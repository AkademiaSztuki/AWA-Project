// PROMPT SYNTHESIS - STEP 1: Scoring Matrix
// Deterministic, transparent, weighted scoring of user data
// Converts multi-source data into numerical weights for prompt building

import { PRSMoodGridData } from '../questions/validated-scales';
import { ActivityContext } from '@/types/deep-personalization';
import { GenerationSource } from './modes';
import { deriveStyleFromFacets, calculateConfidence, type PersonalityData } from './facet-derivation';
import { RESEARCH_SOURCES, BIGFIVE_COLOR_MAPPINGS, BIGFIVE_BIOPHILIA_MAPPINGS } from './research-mappings';
import { analyzeMoodTransformation, mapSocialContext, analyzeActivityNeeds, type MoodTransformation, type SocialContextRecommendations, type ActivityRecommendations } from './mood-transformation';

// =========================
// INPUT TYPES
// =========================

export interface PromptInputs {
  // LAYER 1: Core Profile (global)
  aestheticDNA: {
    implicit: {
      dominantStyles: string[];  // From Tinder swipes pattern analysis
      colors: string[];           // Detected from liked images
      materials: string[];
      complexity: number;         // 0-1
      warmth: number;            // 0-1 (cool to warm)
      brightness: number;        // 0-1 (dark to bright)
    };
    explicit: {
      selectedPalette: string;   // User's ranked #1 palette
      selectedStyle?: string;     // User's selected style (from style-selection flow)
      topMaterials: string[];    // User's selected materials
      warmthPreference: number;  // 0-1 from semantic differential
      brightnessPreference: number; // 0-1
      complexityPreference: number; // 0-1
    };
  };
  
  psychologicalBaseline: {
    prsIdeal: PRSMoodGridData;   // Where user wants spaces ideally
    biophiliaScore: number;      // 0-3 (global from biophilia test)
    implicitBiophiliaScore?: number; // 0-3 (calculated from Tinder swipes - avgBiophilia from liked images)
  };
  
  lifestyle: {
    vibe: string;                // busy/calm/chaotic/structured/social/private
    goals: string[];             // [energy, calm, creativity, focus, etc]
    values: string[];            // From laddering/projective
  };
  
  sensory: {
    music: string;               // Selected music ID
    texture: string;             // Selected texture ID
    light: string;               // Selected light ID
    natureMetaphor: string;      // Selected nature place
  };

  // Big Five Personality (from IPIP-NEO-120 with facets)
  personality?: {
    // Domain scores (0-100)
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    // IPIP-NEO-120 facets (0-100 each, 6 per domain)
    facets?: {
      O: { [key: number]: number }; // O1-O6: Fantasy, Aesthetics, Feelings, Actions, Ideas, Values
      C: { [key: number]: number }; // C1-C6: Competence, Order, Dutifulness, Achievement, Self-Discipline, Deliberation
      E: { [key: number]: number }; // E1-E6: Warmth, Gregariousness, Assertiveness, Activity, Excitement-Seeking, Positive Emotions
      A: { [key: number]: number }; // A1-A6: Trust, Straightforwardness, Altruism, Compliance, Modesty, Tender-Mindedness
      N: { [key: number]: number }; // N1-N6: Anxiety, Anger, Depression, Self-Consciousness, Immoderation, Vulnerability
    };
  };

  // Inspiration Images (from VLM analysis)
  inspirations?: Array<{
    tags: {
      styles?: string[];
      colors?: string[];
      materials?: string[];
      biophilia?: number;
    };
    description?: string;
  }>;
  
  // LAYER 2: Household
  householdContext: {
    livingSituation: string;     // alone, partner, family, roommates
    householdGoals: string[];
  };
  
  // LAYER 3: Room
  roomType: string;
  socialContext: 'solo' | 'shared';
  sharedWith?: string[];
  
  activities: Array<{
    type: string;
    frequency: string;
    satisfaction: string;        // good, ok, difficult
    timeOfDay?: string;
    withWhom?: string;
  }>;
  
  painPoints: string[];
  
  prsCurrent: PRSMoodGridData;    // Current room state
  prsTarget: PRSMoodGridData;     // Desired room state
  
  roomVisualDNA: {
    styles: string[];             // Room-specific style preferences
    colors: string[];
  };
  
  // LAYER 4: Photo Analysis
  currentRoomAnalysis?: {
    clutter: number;              // 0-1
    dominantColors: string[];
    detectedObjects: string[];
    lightQuality: string;         // dark, dim, bright, very_bright
  };

  activityContext?: ActivityContext;
}

// =========================
// SCORING OUTPUTS
// =========================

export interface PromptWeights {
  // Mood & Atmosphere (from PRS gap analysis)
  needsCalming: number;          // 0-1
  needsEnergizing: number;       // 0-1
  needsInspiration: number;      // 0-1
  needsGrounding: number;        // 0-1
  
  // Style (from implicit + explicit)
  dominantStyle: string;
  styleConfidence: number;       // 0-1
  
  // Colors (weighted implicit vs explicit)
  colorPalette: string[];
  colorTemperature: number;      // 0-1 (cool to warm)
  
  // Materials
  primaryMaterials: string[];
  
  // Lighting
  lightingMood: string;          // warm_dim, warm_bright, neutral, cool_bright
  naturalLightImportance: number; // 0-1
  
  // Nature/Biophilia
  natureDensity: number;         // 0-1
  biophilicElements: string[];   // specific elements to include
  
  // Functional Requirements
  primaryActivity: string;
  secondaryActivities: string[];
  functionalPriorities: string[]; // storage, zoning, flexibility, etc
  
  // Social Context
  requiresZoning: boolean;
  privateVsShared: number;       // 0-1 (fully private to fully shared)
  
  // Complexity & Detail
  visualComplexity: number;      // 0-1
  
  // Personality-driven preferences (domain-based)
  storageNeeds: number;          // 0-1 (from conscientiousness)
  harmonyLevel: number;          // 0-1 (from agreeableness + low neuroticism)
  
  // Facet-driven preferences (IPIP-NEO-120 specific)
  facetPreferences: {
    aestheticSensitivity: number;   // 0-1 (from O2 Aesthetics)
    orderPreference: number;        // 0-1 (from C2 Order)
    warmthPreference: number;       // 0-1 (from E1 Warmth)
    socialOpenness: number;         // 0-1 (from E2 Gregariousness)
    excitementSeeking: number;      // 0-1 (from E5 Excitement-Seeking)
    tenderMindedness: number;       // 0-1 (from A6 Tender-Mindedness)
    anxietyLevel: number;           // 0-1 (from N1 Anxiety)
    vulnerabilityLevel: number;     // 0-1 (from N6 Vulnerability)
  };
  
  // Design implications from facets
  designImplications: {
    eclecticMix: boolean;           // High O2 + low C2
    minimalistTendency: boolean;    // High C2 + low O1
    cozyTextures: boolean;          // High E1 + high A6
    boldColors: boolean;            // High E5 + high O2
    softTextures: boolean;          // High A6
    organicShapes: boolean;         // High A6 + high O2
    calmingElements: boolean;       // High N1 (needs calming)
    groundingElements: boolean;     // High N6 (needs stability)
    enclosedSpaces: boolean;        // Low E2 + high N1
    openPlanPreference: boolean;    // High E2 + high E
  };
  
  // Special Considerations
  addressPainPoints: string[];
  
  // NEW: Mood transformation (for MixedFunctional)
  moodTransformation?: MoodTransformation;
  socialContextRecommendations?: SocialContextRecommendations;
  activityNeeds?: ActivityRecommendations;
}

// =========================
// SCORING FUNCTIONS
// =========================

export function calculatePromptWeights(inputs: PromptInputs, sourceType?: GenerationSource | string): PromptWeights {
  // 1. PRS GAP ANALYSIS (highest weight: 25%)
  // IMPORTANT: Some sources have PRS zeroed in modes.ts (Implicit, Explicit, Personality)
  // If PRS is (0,0) for both current and target, all needs will be 0 (correct behavior)
  // Only Mixed and MixedFunctional should use real PRS data
  const prsWeights = analyzePRSGap(inputs.prsCurrent, inputs.prsTarget);
  
  // Pre-calculate inspiration biophilia if tags are present (for InspirationReference)
  // Średnia biophilia z inspiracji liczone względem wszystkich inspiracji (brak taga = 0)
  const inspirationBiophiliaRaw = (() => {
    const total = (inputs.inspirations || []).length;
    if (total === 0) return undefined;
    const sum = (inputs.inspirations || []).reduce((acc, i) => {
      const val = typeof i.tags?.biophilia === 'number' && !Number.isNaN(i.tags.biophilia)
        ? i.tags.biophilia
        : 0;
      return acc + val;
    }, 0);
    return sum / total;
  })();
  const inspirationBiophilia = inspirationBiophiliaRaw;
  const inspirationBiophiliaNormalized =
    inspirationBiophilia !== undefined
      ? (inspirationBiophilia > 1 ? inspirationBiophilia / 3 : inspirationBiophilia)
      : undefined;
  const explicitBiophiliaNormalized = (() => {
    const val = inputs.psychologicalBaseline.biophiliaScore;
    if (val === undefined) return undefined;
    return val > 1 ? val / 3 : val;
  })();

  // Log PRS values for debugging
  if (sourceType) {
    const prsGap = Math.sqrt(
      Math.pow(inputs.prsTarget.x - inputs.prsCurrent.x, 2) + 
      Math.pow(inputs.prsTarget.y - inputs.prsCurrent.y, 2)
    );
    console.log(`[PRS] Source: ${sourceType}, Current: (${inputs.prsCurrent.x}, ${inputs.prsCurrent.y}), Target: (${inputs.prsTarget.x}, ${inputs.prsTarget.y}), Gap: ${prsGap.toFixed(2)}`);
  }
  
  // 2. STYLE INTEGRATION (implicit 60% + explicit 40%, with personality fallback)
  const styleWeights = integrateStylePreferences(
    inputs.aestheticDNA,
    inputs.personality,
    inputs.lifestyle,
    inputs.sensory,
    sourceType
  );
  
  // 3. COLOR INTEGRATION (with personality and style fallback)
  const colorWeights = integrateColorPreferences(
    inputs.aestheticDNA,
    inputs.roomVisualDNA,
    inputs.sensory,
    inputs.personality,
    styleWeights.dominantStyle, // Pass dominant style for color derivation when no color data
    sourceType // Pass source type for Mixed/MixedFunctional differentiation
  );
  
  // 4. BIOPHILIA SCORING
  // Each source type uses different biophilia data (as filtered in modes.ts)
  let biophiliaScoreToUse: number;
  
  switch (sourceType) {
    case GenerationSource.Implicit:
      // Implicit source: use ONLY implicitBiophiliaScore from Tinder (modes.ts sets biophiliaScore to this)
      // But also check if implicitBiophiliaScore is available directly
      biophiliaScoreToUse = inputs.psychologicalBaseline.implicitBiophiliaScore ?? 
                           inputs.psychologicalBaseline.biophiliaScore ?? 0;
      console.log('[Biophilia] Implicit source - using Tinder-derived biophilia:', biophiliaScoreToUse);
      break;
      
    case GenerationSource.Explicit:
      // Explicit source: use ONLY explicit biophiliaScore from test
      biophiliaScoreToUse = inputs.psychologicalBaseline.biophiliaScore ?? 0;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:Explicit-biophilia',message:'Explicit source - using ONLY explicit biophiliaScore',data:{biophiliaScore:biophiliaScoreToUse,inputBiophiliaScore:inputs.psychologicalBaseline.biophiliaScore,ignoredImplicitBiophilia:true},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E11'})}).catch(()=>{});
      // #endregion
      console.log('[Biophilia] Explicit source - using test biophilia:', biophiliaScoreToUse);
      break;
      
    case GenerationSource.Personality:
      // Personality source: derive biophilia from Big Five personality traits
      biophiliaScoreToUse = deriveBiophiliaFromPersonality(inputs.personality);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:Personality-biophilia','message':'Personality source - using ONLY Big Five for biophilia','data':{'personalityDomains':inputs.personality?{'O':inputs.personality.openness,'C':inputs.personality.conscientiousness,'E':inputs.personality.extraversion,'A':inputs.personality.agreeableness,'N':inputs.personality.neuroticism}:null,'biophiliaScore':biophiliaScoreToUse,'ignoredExplicitBiophilia':true},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'B2'})}).catch(()=>{});
      // #endregion
      console.log('[Biophilia] Personality source - derived from Big Five:', biophiliaScoreToUse);
      break;
      
    case GenerationSource.Mixed:
    case GenerationSource.MixedFunctional:
      // Mixed sources: blend ALL biophilia sources (implicit, explicit, personality)
      // Using MIXED_SOURCE_WEIGHTS: 40% implicit, 30% explicit, 30% personality
      const implicitBiophilia = inputs.psychologicalBaseline.implicitBiophiliaScore;
      const explicitBiophilia = inputs.psychologicalBaseline.biophiliaScore ?? 0;
      const personalityBiophilia = inputs.personality ? deriveBiophiliaFromPersonality(inputs.personality) : undefined;
      
      // Calculate weighted average based on available sources
      let totalWeight = 0;
      let weightedSum = 0;
      
      if (implicitBiophilia !== undefined) {
        weightedSum += implicitBiophilia * 0.4;
        totalWeight += 0.4;
      }
      
      weightedSum += explicitBiophilia * 0.3;
      totalWeight += 0.3;
      
      if (personalityBiophilia !== undefined) {
        weightedSum += personalityBiophilia * 0.3;
        totalWeight += 0.3;
      }
      
      // Normalize if some sources are missing
      if (totalWeight > 0) {
        biophiliaScoreToUse = Math.round(weightedSum / totalWeight);
      } else {
        biophiliaScoreToUse = explicitBiophilia; // Fallback to explicit
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:Mixed-biophilia',message:'Mixed source - blending ALL biophilia sources',data:{implicitBiophilia:implicitBiophilia,explicitBiophilia:explicitBiophilia,personalityBiophilia:personalityBiophilia,weights:{implicit:0.4,explicit:0.3,personality:0.3},totalWeight:totalWeight,biophiliaScore:biophiliaScoreToUse},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E12'})}).catch(()=>{});
      // #endregion
      console.log('[Biophilia] Mixed source - blending implicit:', implicitBiophilia, '+ explicit:', explicitBiophilia, '+ personality:', personalityBiophilia, '→', biophiliaScoreToUse);
      break;
      
    case GenerationSource.InspirationReference:
      // InspirationReference: używaj TYLKO biophilii z inspiracji; brak danych = 0 (nie mieszaj z explicit)
      biophiliaScoreToUse = inspirationBiophilia ?? 0;
      console.log('[Biophilia] InspirationReference source - using inspiration tags biophilia only:', biophiliaScoreToUse);
      break;
      
    default:
      // Fallback: use explicit
      biophiliaScoreToUse = inputs.psychologicalBaseline.biophiliaScore ?? 0;
      console.log('[Biophilia] Unknown source - using explicit biophilia:', biophiliaScoreToUse);
  }
  
  const biophiliaWeights = calculateBiophiliaIntegration(
    biophiliaScoreToUse,
    inputs.sensory.natureMetaphor,
    inputs.roomType
  );
  
  // 5. FUNCTIONAL ANALYSIS
  const functionalWeights = analyzeFunctionalRequirements(
    inputs.activities,
    inputs.painPoints,
    inputs.socialContext,
    inputs.activityContext
  );
  
  // 6. LIGHTING REQUIREMENTS
  const lightingWeights = determineLightingStrategy(
    inputs.sensory.light,
    inputs.prsCurrent,
    inputs.prsTarget,
    inputs.activities
  );
  
  // 7. SOCIAL CONTEXT HANDLING
  const socialWeights = analyzeSocialContext(
    inputs.socialContext,
    inputs.sharedWith,
    inputs.householdContext
  );
  
  // 7b. SOCIAL CONTEXT RECOMMENDATIONS (for MixedFunctional)
  const socialContextRecommendations = mapSocialContext(
    inputs.socialContext,
    inputs.sharedWith
  );
  
  // 7c. ACTIVITY NEEDS ANALYSIS (for MixedFunctional)
  const activityNeeds = analyzeActivityNeeds(inputs.activities);
  
  // 8. BIG FIVE PERSONALITY INTEGRATION (domains + facets)
  const personalityWeights = mapBigFiveToPromptWeights(inputs.personality);
  const facetWeights = mapBigFiveFacetsToDesignPreferences(inputs.personality);
  
  // 9. INSPIRATION TAGS INTEGRATION
  const inspirationWeights = integrateInspirationTags(inputs.inspirations);
  
  // COMBINE ALL WEIGHTS
  return {
    // Mood (from PRS gap)
    needsCalming: prsWeights.needsCalming,
    needsEnergizing: prsWeights.needsEnergizing,
    needsInspiration: prsWeights.needsInspiration,
    needsGrounding: prsWeights.needsGrounding,
    
    // Style
    dominantStyle: styleWeights.dominantStyle,
    styleConfidence: styleWeights.confidence,
    
    // Colors (enhanced with inspirations)
    // CRITICAL: For Personality source, use ONLY colors from personality (no inspirations)
    colorPalette: (() => {
      const isPersonality = sourceType === GenerationSource.Personality || sourceType === 'personality';
      if (isPersonality) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:384',message:'Personality source - using ONLY personality colors',data:{personalityColors:colorWeights.palette,inspirationColors:inspirationWeights.additionalColors,ignoredInspirations:true},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'P6'})}).catch(()=>{});
        // #endregion
        return colorWeights.palette; // Only personality colors, no inspirations
      }
      return [...colorWeights.palette, ...inspirationWeights.additionalColors];
    })(),
    colorTemperature: colorWeights.temperature,
    
    // Materials (enhanced with inspirations)
    // CRITICAL: For Personality source, use ONLY materials from personality (no inspirations)
    primaryMaterials: (() => {
      const isPersonality = sourceType === GenerationSource.Personality || sourceType === 'personality';
      if (isPersonality) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:388',message:'Personality source - using ONLY personality materials',data:{personalityMaterials:styleWeights.materials,inspirationMaterials:inspirationWeights.additionalMaterials,ignoredInspirations:true},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'P5'})}).catch(()=>{});
        // #endregion
        return styleWeights.materials; // Only personality materials, no inspirations
      }
      return [...styleWeights.materials, ...inspirationWeights.additionalMaterials];
    })(),
    
    // Lighting
    lightingMood: lightingWeights.mood,
    naturalLightImportance: lightingWeights.naturalImportance,
    
    // Biophilia (enhanced with inspirations; dampen boosts at high base levels)
    natureDensity: (() => {
      // InspirationReference: tylko inspiracje; brak danych = 0, bez miksowania z explicit
      if (sourceType === GenerationSource.InspirationReference) {
        const candidate = inspirationBiophiliaNormalized ?? 0;
        return Math.max(0, Math.min(1, candidate));
      }
      const base = biophiliaWeights.density;
      const boost = inspirationWeights.biophiliaBoost;
      const boostFactor = base < 0.5 ? 0.9 : base < 0.8 ? 0.7 : 0.5;
      return Math.min(1, base + boost * boostFactor);
    })(),
    biophilicElements: [...biophiliaWeights.elements],
    
    // Functional
    primaryActivity: functionalWeights.primary,
    secondaryActivities: functionalWeights.secondary,
    functionalPriorities: functionalWeights.priorities,
    
    // Social (enhanced with personality)
    requiresZoning: socialWeights.requiresZoning,
    privateVsShared: personalityWeights.socialPreferences,
    
    // Complexity (enhanced with personality)
    // CRITICAL: For Personality source, use ONLY personality complexity (styleWeights.complexity also comes from personality)
    visualComplexity: (() => {
      const isPersonality = sourceType === GenerationSource.Personality || sourceType === 'personality';
      if (isPersonality) {
        // Both styleWeights.complexity and personalityWeights.visualComplexity come from personality
        // Average them for final complexity
        const result = (styleWeights.complexity + personalityWeights.visualComplexity) / 2;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:418',message:'Personality source - using ONLY personality complexity',data:{styleComplexity:styleWeights.complexity,personalityComplexity:personalityWeights.visualComplexity,result,fromPersonalityOnly:true},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'P7'})}).catch(()=>{});
        // #endregion
        return result;
      }
      return (styleWeights.complexity + personalityWeights.visualComplexity) / 2;
    })(),
    
    // Personality-driven preferences
    storageNeeds: personalityWeights.storageNeeds,
    harmonyLevel: personalityWeights.harmonyLevel,
    
    // Facet-driven preferences
    facetPreferences: facetWeights.facetPreferences,
    
    // Design implications from facets
    designImplications: facetWeights.designImplications,
    
    // Pain points
    addressPainPoints: inputs.painPoints,
    
    // NEW: Mood transformation and context (for MixedFunctional)
    moodTransformation: prsWeights.moodTransformation,
    socialContextRecommendations: socialContextRecommendations,
    activityNeeds: activityNeeds
  };
}

// =========================
// VALID INTERIOR STYLES
// =========================

const VALID_STYLES = [
  'modern', 'scandinavian', 'industrial', 'minimalist', 'rustic',
  'bohemian', 'contemporary', 'traditional', 'mid-century', 'japandi',
  'coastal', 'farmhouse', 'mediterranean', 'art-deco', 'maximalist',
  'eclectic', 'hygge', 'zen', 'vintage', 'transitional'
];

/**
 * Extracts valid style names from a tag soup string.
 * Handles cases like "bohemian warm earth velvet marble..." -> "bohemian"
 */
function extractValidStyle(styleString: string): string | null {
  if (!styleString) return null;
  
  const lower = styleString.toLowerCase().trim();
  
  // Check if it's already a valid style
  if (VALID_STYLES.includes(lower)) {
    return lower;
  }
  
  // Try to find a valid style within the string
  for (const validStyle of VALID_STYLES) {
    if (lower.includes(validStyle)) {
      return validStyle;
    }
  }
  
  return null;
}

/**
 * Extracts all valid styles from an array of style strings.
 */
function extractAllValidStyles(styles: string[]): string[] {
  const validStyles = new Set<string>();
  
  for (const style of styles) {
    const valid = extractValidStyle(style);
    if (valid) {
      validStyles.add(valid);
    }
  }
  
  return Array.from(validStyles);
}

// =========================
// VALID COLORS AND NORMALIZATION
// =========================

const COLOR_TO_HEX: Record<string, string> = {
  // Neutrals
  'white': '#FFFFFF',
  'black': '#000000',
  'gray': '#808080',
  'grey': '#808080',
  'beige': '#F5F5DC',
  'cream': '#FFFDD0',
  'ivory': '#FFFFF0',
  'taupe': '#8B7355',
  // Warm tones
  'warm coral': '#FF7F50',
  'sunny yellow': '#FFD700',
  'warm beige': '#D4A574',
  'terracotta': '#E2725B',
  'burnt orange': '#CC5500',
  // Cool tones
  'soft gray': '#A9A9A9',
  'muted blue': '#6B8E9F',
  'sage green': '#9DC183',
  'sky blue': '#87CEEB',
  'steel blue': '#4682B4',
  // Rich colors
  'deep teal': '#008080',
  'rich burgundy': '#800020',
  'emerald green': '#50C878',
  'navy blue': '#000080',
  // Soft colors
  'blush pink': '#FFB6C1',
  'soft lavender': '#E6E6FA',
  'peach': '#FFE5B4',
  'mint green': '#98FF98',
  // Earth tones
  'charcoal': '#36454F',
  'crisp white': '#FFFFFF',
  'warm tones': '#D4A574',
  'cool tones': '#6B8E9F',
  'neutral': '#808080',
  // Common color descriptions from Tinder metadata
  'warm neutrals': '#D4A574',
  'cool grays': '#6B8E9F',
  'earth tones': '#8B7355',
  'pastels': '#FFB6C1',
  'bold colors': '#FF7F50',
  'monochrome': '#808080',
  'natural wood': '#D4A574',
  'warm wood': '#D4A574',
  'cool wood': '#6B8E9F',
  'warm': '#D4A574',
  'cool': '#6B8E9F',
  'neutral colors': '#808080',
  'warm colors': '#D4A574',
  'cool colors': '#6B8E9F'
};

/**
 * Converts color names to HEX codes.
 * Returns empty string if no mapping found (FLUX.2 JSON needs hex).
 */
function normalizeColor(color: string): string {
  if (!color) return '';
  
  // Already a hex code
  if (color.startsWith('#')) {
    return color;
  }
  
  const lower = color.toLowerCase().trim();
  
  // Direct mapping
  if (COLOR_TO_HEX[lower]) {
    return COLOR_TO_HEX[lower];
  }
  
  // Try partial matching for common patterns
  if (lower.includes('warm') && lower.includes('neutral')) return '#D4A574';
  if (lower.includes('cool') && lower.includes('gray')) return '#6B8E9F';
  if (lower.includes('earth')) return '#8B7355';
  if (lower.includes('pastel')) return '#FFB6C1';
  if (lower.includes('bold')) return '#FF7F50';
  if (lower.includes('monochrome')) return '#808080';
  if (lower.includes('wood')) return '#D4A574';
  if (lower.includes('warm')) return '#D4A574';
  if (lower.includes('cool')) return '#6B8E9F';
  if (lower.includes('natural')) return '#D4A574';
  if (lower.includes('neutral')) return '#808080';
  
  // No match - return empty (we'll derive from style later)
  return '';
}

/**
 * Extracts and normalizes colors from an array.
 */
function extractValidColors(colors: string[]): string[] {
  const normalized = colors.map(normalizeColor).filter(c => c);
  // Deduplicate
  return Array.from(new Set(normalized));
}

// =========================
// HELPER FUNCTIONS
// =========================

function analyzePRSGap(
  current: PRSMoodGridData,
  target: PRSMoodGridData
): {
  needsCalming: number;
  needsEnergizing: number;
  needsInspiration: number;
  needsGrounding: number;
  moodTransformation?: MoodTransformation;  // NEW: comprehensive transformation data
} {
  // X-axis: -1 (energizing) to +1 (calming)
  // Y-axis: -1 (boring) to +1 (inspiring)
  
  const xGap = target.x - current.x;
  const yGap = target.y - current.y;
  
  // Calculate basic gaps (for backward compatibility)
  const basicGaps = {
    needsCalming: Math.max(0, xGap),        // Positive xGap = needs more calming
    needsEnergizing: Math.max(0, -xGap),    // Negative xGap = needs more energy
    needsInspiration: Math.max(0, yGap),    // Positive yGap = needs more inspiration
    needsGrounding: Math.max(0, -yGap)      // Negative yGap = needs more grounding
  };
  
  // Calculate comprehensive mood transformation
  const moodTransformation = analyzeMoodTransformation(current, target);
  
  return {
    ...basicGaps,
    moodTransformation
  };
}

function integrateStylePreferences(
  aestheticDNA: PromptInputs['aestheticDNA'],
  personality?: PromptInputs['personality'],
  lifestyle?: PromptInputs['lifestyle'],
  sensory?: PromptInputs['sensory'],
  sourceType?: GenerationSource | string
): {
  dominantStyle: string;
  confidence: number;
  materials: string[];
  complexity: number;
} {
  // CRITICAL: Personality source uses ONLY Big Five data, no other sources
  const isPersonality = sourceType === GenerationSource.Personality || sourceType === 'personality';
  if (isPersonality && personality) {
    const personalityStyle = deriveStyleFromPersonality(personality);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:644',message:'Personality source - using ONLY Big Five for style',data:{personalityDomains:{O:personality.openness,C:personality.conscientiousness,E:personality.extraversion,A:personality.agreeableness,N:personality.neuroticism},result:personalityStyle,ignoredAestheticDNA:true,ignoredLifestyle:true,ignoredSensory:true},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'P3'})}).catch(()=>{});
    // #endregion
    return personalityStyle;
  }
  
  // Normalize implicit styles - extract valid styles from tag soup
  const implicitValidStyles = extractAllValidStyles(aestheticDNA.implicit.dominantStyles);
  const hasImplicitStyles = implicitValidStyles.length > 0;
  const hasExplicitStyle = !!aestheticDNA.explicit.selectedStyle && aestheticDNA.explicit.selectedStyle.length > 0;
  const hasExplicitPalette = !!aestheticDNA.explicit.selectedPalette && aestheticDNA.explicit.selectedPalette.length > 0;
  
  // Debug logging
  console.log('[StylePreferences] Input analysis:', {
    sourceType,
    implicitStyles: aestheticDNA.implicit.dominantStyles,
    implicitValidStyles,
    hasImplicitStyles,
    explicitStyle: aestheticDNA.explicit.selectedStyle,
    hasExplicitStyle,
    explicitPalette: aestheticDNA.explicit.selectedPalette,
    hasExplicitPalette,
    hasPersonality: !!personality,
    personalityScores: personality ? {
      O: personality.openness,
      C: personality.conscientiousness,
      E: personality.extraversion,
      A: personality.agreeableness,
      N: personality.neuroticism
    } : null
  });
  
  // SPECIAL HANDLING FOR MIXED SOURCES - force blending even without implicit data
  // Handle both enum and string for backward compatibility
  const isMixed = sourceType === GenerationSource.Mixed || sourceType === GenerationSource.MixedFunctional ||
                  sourceType === 'mixed' || sourceType === 'mixed_functional';
  
  // Define isMixedFunctional once at the top of the Mixed block
  const isMixedFunctional = (sourceType === GenerationSource.MixedFunctional || sourceType === 'mixed_functional');
  
  if (isMixed) {
    let explicitStyle = '';
    if (hasExplicitStyle) {
      explicitStyle = extractValidStyle(aestheticDNA.explicit.selectedStyle!) || '';
    }
    if (!explicitStyle && hasExplicitPalette) {
      explicitStyle = extractValidStyle(aestheticDNA.explicit.selectedPalette) || '';
    }
    if (!explicitStyle) {
      // Fallback: try to use implicit style or personality style if available
      if (hasImplicitStyles) {
        explicitStyle = implicitValidStyles[0];
        console.log('[StylePreferences] Mixed: No explicit style, using implicit style as fallback:', explicitStyle);
      } else if (personality) {
        const personalityStyle = deriveStyleFromPersonality(personality);
        explicitStyle = personalityStyle.dominantStyle.split(' ')[0].toLowerCase();
        console.log('[StylePreferences] Mixed: No explicit style, using personality style as fallback:', explicitStyle);
      } else {
        // Last resort: use default
        explicitStyle = 'modern';
        console.warn('[StylePreferences] Mixed: No style data available, using default "modern"');
      }
    }
    
    // For Mixed sources, ALWAYS blend ALL available sources (implicit, explicit, personality)
    // Using MIXED_SOURCE_WEIGHTS: 40% implicit, 30% explicit, 30% personality
    
    const implicitStyle = hasImplicitStyles ? implicitValidStyles[0] : null;
    const personalityStyle = personality ? deriveStyleFromPersonality(personality) : null;
    const personalityBaseStyle = personalityStyle ? personalityStyle.dominantStyle.split(' ')[0].toLowerCase() : null;
    
    // Collect all available styles
    const availableStyles: Array<{style: string, weight: number, source: string}> = [];
    if (implicitStyle) {
      availableStyles.push({ style: implicitStyle, weight: 0.4, source: 'implicit' });
    }
    if (explicitStyle) {
      availableStyles.push({ style: explicitStyle, weight: 0.3, source: 'explicit' });
    }
    if (personalityBaseStyle) {
      availableStyles.push({ style: personalityBaseStyle, weight: 0.3, source: 'personality' });
    }
    
    // If we have multiple sources, blend them
    if (availableStyles.length >= 2) {
      // Sort by weight (descending) to determine primary and secondary styles
      availableStyles.sort((a, b) => b.weight - a.weight);
      const primary = availableStyles[0];
      const secondary = availableStyles[1];
      const tertiary = availableStyles[2];
      
      // Create blended style name
      let blendedStyle: string;
      if (tertiary && primary.style.toLowerCase() !== secondary.style.toLowerCase() && secondary.style.toLowerCase() !== tertiary.style.toLowerCase()) {
        // All three are different - blend all
        blendedStyle = `${primary.style} with ${secondary.style} and ${tertiary.style} influences`;
      } else if (primary.style.toLowerCase() !== secondary.style.toLowerCase()) {
        // Two different styles
        if (isMixedFunctional) {
          // MixedFunctional: emphasize explicit if available, otherwise primary
          const explicitIndex = availableStyles.findIndex(s => s.source === 'explicit');
          if (explicitIndex >= 0 && explicitIndex !== 0) {
            blendedStyle = `${availableStyles[explicitIndex].style} with ${primary.style} accents`;
        } else {
            blendedStyle = `${primary.style} with ${secondary.style} accents`;
      }
        } else {
          // Mixed: emphasize implicit if available, otherwise primary
          const implicitIndex = availableStyles.findIndex(s => s.source === 'implicit');
          if (implicitIndex >= 0 && implicitIndex !== 0) {
            blendedStyle = `${availableStyles[implicitIndex].style} with ${primary.style} influences`;
          } else {
            blendedStyle = `${primary.style} with ${secondary.style} influences`;
          }
        }
        } else {
        // Same styles - use primary with modifier
        blendedStyle = primary.style;
      }
      
      // Blend materials using weights
      const blendedMaterials: string[] = [];
      if (implicitStyle && aestheticDNA.implicit.materials.length > 0) {
        const count = Math.ceil(3 * 0.4); // 40% of 3 = 1.2 → 2
        blendedMaterials.push(...aestheticDNA.implicit.materials.slice(0, count));
      }
      if (explicitStyle && aestheticDNA.explicit.topMaterials.length > 0) {
        const count = Math.ceil(3 * 0.3); // 30% of 3 = 0.9 → 1
        blendedMaterials.push(...aestheticDNA.explicit.topMaterials.slice(0, count));
      }
      if (personalityStyle && personalityStyle.materials.length > 0) {
        const count = Math.ceil(3 * 0.3); // 30% of 3 = 0.9 → 1
        blendedMaterials.push(...personalityStyle.materials.slice(0, count));
      }
      // Deduplicate and ensure we have at least 3
      const finalMaterials = Array.from(new Set(blendedMaterials)).slice(0, 3);
      
      // Blend complexity using weighted average
      let totalComplexityWeight = 0;
      let weightedComplexitySum = 0;
      if (implicitStyle) {
        weightedComplexitySum += aestheticDNA.implicit.complexity * 0.4;
        totalComplexityWeight += 0.4;
      }
      if (explicitStyle) {
        weightedComplexitySum += aestheticDNA.explicit.complexityPreference * 0.3;
        totalComplexityWeight += 0.3;
      }
      if (personalityStyle) {
        weightedComplexitySum += personalityStyle.complexity * 0.3;
        totalComplexityWeight += 0.3;
        }
      const blendedComplexity = totalComplexityWeight > 0 ? weightedComplexitySum / totalComplexityWeight : aestheticDNA.explicit.complexityPreference;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:Mixed-style',message:'Mixed source - blending ALL style sources',data:{implicitStyle:implicitStyle,explicitStyle:explicitStyle,personalityStyle:personalityBaseStyle,weights:{implicit:0.4,explicit:0.3,personality:0.3},blendedStyle:blendedStyle,materials:finalMaterials,complexity:blendedComplexity},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E13'})}).catch(()=>{});
      // #endregion
      
      console.log('[StylePreferences] Mixed: blending ALL sources:', availableStyles.map(s => `${s.style} (${s.source}, ${s.weight})`).join(' + '), '→', blendedStyle);
      
        return {
          dominantStyle: blendedStyle,
        confidence: 0.75,
        materials: finalMaterials.length > 0 ? finalMaterials : aestheticDNA.explicit.topMaterials.slice(0, 3),
        complexity: blendedComplexity
        };
    }
    
    // If no blending possible (no implicit, no personality, or same styles)
    // FORCE DIVERSITY: Use different styles for Mixed vs MixedFunctional vs Explicit
    // This ensures each source produces visually distinct results
    const styleAlternatives: Record<string, string[]> = {
      'minimalist': ['scandinavian', 'japandi', 'contemporary'],
      'scandinavian': ['minimalist', 'japandi', 'hygge'],
      'modern': ['contemporary', 'transitional', 'scandinavian'],
      'contemporary': ['modern', 'transitional', 'scandinavian'],
      'bohemian': ['eclectic', 'maximalist', 'rustic'],
      'rustic': ['farmhouse', 'bohemian', 'traditional'],
      'industrial': ['modern', 'contemporary', 'minimalist'],
      'traditional': ['transitional', 'rustic', 'contemporary']
    };
    
    const alternatives = styleAlternatives[explicitStyle.toLowerCase()] || ['scandinavian', 'contemporary', 'modern'];
    
    // Mixed uses first alternative, MixedFunctional uses second (or first if only one)
    const alternativeIndex = isMixedFunctional ? 1 : 0;
    const alternativeStyle = alternatives[alternativeIndex] || alternatives[0] || 'scandinavian';
    
    // Only use alternative if it's different from explicit
    if (alternativeStyle.toLowerCase() !== explicitStyle.toLowerCase()) {
      console.log('[StylePreferences] Mixed: forcing diversity - using alternative style:', alternativeStyle, 'instead of', explicitStyle);
      return {
        dominantStyle: alternativeStyle,
        confidence: 0.65,
        materials: aestheticDNA.explicit.topMaterials.slice(0, 3),
        complexity: aestheticDNA.explicit.complexityPreference * 1.1 // Slightly more complex
      };
    }
    
    // Fallback: add modifier if alternative is same as explicit
    const modifier = isMixedFunctional ? 'optimized' : 'elevated';
    console.log('[StylePreferences] Mixed: using explicit with', modifier, 'modifier:', explicitStyle);
    return {
      dominantStyle: `${modifier} ${explicitStyle}`,
      confidence: 0.65,
      materials: aestheticDNA.explicit.topMaterials.slice(0, 3),
      complexity: aestheticDNA.explicit.complexityPreference * 1.1 // Slightly more complex
    };
  }
  
  // PRIORITY 1: If we have personality data and NO aesthetic data, derive from personality
  // This is for the Personality source where all aesthetic data is zeroed
  if (!hasImplicitStyles && !hasExplicitStyle && !hasExplicitPalette && personality) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:815',message:'Personality source - deriving style from personality',data:{personalityScores:{O:personality.openness,C:personality.conscientiousness,E:personality.extraversion,A:personality.agreeableness,N:personality.neuroticism},hasFacets:!!personality.facets,facetCount:personality.facets?Object.values(personality.facets).reduce((sum:number,domain:any)=>sum+Object.keys(domain||{}).length,0):0,sourceType},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const personalityStyle = deriveStyleFromPersonality(personality);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:819',message:'Personality source - derived style result',data:{dominantStyle:personalityStyle.dominantStyle,confidence:personalityStyle.confidence,materials:personalityStyle.materials,complexity:personalityStyle.complexity,researchBasis:personalityStyle.researchBasis},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Logging is already done in deriveStyleFromPersonality with research basis
    return personalityStyle;
  }
  
    // PRIORITY 2: If we have ONLY implicit data (Implicit source)
  if (hasImplicitStyles && !hasExplicitStyle && !hasExplicitPalette) {
    const selectedStyle = implicitValidStyles[0];
    console.log('[StylePreferences] Using implicit style:', selectedStyle, '(from', aestheticDNA.implicit.dominantStyles, ')');
    return {
      dominantStyle: selectedStyle,
      confidence: 0.8,
      materials: aestheticDNA.implicit.materials.slice(0, 3),
      complexity: aestheticDNA.implicit.complexity
    };
  }
  
  // PRIORITY 3: If we have ONLY explicit data (Explicit source)
  if (!hasImplicitStyles && (hasExplicitStyle || hasExplicitPalette)) {
    let explicitStyle = '';
    if (hasExplicitStyle) {
      explicitStyle = extractValidStyle(aestheticDNA.explicit.selectedStyle!) || '';
    }
    // If no valid style from selectedStyle, try to derive from lifestyle/sensory
    if (!explicitStyle && (lifestyle || sensory)) {
      explicitStyle = deriveStyleFromExplicit(lifestyle, sensory) || '';
    }
    // If still no style, try palette name
    if (!explicitStyle && hasExplicitPalette) {
      explicitStyle = extractValidStyle(aestheticDNA.explicit.selectedPalette) || '';
    }
    // Fallbacks to avoid hard failure: use implicit/personality if available, else safe default
    if (!explicitStyle) {
      if (hasImplicitStyles) {
        explicitStyle = implicitValidStyles[0];
        console.warn('[StylePreferences] Explicit source missing style, falling back to implicit style:', explicitStyle);
      } else if (personality) {
        const personalityStyle = deriveStyleFromPersonality(personality);
        explicitStyle = personalityStyle.dominantStyle.split(' ')[0].toLowerCase();
        console.warn('[StylePreferences] Explicit source missing style, falling back to personality style:', explicitStyle);
      } else {
        explicitStyle = 'contemporary';
        console.warn('[StylePreferences] Explicit source missing style, using safe fallback \"contemporary\"');
      }
    }
    
    console.log('[StylePreferences] Using explicit style:', explicitStyle, '(sourceType:', sourceType, ')');
    return {
      dominantStyle: explicitStyle,
      confidence: 0.7,
      materials: aestheticDNA.explicit.topMaterials.slice(0, 3),
      complexity: aestheticDNA.explicit.complexityPreference
    };
  }
  
  // PRIORITY 4: MIXED MODE - both implicit and explicit data exist
  if (hasImplicitStyles && (hasExplicitStyle || hasExplicitPalette)) {
    const implicitStyle = implicitValidStyles[0];
    let explicitStyle = '';
    if (hasExplicitStyle) {
      explicitStyle = extractValidStyle(aestheticDNA.explicit.selectedStyle!) || '';
    }
    if (!explicitStyle && hasExplicitPalette) {
      explicitStyle = extractValidStyle(aestheticDNA.explicit.selectedPalette) || '';
    }
    
    // If they differ, create a blended style
    if (explicitStyle && implicitStyle.toLowerCase() !== explicitStyle.toLowerCase()) {
      console.log('[StylePreferences] Using blended style:', explicitStyle, '+', implicitStyle);
      return {
        dominantStyle: `${explicitStyle} with ${implicitStyle} accents`,
        confidence: 0.75,
        materials: [
          ...aestheticDNA.implicit.materials.slice(0, 2),
          ...aestheticDNA.explicit.topMaterials.slice(0, 1)
        ],
        complexity: (aestheticDNA.implicit.complexity + aestheticDNA.explicit.complexityPreference) / 2
      };
    }
    
    // If same or no explicit, use implicit
    console.log('[StylePreferences] Mixed mode, using implicit:', implicitStyle);
    return {
      dominantStyle: implicitStyle,
      confidence: 0.8,
      materials: [
        ...aestheticDNA.implicit.materials.slice(0, 2),
        ...aestheticDNA.explicit.topMaterials.slice(0, 1)
      ],
      complexity: (aestheticDNA.implicit.complexity + aestheticDNA.explicit.complexityPreference) / 2
    };
  }
  
  // PRIORITY 4b: MIXED MODE without implicit - blend explicit with personality
  // This happens when user has explicit preferences but no Tinder swipes
  if (!hasImplicitStyles && (hasExplicitStyle || hasExplicitPalette) && personality) {
    let explicitStyle = '';
    if (hasExplicitStyle) {
      explicitStyle = extractValidStyle(aestheticDNA.explicit.selectedStyle!) || '';
    }
    if (!explicitStyle && hasExplicitPalette) {
      explicitStyle = extractValidStyle(aestheticDNA.explicit.selectedPalette) || '';
    }
    
    // Get personality-derived style
    const personalityStyle = deriveStyleFromPersonality(personality);
    
    // If explicit and personality styles differ, create a blend
    if (explicitStyle && personalityStyle.dominantStyle.toLowerCase() !== explicitStyle.toLowerCase()) {
      console.log('[StylePreferences] Blending explicit + personality:', explicitStyle, '+', personalityStyle.dominantStyle);
      return {
        dominantStyle: `${explicitStyle} with ${personalityStyle.dominantStyle.split(' ')[0]} influences`,
        confidence: 0.7,
        materials: [
          ...aestheticDNA.explicit.topMaterials.slice(0, 2),
          ...personalityStyle.materials.slice(0, 1)
        ],
        complexity: (aestheticDNA.explicit.complexityPreference + personalityStyle.complexity) / 2
      };
    }
    
    // If same, just use explicit
    if (!explicitStyle) {
      throw new Error(`Mixed mode requires explicit style data, but none found. This indicates a quality gate failure.`);
    }
    console.log('[StylePreferences] Mixed mode (no implicit), using explicit:', explicitStyle);
    return {
      dominantStyle: explicitStyle,
      confidence: 0.7,
      materials: aestheticDNA.explicit.topMaterials.slice(0, 3),
      complexity: aestheticDNA.explicit.complexityPreference
    };
  }
  
  // FALLBACK: No data at all - this shouldn't happen but handle it
  console.log('[StylePreferences] No style data, using fallback');
  
  // Try to derive from lifestyle/sensory if available
  if (lifestyle || sensory) {
    const derivedStyle = deriveStyleFromExplicit(lifestyle, sensory);
    if (derivedStyle) {
      return {
        dominantStyle: derivedStyle,
        confidence: 0.5,
        materials: [],
        complexity: 0.5
      };
    }
  }
  
  // Ultimate fallback
  return {
    dominantStyle: 'modern',
    confidence: 0.3,
    materials: [],
    complexity: 0.5
  };
}

/**
 * Derives style from explicit lifestyle and sensory preferences.
 * Used when selectedStyle is not available but we have lifestyle/sensory data.
 */
function deriveStyleFromExplicit(
  lifestyle?: PromptInputs['lifestyle'],
  sensory?: PromptInputs['sensory']
): string | null {
  if (!lifestyle && !sensory) return null;
  
  // Lifestyle vibe mapping
  if (lifestyle?.vibe) {
    const vibe = lifestyle.vibe.toLowerCase();
    if (vibe.includes('calm') || vibe.includes('peaceful')) return 'minimalist';
    if (vibe.includes('creative') || vibe.includes('artistic')) return 'eclectic';
    if (vibe.includes('busy') || vibe.includes('active')) return 'contemporary';
    if (vibe.includes('structured') || vibe.includes('organized')) return 'scandinavian';
  }
  
  // Sensory texture mapping
  if (sensory?.texture) {
    const texture = sensory.texture.toLowerCase();
    if (texture.includes('cold_metal') || texture.includes('industrial')) return 'industrial';
    if (texture.includes('smooth_wood') || texture.includes('natural')) return 'japandi';
    if (texture.includes('rough') || texture.includes('rustic')) return 'rustic';
  }
  
  // Sensory light mapping
  if (sensory?.light) {
    const light = sensory.light.toLowerCase();
    if (light.includes('warm_low') || light.includes('hygge')) return 'scandinavian';
    if (light.includes('cool_bright')) return 'modern';
  }
  
  // Nature metaphor mapping
  if (sensory?.natureMetaphor) {
    const nature = sensory.natureMetaphor.toLowerCase();
    if (nature === 'ocean' || nature === 'coastal') return 'coastal';
    if (nature === 'forest' || nature === 'woodland') return 'rustic';
    if (nature === 'mountain') return 'modern';
  }
  
  return null;
}

/**
 * Derives style preferences purely from Big Five personality traits.
 * Uses research-backed mappings with facet-level precision when available.
 * Used when no aesthetic data is available (Personality source).
 */
function deriveStyleFromPersonality(personality: NonNullable<PromptInputs['personality']>): {
  dominantStyle: string;
  confidence: number;
  materials: string[];
  complexity: number;
  researchBasis?: string; // Added for transparency
} {
  // Convert to PersonalityData format
  const personalityData: PersonalityData = {
    openness: personality.openness,
    conscientiousness: personality.conscientiousness,
    extraversion: personality.extraversion,
    agreeableness: personality.agreeableness,
    neuroticism: personality.neuroticism,
    facets: personality.facets
  };
  
  // Use facet-driven derivation
  const derivation = deriveStyleFromFacets(personalityData);
  
  // Calculate confidence using new method
  const calculatedConfidence = calculateConfidence(personalityData);
  
  // Get research source citation for logging
  const researchSource = RESEARCH_SOURCES[derivation.researchBasis];
  const researchBasis = researchSource 
    ? `${researchSource.citation.substring(0, 50)}... (${derivation.researchBasis})`
    : derivation.researchBasis;
  
  console.log('[StylePreferences] Personality-derived style:', {
    style: derivation.dominantStyle,
    confidence: calculatedConfidence,
    matchScore: derivation.score,
    matchedMapping: derivation.matchedMapping,
    researchBasis: researchBasis,
    hasFacets: !!personality.facets,
    domainScores: {
      O: personality.openness,
      C: personality.conscientiousness,
      E: personality.extraversion,
      A: personality.agreeableness,
      N: personality.neuroticism
    }
  });
  
  const result = {
    dominantStyle: derivation.dominantStyle,
    confidence: calculatedConfidence,
    materials: derivation.materials,
    complexity: derivation.complexity,
    researchBasis: researchBasis
  };
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:1076',message:'Deriving style, materials, complexity from personality',data:{personalityDomains:{O:personality.openness,C:personality.conscientiousness,E:personality.extraversion,A:personality.agreeableness,N:personality.neuroticism},result},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'C3'})}).catch(()=>{});
  // #endregion
  
  return result;
}

/**
 * Derives colors purely from Big Five personality traits.
 * Used when no aesthetic data is available.
 */
function deriveColorsFromPersonality(personality: NonNullable<PromptInputs['personality']>): {
  palette: string[];
  temperature: number;
} {
  const evalCondition = (value: number, condition: string): boolean => {
    if (!condition) return true;
    if (condition.includes('-')) {
      const [min, max] = condition.split('-').map(parseFloat);
      return value >= min && value <= max;
    }
    if (condition.startsWith('>=')) return value >= parseFloat(condition.substring(2));
    if (condition.startsWith('<=')) return value <= parseFloat(condition.substring(2));
    if (condition.startsWith('>')) return value > parseFloat(condition.substring(1));
    if (condition.startsWith('<')) return value < parseFloat(condition.substring(1));
    const exact = parseFloat(condition);
    if (!Number.isNaN(exact)) return Math.abs(value - exact) < 0.05;
    return false;
  };

  const getFacetValue = (facetKey: string): number | null => {
    if (!personality.facets) return null;
    const domain = facetKey[0] as keyof NonNullable<typeof personality.facets>;
    const numPart = facetKey.substring(1).split('_')[0];
    const idx = parseInt(numPart, 10);
    const domainFacets = personality.facets[domain];
    if (!domainFacets) return null;
    const raw = domainFacets[idx];
    return typeof raw === 'number' ? raw / 100 : null;
  };

  const getTraitValue = (trait: string, facet?: string): number | null => {
    if (facet) {
      return getFacetValue(facet);
    }
    const map: Record<string, number | undefined> = {
      openness: personality.openness,
      conscientiousness: personality.conscientiousness,
      extraversion: personality.extraversion,
      agreeableness: personality.agreeableness,
      neuroticism: personality.neuroticism
    };
    const val = map[trait];
    return typeof val === 'number' ? val / 100 : null;
  };

  const collectedColors: string[] = [];
  const temps: number[] = [];
  const tempMap: Record<'warm' | 'cool' | 'neutral', number> = {
    warm: 0.7,
    cool: 0.3,
    neutral: 0.5
  };

  for (const mapping of BIGFIVE_COLOR_MAPPINGS) {
    const value = getTraitValue(mapping.trait, mapping.facet);
    if (value === null) continue;
    if (!evalCondition(value, mapping.condition)) continue;
    collectedColors.push(...mapping.colors);
    temps.push(tempMap[mapping.temperature]);
  }

  // Deduplicate colors preserving order
  const seen = new Set<string>();
  const palette = collectedColors.filter(c => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  }).slice(0, 6);

  const temperature = temps.length > 0
    ? temps.reduce((a, b) => a + b, 0) / temps.length
    : 0.5;

  const result = {
    palette: palette.length > 0 ? palette : ['#808080', '#FFFFFF', '#D3D3D3'],
    temperature
  };
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:1162',message:'Deriving colors from personality',data:{personalityDomains:{O:personality.openness,C:personality.conscientiousness,E:personality.extraversion,A:personality.agreeableness,N:personality.neuroticism},collectedColorsCount:collectedColors.length,palette:result.palette,temperature:result.temperature,matchedMappingsCount:BIGFIVE_COLOR_MAPPINGS.filter(m=>{const v=getTraitValue(m.trait,m.facet);return v!==null&&evalCondition(v,m.condition);}).length},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'C1'})}).catch(()=>{});
  // #endregion
  
  return result;
}

/**
 * Derives color palette from interior design style.
 * Used when no color data is available but we have a style.
 */
function deriveColorsFromStyle(style: string): {
  palette: string[];
  temperature: number;
} {
  const styleColors: Record<string, { palette: string[]; temperature: number }> = {
    'modern': {
      palette: ['#FFFFFF', '#2C3E50', '#95A5A6', '#BDC3C7'],
      temperature: 0.4
    },
    'scandinavian': {
      palette: ['#FFFFFF', '#F5F5DC', '#D4A574', '#87CEEB'],
      temperature: 0.5
    },
    'bohemian': {
      palette: ['#8B4513', '#DAA520', '#CD853F', '#D2691E', '#FF6347'],
      temperature: 0.7
    },
    'industrial': {
      palette: ['#36454F', '#708090', '#A9A9A9', '#D2691E'],
      temperature: 0.3
    },
    'minimalist': {
      palette: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#000000'],
      temperature: 0.4
    },
    'rustic': {
      palette: ['#8B4513', '#D2691E', '#DEB887', '#F5DEB3'],
      temperature: 0.7
    },
    'contemporary': {
      palette: ['#FFFFFF', '#808080', '#000000', '#C0C0C0'],
      temperature: 0.5
    },
    'traditional': {
      palette: ['#800020', '#DAA520', '#F5F5DC', '#8B4513'],
      temperature: 0.6
    },
    'mid-century': {
      palette: ['#FF6347', '#FFD700', '#008080', '#F5F5DC'],
      temperature: 0.6
    },
    'japandi': {
      palette: ['#F5F5DC', '#D4A574', '#808080', '#2F4F4F'],
      temperature: 0.5
    },
    'coastal': {
      palette: ['#FFFFFF', '#87CEEB', '#F5DEB3', '#20B2AA'],
      temperature: 0.5
    },
    'farmhouse': {
      palette: ['#FFFFFF', '#F5F5DC', '#8B4513', '#708090'],
      temperature: 0.6
    },
    'eclectic': {
      palette: ['#FF6347', '#9370DB', '#20B2AA', '#FFD700'],
      temperature: 0.6
    },
    'hygge': {
      palette: ['#F5F5DC', '#D2B48C', '#8B7355', '#A0522D'],
      temperature: 0.7
    }
  };
  
  const lowerStyle = style.toLowerCase();
  
  // Try exact match first
  if (styleColors[lowerStyle]) {
    return styleColors[lowerStyle];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(styleColors)) {
    if (lowerStyle.includes(key)) {
      return value;
    }
  }
  
  // Default neutral palette
  return {
    palette: ['#FFFFFF', '#F5F5DC', '#808080', '#2C3E50'],
    temperature: 0.5
  };
}

function integrateColorPreferences(
  aestheticDNA: PromptInputs['aestheticDNA'],
  roomVisualDNA: PromptInputs['roomVisualDNA'],
  sensory: PromptInputs['sensory'],
  personality?: PromptInputs['personality'],
  dominantStyle?: string,
  sourceType?: GenerationSource | string
): {
  palette: string[];
  temperature: number;
} {
  // CRITICAL: Personality source uses ONLY Big Five data, no other sources
  const isPersonality = sourceType === GenerationSource.Personality || sourceType === 'personality';
  if (isPersonality && personality) {
    const personalityColors = deriveColorsFromPersonality(personality);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:1284',message:'Personality source - using ONLY Big Five for colors',data:{personalityDomains:{O:personality.openness,C:personality.conscientiousness,E:personality.extraversion,A:personality.agreeableness,N:personality.neuroticism},result:personalityColors,ignoredAestheticDNA:true,ignoredRoomVisualDNA:true,ignoredSensory:true,ignoredDominantStyle:true},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'P4'})}).catch(()=>{});
    // #endregion
    return personalityColors;
  }
  
  // Check if this is a Mixed source
  const isMixed = sourceType === GenerationSource.Mixed || sourceType === GenerationSource.MixedFunctional ||
                  sourceType === 'mixed' || sourceType === 'mixed_functional';
  const isMixedFunctional = (sourceType === GenerationSource.MixedFunctional || sourceType === 'mixed_functional');
  
  // Color temperature: Weighted average
  // For Mixed sources: use MIXED_SOURCE_WEIGHTS (40% implicit, 30% explicit, 30% personality)
  // For other sources: use original weights (40% implicit, 40% explicit, 20% sensory)
  const implicitWarmth = aestheticDNA.implicit.warmth;
  const explicitWarmth = aestheticDNA.explicit.warmthPreference;
  // Handle empty sensory.light - default to neutral (0.5) if empty
  const lightInfluence = sensory.light && sensory.light.length > 0
    ? (sensory.light.includes('warm') ? 0.7 : sensory.light.includes('cool') ? 0.3 : 0.5)
    : 0.5;
  
  // Get personality warmth if available (derive from personality colors)
  const personalityWarmth = (isMixed && personality) ? deriveColorsFromPersonality(personality).temperature : undefined;
  
  let temperature: number;
  if (isMixed && personalityWarmth !== undefined) {
    // Mixed sources: blend all three (40% implicit, 30% explicit, 30% personality)
    let totalWeight = 0;
    let weightedSum = 0;
    if (implicitWarmth !== undefined) {
      weightedSum += implicitWarmth * 0.4;
      totalWeight += 0.4;
    }
    if (explicitWarmth !== undefined) {
      weightedSum += explicitWarmth * 0.3;
      totalWeight += 0.3;
    }
    weightedSum += personalityWarmth * 0.3;
    totalWeight += 0.3;
    temperature = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  } else {
    // Other sources: original weights (40% implicit, 40% explicit, 20% sensory)
    temperature = (
    implicitWarmth * 0.4 +
    explicitWarmth * 0.4 +
    lightInfluence * 0.2
  );
  }
  
  // Collect all raw colors from available sources
  const rawColors: string[] = [
    ...roomVisualDNA.colors,
    ...aestheticDNA.implicit.colors
  ];
  
  // Convert all colors to hex (FLUX.2 JSON needs hex codes)
  const hexColors: string[] = [];
  for (const color of rawColors) {
    if (!color) continue;
    
    // Already hex
    if (color.startsWith('#')) {
      hexColors.push(color);
      continue;
    }
    
    // Try to convert to hex
    const lower = color.toLowerCase().trim();
    if (COLOR_TO_HEX[lower]) {
      hexColors.push(COLOR_TO_HEX[lower]);
    } else {
      // Try partial matching
      const normalized = normalizeColor(color);
      if (normalized && normalized.startsWith('#')) {
        hexColors.push(normalized);
      }
      // Skip non-hex colors - we'll derive from style
    }
  }
  
  // Deduplicate
  const uniqueHexColors = Array.from(new Set(hexColors));
  
  // For Mixed sources: ALWAYS blend colors from ALL available sources (implicit, explicit, personality)
  // Using MIXED_SOURCE_WEIGHTS: 40% implicit, 30% explicit, 30% personality
  if (isMixed && dominantStyle) {
    // Collect colors from all available sources
    const implicitColors = aestheticDNA.implicit.colors.length > 0 
      ? aestheticDNA.implicit.colors.map(c => normalizeColor(c)).filter(c => c && c.startsWith('#'))
      : [];
    const explicitColors = roomVisualDNA.colors.length > 0
      ? roomVisualDNA.colors.map(c => normalizeColor(c)).filter(c => c && c.startsWith('#'))
      : [];
    const personalityColors = personality ? deriveColorsFromPersonality(personality).palette : [];
      
    // If we have colors from multiple sources, blend them using weights
    if ((implicitColors.length > 0 || explicitColors.length > 0 || personalityColors.length > 0)) {
      const blendedPalette: string[] = [];
      
      // Add colors based on weights (40% implicit, 30% explicit, 30% personality)
      if (implicitColors.length > 0) {
        const count = Math.ceil(4 * 0.4); // 40% of 4 = 1.6 → 2
        blendedPalette.push(...implicitColors.slice(0, count));
      }
      if (explicitColors.length > 0) {
        const count = Math.ceil(4 * 0.3); // 30% of 4 = 1.2 → 2
        blendedPalette.push(...explicitColors.slice(0, count));
      }
      if (personalityColors.length > 0) {
        const count = Math.ceil(4 * 0.3); // 30% of 4 = 1.2 → 2
        blendedPalette.push(...personalityColors.slice(0, count));
      }
      
      // Deduplicate and ensure we have 4 colors
      const finalPalette = Array.from(new Set(blendedPalette)).slice(0, 4);
      
      // If we don't have enough, derive from style
      if (finalPalette.length < 4) {
        const styleParts = dominantStyle.toLowerCase().split(/\s+(?:with|and|\+)\s+/);
        const primaryStyle = styleParts[0] || dominantStyle.toLowerCase();
        const styleColors = deriveColorsFromStyle(primaryStyle);
        finalPalette.push(...styleColors.palette.filter(c => !finalPalette.includes(c)).slice(0, 4 - finalPalette.length));
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:Mixed-colors',message:'Mixed source - blending ALL color sources',data:{implicitColors:implicitColors.length,explicitColors:explicitColors.length,personalityColors:personalityColors.length,weights:{implicit:0.4,explicit:0.3,personality:0.3},blendedPalette:finalPalette,temperature},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E14'})}).catch(()=>{});
      // #endregion
      
      return {
        palette: finalPalette.length > 0 ? finalPalette : ['#FFFFFF', '#F5F5DC', '#808080', '#2C3E50'],
        temperature
      };
    }
    
    // Fallback: derive from style
    const styleParts = dominantStyle.toLowerCase().split(/\s+(?:with|and|\+)\s+/);
    const primaryStyle = styleParts[0] || dominantStyle.toLowerCase();
    const styleColors = deriveColorsFromStyle(primaryStyle);
    return { palette: styleColors.palette, temperature };
  }
  
  // If we have valid hex colors and NOT Mixed source, use them
  if (uniqueHexColors.length >= 2 && !isMixed) {
    return {
      palette: uniqueHexColors.slice(0, 4),
      temperature
    };
  }
  
  // No valid colors - derive from style (most specific)
  if (dominantStyle) {
    const styleColors = deriveColorsFromStyle(dominantStyle);
    return { palette: styleColors.palette, temperature };
  }
  
  // No style - derive from personality
  if (personality) {
    return deriveColorsFromPersonality(personality);
  }
  
  // Final fallback: temperature-based colors
  if (temperature > 0.6) {
    return { palette: ['#D4A574', '#F5F5DC', '#8B7355', '#CD853F'], temperature };
  } else if (temperature < 0.4) {
    return { palette: ['#6B8E9F', '#A9A9A9', '#87CEEB', '#4682B4'], temperature };
  } else {
    return { palette: ['#FFFFFF', '#F5F5DC', '#808080', '#2C3E50'], temperature };
  }
}

/**
 * Derives biophilia score (0-3) from Big Five personality traits
 * Based on research linking personality to nature preferences
 */
function deriveBiophiliaFromPersonality(personality?: PromptInputs['personality']): number {
  if (!personality) return 0;
  
  // Normalize domain scores to 0-1
  const normalizedScores = {
    O: personality.openness / 100,
    C: personality.conscientiousness / 100,
    E: personality.extraversion / 100,
    A: personality.agreeableness / 100,
    N: personality.neuroticism / 100
  };
  
  // Normalize facet scores if available
  const normalizedFacets: Record<string, number> = {};
  if (personality.facets) {
    for (const [domain, facets] of Object.entries(personality.facets)) {
      for (const [facetName, value] of Object.entries(facets)) {
        normalizedFacets[`${domain}_${facetName}`] = value / 100;
      }
    }
  }
  
  // Base biophilia score starts at 0
  let biophiliaScore = 0;
  const matchedMappings: string[] = [];
  
  // Check each mapping condition
  for (const mapping of BIGFIVE_BIOPHILIA_MAPPINGS) {
    let matches = true;
    let value: number | undefined;
    
    // Check domain condition
    const domainKey = mapping.trait.charAt(0).toUpperCase() as keyof typeof normalizedScores;
    if (mapping.trait === 'openness') {
      value = normalizedScores.O;
    } else if (mapping.trait === 'conscientiousness') {
      value = normalizedScores.C;
    } else if (mapping.trait === 'extraversion') {
      value = normalizedScores.E;
    } else if (mapping.trait === 'agreeableness') {
      value = normalizedScores.A;
    } else if (mapping.trait === 'neuroticism') {
      value = normalizedScores.N;
    }
    
    if (value === undefined) continue;
    
    // Check condition (e.g., ">0.6", "<0.4", "0.4-0.6")
    const condition = mapping.condition;
    if (condition.startsWith('>')) {
      const threshold = parseFloat(condition.substring(1));
      matches = value > threshold;
    } else if (condition.startsWith('<')) {
      const threshold = parseFloat(condition.substring(1));
      matches = value < threshold;
    } else if (condition.includes('-')) {
      const [min, max] = condition.split('-').map(parseFloat);
      matches = value >= min && value <= max;
    }
    
    // If facet is specified, check facet condition
    if (matches && mapping.facet) {
      const facetValue = normalizedFacets[mapping.facet];
      if (facetValue === undefined) {
        matches = false;
      } else {
        // Re-check condition with facet value
        if (condition.startsWith('>')) {
          const threshold = parseFloat(condition.substring(1));
          matches = facetValue > threshold;
        } else if (condition.startsWith('<')) {
          const threshold = parseFloat(condition.substring(1));
          matches = facetValue < threshold;
        } else if (condition.includes('-')) {
          const [min, max] = condition.split('-').map(parseFloat);
          matches = facetValue >= min && value <= max;
        }
        value = facetValue;
      }
    }
    
    if (matches) {
      biophiliaScore += mapping.biophiliaBoost;
      matchedMappings.push(`${mapping.trait}${mapping.facet ? `:${mapping.facet}` : ''} (${condition}, value: ${value?.toFixed(2)})`);
    }
  }
  
  // Clamp to 0-3 scale
  biophiliaScore = Math.max(0, Math.min(3, biophiliaScore));
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:deriveBiophiliaFromPersonality','message':'Deriving biophilia from personality','data':{'personalityDomains':{'O':personality.openness,'C':personality.conscientiousness,'E':personality.extraversion,'A':personality.agreeableness,'N':personality.neuroticism},'matchedMappingsCount':matchedMappings.length,'matchedMappings':matchedMappings,'biophiliaScore':biophiliaScore},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'B1'})}).catch(()=>{});
  // #endregion
  
  return biophiliaScore;
}

function calculateBiophiliaIntegration(
  biophiliaScore: number,
  natureMetaphor: string,
  roomType: string
): {
  density: number;
  elements: string[];
} {
  // Map 0-3 UI scale to internal 0-6 (allow halves) then to density 0-1
  const clampedScore = Math.max(0, Math.min(3, biophiliaScore));
  const granularLevel = clampedScore * 2; // 0..6
  const density = granularLevel / 6;
  
  // If biophiliaScore is 0, user explicitly wants NO plants
  if (biophiliaScore === 0) {
    return { density: 0, elements: [] };
  }
  
  // Elements based on score + nature metaphor
  const elements: string[] = [];
  
  if (density > 0.05) elements.push('natural materials');
  if (density >= 0.17) elements.push('one small plant');
  if (density >= 0.34) elements.push('two small plants');
  if (density >= 0.5) elements.push('3-4 mixed plants');
  if (density >= 0.67) elements.push('floor plant', 'hanging planter');
  if (density >= 0.83) elements.push('vertical greenery', 'lush foliage');
  
  // Nature metaphor influences specific elements (only if biophilia > 0 and natureMetaphor is provided)
  if (natureMetaphor && natureMetaphor.length > 0) {
    if (natureMetaphor === 'ocean') {
      elements.push('flowing forms', 'water-inspired colors');
    } else if (natureMetaphor === 'forest') {
      elements.push('layered textures', 'wood elements');
    } else if (natureMetaphor === 'mountain') {
      elements.push('stone materials', 'strong vertical lines');
    }
  }
  
  return { density, elements };
}

function analyzeFunctionalRequirements(
  activities: PromptInputs['activities'],
  painPoints: string[],
  socialContext: 'solo' | 'shared',
  activityContext?: ActivityContext
): {
  primary: string;
  secondary: string[];
  priorities: string[];
} {
  // Sort activities by frequency/importance
  const sortedActivities = [...activities].sort((a, b) => {
    const freqOrder: Record<string, number> = { daily: 4, few_times_week: 3, weekly: 2, occasionally: 1, rarely: 0 };
    return (freqOrder[b.frequency] || 0) - (freqOrder[a.frequency] || 0);
  });
  
  const primary = sortedActivities[0]?.type || 'relax';
  const secondary = sortedActivities.slice(1, 3).map(a => a.type);
  
  // Priorities from pain points
  const prioritySet = new Set<string>();
  if (painPoints.includes('storage')) prioritySet.add('ample storage');
  if (painPoints.includes('layout')) prioritySet.add('optimized layout');
  if (painPoints.includes('light')) prioritySet.add('improved lighting');
  if (painPoints.includes('clutter')) prioritySet.add('organization systems');
  if (socialContext === 'shared') prioritySet.add('zoning for multiple users');

  activities.forEach((activity) => {
    if (activity.satisfaction === 'difficult') {
      prioritySet.add(`improve_${activity.type}_support`);
    }
    if (activity.timeOfDay === 'evening' || activity.timeOfDay === 'night') {
      prioritySet.add('layered lighting');
    }
    if (activity.withWhom && activity.withWhom !== 'alone') {
      prioritySet.add('flexible seating');
    }
  });

  activityContext?.requiredFurniture?.forEach((item) => prioritySet.add(item));
  activityContext?.behaviorZones?.forEach((zone) => prioritySet.add(zone));
  activityContext?.storageNeeds?.forEach((need) => prioritySet.add(need));
  activityContext?.lightingNotes?.forEach((note) => prioritySet.add(note));

  return { primary, secondary, priorities: Array.from(prioritySet) };
}

function determineLightingStrategy(
  lightPreference: string,
  prsCurrent: PRSMoodGridData,
  prsTarget: PRSMoodGridData,
  activities: PromptInputs['activities']
): {
  mood: string;
  naturalImportance: number;
} {
  // Handle empty lightPreference - default to balanced lighting
  let mood: string;
  if (lightPreference && lightPreference.length > 0) {
    mood = lightPreference;
  } else {
    // Default to balanced lighting when no preference
    mood = 'neutral';
  }
  
  // Natural light importance from PRS target (inspiring spaces need more light)
  // When PRS is neutral (0,0), naturalImportance = 0.5 (moderate)
  const naturalImportance = (prsTarget.y + 1) / 2; // Convert -1:1 to 0:1
  
  // Activities that need good lighting
  const lightIntensiveActivities = ['work', 'read', 'creative', 'cook'];
  const needsGoodLight = activities && activities.length > 0 && activities.some(a =>
    lightIntensiveActivities.includes(a.type) && a.frequency !== 'rarely'
  );
  
  if (needsGoodLight) {
    return { mood: 'warm_bright', naturalImportance: Math.max(naturalImportance, 0.7) };
  }
  
  return { mood, naturalImportance };
}

function analyzeSocialContext(
  socialContext: 'solo' | 'shared',
  sharedWith: string[] | undefined,
  householdContext: PromptInputs['householdContext']
): {
  requiresZoning: boolean;
  privateVsShared: number;
} {
  if (socialContext === 'solo') {
    return {
      requiresZoning: false,
      privateVsShared: 0 // Fully private
    };
  }
  
  // Shared room considerations
  const numberOfUsers = (sharedWith?.length || 0) + 1;
  const requiresZoning = numberOfUsers > 1;
  
  // Private vs shared spectrum
  // 0 = private sanctuary, 1 = fully shared/communal
  const privateVsShared = householdContext.householdGoals.includes('connection') ? 0.7 : 0.4;
  
  return {
    requiresZoning,
    privateVsShared
  };
}

// =========================
// BIG FIVE PERSONALITY MAPPING
// =========================

function mapBigFiveToPromptWeights(personality: PromptInputs['personality']): {
  visualComplexity: number;
  socialPreferences: number;
  storageNeeds: number;
  lightingPreferences: number;
  harmonyLevel: number;
} {
  if (!personality) {
    return {
      visualComplexity: 0.5,
      socialPreferences: 0.5,
      storageNeeds: 0.5,
      lightingPreferences: 0.5,
      harmonyLevel: 0.5
    };
  }

  const { openness, conscientiousness, extraversion, agreeableness, neuroticism } = personality;

  // Visual Complexity (Openness + Conscientiousness)
  // High openness = more complex, varied designs
  // High conscientiousness = more organized, structured complexity
  const opennessFactor = openness / 100; // 0-1
  const conscientiousnessFactor = conscientiousness / 100; // 0-1
  const visualComplexity = (opennessFactor * 0.7) + (conscientiousnessFactor * 0.3);

  // Social Preferences (Extraversion)
  // High extraversion = more social, open spaces
  // Low extraversion = more private, intimate spaces
  const socialPreferences = extraversion / 100; // 0-1

  // Storage Needs (Conscientiousness)
  // High conscientiousness = more storage, organization
  // Low conscientiousness = minimal storage, flexible spaces
  const storageNeeds = conscientiousness / 100; // 0-1

  // Lighting Preferences (Neuroticism + Extraversion)
  // High neuroticism = softer, warmer lighting for comfort
  // High extraversion = brighter lighting for energy
  // Low neuroticism + low extraversion = balanced lighting
  const neuroticismFactor = neuroticism / 100; // 0-1
  const extraversionFactor = extraversion / 100; // 0-1
  const lightingPreferences = (neuroticismFactor * 0.3) + (extraversionFactor * 0.7);

  // Harmony Level (Agreeableness + low Neuroticism)
  // High agreeableness = more harmonious, balanced designs
  // Low neuroticism = more stable, calming elements
  const agreeablenessFactor = agreeableness / 100; // 0-1
  const harmonyLevel = (agreeablenessFactor * 0.6) + ((100 - neuroticism) / 100 * 0.4);

  const result = {
    visualComplexity: Math.max(0, Math.min(1, visualComplexity)),
    socialPreferences: Math.max(0, Math.min(1, socialPreferences)),
    storageNeeds: Math.max(0, Math.min(1, storageNeeds)),
    lightingPreferences: Math.max(0, Math.min(1, lightingPreferences)),
    harmonyLevel: Math.max(0, Math.min(1, harmonyLevel))
  };
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scoring.ts:1605',message:'Mapping Big Five to prompt weights',data:{personalityDomains:{O:personality.openness,C:personality.conscientiousness,E:personality.extraversion,A:personality.agreeableness,N:personality.neuroticism},opennessFactor,conscientiousnessFactor,result},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'C2'})}).catch(()=>{});
  // #endregion
  
  return result;
}

// =========================
// BIG FIVE FACETS MAPPING (IPIP-NEO-120)
// =========================

/**
 * Maps IPIP-NEO-120 facets to specific design preferences.
 * Facets provide much more granular insight than domain scores alone.
 * 
 * Key facets for interior design:
 * - O2 (Aesthetics): Appreciation for art, beauty, sensitivity to design
 * - C2 (Order): Preference for organization, tidiness, structure
 * - E1 (Warmth): Friendliness, affection, cozy preferences
 * - E2 (Gregariousness): Social nature, open spaces preference
 * - E5 (Excitement-Seeking): Bold choices, dynamic patterns
 * - A6 (Tender-Mindedness): Soft textures, gentle aesthetics
 * - N1 (Anxiety): Need for calming elements, nature
 * - N6 (Vulnerability): Need for grounding, enclosed safe spaces
 */
function mapBigFiveFacetsToDesignPreferences(personality: PromptInputs['personality']): {
  facetPreferences: PromptWeights['facetPreferences'];
  designImplications: PromptWeights['designImplications'];
} {
  // Default values when no personality data available
  const defaultFacetPreferences = {
    aestheticSensitivity: 0.5,
    orderPreference: 0.5,
    warmthPreference: 0.5,
    socialOpenness: 0.5,
    excitementSeeking: 0.5,
    tenderMindedness: 0.5,
    anxietyLevel: 0.5,
    vulnerabilityLevel: 0.5
  };
  
  const defaultDesignImplications = {
    eclecticMix: false,
    minimalistTendency: false,
    cozyTextures: false,
    boldColors: false,
    softTextures: false,
    organicShapes: false,
    calmingElements: false,
    groundingElements: false,
    enclosedSpaces: false,
    openPlanPreference: false
  };
  
  if (!personality) {
    return {
      facetPreferences: defaultFacetPreferences,
      designImplications: defaultDesignImplications
    };
  }
  
  const facets = personality.facets;
  
  // Extract facet scores (with fallback to domain-based estimation)
  const getFacetScore = (domain: 'O' | 'C' | 'E' | 'A' | 'N', facetNum: number, fallbackDomain: number): number => {
    if (facets && facets[domain] && typeof facets[domain][facetNum] === 'number') {
      return facets[domain][facetNum] / 100; // Convert 0-100 to 0-1
    }
    // Fallback: use domain score as estimation
    return fallbackDomain / 100;
  };
  
  // Extract key facets
  const O1_Fantasy = getFacetScore('O', 1, personality.openness);
  const O2_Aesthetics = getFacetScore('O', 2, personality.openness);
  const C2_Order = getFacetScore('C', 2, personality.conscientiousness);
  const E1_Warmth = getFacetScore('E', 1, personality.extraversion);
  const E2_Gregariousness = getFacetScore('E', 2, personality.extraversion);
  const E5_ExcitementSeeking = getFacetScore('E', 5, personality.extraversion);
  const A6_TenderMindedness = getFacetScore('A', 6, personality.agreeableness);
  const N1_Anxiety = getFacetScore('N', 1, personality.neuroticism);
  const N6_Vulnerability = getFacetScore('N', 6, personality.neuroticism);
  
  // Build facet preferences
  const facetPreferences = {
    aestheticSensitivity: O2_Aesthetics,
    orderPreference: C2_Order,
    warmthPreference: E1_Warmth,
    socialOpenness: E2_Gregariousness,
    excitementSeeking: E5_ExcitementSeeking,
    tenderMindedness: A6_TenderMindedness,
    anxietyLevel: N1_Anxiety,
    vulnerabilityLevel: N6_Vulnerability
  };
  
  // Derive design implications from facet combinations
  const designImplications = {
    // High O2 (aesthetics) + low C2 (order) = eclectic, varied mix
    eclecticMix: O2_Aesthetics > 0.6 && C2_Order < 0.4,
    
    // High C2 (order) + low O1 (fantasy) = minimalist, clean lines
    minimalistTendency: C2_Order > 0.6 && O1_Fantasy < 0.4,
    
    // High E1 (warmth) + high A6 (tender) = cozy, soft textures
    cozyTextures: E1_Warmth > 0.5 && A6_TenderMindedness > 0.5,
    
    // High E5 (excitement) + high O2 (aesthetics) = bold colors, dynamic
    boldColors: E5_ExcitementSeeking > 0.6 && O2_Aesthetics > 0.5,
    
    // High A6 (tender-mindedness) = soft textures preference
    softTextures: A6_TenderMindedness > 0.6,
    
    // High A6 + high O2 = organic, flowing shapes
    organicShapes: A6_TenderMindedness > 0.5 && O2_Aesthetics > 0.5,
    
    // High N1 (anxiety) = needs calming elements, nature
    calmingElements: N1_Anxiety > 0.6,
    
    // High N6 (vulnerability) = needs grounding, stability
    groundingElements: N6_Vulnerability > 0.6,
    
    // Low E2 (gregariousness) + high N1 (anxiety) = enclosed, cozy spaces
    enclosedSpaces: E2_Gregariousness < 0.4 && N1_Anxiety > 0.5,
    
    // High E2 (gregariousness) + high E = open plan, social spaces
    openPlanPreference: E2_Gregariousness > 0.6 && (personality.extraversion / 100) > 0.5
  };
  
  return {
    facetPreferences,
    designImplications
  };
}

function integrateInspirationTags(inspirations: PromptInputs['inspirations']): {
  additionalStyles: string[];
  additionalColors: string[];
  additionalMaterials: string[];
  biophiliaBoost: number;
} {
  if (!inspirations || inspirations.length === 0) {
    return {
      additionalStyles: [],
      additionalColors: [],
      additionalMaterials: [],
      biophiliaBoost: 0
    };
  }

  // Aggregate all tags from inspiration images
  const allStyles = new Set<string>();
  const allColors = new Set<string>();
  const allMaterials = new Set<string>();
  let totalBiophilia = 0;
  let validInspirations = 0;

  inspirations.forEach(inspiration => {
    if (inspiration.tags) {
      // Extract valid styles from each style tag (may contain garbage)
      inspiration.tags.styles?.forEach(style => {
        const validStyles = extractAllValidStyles([style]);
        validStyles.forEach(s => allStyles.add(s));
      });
      inspiration.tags.colors?.forEach(color => allColors.add(color));
      inspiration.tags.materials?.forEach(material => allMaterials.add(material));
      
      if (inspiration.tags.biophilia !== undefined) {
        totalBiophilia += inspiration.tags.biophilia;
        validInspirations++;
      }
    }
  });

  // Gamma model returns biophilia on a 0-3 scale. Normalize to 0-1, but
  // keep compatibility if the value already comes as 0-1.
  const avgBiophilia = validInspirations > 0 ? totalBiophilia / validInspirations : 0;
  const normalizedBiophilia = avgBiophilia > 1 ? avgBiophilia / 3 : avgBiophilia;
  const biophiliaBoost = Math.max(0, Math.min(1, normalizedBiophilia));

  return {
    additionalStyles: Array.from(allStyles),
    additionalColors: Array.from(allColors),
    additionalMaterials: Array.from(allMaterials),
    biophiliaBoost
  };
}

