// PROMPT SYNTHESIS - STEP 1: Scoring Matrix
// Deterministic, transparent, weighted scoring of user data
// Converts multi-source data into numerical weights for prompt building

import { PRSMoodGridData } from '../questions/validated-scales';
import { ActivityContext } from '@/types/deep-personalization';

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
      topMaterials: string[];    // User's selected materials
      warmthPreference: number;  // 0-1 from semantic differential
      brightnessPreference: number; // 0-1
      complexityPreference: number; // 0-1
    };
  };
  
  psychologicalBaseline: {
    prsIdeal: PRSMoodGridData;   // Where user wants spaces ideally
    biophiliaScore: number;      // 0-3
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
}

// =========================
// SCORING FUNCTIONS
// =========================

export function calculatePromptWeights(inputs: PromptInputs): PromptWeights {
  // 1. PRS GAP ANALYSIS (highest weight: 25%)
  const prsWeights = analyzePRSGap(inputs.prsCurrent, inputs.prsTarget);
  
  // 2. STYLE INTEGRATION (implicit 60% + explicit 40%, with personality fallback)
  const styleWeights = integrateStylePreferences(inputs.aestheticDNA, inputs.personality);
  
  // 3. COLOR INTEGRATION (with personality fallback)
  const colorWeights = integrateColorPreferences(
    inputs.aestheticDNA,
    inputs.roomVisualDNA,
    inputs.sensory,
    inputs.personality
  );
  
  // 4. BIOPHILIA SCORING
  const biophiliaWeights = calculateBiophiliaIntegration(
    inputs.psychologicalBaseline.biophiliaScore,
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
    colorPalette: [...colorWeights.palette, ...inspirationWeights.additionalColors],
    colorTemperature: colorWeights.temperature,
    
    // Materials (enhanced with inspirations)
    primaryMaterials: [...styleWeights.materials, ...inspirationWeights.additionalMaterials],
    
    // Lighting
    lightingMood: lightingWeights.mood,
    naturalLightImportance: lightingWeights.naturalImportance,
    
    // Biophilia (enhanced with inspirations)
    natureDensity: Math.min(1, biophiliaWeights.density + inspirationWeights.biophiliaBoost),
    biophilicElements: [...biophiliaWeights.elements],
    
    // Functional
    primaryActivity: functionalWeights.primary,
    secondaryActivities: functionalWeights.secondary,
    functionalPriorities: functionalWeights.priorities,
    
    // Social (enhanced with personality)
    requiresZoning: socialWeights.requiresZoning,
    privateVsShared: personalityWeights.socialPreferences,
    
    // Complexity (enhanced with personality)
    visualComplexity: (styleWeights.complexity + personalityWeights.visualComplexity) / 2,
    
    // Personality-driven preferences
    storageNeeds: personalityWeights.storageNeeds,
    harmonyLevel: personalityWeights.harmonyLevel,
    
    // Facet-driven preferences
    facetPreferences: facetWeights.facetPreferences,
    
    // Design implications from facets
    designImplications: facetWeights.designImplications,
    
    // Pain points
    addressPainPoints: inputs.painPoints
  };
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
} {
  // X-axis: -1 (energizing) to +1 (calming)
  // Y-axis: -1 (boring) to +1 (inspiring)
  
  const xGap = target.x - current.x;
  const yGap = target.y - current.y;
  
  return {
    needsCalming: Math.max(0, xGap),        // Positive xGap = needs more calming
    needsEnergizing: Math.max(0, -xGap),    // Negative xGap = needs more energy
    needsInspiration: Math.max(0, yGap),    // Positive yGap = needs more inspiration
    needsGrounding: Math.max(0, -yGap)      // Negative yGap = needs more grounding
  };
}

function integrateStylePreferences(
  aestheticDNA: PromptInputs['aestheticDNA'],
  personality?: PromptInputs['personality']
): {
  dominantStyle: string;
  confidence: number;
  materials: string[];
  complexity: number;
} {
  // Check if we have aesthetic data
  const hasImplicitStyles = aestheticDNA.implicit.dominantStyles.length > 0;
  const hasExplicitPalette = !!aestheticDNA.explicit.selectedPalette;
  
  // If no aesthetic data, derive from personality
  if (!hasImplicitStyles && !hasExplicitPalette && personality) {
    return deriveStyleFromPersonality(personality);
  }
  
  // Implicit preferences have 60% weight (behavioral data)
  // Explicit preferences have 40% weight (stated preferences)
  const implicitWeight = 0.6;
  const explicitWeight = 0.4;
  
  // Style: Take implicit first (more authentic), then explicit, then 'modern' fallback
  let dominantStyle = aestheticDNA.implicit.dominantStyles[0];
  if (!dominantStyle && aestheticDNA.explicit.selectedPalette) {
    // Try to derive style from palette name
    dominantStyle = aestheticDNA.explicit.selectedPalette.toLowerCase();
  }
  if (!dominantStyle) {
    dominantStyle = 'modern'; // Ultimate fallback
  }
  
  // Confidence: Higher if implicit and explicit align
  const confidence = hasImplicitStyles ? 0.8 : 0.5;
  
  // Materials: Combine implicit (60%) + explicit (40%)
  const materials = [
    ...aestheticDNA.implicit.materials.slice(0, 2),
    ...aestheticDNA.explicit.topMaterials.slice(0, 1)
  ];
  
  // Complexity: Weighted average
  const complexity = (
    aestheticDNA.implicit.complexity * implicitWeight +
    aestheticDNA.explicit.complexityPreference * explicitWeight
  );
  
  return {
    dominantStyle,
    confidence,
    materials,
    complexity
  };
}

/**
 * Derives style preferences purely from Big Five personality traits.
 * Used when no aesthetic data is available (Personality source).
 */
function deriveStyleFromPersonality(personality: NonNullable<PromptInputs['personality']>): {
  dominantStyle: string;
  confidence: number;
  materials: string[];
  complexity: number;
} {
  const O = personality.openness / 100;      // 0-1
  const C = personality.conscientiousness / 100;
  const E = personality.extraversion / 100;
  const A = personality.agreeableness / 100;
  const N = personality.neuroticism / 100;
  
  // STYLE MAPPING based on Big Five combinations
  let dominantStyle: string;
  
  if (O > 0.7 && C < 0.4) {
    // High Openness + Low Conscientiousness = Bohemian, Eclectic
    dominantStyle = 'bohemian eclectic';
  } else if (O > 0.6 && E > 0.6) {
    // High Openness + High Extraversion = Bold, Maximalist
    dominantStyle = 'maximalist artistic';
  } else if (C > 0.7 && O < 0.4) {
    // High Conscientiousness + Low Openness = Minimalist, Clean
    dominantStyle = 'minimalist clean';
  } else if (C > 0.6 && A > 0.6) {
    // High Conscientiousness + High Agreeableness = Scandinavian
    dominantStyle = 'Scandinavian';
  } else if (N > 0.6 && A > 0.5) {
    // High Neuroticism + High Agreeableness = Cozy, Hygge
    dominantStyle = 'cozy hygge';
  } else if (E < 0.4 && N > 0.5) {
    // Low Extraversion + High Neuroticism = Cocooning, Private
    dominantStyle = 'cozy sanctuary';
  } else if (E > 0.7 && A > 0.5) {
    // High Extraversion + High Agreeableness = Open, Social
    dominantStyle = 'open contemporary';
  } else if (O > 0.5 && N < 0.4) {
    // High Openness + Low Neuroticism = Modern, Confident
    dominantStyle = 'modern confident';
  } else {
    // Balanced = Modern Classic
    dominantStyle = 'modern classic';
  }
  
  // MATERIALS based on personality
  const materials: string[] = [];
  
  if (A > 0.6 || N > 0.5) {
    // High Agreeableness or Neuroticism = soft, natural
    materials.push('soft textiles', 'natural wood');
  }
  if (C > 0.6) {
    // High Conscientiousness = clean, organized
    materials.push('glass', 'polished surfaces');
  }
  if (O > 0.6) {
    // High Openness = varied, interesting
    materials.push('mixed textures', 'artisanal elements');
  }
  if (E > 0.6) {
    // High Extraversion = bold, statement
    materials.push('brass', 'bold accents');
  }
  
  // COMPLEXITY from Openness
  const complexity = O;
  
  return {
    dominantStyle,
    confidence: 0.7, // Personality-derived has moderate confidence
    materials: materials.slice(0, 3),
    complexity
  };
}

/**
 * Derives colors purely from Big Five personality traits.
 * Used when no aesthetic data is available.
 */
function deriveColorsFromPersonality(personality: NonNullable<PromptInputs['personality']>): {
  palette: string[];
  temperature: number;
} {
  const O = personality.openness / 100;
  const C = personality.conscientiousness / 100;
  const E = personality.extraversion / 100;
  const A = personality.agreeableness / 100;
  const N = personality.neuroticism / 100;
  
  const colors: string[] = [];
  
  // Base colors from personality
  if (E > 0.6) {
    // High Extraversion = warm, vibrant
    colors.push('warm coral', 'sunny yellow');
  } else if (E < 0.4) {
    // Low Extraversion = cool, muted
    colors.push('soft gray', 'muted blue');
  }
  
  if (O > 0.6) {
    // High Openness = varied, bold
    colors.push('deep teal', 'rich burgundy');
  } else if (O < 0.4) {
    // Low Openness = neutral, safe
    colors.push('beige', 'cream');
  }
  
  if (N > 0.6) {
    // High Neuroticism = calming, nature
    colors.push('sage green', 'sky blue');
  }
  
  if (A > 0.6) {
    // High Agreeableness = soft, harmonious
    colors.push('blush pink', 'soft lavender');
  }
  
  if (C > 0.6) {
    // High Conscientiousness = clean, organized
    colors.push('crisp white', 'charcoal');
  }
  
  // Temperature: Extraversion drives warmth
  const temperature = E * 0.6 + A * 0.2 + (1 - N) * 0.2;
  
  return {
    palette: colors.length > 0 ? colors.slice(0, 4) : ['neutral gray', 'white', 'natural wood tones'],
    temperature
  };
}

function integrateColorPreferences(
  aestheticDNA: PromptInputs['aestheticDNA'],
  roomVisualDNA: PromptInputs['roomVisualDNA'],
  sensory: PromptInputs['sensory'],
  personality?: PromptInputs['personality']
): {
  palette: string[];
  temperature: number;
} {
  // Check if we have any color data
  const hasRoomColors = roomVisualDNA.colors.length > 0;
  const hasImplicitColors = aestheticDNA.implicit.colors.length > 0;
  
  // If no color data, derive from personality
  if (!hasRoomColors && !hasImplicitColors && personality) {
    return deriveColorsFromPersonality(personality);
  }
  
  // Prioritize room-specific visual DNA (most recent, most relevant)
  const colors = hasRoomColors
    ? roomVisualDNA.colors
    : aestheticDNA.implicit.colors;
  
  // Color temperature: Weighted average
  const implicitWarmth = aestheticDNA.implicit.warmth;
  const explicitWarmth = aestheticDNA.explicit.warmthPreference;
  
  // Sensory light preference influences temperature
  const lightInfluence = sensory.light.includes('warm') ? 0.7 : sensory.light.includes('cool') ? 0.3 : 0.5;
  
  const temperature = (
    implicitWarmth * 0.4 +
    explicitWarmth * 0.4 +
    lightInfluence * 0.2
  );
  
  return {
    palette: colors.length > 0 ? colors : ['neutral tones'],
    temperature
  };
}

function calculateBiophiliaIntegration(
  biophiliaScore: number,
  natureMetaphor: string,
  roomType: string
): {
  density: number;
  elements: string[];
} {
  // Normalize biophilia score to 0-1
  const density = biophiliaScore / 3;
  
  // Elements based on score + nature metaphor
  const elements: string[] = [];
  
  if (density > 0) {
    elements.push('natural materials');
  }
  if (density > 0.33) {
    elements.push('indoor plants');
  }
  if (density > 0.66) {
    elements.push('organic shapes', 'abundant greenery');
  }
  
  // Nature metaphor influences specific elements
  if (natureMetaphor === 'ocean') {
    elements.push('flowing forms', 'water-inspired colors');
  } else if (natureMetaphor === 'forest') {
    elements.push('layered textures', 'wood elements');
  } else if (natureMetaphor === 'mountain') {
    elements.push('stone materials', 'strong vertical lines');
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
  // Direct from sensory preference
  const mood = lightPreference;
  
  // Natural light importance from PRS target (inspiring spaces need more light)
  const naturalImportance = (prsTarget.y + 1) / 2; // Convert -1:1 to 0:1
  
  // Activities that need good lighting
  const lightIntensiveActivities = ['work', 'read', 'creative', 'cook'];
  const needsGoodLight = activities.some(a =>
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

  return {
    visualComplexity: Math.max(0, Math.min(1, visualComplexity)),
    socialPreferences: Math.max(0, Math.min(1, socialPreferences)),
    storageNeeds: Math.max(0, Math.min(1, storageNeeds)),
    lightingPreferences: Math.max(0, Math.min(1, lightingPreferences)),
    harmonyLevel: Math.max(0, Math.min(1, harmonyLevel))
  };
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
      inspiration.tags.styles?.forEach(style => allStyles.add(style));
      inspiration.tags.colors?.forEach(color => allColors.add(color));
      inspiration.tags.materials?.forEach(material => allMaterials.add(material));
      
      if (inspiration.tags.biophilia !== undefined) {
        totalBiophilia += inspiration.tags.biophilia;
        validInspirations++;
      }
    }
  });

  const biophiliaBoost = validInspirations > 0 ? totalBiophilia / validInspirations : 0;

  return {
    additionalStyles: Array.from(allStyles),
    additionalColors: Array.from(allColors),
    additionalMaterials: Array.from(allMaterials),
    biophiliaBoost: Math.max(0, Math.min(1, biophiliaBoost))
  };
}

