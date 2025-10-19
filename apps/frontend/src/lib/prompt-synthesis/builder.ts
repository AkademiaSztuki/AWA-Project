// PROMPT SYNTHESIS - STEP 2: Template Builder
// Converts weighted scores into structured, natural language prompt for FLUX
// Rule-based, deterministic, reproducible

import { PromptWeights } from './scoring';

// =========================
// PROMPT TEMPLATES
// =========================

interface PromptComponents {
  roomType: string;
  style: string;
  mood: string;
  colors: string;
  materials: string;
  lighting: string;
  biophilia: string;
  functional: string;
  layout: string;
}

// =========================
// MAIN BUILDER FUNCTION
// =========================

export function buildPromptFromWeights(
  weights: PromptWeights,
  roomType: string
): {
  prompt: string;
  components: PromptComponents;
  metadata: {
    tokenCount: number;
    weights: PromptWeights;
  };
} {
  const components: PromptComponents = {
    roomType: buildRoomTypePhrase(roomType),
    style: buildStylePhrase(weights),
    mood: buildMoodPhrase(weights),
    colors: buildColorPhrase(weights),
    materials: buildMaterialsPhrase(weights),
    lighting: buildLightingPhrase(weights),
    biophilia: buildBiophiliaPhrase(weights),
    functional: buildFunctionalPhrase(weights, roomType),
    layout: buildLayoutPhrase(weights, roomType)
  };
  
  // Assemble full prompt with prioritization
  const prompt = assemblePrompt(components, weights);
  
  // Token count estimation (rough)
  const tokenCount = prompt.split(/\s+/).length;
  
  return {
    prompt,
    components,
    metadata: {
      tokenCount,
      weights
    }
  };
}

// =========================
// COMPONENT BUILDERS
// =========================

function buildRoomTypePhrase(roomType: string): string {
  const roomTypeMap: Record<string, string> = {
    bedroom: 'bedroom',
    living_room: 'living room',
    kitchen: 'kitchen',
    bathroom: 'bathroom',
    home_office: 'home office',
    dining_room: 'dining room',
    kids_room: 'children\'s bedroom',
    default: 'interior space'
  };
  
  return `A ${roomTypeMap[roomType] || roomTypeMap.default}`;
}

function buildStylePhrase(weights: PromptWeights): string {
  if (!weights.dominantStyle) return '';
  
  // Style confidence influences how strongly we state it
  if (weights.styleConfidence > 0.7) {
    return `in ${weights.dominantStyle} style`;
  } else if (weights.styleConfidence > 0.4) {
    return `with ${weights.dominantStyle} influences`;
  } else {
    return `with eclectic, ${weights.dominantStyle}-inspired design`;
  }
}

function buildMoodPhrase(weights: PromptWeights): string {
  const moods: string[] = [];
  
  // PRS-derived moods (prioritize highest scores)
  if (weights.needsCalming > 0.6) {
    moods.push('serene', 'calming atmosphere');
  } else if (weights.needsEnergizing > 0.6) {
    moods.push('energizing', 'invigorating vibe');
  }
  
  if (weights.needsInspiration > 0.6) {
    moods.push('inspiring', 'creative energy');
  } else if (weights.needsGrounding > 0.6) {
    moods.push('grounded', 'stable presence');
  }
  
  // Social context mood
  if (weights.privateVsShared > 0.6) {
    moods.push('welcoming', 'sociable ambiance');
  } else if (weights.privateVsShared < 0.3) {
    moods.push('intimate', 'personal sanctuary feel');
  }
  
  if (moods.length === 0) {
    return 'with balanced, comfortable atmosphere';
  }
  
  return `featuring ${moods.slice(0, 2).join(' and ')}`;
}

function buildColorPhrase(weights: PromptWeights): string {
  if (!weights.colorPalette || weights.colorPalette.length === 0) {
    // Fallback to temperature
    if (weights.colorTemperature > 0.6) {
      return 'in warm tones';
    } else if (weights.colorTemperature < 0.4) {
      return 'in cool tones';
    } else {
      return 'in neutral, balanced colors';
    }
  }
  
  // Use specific colors from palette
  const colors = weights.colorPalette.slice(0, 3).join(', ');
  
  // Add temperature descriptor
  const tempDescriptor = weights.colorTemperature > 0.6 ? 'warm' :
                         weights.colorTemperature < 0.4 ? 'cool' : '';
  
  if (tempDescriptor) {
    return `with ${tempDescriptor} color palette of ${colors}`;
  } else {
    return `featuring colors of ${colors}`;
  }
}

function buildMaterialsPhrase(weights: PromptWeights): string {
  if (!weights.primaryMaterials || weights.primaryMaterials.length === 0) {
    return '';
  }
  
  const materials = weights.primaryMaterials.slice(0, 3).join(', ');
  
  // Complexity influences how we describe materials
  if (weights.visualComplexity > 0.6) {
    return `with rich textures including ${materials}`;
  } else {
    return `featuring ${materials}`;
  }
}

function buildLightingPhrase(weights: PromptWeights): string {
  const lightPhrases: string[] = [];
  
  // Mood-based lighting
  const lightingMoodMap: Record<string, string> = {
    warm_low: 'soft, warm ambient lighting',
    warm_bright: 'bright, inviting warm light',
    neutral: 'balanced natural daylight',
    cool_bright: 'crisp, focused cool lighting'
  };
  
  const moodLight = lightingMoodMap[weights.lightingMood];
  if (moodLight) {
    lightPhrases.push(moodLight);
  }
  
  // Natural light importance
  if (weights.naturalLightImportance > 0.7) {
    lightPhrases.push('abundant natural light');
  } else if (weights.naturalLightImportance > 0.4) {
    lightPhrases.push('good natural light');
  }
  
  if (lightPhrases.length === 0) {
    return '';
  }
  
  return `with ${lightPhrases.join(' and ')}`;
}

function buildBiophiliaPhrase(weights: PromptWeights): string {
  if (weights.natureDensity < 0.1) {
    return ''; // No nature elements
  }
  
  const phrases: string[] = [];
  
  // Density-based base phrase
  if (weights.natureDensity > 0.75) {
    phrases.push('abundant natural elements');
  } else if (weights.natureDensity > 0.5) {
    phrases.push('significant natural presence');
  } else if (weights.natureDensity > 0.25) {
    phrases.push('subtle natural accents');
  } else {
    phrases.push('minimal natural touches');
  }
  
  // Specific elements
  if (weights.biophilicElements.length > 0) {
    const elements = weights.biophilicElements.slice(0, 2).join(' and ');
    phrases.push(`including ${elements}`);
  }
  
  return phrases.join(', ');
}

function buildFunctionalPhrase(weights: PromptWeights, roomType: string): string {
  const phrases: string[] = [];
  
  // Primary activity
  if (weights.primaryActivity) {
    const activityPhrases: Record<string, string> = {
      work: 'optimized for focused work',
      sleep: 'designed for restful sleep',
      relax: 'perfect for relaxation',
      cook: 'functional for cooking',
      entertain: 'ideal for entertaining',
      read: 'with dedicated reading area',
      exercise: 'suitable for physical activity',
      creative: 'inspiring creative pursuits'
    };
    
    const activityPhrase = activityPhrases[weights.primaryActivity];
    if (activityPhrase) {
      phrases.push(activityPhrase);
    }
  }
  
  // Functional priorities
  if (weights.functionalPriorities.length > 0) {
    const priority = weights.functionalPriorities[0];
    phrases.push(priority);
  }
  
  return phrases.length > 0 ? phrases.join(', ') : '';
}

function buildLayoutPhrase(weights: PromptWeights, roomType: string): string {
  const phrases: string[] = [];
  
  // Zoning for shared spaces
  if (weights.requiresZoning) {
    phrases.push('with distinct functional zones');
  }
  
  // Address specific pain points
  if (weights.addressPainPoints.includes('layout')) {
    phrases.push('improved space flow');
  }
  if (weights.addressPainPoints.includes('storage')) {
    phrases.push('smart storage solutions');
  }
  if (weights.addressPainPoints.includes('clutter')) {
    phrases.push('clean, organized aesthetic');
  }
  
  // Visual complexity
  if (weights.visualComplexity < 0.3) {
    phrases.push('minimalist, uncluttered layout');
  } else if (weights.visualComplexity > 0.7) {
    phrases.push('richly layered, detailed composition');
  }
  
  return phrases.length > 0 ? phrases.join(', ') : '';
}

// =========================
// PROMPT ASSEMBLY
// =========================

function assemblePrompt(
  components: PromptComponents,
  weights: PromptWeights
): string {
  // Priority-based assembly to stay under token limit
  const parts: string[] = [];
  
  // TIER 1: Essential (always include)
  parts.push(components.roomType);  // "A bedroom"
  if (components.style) parts.push(components.style);  // "in Scandinavian style"
  
  // TIER 2: High priority (mood + colors)
  if (components.mood) parts.push(components.mood);
  if (components.colors) parts.push(components.colors);
  
  // TIER 3: Medium priority (materials + lighting)
  if (components.materials) parts.push(components.materials);
  if (components.lighting) parts.push(components.lighting);
  
  // TIER 4: Context-dependent
  if (components.biophilia) parts.push(components.biophilia);
  if (components.functional) parts.push(components.functional);
  if (components.layout) parts.push(components.layout);
  
  // Join with proper punctuation
  let prompt = parts.join(', ');
  
  // Ensure proper capitalization and ending
  prompt = prompt.charAt(0).toUpperCase() + prompt.slice(1);
  if (!prompt.endsWith('.')) {
    prompt += '.';
  }
  
  // Token limit check (CLIP max is 77 tokens, we target ~65)
  const tokens = prompt.split(/\s+/);
  if (tokens.length > 65) {
    console.warn(`[Prompt Builder] Token count (${tokens.length}) exceeds recommended limit (65)`);
    console.warn(`[Prompt Builder] Consider using LLM refinement to condense`);
  }
  
  return prompt;
}

// =========================
// UTILITIES
// =========================

export function estimateTokenCount(text: string): number {
  // Rough estimation: split by whitespace
  return text.split(/\s+/).length;
}

export function validatePromptLength(prompt: string): {
  isValid: boolean;
  tokenCount: number;
  recommendation: string;
} {
  const tokenCount = estimateTokenCount(prompt);
  
  if (tokenCount <= 65) {
    return {
      isValid: true,
      tokenCount,
      recommendation: 'Prompt length is optimal'
    };
  } else if (tokenCount <= 77) {
    return {
      isValid: true,
      tokenCount,
      recommendation: 'Prompt is at limit, consider slight refinement'
    };
  } else {
    return {
      isValid: false,
      tokenCount,
      recommendation: 'Prompt exceeds CLIP limit (77 tokens), will be truncated. Use LLM refinement.'
    };
  }
}

// =========================
// EXPORT
// =========================

export {
  type PromptComponents
};

