// PROMPT SYNTHESIS - STEP 1: Scoring Matrix
// Deterministic, transparent, weighted scoring of user data
// Converts multi-source data into numerical weights for prompt building

import { PRSMoodGridData } from '../questions/validated-scales';

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
  
  // Special Considerations
  addressPainPoints: string[];
}

// =========================
// SCORING FUNCTIONS
// =========================

export function calculatePromptWeights(inputs: PromptInputs): PromptWeights {
  // 1. PRS GAP ANALYSIS (highest weight: 25%)
  const prsWeights = analyzePRSGap(inputs.prsCurrent, inputs.prsTarget);
  
  // 2. STYLE INTEGRATION (implicit 60% + explicit 40%)
  const styleWeights = integrateStylePreferences(inputs.aestheticDNA);
  
  // 3. COLOR INTEGRATION
  const colorWeights = integrateColorPreferences(
    inputs.aestheticDNA,
    inputs.roomVisualDNA,
    inputs.sensory
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
    inputs.socialContext
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
    
    // Colors
    colorPalette: colorWeights.palette,
    colorTemperature: colorWeights.temperature,
    
    // Materials
    primaryMaterials: styleWeights.materials,
    
    // Lighting
    lightingMood: lightingWeights.mood,
    naturalLightImportance: lightingWeights.naturalImportance,
    
    // Biophilia
    natureDensity: biophiliaWeights.density,
    biophilicElements: biophiliaWeights.elements,
    
    // Functional
    primaryActivity: functionalWeights.primary,
    secondaryActivities: functionalWeights.secondary,
    functionalPriorities: functionalWeights.priorities,
    
    // Social
    requiresZoning: socialWeights.requiresZoning,
    privateVsShared: socialWeights.privateVsShared,
    
    // Complexity
    visualComplexity: styleWeights.complexity,
    
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

function integrateStylePreferences(aestheticDNA: PromptInputs['aestheticDNA']): {
  dominantStyle: string;
  confidence: number;
  materials: string[];
  complexity: number;
} {
  // Implicit preferences have 60% weight (behavioral data)
  // Explicit preferences have 40% weight (stated preferences)
  
  const implicitWeight = 0.6;
  const explicitWeight = 0.4;
  
  // Style: Take implicit first (more authentic)
  const dominantStyle = aestheticDNA.implicit.dominantStyles[0] || 'modern';
  
  // Confidence: Higher if implicit and explicit align
  const confidence = 0.8; // TODO: Calculate based on alignment
  
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

function integrateColorPreferences(
  aestheticDNA: PromptInputs['aestheticDNA'],
  roomVisualDNA: PromptInputs['roomVisualDNA'],
  sensory: PromptInputs['sensory']
): {
  palette: string[];
  temperature: number;
} {
  // Prioritize room-specific visual DNA (most recent, most relevant)
  const colors = roomVisualDNA.colors.length > 0
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
    palette: colors,
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
  socialContext: 'solo' | 'shared'
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
  const priorities: string[] = [];
  if (painPoints.includes('storage')) priorities.push('ample storage');
  if (painPoints.includes('layout')) priorities.push('optimized layout');
  if (painPoints.includes('light')) priorities.push('improved lighting');
  if (painPoints.includes('clutter')) priorities.push('organization systems');
  if (socialContext === 'shared') priorities.push('zoning for multiple users');
  
  return { primary, secondary, priorities };
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

