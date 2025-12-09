import { PromptInputs } from './scoring';
import { GenerationSource } from './modes';
import { calculateImplicitQuality, isImplicitQualitySufficient, ImplicitQualityMetrics } from './implicit-quality';
import { analyzeSourceConflict, SourceConflictAnalysis } from './conflict-analysis';
import { TinderSwipe } from '@/lib/dna';
import { calculateConfidence as calculateFacetConfidence, hasAllFacets, calculateExtremity } from './facet-derivation';

/**
 * Data quality assessment for prompt generation sources
 * Validates data completeness and quality before generation
 */

export type DataStatus = 'sufficient' | 'limited' | 'insufficient';

export interface SourceQualityReport {
  source: GenerationSource;
  status: DataStatus;
  shouldGenerate: boolean;
  
  // Quality metrics
  dataPoints: number;
  confidence: number;  // 0-100
  warnings: string[];
  
  // Source-specific metrics
  implicitQuality?: ImplicitQualityMetrics;
  conflictAnalysis?: SourceConflictAnalysis;
  hasCompleteBigFive?: boolean;
  explicitAnswerCount?: number;
}

/**
 * Quality thresholds for each source type
 */
export const QUALITY_THRESHOLDS = {
  implicit: {
    minLikes: 3,          // Minimum likes for pattern recognition
    minLikeRatio: 0.1,    // At least 10% likes (not all left)
    maxLikeRatio: 0.9,    // At most 90% likes (not all right)
    minQualityScore: 30   // Minimum quality score
  },
  explicit: {
    requiredFields: ['biophiliaScore'], // Only biophilia is research-backed
    recommendedFields: ['selectedStyle', 'sensoryPreferences']
  },
  personality: {
    requireComplete: true,  // Full Big Five, no fallback 50s
    noFallbackAllowed: true
  },
  mixed: {
    requireBothSources: true, // Needs both implicit and explicit
    minImplicitQuality: 30
  },
  mixed_functional: {
    requireBothSources: true,
    requireFunctionalData: true, // Needs activities/pain points
    minImplicitQuality: 30
  },
  inspiration_reference: {
    minInspirations: 1,  // At least one inspiration image
    requireImageUrl: true
  }
};

/**
 * Assesses quality for a specific source
 */
export function assessSourceQuality(
  inputs: PromptInputs,
  source: GenerationSource,
  tinderSwipes?: TinderSwipe[]
): SourceQualityReport {
  const warnings: string[] = [];
  let dataPoints = 0;
  let confidence = 0;
  let status: DataStatus = 'sufficient';
  let shouldGenerate = true;
  
  // IMPLICIT SOURCE
  if (source === GenerationSource.Implicit) {
    if (!tinderSwipes || tinderSwipes.length === 0) {
      return {
        source,
        status: 'insufficient',
        shouldGenerate: false,
        dataPoints: 0,
        confidence: 0,
        warnings: ['No Tinder swipe data available']
      };
    }
    
    const implicitQuality = calculateImplicitQuality(tinderSwipes);
    const sufficient = isImplicitQualitySufficient(implicitQuality);
    
    if (!sufficient.sufficient) {
      warnings.push(sufficient.reason || 'Implicit data quality insufficient');
      status = 'insufficient';
      shouldGenerate = false;
    } else if (implicitQuality.qualityScore < 50) {
      warnings.push(`Low quality score: ${implicitQuality.qualityScore}/100`);
      status = 'limited';
    }
    
    dataPoints = implicitQuality.likeCount;
    confidence = implicitQuality.qualityScore;
    
    return {
      source,
      status,
      shouldGenerate,
      dataPoints,
      confidence,
      warnings,
      implicitQuality
    };
  }
  
  // EXPLICIT SOURCE
  if (source === GenerationSource.Explicit) {
    const requiredFields = QUALITY_THRESHOLDS.explicit.requiredFields;
    const hasRequired = requiredFields.every(field => {
      if (field === 'biophiliaScore') {
        return inputs.psychologicalBaseline.biophiliaScore !== undefined;
      }
      return false;
    });
    
    if (!hasRequired) {
      warnings.push('Missing required explicit data (biophiliaScore)');
      status = 'insufficient';
      shouldGenerate = false;
    }
    
    // Count explicit answers
    let answerCount = 0;
    if (inputs.aestheticDNA.explicit.selectedStyle) answerCount++;
    if (inputs.aestheticDNA.explicit.selectedPalette) answerCount++;
    if (inputs.aestheticDNA.explicit.topMaterials.length > 0) answerCount++;
    if (inputs.sensory.music && inputs.sensory.music !== 'silence') answerCount++;
    if (inputs.sensory.texture) answerCount++;
    if (inputs.sensory.light) answerCount++;
    
    dataPoints = answerCount;
    confidence = hasRequired ? Math.min(100, answerCount * 15) : 0;
    
    if (answerCount < 2) {
      warnings.push('Very few explicit answers - limited personalization');
      status = status === 'insufficient' ? 'insufficient' : 'limited';
    }
    
    return {
      source,
      status,
      shouldGenerate,
      dataPoints,
      confidence,
      warnings,
      explicitAnswerCount: answerCount
    };
  }
  
  // PERSONALITY SOURCE
  if (source === GenerationSource.Personality) {
    const hasBigFive = !!inputs.personality;
    const p = inputs.personality;
    const domainScores = p ? [
      p.openness,
      p.conscientiousness,
      p.extraversion,
      p.agreeableness,
      p.neuroticism
    ] : [];

    const allDomainsAre50 = domainScores.length === 5 && domainScores.every(v => v === 50);
    const facetsObj = p?.facets;
    const facetCount = facetsObj
      ? Object.values(facetsObj).reduce((sum, domainFacets) => sum + Object.keys(domainFacets || {}).length, 0)
      : 0;

    const hasFacetData = facetCount > 0;
    const isComplete = hasBigFive && (!allDomainsAre50 || hasFacetData);
    
    if (!hasBigFive) {
      warnings.push('No Big Five personality data');
      status = 'insufficient';
      shouldGenerate = false;
    } else if (!isComplete) {
      warnings.push('Big Five data appears to be fallback values (all 50) - not reliable');
      status = 'limited';
      // Still generate, but with warning
    }
    
    // Data points: prefer facet granularity, else domain count
    dataPoints = hasBigFive ? Math.max(facetCount, 5) : 0;

    // Confidence: leverage facet-based confidence when available
    if (hasFacetData) {
      // Reuse facet-derivation scoring (0-0.95) → percent
      const personalityPayload: any = {
        openness: p!.openness,
        conscientiousness: p!.conscientiousness,
        extraversion: p!.extraversion,
        agreeableness: p!.agreeableness,
        neuroticism: p!.neuroticism,
        facets: p!.facets
      };
      confidence = Math.round(calculateFacetConfidence(personalityPayload) * 100);
    } else if (isComplete) {
      // Domains only but not all 50
      const extremity = calculateExtremity({
        openness: p!.openness,
        conscientiousness: p!.conscientiousness,
        extraversion: p!.extraversion,
        agreeableness: p!.agreeableness,
        neuroticism: p!.neuroticism,
        facets: p!.facets
      } as any);
      confidence = Math.round(60 + extremity * 25); // 60-85 range
    } else {
      confidence = hasBigFive ? 40 : 0;
    }
    
    return {
      source,
      status,
      shouldGenerate,
      dataPoints,
      confidence,
      warnings,
      hasCompleteBigFive: isComplete || hasFacetData
    };
  }
  
  // MIXED SOURCE
  if (source === GenerationSource.Mixed) {
    // Check both implicit and explicit
    const implicitReport = tinderSwipes 
      ? assessSourceQuality(inputs, GenerationSource.Implicit, tinderSwipes)
      : null;
    const explicitReport = assessSourceQuality(inputs, GenerationSource.Explicit);
    
    const hasBoth = implicitReport?.shouldGenerate && explicitReport?.shouldGenerate;
    const hasOne = implicitReport?.shouldGenerate || explicitReport?.shouldGenerate;
    
    if (!hasBoth) {
      warnings.push('Mixed source requires both implicit and explicit data');
      if (!hasOne) {
        status = 'insufficient';
        shouldGenerate = false;
      } else {
        status = 'limited';
        warnings.push('Only one source available - limited blending');
      }
    }
    
    // Conflict analysis
    const conflictAnalysis = hasBoth ? analyzeSourceConflict(inputs) : undefined;
    if (conflictAnalysis?.hasConflict) {
      warnings.push(`Conflict detected: ${conflictAnalysis.conflictType} (${conflictAnalysis.conflictSeverity})`);
    }
    
    dataPoints = (implicitReport?.dataPoints || 0) + (explicitReport?.dataPoints || 0);
    confidence = hasBoth 
      ? Math.round((implicitReport!.confidence + explicitReport!.confidence) / 2)
      : Math.max(implicitReport?.confidence || 0, explicitReport?.confidence || 0);
    
    return {
      source,
      status,
      shouldGenerate,
      dataPoints,
      confidence,
      warnings,
      conflictAnalysis
    };
  }
  
  // MIXED FUNCTIONAL SOURCE
  if (source === GenerationSource.MixedFunctional) {
    const mixedReport = assessSourceQuality(inputs, GenerationSource.Mixed, tinderSwipes);
    
    // Also check functional data
    const hasFunctionalData = 
      (inputs.activities && inputs.activities.length > 0) ||
      (inputs.painPoints && inputs.painPoints.length > 0) ||
      inputs.primaryActivity;
    
    if (!hasFunctionalData) {
      warnings.push('MixedFunctional requires functional data (activities, pain points)');
      status = mixedReport.status === 'insufficient' ? 'insufficient' : 'limited';
    }
    
    return {
      ...mixedReport,
      source: GenerationSource.MixedFunctional,
      shouldGenerate: mixedReport.shouldGenerate && hasFunctionalData,
      warnings: [...mixedReport.warnings, ...(hasFunctionalData ? [] : ['Missing functional requirements'])]
    };
  }
  
  // INSPIRATION REFERENCE SOURCE
  if (source === GenerationSource.InspirationReference) {
    const inspirations = inputs.inspirations || [];
    const hasInspirations = inspirations.length >= QUALITY_THRESHOLDS.inspiration_reference.minInspirations;
    // Check for url, imageBase64, previewUrl, or image (multiple possible formats)
    const hasUrls = inspirations.some(i => {
      const insp = i as any;
      return insp.url || insp.imageBase64 || insp.previewUrl || insp.image;
    });
    
    if (!hasInspirations) {
      warnings.push('No inspiration images provided');
      status = 'insufficient';
      shouldGenerate = false;
    } else if (!hasUrls) {
      warnings.push('Inspiration images missing URLs or base64 data');
      status = 'limited';
      // Still allow generation if we have inspirations - base64 can be extracted later
      shouldGenerate = hasInspirations;
    }
    
    dataPoints = inspirations.length;
    confidence = hasInspirations && hasUrls ? 80 : (hasInspirations ? 40 : 0);
    
    return {
      source,
      status,
      shouldGenerate: hasInspirations,
      dataPoints,
      confidence,
      warnings
    };
  }
  
  // Default fallback
  return {
    source,
    status: 'limited',
    shouldGenerate: true,
    dataPoints: 0,
    confidence: 50,
    warnings: ['Unknown source type']
  };
}

/**
 * Assesses quality for all available sources
 */
export function assessAllSourcesQuality(
  inputs: PromptInputs,
  tinderSwipes?: TinderSwipe[]
): SourceQualityReport[] {
  const sources: GenerationSource[] = [
    GenerationSource.Implicit,
    GenerationSource.Explicit,
    GenerationSource.Personality,
    GenerationSource.Mixed,
    GenerationSource.MixedFunctional,
    GenerationSource.InspirationReference
  ];
  
  return sources.map(source => 
    assessSourceQuality(inputs, source, tinderSwipes)
  );
}

/**
 * Gets viable sources (shouldGenerate = true)
 */
export function getViableSources(reports: SourceQualityReport[]): GenerationSource[] {
  return reports
    .filter(r => r.shouldGenerate)
    .map(r => r.source);
}

