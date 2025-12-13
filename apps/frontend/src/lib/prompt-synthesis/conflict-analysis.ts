import { PromptInputs } from './scoring';

/**
 * Conflict analysis between Implicit (Tinder) and Explicit (questionnaire) data
 * Detects differences and provides recommendations for how to use them
 */

export type ConflictType = 'style' | 'colors' | 'materials' | 'biophilia' | 'none';
export type ConflictSeverity = 'minor' | 'moderate' | 'major';

export interface SourceConflictAnalysis {
  hasConflict: boolean;
  conflictType: ConflictType;
  conflictSeverity: ConflictSeverity;
  
  // Source data
  implicit: {
    style: string | null;
    colors: string[];
    materials: string[];
    biophilia: number;
  };
  explicit: {
    style: string | null;
    colors: string[];
    materials: string[];
    biophilia: number;
  };
  
  // How to use the conflict
  recommendation: {
    forMixed: string;           // How to blend for Mixed source
    forMixedFunctional: string; // How to blend for MixedFunctional source
    userMessage?: string;       // Optional message for user
  };
  
  // Detailed conflict info
  conflicts: Array<{
    type: ConflictType;
    severity: ConflictSeverity;
    description: string;
  }>;
}

/**
 * Analyzes conflicts between implicit and explicit preferences
 */
export function analyzeSourceConflict(inputs: PromptInputs): SourceConflictAnalysis {
  const implicit = {
    style: inputs.aestheticDNA.implicit.dominantStyles[0] || null,
    colors: inputs.aestheticDNA.implicit.colors || [],
    materials: inputs.aestheticDNA.implicit.materials || [],
    biophilia: inputs.psychologicalBaseline.implicitBiophiliaScore ?? 
               inputs.psychologicalBaseline.biophiliaScore ?? 0
  };
  
  const explicit = {
    style: inputs.aestheticDNA.explicit.selectedStyle || 
           extractStyleFromPalette(inputs.aestheticDNA.explicit.selectedPalette) || null,
    colors: [], // Explicit colors come from palette/style, not direct array
    materials: inputs.aestheticDNA.explicit.topMaterials || [],
    biophilia: inputs.psychologicalBaseline.biophiliaScore ?? 0
  };
  
  const conflicts: Array<{ type: ConflictType; severity: ConflictSeverity; description: string }> = [];
  
  // STYLE CONFLICT
  let styleConflict = false;
  let styleSeverity: ConflictSeverity | undefined = undefined;
  if (implicit.style && explicit.style) {
    const styleDistance = calculateStyleDistance(implicit.style, explicit.style);
    if (styleDistance > 0) {
      styleConflict = true;
      styleSeverity = categorizeStyleDistance(styleDistance);
      conflicts.push({
        type: 'style',
        severity: styleSeverity,
        description: `Style mismatch: implicit=${implicit.style}, explicit=${explicit.style}`
      });
    }
  }
  
  // BIOPHILIA CONFLICT
  let biophiliaConflict = false;
  let biophiliaSeverity: ConflictSeverity | undefined = undefined;
  const biophiliaDiff = Math.abs(implicit.biophilia - explicit.biophilia);
  if (biophiliaDiff >= 2) {
    biophiliaConflict = true;
    biophiliaSeverity = biophiliaDiff >= 3 ? 'major' : 'moderate';
    conflicts.push({
      type: 'biophilia',
      severity: biophiliaSeverity,
      description: `Biophilia mismatch: implicit=${implicit.biophilia}, explicit=${explicit.biophilia}`
    });
  }
  
  // MATERIALS CONFLICT (if no overlap)
  let materialsConflict = false;
  if (implicit.materials.length > 0 && explicit.materials.length > 0) {
    const overlap = implicit.materials.filter(m => 
      explicit.materials.some(e => e.toLowerCase() === m.toLowerCase())
    );
    if (overlap.length === 0) {
      materialsConflict = true;
      conflicts.push({
        type: 'materials',
        severity: 'moderate',
        description: `No material overlap between implicit and explicit preferences`
      });
    }
  }
  
  // Determine overall conflict
  const hasConflict = conflicts.length > 0;
  const primaryConflictType: ConflictType = conflicts.length > 0 
    ? conflicts[0].type 
    : 'none';
  const maxSeverity: ConflictSeverity = conflicts.length > 0
    ? conflicts.reduce((max, c) => 
        c.severity === 'major' ? 'major' : 
        c.severity === 'moderate' ? (max === 'major' ? 'major' : 'moderate') : 
        max, 'minor' as ConflictSeverity)
    : 'minor';
  
  // Generate recommendations
  const recommendation = hasConflict
    ? generateConflictRecommendations(implicit, explicit, primaryConflictType, maxSeverity)
    : {
        forMixed: 'Blend implicit and explicit preferences harmoniously',
        forMixedFunctional: 'Use explicit as base, enhance with implicit aesthetics'
      };
  
  return {
    hasConflict,
    conflictType: primaryConflictType,
    conflictSeverity: maxSeverity,
    implicit,
    explicit,
    recommendation,
    conflicts
  };
}

/**
 * Extracts style name from palette string if possible
 */
function extractStyleFromPalette(palette: string): string | null {
  if (!palette) return null;
  
  const styleKeywords: Record<string, string> = {
    'scandinavian': 'scandinavian',
    'modern': 'modern',
    'industrial': 'industrial',
    'rustic': 'rustic',
    'bohemian': 'bohemian',
    'minimalist': 'minimalist',
    'mid-century': 'mid-century',
    'contemporary': 'contemporary',
    'traditional': 'traditional'
  };
  
  const lower = palette.toLowerCase();
  for (const [keyword, style] of Object.entries(styleKeywords)) {
    if (lower.includes(keyword)) {
      return style;
    }
  }
  
  return null;
}

/**
 * Calculates distance between two styles (0 = same, higher = more different)
 */
function calculateStyleDistance(style1: string, style2: string): number {
  const s1 = style1.toLowerCase().trim();
  const s2 = style2.toLowerCase().trim();
  
  if (s1 === s2) return 0;
  
  // Check for partial matches (e.g., "modern" in "modern minimalist")
  if (s1.includes(s2) || s2.includes(s1)) return 0.5;
  
  // Style compatibility matrix (lower = more compatible)
  const compatibilityMatrix: Record<string, Record<string, number>> = {
    'modern': {
      'contemporary': 0.3,
      'minimalist': 0.3,
      'scandinavian': 0.5,
      'industrial': 0.7,
      'rustic': 2.0,
      'traditional': 2.5,
      'bohemian': 2.0
    },
    'scandinavian': {
      'minimalist': 0.3,
      'modern': 0.5,
      'japandi': 0.4,
      'rustic': 1.5,
      'industrial': 1.8,
      'bohemian': 2.0
    },
    'industrial': {
      'modern': 0.7,
      'contemporary': 0.8,
      'rustic': 1.2,
      'scandinavian': 1.8,
      'traditional': 2.5,
      'bohemian': 2.5
    },
    'rustic': {
      'traditional': 0.5,
      'farmhouse': 0.3,
      'industrial': 1.2,
      'modern': 2.0,
      'scandinavian': 1.5
    },
    'bohemian': {
      'eclectic': 0.3,
      'maximalist': 0.5,
      'rustic': 1.0,
      'modern': 2.0,
      'minimalist': 2.5
    }
  };
  
  // Check matrix
  if (compatibilityMatrix[s1]?.[s2] !== undefined) {
    return compatibilityMatrix[s1][s2];
  }
  if (compatibilityMatrix[s2]?.[s1] !== undefined) {
    return compatibilityMatrix[s2][s1];
  }
  
  // Default: different styles = distance 2.0
  return 2.0;
}

/**
 * Categorizes style distance into severity
 */
function categorizeStyleDistance(distance: number): ConflictSeverity {
  if (distance <= 0.5) return 'minor';
  if (distance <= 1.5) return 'moderate';
  return 'major';
}

/**
 * Generates recommendations for handling conflicts
 */
function generateConflictRecommendations(
  implicit: { style: string | null; biophilia: number },
  explicit: { style: string | null; biophilia: number },
  conflictType: ConflictType,
  severity: ConflictSeverity
): {
  forMixed: string;
  forMixedFunctional: string;
  userMessage?: string;
} {
  if (conflictType === 'style' && implicit.style && explicit.style) {
    const userMessage = severity === 'major'
      ? `Zauważyliśmy różnicę: lubisz ${implicit.style} (z wyborów), ale wybrałeś ${explicit.style} (w ankiecie). Pokażemy oba style!`
      : `Łączymy ${implicit.style} z ${explicit.style} dla unikalnego efektu.`;
    
    return {
      forMixed: `Blend ${implicit.style} aesthetics with ${explicit.style} structural elements`,
      forMixedFunctional: `Use ${explicit.style} as functional base, ${implicit.style} as aesthetic accent`,
      userMessage
    };
  }
  
  if (conflictType === 'biophilia') {
    const avgBiophilia = Math.round((implicit.biophilia + explicit.biophilia) / 2);
    return {
      forMixed: `Balance biophilia: blend ${implicit.biophilia}/3 (implicit) with ${explicit.biophilia}/3 (explicit) → ${avgBiophilia}/3`,
      forMixedFunctional: `Prioritize explicit biophilia (${explicit.biophilia}/3) for functional needs, add implicit touches (${implicit.biophilia}/3)`,
      userMessage: `Różnica w roślinach: ${implicit.biophilia}/3 vs ${explicit.biophilia}/3 - znajdziemy złoty środek!`
    };
  }
  
  return {
    forMixed: 'Blend conflicting preferences harmoniously',
    forMixedFunctional: 'Use explicit as base, enhance with implicit elements'
  };
}

