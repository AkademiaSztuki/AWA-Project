import { TinderSwipe } from '@/lib/dna';

/**
 * Quality metrics for implicit (Tinder) data
 * Since we always have 30 swipes, we measure quality differently:
 * - Style consistency (do liked images share common patterns?)
 * - Like ratio (healthy range vs all-left/all-right)
 * - Diversity vs coherence
 */

export type ConsistencyInterpretation = 
  | 'clear_preference'      // >60% one style - clear preference
  | 'mixed_preference'      // 2-3 dominant styles - likes mixes
  | 'eclectic_taste'        // Many styles equally - eclectic
  | 'random_swiping';       // No pattern - possibly random swiping

export interface ImplicitQualityMetrics {
  totalSwipes: number;  // Always 30
  likeCount: number;
  likeRatio: number;  // likeCount / totalSwipes
  
  // STYLE CONSISTENCY
  styleConsistency: {
    dominantStyle: string | null;      // Most common style in likes
    dominantStyleRatio: number;        // % of likes with this style
    uniqueStylesLiked: number;         // How many different styles were liked
    consistencyScore: number;          // 0-1 (1 = very consistent)
    allLikedStyles: Array<{ style: string; count: number }>; // All styles with counts
  };
  
  // COLOR CONSISTENCY
  colorConsistency: {
    dominantColors: string[];          // Top 3 colors from likes
    uniqueColorsLiked: number;
    colorConsistencyScore: number;
  };
  
  // BIOPHILIA CONSISTENCY
  biophiliaConsistency: {
    avgBiophilia: number;              // Average biophilia from liked images
    biophiliaRange: { min: number; max: number };
    biophiliaConsistencyScore: number; // How consistent is biophilia preference
  };
  
  // Overall interpretation
  interpretation: ConsistencyInterpretation;
  
  // Quality assessment
  qualityStatus: 'high' | 'medium' | 'low';
  qualityScore: number;  // 0-100
}

/**
 * Calculates quality metrics for implicit (Tinder) data
 */
export function calculateImplicitQuality(swipes: TinderSwipe[]): ImplicitQualityMetrics {
  const totalSwipes = swipes.length;
  const likes = swipes.filter(s => s.direction === 'right');
  const likeCount = likes.length;
  const likeRatio = totalSwipes > 0 ? likeCount / totalSwipes : 0;
  
  // STYLE CONSISTENCY
  const styleCounts = new Map<string, number>();
  likes.forEach(like => {
    const style = like.categories?.style;
    if (style) {
      styleCounts.set(style, (styleCounts.get(style) || 0) + 1);
    }
  });
  
  const sortedStyles = Array.from(styleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([style, count]) => ({ style, count }));
  
  const dominantStyle = sortedStyles[0]?.style || null;
  const dominantCount = sortedStyles[0]?.count || 0;
  const uniqueStylesLiked = styleCounts.size;
  
  const consistencyScore = likeCount > 0 
    ? dominantCount / likeCount 
    : 0;
  
  // COLOR CONSISTENCY
  const colorCounts = new Map<string, number>();
  likes.forEach(like => {
    like.categories?.colors?.forEach(color => {
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    });
  });
  
  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color);
  
  const colorConsistencyScore = likeCount > 0 && sortedColors.length > 0
    ? Math.min(1, sortedColors.length / 3) // More colors = less consistent
    : 0;
  
  // BIOPHILIA CONSISTENCY
  const biophiliaValues: number[] = [];
  likes.forEach(like => {
    const biophilia = like.categories?.biophilia;
    if (biophilia !== undefined) {
      biophiliaValues.push(biophilia);
    }
  });
  
  const avgBiophilia = biophiliaValues.length > 0
    ? biophiliaValues.reduce((a, b) => a + b, 0) / biophiliaValues.length
    : 0;
  
  const biophiliaRange = biophiliaValues.length > 0
    ? {
        min: Math.min(...biophiliaValues),
        max: Math.max(...biophiliaValues)
      }
    : { min: 0, max: 0 };
  
  // Consistency = inverse of range (smaller range = more consistent)
  const biophiliaConsistencyScore = biophiliaRange.max > biophiliaRange.min
    ? 1 - ((biophiliaRange.max - biophiliaRange.min) / 3) // Normalize to 0-1
    : 1; // All same = perfectly consistent
  
  // INTERPRETATION
  const interpretation = interpretConsistency(
    consistencyScore,
    uniqueStylesLiked,
    likeCount
  );
  
  // QUALITY SCORE (0-100)
  const qualityScore = calculateQualityScore(
    likeRatio,
    consistencyScore,
    colorConsistencyScore,
    biophiliaConsistencyScore,
    likeCount
  );
  
  const qualityStatus: 'high' | 'medium' | 'low' = 
    qualityScore >= 70 ? 'high' :
    qualityScore >= 40 ? 'medium' : 'low';
  
  return {
    totalSwipes,
    likeCount,
    likeRatio,
    styleConsistency: {
      dominantStyle,
      dominantStyleRatio: consistencyScore,
      uniqueStylesLiked,
      consistencyScore,
      allLikedStyles: sortedStyles
    },
    colorConsistency: {
      dominantColors: sortedColors,
      uniqueColorsLiked: colorCounts.size,
      colorConsistencyScore
    },
    biophiliaConsistency: {
      avgBiophilia,
      biophiliaRange,
      biophiliaConsistencyScore
    },
    interpretation,
    qualityStatus,
    qualityScore
  };
}

/**
 * Interprets consistency based on metrics
 */
function interpretConsistency(
  consistencyScore: number,
  uniqueStyles: number,
  likeCount: number
): ConsistencyInterpretation {
  if (likeCount < 3) {
    return 'random_swiping'; // Too few likes to determine pattern
  }
  
  if (consistencyScore > 0.6) {
    return 'clear_preference'; // >60% one style
  }
  
  if (consistencyScore > 0.3 && uniqueStyles <= 3) {
    return 'mixed_preference'; // 2-3 styles dominant
  }
  
  if (uniqueStyles > 4) {
    return 'eclectic_taste'; // Many different styles
  }
  
  return 'random_swiping'; // No clear pattern
}

/**
 * Calculates overall quality score (0-100)
 */
function calculateQualityScore(
  likeRatio: number,
  styleConsistency: number,
  colorConsistency: number,
  biophiliaConsistency: number,
  likeCount: number
): number {
  // Like ratio should be in healthy range (0.1 - 0.9)
  // Too low (<0.1) or too high (>0.9) suggests non-engagement
  const likeRatioScore = likeRatio >= 0.1 && likeRatio <= 0.9
    ? 100
    : likeRatio < 0.1
    ? likeRatio * 1000  // Very low = very bad
    : (1 - likeRatio) * 1000; // Very high = very bad
  
  // Need minimum likes for quality
  const likeCountScore = likeCount >= 3
    ? 100
    : (likeCount / 3) * 100;
  
  // Weighted average
  const score = (
    likeRatioScore * 0.3 +
    styleConsistency * 100 * 0.3 +
    colorConsistency * 100 * 0.2 +
    biophiliaConsistency * 100 * 0.1 +
    likeCountScore * 0.1
  );
  
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Checks if implicit data quality is sufficient for generation
 */
export function isImplicitQualitySufficient(metrics: ImplicitQualityMetrics): {
  sufficient: boolean;
  reason?: string;
} {
  // Minimum requirements
  if (metrics.likeCount < 3) {
    return {
      sufficient: false,
      reason: 'Too few likes (<3) - insufficient data for pattern recognition'
    };
  }
  
  if (metrics.likeRatio < 0.1 || metrics.likeRatio > 0.9) {
    return {
      sufficient: false,
      reason: `Unhealthy like ratio (${(metrics.likeRatio * 100).toFixed(0)}%) - suggests non-engagement`
    };
  }
  
  if (metrics.qualityScore < 30) {
    return {
      sufficient: false,
      reason: `Quality score too low (${metrics.qualityScore}/100) - data too inconsistent`
    };
  }
  
  return { sufficient: true };
}

