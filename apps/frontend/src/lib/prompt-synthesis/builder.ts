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
export function ensureHexColor(color: string): string {
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
function getBiophiliaDescriptors(
  natureDensity: number,
  elements: string[]
): {
  tier: 'none' | 'minimal' | 'subtle' | 'light' | 'moderate' | 'abundant' | 'lush';
  description: string;
  plantDensity: string;
  naturalElements: string[];
  shortPhrase: string;
} {
  const d = Math.max(0, Math.min(1, natureDensity));

  type TierSpec = {
    max: number;
    tier: 'none' | 'minimal' | 'subtle' | 'light' | 'moderate' | 'abundant' | 'lush';
    plantDensity: string;
    baseElements: string[];
    shortPhrase: string;
    description: string;
  };

  const tiers: TierSpec[] = [
    {
      max: 0.05,
      tier: 'none',
      plantDensity: 'no plants',
      baseElements: [],
      shortPhrase: 'no plants or greenery',
      description: 'no plants or greenery - clean, plant-free space'
    },
    {
      max: 0.17, // ~1/6
      tier: 'minimal',
      plantDensity: 'minimal plants',
      baseElements: ['one tiny plant'],
      shortPhrase: 'minimal natural touches (1 tiny plant)',
      description: 'minimal natural touches - one tiny potted plant on a shelf'
    },
    {
      max: 0.34, // ~2/6
      tier: 'subtle',
      plantDensity: 'few plants',
      baseElements: ['two small plants', 'light wood'],
      shortPhrase: 'subtle natural accents (2 small plants)',
      description: 'subtle natural accents - 2 small plants and light wood detail'
    },
    {
      max: 0.5, // ~3/6
      tier: 'light',
      plantDensity: 'several plants',
      baseElements: ['3-4 small/medium plants', 'natural materials'],
      shortPhrase: 'natural presence (3-4 small/medium plants)',
      description: 'natural presence - 3-4 small/medium plants, natural materials'
    },
    {
      max: 0.67, // ~4/6
      tier: 'moderate',
      plantDensity: 'many plants',
      baseElements: ['4-6 mixed plants', 'rattan', 'linen', 'wood'],
      shortPhrase: 'moderate greenery (4-6 mixed plants)',
      description: 'moderate greenery - 4-6 mixed plants, visible natural textures'
    },
    {
      max: 0.83, // ~5/6
      tier: 'abundant',
      plantDensity: 'abundant plants',
      baseElements: ['6-8 plants', 'one floor plant', 'one hanging planter', 'natural textures'],
      shortPhrase: 'abundant greenery (floor + hanging planters)',
      description: 'abundant greenery - floor plant plus hanging planter, 6-8 plants total'
    },
    {
      max: 1.0,
      tier: 'lush',
      plantDensity: 'jungle-like',
      baseElements: ['8-12 plants', 'large floor plants', 'vertical greenery', 'botanical atmosphere'],
      shortPhrase: 'lush indoor jungle (8-12 plants)',
      description: 'lush indoor jungle - many large plants, vertical green accents'
    }
  ];

  const tier = tiers.find(t => d <= t.max) || tiers[tiers.length - 1];

  const mergedElements = Array.from(
    new Set([...(tier.baseElements || []), ...(elements || [])])
  ).slice(0, 5);

  return {
    tier: tier.tier,
    description: tier.description,
    plantDensity: tier.plantDensity,
    naturalElements: mergedElements,
    shortPhrase: tier.shortPhrase
  };
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
    
    // Simple, non-repetitive descriptors
    const descriptors: Record<string, (item: string) => string> = {
      'modern': (i) => `modern ${i}`,
      'scandinavian': (i) => `nordic ${i}`,
      'bohemian': (i) => `bohemian ${i}`,
      'industrial': (i) => `loft-style ${i}`,
      'minimalist': (i) => `minimalist ${i}`,
      'rustic': (i) => `rustic ${i}`,
      'contemporary': (i) => `contemporary ${i}`,
      'traditional': (i) => `classic ${i}`,
      'mid-century': (i) => `mid-century ${i}`,
      'japandi': (i) => `japandi ${i}`,
      'wabi_sabi': (i) => `wabi-sabi ${i}`,
      'art_deco': (i) => `art deco ${i}`,
      'hollywood_regency': (i) => `glamorous ${i}`,
      'nordic_hygge': (i) => `hygge ${i}`
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
  const result = getStyleDescriptor(primaryStyle, baseItem);
  
  
  return result;
});
}

/**
 * Schema version for the structured JSON prompt. Stored alongside generations so
 * research data stays comparable when the schema evolves.
 */
export const PROMPT_SCHEMA_VERSION = 'v3';

/**
 * Room geometry that MUST stay identical between the input photo and the generated
 * image. Surface finishes (walls, floor, ceiling colors/materials) are NOT locked —
 * see `restyle_surfaces` in the assembled prompt object.
 */
export const ARCHITECTURAL_GEOMETRY_PRESERVE = [
  'windows',
  'doors',
  'camera_angle',
  'perspective',
  'ceiling_height',
  'room_footprint',
] as const;

/** @deprecated Use ARCHITECTURAL_GEOMETRY_PRESERVE — v2 locked walls; v3 does not. */
export const ARCHITECTURAL_PRESERVE = ARCHITECTURAL_GEOMETRY_PRESERVE;

/**
 * Core, identical-across-sources fields of the structured prompt. Every one of the 6
 * generation sources fills exactly these keys (only the values differ), guaranteeing
 * comparable records in the research database.
 */
export interface StructuredPromptCore {
  room_type: string;
  primary_style: string;
  secondary_styles: string[];
  colors: string[];
  materials: string[];
  complexity: string;
  brightness: string;
  lighting_mood: string;
  nature_metaphor: string;
  texture: string;
  mood: string;
  plants: number;
}

/**
 * Assembles the final structured prompt object used by ALL generation sources.
 * Guarantees: a leading `schema_version`, the identical core key set, optional
 * source-specific `extra` fields (e.g. functional_requirements, vision_* labels),
 * and the fixed architectural lock fields appended at the end.
 */
export function buildStructuredPromptObject(
  core: StructuredPromptCore,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  return {
    schema_version: PROMPT_SCHEMA_VERSION,
    ...core,
    ...(extra || {}),
    restyle_surfaces: true,
    preserve: [...ARCHITECTURAL_GEOMETRY_PRESERVE],
    architectural_lock: true,
  };
}

/**
 * Builds the structured JSON prompt sent verbatim to the image model (Nano Banana).
 * This format gives precise control over all design elements.
 *
 * @param weights - Calculated prompt weights
 * @param roomType - Type of room being designed
 * @param sourceType - Optional source type for source-specific customization
 */
export function buildNanoBananaJsonPrompt(
  weights: PromptWeights,
  roomType: string,
  sourceType?: GenerationSource
): string {
  const roomName = getRoomName(roomType);
  
  const primaryStyle = extractPrimaryStyle(weights.dominantStyle || 'modern');
  const styleOption = STYLE_OPTIONS.find(s => s.id === primaryStyle);
  const styleLabel = styleOption ? styleOption.labelEn : primaryStyle;
  const styleDescription = styleOption ? styleOption.description : '';
  const finalStyle = styleLabel;
  const secondaryStyles = weights.secondaryStyles || [];
  
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
  
  // Furniture style - use primary style for main items
  const furnitureStyle = `${styleLabel} furniture with clean lines`;
  
  // Biophilia - convert numeric level to descriptive text for FLUX.2
  const biophiliaDescriptor = getBiophiliaDescriptors(
    weights.natureDensity,
    weights.biophilicElements?.slice(0, 4) || []
  );
  
  const biophilia = {
    description: biophiliaDescriptor.description,
    plant_density: biophiliaDescriptor.plantDensity,
    natural_elements: biophiliaDescriptor.naturalElements
  };
  
  // Build style string - use enriched description if available
  const styleString = styleDescription ? `${styleLabel}: ${styleDescription}` : styleLabel;
  
  // Generate layout variation for diversity
  const layoutVariation = sourceType ? generateLayoutVariation(sourceType, weights) : null;
  
  // Helper mappings for compact prompt JSON
  const complexity =
    weights.visualComplexity < 0.35 ? 'simple' :
    weights.visualComplexity > 0.70 ? 'complex' :
    'balanced';

  const brightness =
    weights.naturalLightImportance < 0.35 ? 'dark' :
    weights.naturalLightImportance > 0.70 ? 'bright' :
    'balanced';

  const moodAtmosphere = mood;

  // Biophilia as explicit plant count (model follows numbers better than boolean flags)
  const plantCount = (() => {
    const d = Math.max(0, Math.min(1, weights.natureDensity || 0));
    if (d <= 0.05) return 0;
    if (d <= 0.17) return 1;
    if (d <= 0.34) return 2;
    if (d <= 0.50) return 4;
    if (d <= 0.67) return 6;
    if (d <= 0.83) return 8;
    return 12;
  })();

  
  // Get furniture list for this source (especially important for MixedFunctional)
  const furnitureList = getFurnitureForRoom(roomName, primaryStyle, weights, sourceType);
  
  // Build functional requirements for MixedFunctional
  let functionalRequirements: any = null;
  if (isMixedFunctional && weights.primaryActivity) {
    functionalRequirements = {
      primary_activity: weights.primaryActivity,
      secondary_activities: weights.secondaryActivities || [],
      functional_priorities: weights.functionalPriorities || []
    };
  }
  
  
  // Source-specific extra fields
  const extra: Record<string, unknown> = {};
  if (layoutVariation?.description) {
    extra.layout = layoutVariation.description;
  }
  if (furnitureList.length > 0) {
    extra.furniture = furnitureList;
  }
  if (functionalRequirements) {
    extra.functional_requirements = functionalRequirements;
  }

  // Shared schema: identical core keys for every source + architectural lock + schema_version
  const promptJson = buildStructuredPromptObject(
    {
      room_type: roomName, // from photo analysis
      primary_style: finalStyle, // ONE dominant style
      secondary_styles: secondaryStyles, // subtle secondary influences
      colors: uniqueColors,
      materials,
      complexity,
      brightness,
      lighting_mood: weights.lightingMood,
      nature_metaphor: weights.natureMetaphor || '',
      texture: getTextureFocus(materials, styleLabel),
      mood: moodAtmosphere,
      plants: plantCount,
    },
    extra
  );

  return JSON.stringify(promptJson, null, 2);
}

// =========================
// DESCRIPTIVE MAPPINGS
// =========================

const COMPLEXITY_LEVEL_MAPPINGS = [
  { threshold: 0.2, label: 'Very Minimal (Hero pieces only, massive negative space, zero clutter)' },
  { threshold: 0.4, label: 'Simple (Minimal accessories, breathable space, focus on function)' },
  { threshold: 0.6, label: 'Balanced (Thoughtful layering, selective decor, lived-in but tidy)' },
  { threshold: 0.8, label: 'Richly Layered (Textured textiles, multiple accessories, curated collections)' },
  { threshold: 1.1, label: 'Maximalist (Dense patterns, abundant decor, highly complex visual interest)' }
];

export function getComplexityLabel(weight: number): string {
  return COMPLEXITY_LEVEL_MAPPINGS.find(m => weight <= m.threshold)?.label || 'Balanced';
}

function getTextureFocus(materials: string[], style: string): string {
  if (materials.length < 2) return `Focus on authentic ${style} textures`;
  return `${materials[0]} vs ${materials[1]} contrast for tactile depth`;
}

// =========================
// EXPORT
// =========================

export {
  type PromptComponents,
  getBiophiliaDescriptors
  // buildNanoBananaJsonPrompt is already exported above as a named export
};

