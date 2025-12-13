/**
 * Mood Transformation Analysis
 * 
 * Maps PRS (Perceived Restorativeness Scale) gap between current and target mood
 * to specific design recommendations based on environmental psychology research.
 */

import { PRSMoodGridData } from '../questions/validated-scales';

// =========================
// TYPES
// =========================

export type MoodDirection = 
  | 'stressed_to_relaxed'    // x: negative → positive (needs calming)
  | 'bored_to_inspired'      // y: negative → positive (needs inspiration)
  | 'chaotic_to_grounded'    // high magnitude in both (needs grounding)
  | 'low_to_energized'       // x: positive → negative (needs energizing)
  | 'neutral';               // small gap

export interface MoodTransformation {
  // Gap analysis
  direction: MoodDirection;
  magnitude: 'subtle' | 'moderate' | 'significant';
  
  // Design recommendations (research-backed)
  colorRecommendations: {
    temperature: 'warm' | 'cool' | 'neutral';
    saturation: 'muted' | 'moderate' | 'vibrant';
    specificColors?: string[];  // hex codes
  };
  
  textureRecommendations: {
    primary: 'soft' | 'natural' | 'smooth' | 'rough';
    suggestions: string[];  // "velvet", "linen", "wood grain"
  };
  
  biophiliaModifier: number;  // -0.5 to +0.5 (add to base score)
  
  lightingRecommendations: {
    warmth: 'warm' | 'neutral' | 'cool';
    intensity: 'dim' | 'moderate' | 'bright';
    naturalLight: 'essential' | 'important' | 'moderate';
  };
  
  complexityModifier: number;  // -0.3 to +0.3 (add to base)
  
  layoutRecommendations: {
    openness: 'intimate' | 'balanced' | 'open';
    flow: 'structured' | 'organic';
  };
}

interface DesignRecommendations {
  colors: {
    temperature: 'warm' | 'cool' | 'neutral';
    saturation: 'muted' | 'moderate' | 'vibrant';
    specificColors?: string[];
  };
  textures: string[];
  biophilia: number;
  lighting: {
    warmth: 'warm' | 'neutral' | 'cool';
    intensity: 'dim' | 'moderate' | 'bright';
  };
  complexity: number;
  layout: {
    openness: 'intimate' | 'balanced' | 'open';
    flow: 'structured' | 'organic';
  };
}

// =========================
// RESEARCH-BACKED MAPPINGS
// =========================

// Based on environmental psychology research:
// - Ulrich (1984): Nature views reduce stress
// - Kaplan & Kaplan (1989): Restorative environments
// - Küller et al. (2006): Color and lighting effects on mood
const MOOD_TO_DESIGN: Record<MoodDirection, DesignRecommendations> = {
  stressed_to_relaxed: {
    colors: { 
      temperature: 'warm', 
      saturation: 'muted',
      specificColors: ['#F5E6D3', '#E8D5C4', '#D4A574', '#C9A88B'] // warm beiges, soft browns
    },
    textures: ['soft fabrics', 'natural wood', 'linen', 'cotton'],
    biophilia: +0.3,  // More plants calm stress (Ulrich 1984)
    lighting: { warmth: 'warm', intensity: 'dim' },
    complexity: -0.2,  // Simpler = calmer
    layout: { openness: 'intimate', flow: 'organic' }
  },
  
  bored_to_inspired: {
    colors: { 
      temperature: 'neutral', 
      saturation: 'moderate',
      specificColors: ['#9370DB', '#BA55D3', '#DA70D6', '#FF69B4'] // purples, pinks
    },
    textures: ['varied', 'artistic', 'mixed media', 'textured surfaces'],
    biophilia: +0.1,
    lighting: { warmth: 'neutral', intensity: 'bright' },
    complexity: +0.2,  // More visual interest
    layout: { openness: 'balanced', flow: 'organic' }
  },
  
  chaotic_to_grounded: {
    colors: { 
      temperature: 'warm', 
      saturation: 'muted',
      specificColors: ['#8B7355', '#A0826D', '#B8A082', '#D4C4B0'] // earth tones
    },
    textures: ['natural', 'solid', 'consistent', 'wood grain'],
    biophilia: +0.2,
    lighting: { warmth: 'warm', intensity: 'moderate' },
    complexity: -0.3,  // Much simpler
    layout: { openness: 'balanced', flow: 'structured' }
  },
  
  low_to_energized: {
    colors: { 
      temperature: 'warm', 
      saturation: 'vibrant',
      specificColors: ['#FF7F50', '#FFD700', '#FF6347', '#FFA500'] // coral, gold, orange
    },
    textures: ['dynamic', 'contrasting', 'smooth surfaces'],
    biophilia: 0,
    lighting: { warmth: 'neutral', intensity: 'bright' },
    complexity: +0.1,
    layout: { openness: 'open', flow: 'structured' }
  },
  
  neutral: {
    colors: { 
      temperature: 'neutral', 
      saturation: 'moderate',
      specificColors: ['#F5F5F5', '#E0E0E0', '#D3D3D3', '#C0C0C0'] // neutrals
    },
    textures: ['balanced', 'varied'],
    biophilia: 0,
    lighting: { warmth: 'neutral', intensity: 'moderate' },
    complexity: 0,
    layout: { openness: 'balanced', flow: 'structured' }
  }
};

// =========================
// MAIN FUNCTION
// =========================

/**
 * Analyzes mood transformation from current to target PRS state
 * and provides design recommendations
 */
export function analyzeMoodTransformation(
  current: PRSMoodGridData,
  target: PRSMoodGridData
): MoodTransformation {
  const xGap = target.x - current.x;  // calming (+) vs energizing (-)
  const yGap = target.y - current.y;  // inspiring (+) vs grounding (-)
  const magnitude = Math.sqrt(xGap * xGap + yGap * yGap);
  
  // Determine direction
  const direction = classifyDirection(xGap, yGap, magnitude);
  
  // Get base recommendations for this direction
  const baseDesign = MOOD_TO_DESIGN[direction];
  
  // Adjust based on magnitude
  const magnitudeMultiplier = magnitude < 0.5 ? 0.5 : magnitude < 1.2 ? 1.0 : 1.5;
  
  return {
    direction,
    magnitude: magnitude < 0.5 ? 'subtle' : magnitude < 1.2 ? 'moderate' : 'significant',
    colorRecommendations: {
      ...baseDesign.colors,
      specificColors: baseDesign.colors.specificColors
    },
    textureRecommendations: {
      primary: getPrimaryTexture(baseDesign.textures),
      suggestions: baseDesign.textures
    },
    biophiliaModifier: Math.max(-0.5, Math.min(0.5, baseDesign.biophilia * magnitudeMultiplier)),
    lightingRecommendations: {
      ...baseDesign.lighting,
      naturalLight: magnitude > 1.0 ? 'essential' : magnitude > 0.5 ? 'important' : 'moderate'
    },
    complexityModifier: Math.max(-0.3, Math.min(0.3, baseDesign.complexity * magnitudeMultiplier)),
    layoutRecommendations: baseDesign.layout
  };
}

/**
 * Classifies the direction of mood transformation
 */
function classifyDirection(
  xGap: number,
  yGap: number,
  magnitude: number
): MoodDirection {
  // Small gap = neutral
  if (magnitude < 0.3) {
    return 'neutral';
  }
  
  // Dominant X-axis transformation (calming vs energizing)
  if (Math.abs(xGap) > Math.abs(yGap) * 1.5) {
    if (xGap > 0.5) {
      return 'stressed_to_relaxed';  // Needs calming
    } else if (xGap < -0.5) {
      return 'low_to_energized';  // Needs energizing
    }
  }
  
  // Dominant Y-axis transformation (inspiring vs grounding)
  if (Math.abs(yGap) > Math.abs(xGap) * 1.5) {
    if (yGap > 0.5) {
      return 'bored_to_inspired';  // Needs inspiration
    }
  }
  
  // High magnitude in both = chaotic to grounded
  if (magnitude > 1.0 && Math.abs(xGap) > 0.4 && Math.abs(yGap) > 0.4) {
    return 'chaotic_to_grounded';
  }
  
  // Default based on primary gap
  if (xGap > 0) {
    return 'stressed_to_relaxed';
  } else if (yGap > 0) {
    return 'bored_to_inspired';
  } else {
    return 'neutral';
  }
}

/**
 * Extracts primary texture from texture array
 */
function getPrimaryTexture(textures: string[]): 'soft' | 'natural' | 'smooth' | 'rough' {
  if (textures.some(t => t.includes('soft') || t.includes('fabric') || t.includes('linen'))) {
    return 'soft';
  }
  if (textures.some(t => t.includes('natural') || t.includes('wood'))) {
    return 'natural';
  }
  if (textures.some(t => t.includes('smooth') || t.includes('polished'))) {
    return 'smooth';
  }
  return 'rough';
}

/**
 * Describes a mood point in human-readable terms
 */
export function describeMoodPoint(point: PRSMoodGridData): string {
  const xDesc = point.x > 0.5 ? 'calming' : point.x < -0.5 ? 'energizing' : 'neutral';
  const yDesc = point.y > 0.5 ? 'inspiring' : point.y < -0.5 ? 'grounding' : 'neutral';
  
  if (xDesc === 'neutral' && yDesc === 'neutral') {
    return 'balanced';
  }
  
  return `${xDesc}, ${yDesc}`;
}

// =========================
// SOCIAL CONTEXT INTEGRATION
// =========================

export interface SocialContextRecommendations {
  layoutOpenness: 'intimate' | 'balanced' | 'open' | 'zoned';
  furnitureScale: 'cozy' | 'standard' | 'generous';
  durabilityPriority: 'low' | 'medium' | 'high';
  privacyElements: boolean;
  socialElements: boolean;
}

/**
 * Maps social context to design recommendations
 */
export function mapSocialContext(
  context: 'solo' | 'shared',
  sharedWith?: string[]
): SocialContextRecommendations {
  if (context === 'solo') {
    return {
      layoutOpenness: 'intimate',
      furnitureScale: 'cozy',
      durabilityPriority: 'low',
      privacyElements: true,
      socialElements: false
    };
  }
  
  // Analyze who room is shared with
  const hasKids = sharedWith?.some(w => 
    w.toLowerCase().includes('child') || 
    w.toLowerCase().includes('kid') ||
    w.toLowerCase().includes('dzieci')
  );
  const hasPartner = sharedWith?.some(w => 
    w.toLowerCase().includes('partner') || 
    w.toLowerCase().includes('spouse') ||
    w.toLowerCase().includes('partner')
  );
  const hasGuests = sharedWith?.some(w => 
    w.toLowerCase().includes('guest') || 
    w.toLowerCase().includes('visitor') ||
    w.toLowerCase().includes('gość')
  );
  
  return {
    layoutOpenness: hasGuests ? 'open' : hasPartner ? 'balanced' : 'zoned',
    furnitureScale: hasKids ? 'generous' : 'standard',
    durabilityPriority: hasKids ? 'high' : 'medium',
    privacyElements: !hasGuests,
    socialElements: Boolean(hasGuests || hasPartner)
  };
}

// =========================
// ACTIVITY SATISFACTION INTEGRATION
// =========================

export interface ActivityRecommendations {
  priorityActivities: string[];
  needsImprovement: boolean;
  specificNeeds: string[];
}

/**
 * Maps problem activities to design solutions
 */
const ACTIVITY_DESIGN_SOLUTIONS: Record<string, string[]> = {
  'work': ['dedicated workspace', 'good task lighting', 'organized storage', 'ergonomic setup'],
  'relax': ['comfortable seating', 'soft lighting', 'calming colors', 'cozy atmosphere'],
  'sleep': ['blackout capability', 'minimal distractions', 'cozy bedding', 'quiet environment'],
  'entertain': ['flexible seating', 'good acoustics', 'ambient lighting', 'social layout'],
  'read': ['reading nook', 'focused lighting', 'comfortable chair', 'quiet corner'],
  'cook': ['efficient layout', 'good lighting', 'accessible storage', 'ventilation'],
  'exercise': ['open space', 'mirror placement', 'motivational atmosphere', 'storage for equipment'],
  'watch_tv': ['optimal viewing distance', 'comfortable seating', 'dimmed ambient light', 'media storage']
};

/**
 * Analyzes activity needs based on satisfaction levels
 */
export function analyzeActivityNeeds(
  activities: Array<{
    type: string;
    satisfaction: string;
    frequency?: string;
  }>
): ActivityRecommendations {
  // Find activities with "difficult" satisfaction - these need design attention
  const problematicActivities = activities
    .filter(a => a.satisfaction === 'difficult')
    .map(a => a.type);
  
  // Collect specific design needs for problematic activities
  const specificNeeds: string[] = [];
  problematicActivities.forEach(activityType => {
    const solutions = ACTIVITY_DESIGN_SOLUTIONS[activityType.toLowerCase()];
    if (solutions) {
      specificNeeds.push(...solutions);
    }
  });
  
  // Also prioritize frequent activities even if not difficult
  const frequentActivities = activities
    .filter(a => a.frequency === 'daily' || a.frequency === 'often')
    .map(a => a.type);
  
  return {
    priorityActivities: Array.from(new Set([...problematicActivities, ...frequentActivities])),
    needsImprovement: problematicActivities.length > 0,
    specificNeeds: Array.from(new Set(specificNeeds))
  };
}

