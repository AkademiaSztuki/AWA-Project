// PROMPT SYNTHESIS - STEP 2: Template Builder
// Converts weighted scores into structured prompts for FLUX 2
// Supports both natural language (legacy) and JSON structured prompts (FLUX 2)
// Rule-based, deterministic, reproducible

import { PromptWeights } from './scoring';
import { GenerationSource } from './modes';
import { STYLE_OPTIONS, getStyleLabel } from '@/lib/questions/style-options';
import { generateLayoutVariation, layoutVariationToPhrase, getLayoutFurnitureInstructions } from './layout-diversity';

// =========================
// COLOR GENERATION
// =========================

/**
 * Generates temperature-based colors per source type
 * Ensures different sources get different colors even with same temperature
 */
function generateTemperatureBasedColors(
  temperature: number,
  sourceType?: GenerationSource
): string[] {
  // Base colors by temperature
  const warmColors = ['#D4A574', '#F5DEB3', '#DEB887', '#CD853F', '#D2691E', '#8B4513'];
  const coolColors = ['#87CEEB', '#B0E0E6', '#E0F6FF', '#4682B4', '#5F9EA0', '#20B2AA'];
  const neutralColors = ['#F5F5F5', '#E0E0E0', '#D3D3D3', '#A9A9A9', '#808080', '#696969'];
  
  // Select base palette based on temperature
  let basePalette: string[];
  if (temperature > 0.6) {
    basePalette = warmColors;
  } else if (temperature < 0.4) {
    basePalette = coolColors;
  } else {
    basePalette = neutralColors;
  }
  
  // Vary palette per source type to ensure diversity
  if (sourceType) {
    const sourceIndex = Object.values(GenerationSource).indexOf(sourceType);
    // Rotate palette based on source index
    const rotated = [...basePalette.slice(sourceIndex % basePalette.length), ...basePalette.slice(0, sourceIndex % basePalette.length)];
    return rotated.slice(0, 4);
  }
  
  return basePalette.slice(0, 4);
}

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
  
  // FLUX 2 supports much longer prompts (32K tokens), so we just log
  const tokens = prompt.split(/\s+/);
  if (tokens.length > 200) {
    console.log(`[Prompt Builder] Long prompt (${tokens.length} words) - FLUX 2 supports up to 32K tokens`);
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
  
  // FLUX 2 supports up to 32K tokens, so we're much more lenient
  if (tokenCount <= 200) {
    return {
      isValid: true,
      tokenCount,
      recommendation: 'Prompt length is optimal for FLUX 2'
    };
  } else if (tokenCount <= 1000) {
    return {
      isValid: true,
      tokenCount,
      recommendation: 'Long prompt - FLUX 2 handles this well'
    };
  } else {
    return {
      isValid: true, // Still valid, just very long
      tokenCount,
      recommendation: 'Very long prompt - FLUX 2 supports up to 32K tokens'
    };
  }
}

// =========================
// FLUX 2 JSON STRUCTURED PROMPTS
// =========================

/**
 * Normalizes a style string to a single valid style name.
 * Handles tag soup like "bohemian warm earth velvet marble..."
 * Preserves modifiers like "elevated", "optimized" for Mixed sources.
 */
function normalizeStyle(styleString: string): string {
  if (!styleString) return 'modern';
  
  const lower = styleString.toLowerCase().trim();
  
  // Check if it contains a valid style
  const validStyles = ['modern', 'scandinavian', 'industrial', 'minimalist', 'rustic',
    'bohemian', 'contemporary', 'traditional', 'mid-century', 'japandi',
    'coastal', 'farmhouse', 'mediterranean', 'art-deco', 'maximalist',
    'eclectic', 'hygge', 'zen', 'vintage', 'transitional'];
  
  // Preserve modifiers for Mixed sources (elevated, optimized)
  const modifiers = ['elevated', 'optimized', 'refined', 'enhanced'];
  let preservedModifier = '';
  for (const mod of modifiers) {
    if (lower.startsWith(mod + ' ')) {
      preservedModifier = mod + ' ';
      break;
    }
  }
  
  // Find the base style
  let baseStyle = '';
  for (const validStyle of validStyles) {
    if (lower.includes(validStyle)) {
      baseStyle = validStyle;
      break;
    }
  }
  
  // If it's a blended style like "bohemian with modern accents", extract the first one
  if (!baseStyle) {
    const parts = lower.split(/\s+(?:with|and|\+)\s+/);
    for (const part of parts) {
      for (const validStyle of validStyles) {
        if (part.includes(validStyle)) {
          baseStyle = validStyle;
          break;
        }
      }
      if (baseStyle) break;
    }
  }
  
  if (!baseStyle) {
    baseStyle = 'modern'; // Fallback
  }
  
  // Return with modifier if it was preserved
  return preservedModifier ? preservedModifier + baseStyle : baseStyle;
}

/**
 * Ensures color is in HEX format.
 */
function ensureHexColor(color: string): string {
  if (!color) return '#808080';
  
  // Already a hex code
  if (color.startsWith('#')) {
    return color;
  }
  
  // Common color mappings
  const colorMap: Record<string, string> = {
    'warm coral': '#FF7F50',
    'sunny yellow': '#FFD700',
    'soft gray': '#A9A9A9',
    'muted blue': '#6B8E9F',
    'deep teal': '#008080',
    'rich burgundy': '#800020',
    'sage green': '#9DC183',
    'sky blue': '#87CEEB',
    'blush pink': '#FFB6C1',
    'soft lavender': '#E6E6FA',
    'crisp white': '#FFFFFF',
    'charcoal': '#36454F',
    'beige': '#F5F5DC',
    'cream': '#FFFDD0',
    'warm beige': '#D4A574',
    'light oak': '#D4A574',
    'warm gray': '#8B7355',
    'neutral': '#808080',
    'warm tones': '#D4A574',
    'cool tones': '#6B8E9F',
  };
  
  const lowerColor = color.toLowerCase().trim();
  return colorMap[lowerColor] || '#808080';
}

/**
 * Gets room name in English for prompts
 */
function getRoomName(roomType: string): string {
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
  
  return roomTypeMap[roomType] || roomTypeMap.default;
}

/**
 * Adapts materials list for specific room types
 */
function adaptMaterialsForRoom(materials: string[], roomName: string): string[] {
  const roomMaterialPreferences: Record<string, string[]> = {
    'kitchen': ['durable surfaces', 'easy-clean materials', 'water-resistant finishes'],
    'bathroom': ['waterproof materials', 'moisture-resistant surfaces', 'non-porous finishes'],
    'bedroom': ['soft textiles', 'comfortable fabrics', 'cozy materials'],
    'living room': ['durable upholstery', 'quality materials', 'comfortable textures'],
    'home office': ['professional finishes', 'quality materials', 'focused textures']
  };
  
  const roomPrefs = roomMaterialPreferences[roomName] || [];
  // Combine user preferences with room-specific needs
  return [...materials.slice(0, 2), ...roomPrefs.slice(0, 2)].slice(0, 4);
}

/**
 * Gets room-specific lighting description
 */
function getRoomSpecificLighting(
  roomName: string,
  lightingMood: string,
  naturalLightImportance: number
): string {
  const roomLightingStrategies: Record<string, string> = {
    'kitchen': 'bright task lighting with ambient fill',
    'bedroom': 'layered lighting with dimmable options',
    'bathroom': 'bright, even lighting for grooming',
    'living room': 'flexible ambient and accent lighting',
    'home office': 'focused task lighting with natural light'
  };
  
  const baseStrategy = roomLightingStrategies[roomName] || getLightingDescription(lightingMood, naturalLightImportance);
  
  // Add mood-based adjustments
  if (lightingMood === 'warm_low' && roomName !== 'kitchen' && roomName !== 'bathroom') {
    return `warm, ${baseStrategy}`;
  } else if (lightingMood === 'cool_bright' && (roomName === 'kitchen' || roomName === 'home office')) {
    return `crisp, ${baseStrategy}`;
  }
  
  return baseStrategy;
}

/**
 * Gets room-specific lighting strategy
 */
function getRoomLightingStrategy(roomName: string): string {
  const strategies: Record<string, string> = {
    'kitchen': 'task-focused with ambient support',
    'bedroom': 'layered with blackout capability',
    'bathroom': 'even, shadow-free illumination',
    'living room': 'flexible multi-level lighting',
    'home office': 'focused task with natural integration'
  };
  
  return strategies[roomName] || 'balanced ambient lighting';
}

/**
 * Gets lighting description from mood
 */
function getLightingDescription(lightingMood: string, naturalLightImportance: number): string {
  const moodMap: Record<string, string> = {
    warm_low: 'soft, warm ambient lighting',
    warm_bright: 'bright, inviting warm light',
    neutral: 'balanced natural daylight',
    cool_bright: 'crisp, focused cool lighting'
  };
  
  let lighting = moodMap[lightingMood] || 'balanced lighting';
  
  if (naturalLightImportance > 0.7) {
    lighting += ' with abundant natural light';
  } else if (naturalLightImportance > 0.4) {
    lighting += ' with good natural light';
  }
  
  return lighting;
}

/**
 * Gets biophilia description
 */
function getBiophiliaDescription(natureDensity: number, elements: string[]): string {
  if (natureDensity < 0.1) {
    return 'minimal natural elements';
  }
  
  const level = Math.round(natureDensity * 3); // 0-3
  const levelDesc = level === 3 ? 'abundant' : level === 2 ? 'moderate' : level === 1 ? 'subtle' : 'minimal';
  
  if (elements.length > 0) {
    return `${levelDesc} natural elements including ${elements.slice(0, 2).join(' and ')}`;
  }
  
  return `${levelDesc} natural elements`;
}

/**
 * Extracts primary style from blended style string.
 * Handles cases like "rustic with scandinavian influences" → "rustic"
 */
function extractPrimaryStyle(styleString: string): string {
  if (!styleString) return 'modern';
  
  const lower = styleString.toLowerCase().trim();
  
  // Check if it's a blended style (contains "with", "influences", "accents", "touches")
  const isBlended = lower.includes(' with ') || 
                    lower.includes(' influences') ||
                    lower.includes(' accents') ||
                    lower.includes(' touches');
  
  if (!isBlended) {
    // Not blended - might still have modifiers like "elevated modern"
    const parts = lower.split(/\s+/);
    // Check if first word is a modifier
    const modifiers = ['elevated', 'optimized', 'refined', 'enhanced'];
    if (modifiers.includes(parts[0]) && parts.length > 1) {
      return parts[1];
    }
    return lower;
  }
  
  // Extract primary style (first part before "with")
  const parts = lower.split(/\s+(?:with|and|\+)\s+/);
  const primary = parts[0] || lower;
  
  // Remove any modifiers from primary
  const primaryParts = primary.split(/\s+/);
  const modifiers = ['elevated', 'optimized', 'refined', 'enhanced'];
  if (modifiers.includes(primaryParts[0]) && primaryParts.length > 1) {
    return primaryParts[1];
  }
  
  return primary;
}

/**
 * Gets source-specific items based on source data characteristics
 * Each source gets different items to ensure visual diversity
 * Returns room-appropriate items
 */
function getSourceSpecificItems(
  sourceType: GenerationSource,
  weights: PromptWeights | undefined,
  roomName: string
): string[] {
  const items: string[] = [];
  
  // Living room specific items per source
  if (roomName === 'living room') {
    if (sourceType === GenerationSource.Implicit && weights) {
      // Implicit: Use complexity, warmth, brightness from Tinder swipes
      const complexity = weights.visualComplexity || 0.5;
      const warmth = weights.colorTemperature || 0.5;
      const brightness = weights.naturalLightImportance || 0.5;
      
      // Base seating based on complexity
      if (complexity < 0.3) {
        items.push('minimalist sofa', 'simple coffee table');
      } else if (complexity > 0.7) {
        items.push('layered seating arrangement', 'decorative accent pieces', 'art objects');
      } else {
        items.push('stylish sofa', 'accent seating');
      }
      
      // Add warmth-based items
      if (warmth > 0.6) {
        items.push('cozy throw pillows', 'soft textiles');
      } else if (warmth < 0.4) {
        items.push('cool-toned accessories');
      }
      
      // Add brightness-based items
      if (brightness > 0.6) {
        items.push('light window treatments');
      }
      
      // Implicit always gets decorative elements (from visual preferences)
      items.push('decorative objects', 'art pieces');
      
    } else if (sourceType === GenerationSource.Explicit && weights) {
      // Explicit: Use selected materials and sensory preferences
      const materials = weights.primaryMaterials || [];
      
      // Base seating based on materials
      if (materials.some(m => m.toLowerCase().includes('velvet'))) {
        items.push('velvet-upholstered sofa', 'plush armchairs');
      } else if (materials.some(m => m.toLowerCase().includes('leather'))) {
        items.push('leather sofa', 'leather accent chair');
      } else if (materials.some(m => m.toLowerCase().includes('linen'))) {
        items.push('linen-upholstered sofa', 'natural fabric seating');
      } else {
        items.push('sofa', 'armchairs');
      }
      
      // Explicit gets intentional decorative elements
      items.push('side tables', 'decorative accessories', 'curated decor');
      
    } else if (sourceType === GenerationSource.Personality && weights) {
      // Personality: Use facet preferences to determine items
      const orderPref = weights.facetPreferences?.orderPreference || 0.5;
      const aestheticSens = weights.facetPreferences?.aestheticSensitivity || 0.5;
      const excitementSeek = weights.facetPreferences?.excitementSeeking || 0.5;
      const complexity = weights.visualComplexity || 0.5;
      
      // Base seating based on order preference
      if (orderPref > 0.6) {
        items.push('structured seating arrangement', 'organized storage solutions');
      } else if (orderPref < 0.4) {
        items.push('relaxed seating arrangement', 'flexible furniture');
      } else {
        items.push('stylish sofa', 'accent seating');
      }
      
      // Add aesthetic elements based on sensitivity
      if (aestheticSens > 0.6) {
        items.push('decorative objects', 'art pieces', 'curated artwork');
      }
      
      // Add dynamic elements based on excitement seeking
      if (excitementSeek > 0.6) {
        items.push('dynamic accent pieces', 'varied textures', 'bold accessories');
      } else if (excitementSeek < 0.4) {
        items.push('calm, balanced elements');
      }
      
      // Complexity affects item variety
      if (complexity > 0.7) {
        items.push('layered decorative elements');
      } else if (complexity < 0.3) {
        items.push('minimal decorative accents');
      }
      
    } else if (sourceType === GenerationSource.Mixed) {
      // Mixed: Balanced blend of aesthetic elements
      items.push('sofa', 'accent chair', 'side tables', 'accent pieces', 'decorative elements');
      
    } else if (sourceType === GenerationSource.MixedFunctional) {
      // MixedFunctional: Base items, activities will add more
      items.push('sofa', 'armchair');
    }
  } else {
    // For other rooms, return generic items that will be filtered/adapted by calling function
    if (sourceType === GenerationSource.Implicit) {
      items.push('stylish furniture', 'accent pieces', 'decorative objects');
    } else if (sourceType === GenerationSource.Explicit) {
      items.push('furniture', 'seating', 'decorative accessories');
    } else if (sourceType === GenerationSource.Personality) {
      items.push('furniture', 'accent pieces', 'decorative elements');
    } else if (sourceType === GenerationSource.Mixed) {
      items.push('furniture', 'accent pieces', 'decorative elements');
    }
  }
  
  return items;
}

/**
 * Gets furniture items appropriate for room type, style, activities, and source type
 * 
 * PHILOSOPHY:
 * - Start with MINIMAL neutral furniture (no assumptions about user needs)
 * - Add functional items ONLY when user explicitly declared them
 * - For non-functional sources (Implicit, Personality), use generic descriptions
 * - Never assume user wants TV, desk, bookshelf etc. unless they said so
 * - Source-specific items vary based on source data characteristics
 */
function getFurnitureForRoom(
  roomName: string, 
  style: string, 
  weights?: PromptWeights,
  sourceType?: GenerationSource
): string[] {
  // MINIMAL BASE: Universal items that every living space needs
  // NO assumptions about specific functions (no TV, no desk, no bookshelf)
  const minimalBaseFurniture: Record<string, string[]> = {
    'living room': ['comfortable seating', 'coffee table', 'ambient lighting', 'area rug'],
    'bedroom': ['bed with headboard', 'nightstands', 'soft lighting', 'area rug'],
    'kitchen': ['dining surface', 'seating', 'task lighting', 'storage'],
    'bathroom': ['vanity', 'mirror', 'storage', 'textiles'],
    'home office': ['work surface', 'seating', 'task lighting', 'storage'],
    'dining room': ['dining table', 'seating', 'ambient lighting', 'area rug'],
    'children\'s bedroom': ['bed', 'storage', 'soft rug', 'lighting']
  };
  
  // Concrete style descriptors - return specific, descriptive phrases for FLUX 2
  const getStyleDescriptor = (style: string, item: string): string => {
    const styleLower = style.toLowerCase();
    
    // Map style to concrete description
    const descriptors: Record<string, (item: string) => string> = {
      'modern': (i) => `sleek ${i} with clean lines and minimalist design`,
      'scandinavian': (i) => `${i} in light wood with clean, simple lines`,
      'bohemian': (i) => `eclectic ${i} with rich textures and patterns`,
      'industrial': (i) => `${i} with exposed metal details and raw wood finishes`,
      'minimalist': (i) => `simple, functional ${i} with clean geometry`,
      'rustic': (i) => `${i} in natural wood with warm, organic textures`,
      'contemporary': (i) => `modern ${i} with clean lines and neutral tones`,
      'traditional': (i) => `classic ${i} with elegant, timeless design`,
      'mid-century': (i) => `retro ${i} in 1950s-60s style with tapered legs`,
      'japandi': (i) => `${i} blending Japanese minimalism with Scandinavian warmth`,
      'wabi_sabi': (i) => `imperfect, organic ${i} with natural textures`,
      'wabi': (i) => `imperfect, organic ${i} with natural textures`,
      'art_deco': (i) => `geometric ${i} with luxurious materials and bold shapes`,
      'art_nouveau': (i) => `flowing ${i} with organic, curved lines`,
      'hollywood_regency': (i) => `glamorous ${i} with bold patterns and luxurious finishes`,
      'french_provincial': (i) => `refined ${i} with romantic, elegant details`,
      'english_country': (i) => `cozy ${i} with traditional, comfortable design`,
      'nordic_hygge': (i) => `cozy ${i} with warm textures and soft lighting`,
      'california_casual': (i) => `relaxed ${i} with natural materials and easy-going style`,
      'brooklyn_loft': (i) => `urban ${i} with industrial elements and modern edge`,
      'parisian_chic': (i) => `elegant ${i} with refined, sophisticated details`,
      'memphis_postmodern': (i) => `bold ${i} with playful geometric patterns`,
      'memphis': (i) => `bold ${i} with playful geometric patterns`
    };
    
    // Find matching descriptor
    for (const [key, fn] of Object.entries(descriptors)) {
      if (styleLower.includes(key)) {
        return fn(item);
      }
    }
    
    // Fallback: use style name with item
    return `${style} ${item}`;
  };
  
  // Start with minimal base
  let furniture: string[] = [...(minimalBaseFurniture[roomName] || minimalBaseFurniture['living room'])];
  
  // Source type determines how we build furniture list
  const hasFunctionalData = weights && (
    weights.primaryActivity || 
    (weights.secondaryActivities && weights.secondaryActivities.length > 0) ||
    (weights.functionalPriorities && weights.functionalPriorities.length > 0)
  );
  
  const isImplicit = sourceType === GenerationSource.Implicit;
  const isExplicit = sourceType === GenerationSource.Explicit;
  const isPersonality = sourceType === GenerationSource.Personality;
  const isMixed = sourceType === GenerationSource.Mixed;
  const isMixedFunctional = sourceType === GenerationSource.MixedFunctional;
  
  if (roomName === 'living room') {
    // For FUNCTIONAL sources (MixedFunctional) - add items based on declared needs
    if (isMixedFunctional && hasFunctionalData && weights) {
      const primaryActivity = weights.primaryActivity;
      const secondaryActivities = weights.secondaryActivities || [];
      const allActivities = [primaryActivity, ...secondaryActivities].filter(Boolean);
      const functionalPriorities = weights.functionalPriorities || [];
      
      // Replace generic seating with specific based on needs
      furniture = furniture.filter(item => item !== 'comfortable seating');
      
      // Seating based on activity
      if (allActivities.includes('family_time') || functionalPriorities.includes('sectional_sofa')) {
        furniture.unshift('sectional sofa');
        furniture.push('ottoman');
      } else if (allActivities.includes('entertain')) {
        furniture.unshift('sofa');
        furniture.push('accent chairs', 'additional seating');
      } else {
        furniture.unshift('sofa', 'armchair');
      }
      
      // Add ONLY items user explicitly needs
      if (allActivities.includes('watch_tv') || allActivities.includes('movies')) {
        furniture.push('media console'); // NOT "TV stand" - more neutral
      }
      
      if (allActivities.includes('read')) {
        furniture.push('reading chair', 'bookshelf', 'reading lamp');
      }
      
      if (allActivities.includes('work')) {
        furniture.push('desk area', 'task lighting');
      }
      
      if (allActivities.includes('play') || allActivities.includes('games')) {
        furniture.push('open floor space', 'storage for games');
      }
      
      if (allActivities.includes('entertain')) {
        furniture.push('bar cart or drinks station');
      }
      
      // Functional priorities
      if (functionalPriorities.includes('storage_solutions') || functionalPriorities.includes('organization systems')) {
        furniture.push('built-in storage', 'storage furniture');
      }
      
      if (functionalPriorities.includes('zoning_for_multiple_users')) {
        furniture.push('room divider elements', 'multiple seating zones');
      }
      
    } else {
      // For AESTHETIC sources (Implicit, Explicit, Personality, Mixed) - use source-specific items
      furniture = furniture.filter(item => item !== 'comfortable seating');
      
      // Get source-specific items based on source data - different per source
      const sourceItems = getSourceSpecificItems(sourceType!, weights, roomName);
      
      if (isImplicit || isExplicit || isPersonality) {
        // Replace base furniture with source-specific items
        furniture = [...sourceItems, ...furniture.filter(item => 
          item === 'coffee table' || item === 'ambient lighting' || item === 'area rug'
        )];
      } else if (isMixed) {
        // Mixed: Use source items + base
        furniture = [...sourceItems, ...furniture.filter(item => 
          item === 'coffee table' || item === 'ambient lighting' || item === 'area rug'
        )];
        
        // Add functional items only if user has data
        if (hasFunctionalData && weights) {
          const allActivities = [weights.primaryActivity, ...(weights.secondaryActivities || [])].filter(Boolean);
          if (allActivities.includes('read')) {
            furniture.push('bookshelf');
          }
        }
      }
    }
  } else if (roomName === 'bedroom') {
    // Bedroom-specific logic per source
    furniture = furniture.filter(item => !item.includes('seating') && !item.includes('coffee table'));
    
    if (isMixedFunctional && hasFunctionalData && weights) {
      const allActivities = [weights.primaryActivity, ...(weights.secondaryActivities || [])].filter(Boolean);
      
      if (allActivities.includes('work')) {
        furniture.push('desk area', 'task lighting');
      }
      if (allActivities.includes('read')) {
        furniture.push('reading chair', 'bookshelf', 'reading lamp');
      }
      if (allActivities.includes('relax')) {
        furniture.push('comfortable seating area', 'soft lighting');
      }
    } else {
      // Use source-specific items for bedroom
      const sourceItems = getSourceSpecificItems(sourceType!, weights, roomName);
      furniture = [...sourceItems.filter(item => 
        item.includes('bed') || item.includes('seating') || item.includes('storage') || item.includes('lighting')
      ), ...furniture];
    }
    
  } else if (roomName === 'kitchen') {
    // Kitchen-specific logic per source
    if (isMixedFunctional && hasFunctionalData && weights) {
      const allActivities = [weights.primaryActivity, ...(weights.secondaryActivities || [])].filter(Boolean);
      
      if (allActivities.includes('entertain') || allActivities.includes('family_time')) {
        furniture.push('island with seating', 'bar stools');
      }
      if (allActivities.includes('work') || weights.functionalPriorities?.includes('organization systems')) {
        furniture.push('organized storage systems', 'pantry organization');
      }
    } else {
      const sourceItems = getSourceSpecificItems(sourceType!, weights, roomName);
      furniture = [...sourceItems.filter(item => 
        item.includes('storage') || item.includes('seating') || item.includes('surface')
      ), ...furniture];
    }
    
  } else if (roomName === 'bathroom') {
    // Bathroom-specific logic per source
    if (isMixedFunctional && hasFunctionalData && weights) {
      const allActivities = [weights.primaryActivity, ...(weights.secondaryActivities || [])].filter(Boolean);
      
      if (allActivities.includes('relax')) {
        furniture.push('bathtub area', 'relaxation elements');
      }
      if (weights.functionalPriorities?.includes('storage_solutions')) {
        furniture.push('organized storage', 'vanity storage');
      }
    } else {
      const sourceItems = getSourceSpecificItems(sourceType!, weights, roomName);
      furniture = [...sourceItems.filter(item => 
        item.includes('storage') || item.includes('vanity') || item.includes('textiles')
      ), ...furniture];
    }
    
  } else if (roomName === 'home office') {
    // Home office-specific logic per source
    if (isMixedFunctional && hasFunctionalData && weights) {
      const allActivities = [weights.primaryActivity, ...(weights.secondaryActivities || [])].filter(Boolean);
      
      if (allActivities.includes('read')) {
        furniture.push('reading area', 'bookshelf');
      }
      if (weights.functionalPriorities?.includes('storage_solutions')) {
        furniture.push('organized filing system', 'storage furniture');
      }
    } else {
      const sourceItems = getSourceSpecificItems(sourceType!, weights, roomName);
      furniture = [...sourceItems.filter(item => 
        item.includes('work') || item.includes('storage') || item.includes('seating')
      ), ...furniture];
    }
    
  } else if (roomName === 'dining room') {
    // Dining room-specific logic per source
    if (isMixedFunctional && hasFunctionalData && weights) {
      const allActivities = [weights.primaryActivity, ...(weights.secondaryActivities || [])].filter(Boolean);
      
      if (allActivities.includes('entertain')) {
        furniture.push('extendable dining table', 'additional seating');
      }
      if (weights.functionalPriorities?.includes('storage_solutions')) {
        furniture.push('china cabinet', 'storage for dining accessories');
      }
    } else {
      const sourceItems = getSourceSpecificItems(sourceType!, weights, roomName);
      furniture = [...sourceItems.filter(item => 
        item.includes('dining') || item.includes('seating') || item.includes('table')
      ), ...furniture];
    }
  }
  
  // Deduplicate
  furniture = Array.from(new Set(furniture));
  
  // Limit quantity per source type for diversity
  let maxItems: number;
  if (sourceType === GenerationSource.Implicit) {
    maxItems = 6; // Intuitive, less structured
  } else if (sourceType === GenerationSource.Explicit) {
    maxItems = 8; // Intentional, complete
  } else if (sourceType === GenerationSource.Personality) {
    maxItems = 7; // Based on complexity preference
    if (weights?.visualComplexity) {
      maxItems = weights.visualComplexity > 0.7 ? 8 : weights.visualComplexity < 0.3 ? 6 : 7;
    }
  } else if (sourceType === GenerationSource.Mixed) {
    maxItems = 8; // Balanced
  } else if (sourceType === GenerationSource.MixedFunctional) {
    maxItems = 10; // Most complete
  } else {
    maxItems = 7; // Default
  }
  
  furniture = furniture.slice(0, maxItems);
  
  // Extract primary style from blended style string
  const primaryStyle = extractPrimaryStyle(style);
  
  // Apply concrete style descriptors - each item gets its own unique descriptor
  // Remove generic base items and apply style to each specific item
  return furniture.map(item => {
    // Extract the base item name (remove any existing style descriptors)
    const baseItem = item
      .replace(/^(sleek|eclectic|retro|modern|classic|stylish|minimalist|simple|comfortable|cozy|light|dark|warm|cool)\s+/i, '')
      .replace(/\s+with\s+.*$/i, '')
      .trim();
    
    // Apply style descriptor to the base item
    return getStyleDescriptor(primaryStyle, baseItem);
  });
}

/**
 * Builds FLUX 2 JSON structured prompt
 * This format gives precise control over all design elements
 * 
 * @param weights - Calculated prompt weights
 * @param roomType - Type of room being designed
 * @param sourceType - Optional source type for source-specific customization
 */
export function buildFlux2Prompt(
  weights: PromptWeights,
  roomType: string,
  sourceType?: GenerationSource
): string {
  const roomName = getRoomName(roomType);
  
  // Normalize style - extract valid style from potential tag soup
  const rawStyle = weights.dominantStyle || 'modern';
  
  // Check if it's a blended style (contains "with" or "influences" or "accents")
  const isBlendedStyle = rawStyle.toLowerCase().includes(' with ') || 
                         rawStyle.toLowerCase().includes(' influences') ||
                         rawStyle.toLowerCase().includes(' accents') ||
                         rawStyle.toLowerCase().includes(' touches');
  
  let normalizedStyleId: string;
  let styleLabel: string;
  let styleDescription: string;
  
  if (isBlendedStyle) {
    // For blended styles, extract the primary style for STYLE_OPTIONS lookup
    // but keep the full blended description
    const primaryStyle = normalizeStyle(rawStyle);
    const styleOption = STYLE_OPTIONS.find(s => s.id === primaryStyle);
    const primaryLabel = styleOption ? styleOption.labelEn : primaryStyle;
    
    // Use the full blended style as label
    styleLabel = rawStyle;
    normalizedStyleId = primaryStyle; // Use primary for color/material lookups
    styleDescription = styleOption ? styleOption.description : '';
  } else {
    // For simple styles, normalize and use STYLE_OPTIONS
    normalizedStyleId = normalizeStyle(rawStyle);
    const styleOption = STYLE_OPTIONS.find(s => s.id === normalizedStyleId);
    styleLabel = styleOption ? styleOption.labelEn : normalizedStyleId;
    styleDescription = styleOption ? styleOption.description : '';
  }
  
  // For InspirationReference, use tags from inspirations (handled in index.ts)
  // This function should not be called for InspirationReference, but if it is, return minimal prompt
  if (sourceType === GenerationSource.InspirationReference) {
    const promptJson = {
      scene: `${roomName} interior design transformation`,
      instruction: "Transform using specific style elements from reference images while preserving all architectural structure - walls, windows, doors, ceiling, floor positions, and perspective must remain exactly as in the input image",
      reference_usage: "Apply concrete style, colors, and materials from the analyzed inspiration images",
      preserve: ["walls", "windows", "doors", "ceiling", "floor layout", "room perspective", "architectural elements"],
      photography: "professional interior photography, high quality"
    };
    return JSON.stringify(promptJson, null, 2);
  }
  
  // Mood determination - differentiate by source type
  const isMixed = sourceType === GenerationSource.Mixed || sourceType === GenerationSource.MixedFunctional;
  const isMixedFunctional = sourceType === GenerationSource.MixedFunctional;
  
  let mood: string;
  if (weights.needsCalming > 0.6) {
    mood = 'serene, calming, peaceful';
  } else if (weights.needsEnergizing > 0.6) {
    mood = 'energizing, vibrant, dynamic';
  } else if (weights.needsInspiration > 0.6) {
    mood = 'inspiring, creative, stimulating';
  } else if (weights.needsGrounding > 0.6) {
    mood = 'grounded, stable, balanced';
  } else {
    // Differentiate fallback mood by source type
    if (isMixedFunctional) {
      mood = 'functional, organized, balanced';
    } else if (isMixed) {
      mood = 'harmonious, balanced, refined';
    } else if (sourceType === GenerationSource.Implicit) {
      mood = 'intuitive, comfortable, natural';
    } else if (sourceType === GenerationSource.Explicit) {
      mood = 'intentional, comfortable, balanced';
    } else if (sourceType === GenerationSource.Personality) {
      mood = 'personalized, comfortable, balanced';
  } else {
    mood = 'comfortable, balanced';
    }
  }
  
  // Color palette - FLUX.2 JSON requires hex codes in color_palette array
  // According to documentation: "color_palette": ["#hex1", "#hex2", "#hex3"]
  // weights.colorPalette should already contain hex codes from integrateColorPreferences
  let colorPalette: string[] = [];
  
  if (weights.colorPalette && weights.colorPalette.length > 0) {
    // Filter to only hex colors and convert any non-hex
    weights.colorPalette.slice(0, 4).forEach(color => {
      if (color.startsWith('#')) {
        colorPalette.push(color);
      } else {
        const hex = ensureHexColor(color);
        if (hex !== '#808080') { // Don't add gray fallback
          colorPalette.push(hex);
        }
      }
    });
  }
  
  // If no valid colors, derive from style
  if (colorPalette.length === 0) {
    const styleColorMap: Record<string, string[]> = {
      'modern': ['#FFFFFF', '#2C3E50', '#95A5A6', '#BDC3C7'],
      'scandinavian': ['#FFFFFF', '#F5F5DC', '#D4A574', '#87CEEB'],
      'bohemian': ['#8B4513', '#DAA520', '#CD853F', '#D2691E'],
      'industrial': ['#36454F', '#708090', '#A9A9A9', '#D2691E'],
      'minimalist': ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#000000'],
      'rustic': ['#8B4513', '#D2691E', '#DEB887', '#F5DEB3'],
      'contemporary': ['#FFFFFF', '#808080', '#000000', '#C0C0C0'],
      'traditional': ['#800020', '#DAA520', '#F5F5DC', '#8B4513'],
      'mid-century': ['#FF6347', '#FFD700', '#008080', '#F5F5DC'],
      'japandi': ['#F5F5DC', '#D4A574', '#808080', '#2F4F4F'],
      'coastal': ['#FFFFFF', '#87CEEB', '#F5DEB3', '#20B2AA'],
      'eclectic': ['#FF6347', '#9370DB', '#20B2AA', '#FFD700'],
      'hygge': ['#F5F5DC', '#D2B48C', '#8B7355', '#A0522D']
    };
    
    // Instead of styleColorMap fallback, use temperature-based colors per source
    // This ensures different sources get different colors even with same style
    colorPalette = generateTemperatureBasedColors(weights.colorTemperature, sourceType);
  }
  
  // Deduplicate colors
  const uniqueColors = Array.from(new Set(colorPalette));
  
  // Materials - room-specific adaptations
  let materials = weights.primaryMaterials?.slice(0, 4) || ['natural materials'];
  materials = adaptMaterialsForRoom(materials, roomName);
  
  // Lighting - room-specific strategies
  const lighting = {
    type: getRoomSpecificLighting(roomName, weights.lightingMood, weights.naturalLightImportance),
    natural_light: weights.naturalLightImportance > 0.5 ? 'abundant' : 'moderate',
    strategy: getRoomLightingStrategy(roomName)
  };
  
  // Furniture style - for blended styles, create blended furniture description
  let furnitureStyle: string;
  if (isBlendedStyle) {
    // Extract both primary and secondary styles for blended furniture
    const styleParts = rawStyle.toLowerCase().split(/\s+(?:with|and|\+)\s+/);
    const primaryStyle = styleParts[0] || normalizedStyleId;
    const secondaryStyle = styleParts[1] || null;
    
    const primaryStyleMod = STYLE_OPTIONS.find(s => s.id === primaryStyle)?.labelEn || primaryStyle;
    
    if (secondaryStyle) {
      const secondaryStyleMod = STYLE_OPTIONS.find(s => s.id === secondaryStyle)?.labelEn || secondaryStyle;
      // Create blended furniture description
      furnitureStyle = `${primaryStyleMod} furniture with ${secondaryStyleMod} influences`;
    } else {
      furnitureStyle = `${primaryStyleMod} furniture with clean lines`;
    }
  } else {
    furnitureStyle = `${styleLabel} furniture with clean lines`;
  }
  
  // Biophilia - convert numeric level to descriptive text for FLUX.2
  const biophiliaLevel = weights.natureDensity;
  const biophiliaElements = weights.biophilicElements?.slice(0, 4) || [];
  
  let biophiliaDescription: string;
  let plantDensity: string;
  let naturalElements: string[];
  
  if (biophiliaLevel <= 0.05) {
    // User explicitly chose NO plants (biophiliaScore = 0)
    biophiliaDescription = 'no plants or greenery - clean, plant-free space';
    plantDensity = 'no plants';
    naturalElements = [];
  } else if (biophiliaLevel < 0.2) {
    biophiliaDescription = 'minimal greenery - one small potted plant on a shelf';
    plantDensity = 'minimal plants';
    naturalElements = ['one small plant'];
  } else if (biophiliaLevel < 0.4) {
    biophiliaDescription = 'subtle natural touches - 2-3 small plants, natural wood accents';
    plantDensity = 'few plants';
    naturalElements = biophiliaElements.length > 0 ? biophiliaElements : ['small plants', 'natural wood'];
  } else if (biophiliaLevel < 0.6) {
    biophiliaDescription = 'moderate greenery - several medium plants, natural materials throughout';
    plantDensity = 'several plants';
    naturalElements = biophiliaElements.length > 0 ? biophiliaElements : ['medium plants', 'natural materials'];
  } else if (biophiliaLevel < 0.8) {
    biophiliaDescription = 'abundant plants - large floor plants, hanging planters, natural textures';
    plantDensity = 'many plants';
    naturalElements = biophiliaElements.length > 0 ? biophiliaElements : ['large plants', 'hanging planters'];
  } else {
    biophiliaDescription = 'lush indoor jungle - many large plants, vertical garden elements, botanical atmosphere';
    plantDensity = 'abundant plants';
    naturalElements = biophiliaElements.length > 0 ? biophiliaElements : ['large plants', 'vertical garden', 'botanical'];
  }
  
  // Add specific elements if available and not already included
  if (biophiliaElements.length > 0 && biophiliaLevel > 0.05) {
    biophiliaDescription += `, featuring ${biophiliaElements.join(', ')}`;
  }
  
  const biophilia = {
    description: biophiliaDescription,
    plant_density: plantDensity,
    natural_elements: naturalElements
  };
  
  // Build style string - use enriched description if available
  // For blended styles, don't add description (it's already descriptive)
  const styleString = isBlendedStyle
    ? styleLabel
    : (styleDescription ? `${styleLabel}: ${styleDescription}` : styleLabel);
  
  // Generate layout variation for diversity
  const layoutVariation = sourceType ? generateLayoutVariation(sourceType, weights) : null;
  
  // Build JSON structure with clear transformation instructions
  // FLUX.2 needs explicit instructions about what to change vs preserve
  // For blended styles, use the full description; for simple styles, use label
  const sceneStyleLabel = isBlendedStyle ? styleLabel : styleLabel;
  const instructionStyleLabel = isBlendedStyle ? styleLabel : styleLabel;
  
  const promptJson: any = {
    scene: `Complete ${roomName} redesign in ${sceneStyleLabel} style`,
    instruction: `REMOVE all existing furniture, decorations, rugs, curtains, and accessories. REPLACE with new ${instructionStyleLabel} style furniture and decor. KEEP only the architectural shell: walls, windows, doors, ceiling structure, and floor.`,
    style: styleString,
    mood: mood,
    color_palette: uniqueColors,
    materials: materials,
    lighting: lighting,
    furniture: {
      style: furnitureStyle,
      items: getFurnitureForRoom(roomName, styleLabel, weights, sourceType),
      action: "completely replace - remove old, add new"
    },
    decor: {
      style: `${sceneStyleLabel} decorative elements`,
      action: "add new decorations matching the style"
    },
    biophilia: biophilia,
    remove: ["all existing furniture", "current rugs and carpets", "existing curtains", "current decorations", "old accessories"],
    preserve: ["wall positions", "window locations", "door frames", "ceiling height", "floor material"],
    photography: "professional interior photography, high resolution, realistic"
  };
  
  // Add layout variation for diversity
  if (layoutVariation) {
    promptJson.layout = {
      arrangement: layoutVariation.arrangement,
      focal_point: layoutVariation.focalPoint,
      furniture_grouping: layoutVariation.furnitureGrouping,
      zoning: layoutVariation.zoning,
      description: layoutVariation.description,
      furniture_instructions: getLayoutFurnitureInstructions(layoutVariation)
    };
  }
  
  // Add source-specific fields
  if (sourceType === GenerationSource.MixedFunctional) {
    // Add functional requirements for MixedFunctional
    if (weights.primaryActivity) {
      promptJson.functional_requirements = {
        primary_activity: weights.primaryActivity,
        secondary_activities: weights.secondaryActivities?.slice(0, 2) || [],
        priorities: weights.functionalPriorities?.slice(0, 3) || []
      };
    }
    if (weights.addressPainPoints && weights.addressPainPoints.length > 0) {
      promptJson.address_pain_points = weights.addressPainPoints.slice(0, 3);
    }
    
    // NEW: Mood transformation recommendations
    if (weights.moodTransformation) {
      const mt = weights.moodTransformation;
      
      // Modify colors based on mood transformation
      if (mt.colorRecommendations.temperature === 'warm') {
        promptJson.mood_color_adjustment = 'warm, soothing palette';
      } else if (mt.colorRecommendations.temperature === 'cool') {
        promptJson.mood_color_adjustment = 'cool, calming palette';
      }
      
      if (mt.colorRecommendations.saturation === 'muted') {
        promptJson.color_saturation = 'muted, soft tones';
      } else if (mt.colorRecommendations.saturation === 'vibrant') {
        promptJson.color_saturation = 'vibrant, energetic colors';
      }
      
      // Add specific colors if recommended
      if (mt.colorRecommendations.specificColors && mt.colorRecommendations.specificColors.length > 0) {
        promptJson.mood_colors = mt.colorRecommendations.specificColors.slice(0, 3);
      }
      
      // Add texture recommendations
      if (mt.textureRecommendations.suggestions.length > 0) {
        promptJson.texture_emphasis = mt.textureRecommendations.suggestions.slice(0, 3);
      }
      
      // Adjust biophilia
      const adjustedBiophilia = weights.natureDensity + mt.biophiliaModifier;
      promptJson.biophilia_level = adjustedBiophilia > 0.7 ? 'abundant' : 
                                   adjustedBiophilia > 0.4 ? 'moderate' : 'minimal';
      
      // Add mood transformation context
      // Direction already describes the transformation
      const directionDescriptions: Record<string, { from: string; to: string }> = {
        'stressed_to_relaxed': { from: 'stressed, tense', to: 'relaxed, calm' },
        'bored_to_inspired': { from: 'boring, uninspiring', to: 'inspiring, stimulating' },
        'chaotic_to_grounded': { from: 'chaotic, overwhelming', to: 'grounded, stable' },
        'low_to_energized': { from: 'low energy, tired', to: 'energized, vibrant' },
        'neutral': { from: 'balanced', to: 'balanced' }
      };
      
      const directionDesc = directionDescriptions[mt.direction] || { from: 'current state', to: 'desired state' };
      
      promptJson.mood_transformation = {
        from: directionDesc.from,
        to: directionDesc.to,
        approach: mt.direction,
        magnitude: mt.magnitude
      };
      
      // Adjust lighting based on mood transformation
      if (mt.lightingRecommendations.warmth !== 'neutral') {
        promptJson.lighting_warmth = mt.lightingRecommendations.warmth;
      }
      if (mt.lightingRecommendations.intensity !== 'moderate') {
        promptJson.lighting_intensity = mt.lightingRecommendations.intensity;
      }
      if (mt.lightingRecommendations.naturalLight === 'essential') {
        promptJson.natural_light = 'essential, maximize windows and natural light sources';
      }
      
      // Adjust complexity
      if (mt.complexityModifier < -0.1) {
        promptJson.complexity_adjustment = 'simplified, minimal visual clutter';
      } else if (mt.complexityModifier > 0.1) {
        promptJson.complexity_adjustment = 'enhanced visual interest, varied textures and elements';
      }
      
      // Layout recommendations
      if (mt.layoutRecommendations.openness !== 'balanced') {
        promptJson.layout_openness = mt.layoutRecommendations.openness;
      }
      if (mt.layoutRecommendations.flow !== 'structured') {
        promptJson.layout_flow = mt.layoutRecommendations.flow;
      }
    }
    
    // Social context recommendations
    if (weights.socialContextRecommendations) {
      const sc = weights.socialContextRecommendations;
      promptJson.social_design = {
        layout_openness: sc.layoutOpenness,
        furniture_scale: sc.furnitureScale,
        durability_priority: sc.durabilityPriority,
        privacy_elements: sc.privacyElements,
        social_elements: sc.socialElements
      };
    }
    
    // Activity priorities (focus on "difficult" satisfaction)
    if (weights.activityNeeds && weights.activityNeeds.needsImprovement) {
      promptJson.improve_activities = {
        priority_activities: weights.activityNeeds.priorityActivities,
        specific_needs: weights.activityNeeds.specificNeeds.slice(0, 5)
      };
    }
  }
  
  if (sourceType === GenerationSource.Personality && weights.designImplications) {
    // Add personality signature for Personality source
    promptJson.personality_signature = {
      visual_complexity: weights.visualComplexity > 0.6 ? 'high' : weights.visualComplexity < 0.4 ? 'low' : 'moderate',
      design_approach: weights.designImplications.minimalistTendency ? 'minimalist' :
                       weights.designImplications.eclecticMix ? 'eclectic' :
                       weights.designImplications.cozyTextures ? 'cozy' : 'balanced',
      texture_preference: weights.designImplications.softTextures ? 'soft' : 'varied',
      color_approach: weights.designImplications.boldColors ? 'bold' : 'subtle'
    };
  }
  
  // FLUX.2 supports JSON structured prompts - use JSON for precise control
  // According to documentation: "FLUX.2 understands both formats equally well"
  // JSON is better for complex interior design scenes with multiple elements
  return JSON.stringify(promptJson, null, 2);
}

// =========================
// EXPORT
// =========================

export {
  type PromptComponents
  // buildFlux2Prompt is already exported above as a named export
};

