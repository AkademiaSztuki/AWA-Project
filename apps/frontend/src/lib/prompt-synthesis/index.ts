// PROMPT SYNTHESIS - Main Pipeline
// Orchestrates: Scoring → Building → Optional LLM Refinement
// Exports main synthesizePrompt() function for use throughout app

import { PromptInputs, PromptWeights, calculatePromptWeights } from './scoring';
import { buildPromptFromWeights, buildFlux2Prompt, validatePromptLength, PromptComponents, ensureHexColor } from './builder';
import { refineSyntaxWithLLM } from './refinement';
import { 
  GenerationSource, 
  filterInputsBySource, 
  GENERATION_SOURCE_LABELS 
} from './modes';
import { buildPromptInputsFromSession } from './input-builder';
import { SessionData } from '@/types';
import { assessAllSourcesQuality, getViableSources, SourceQualityReport } from './data-quality';
import { TinderSwipe } from '@/lib/dna';

// =========================
// MAIN SYNTHESIS FUNCTION
// =========================

export interface ExplainabilityMetadata {
  style: { 
    source: 'implicit' | 'explicit' | 'personality' | 'blended' | 'inspiration'; 
    confidence: number;
    details?: string;
  };
  colors: { 
    source: 'implicit' | 'explicit' | 'inspiration' | 'temperature-based'; 
    confidence: number;
    details?: string;
  };
  materials: { 
    source: 'implicit' | 'explicit' | 'personality' | 'inspiration'; 
    confidence: number;
    details?: string;
  };
  layout: {
    source: 'source-type' | 'personality' | 'functional';
    variation: string;
  };
  biophilia: {
    source: 'explicit' | 'implicit' | 'inspiration' | 'mood-transformation';
    level: number;
  };
}

export interface SynthesisResult {
  prompt: string;              // Final prompt for FLUX
  components: PromptComponents; // Breakdown of prompt parts
  weights: PromptWeights;       // Calculated weights
  source?: GenerationSource;    // Which source this prompt came from
  metadata: {
    tokenCount: number;
    isRefined: boolean;          // Was LLM refinement used?
    validationStatus: string;
    synthesisTimestamp: string;
    sourceLabel?: { pl: string; en: string }; // Human-readable label
    explainability?: ExplainabilityMetadata; // NEW: Source tracking for each element
  };
}

/**
 * Result of 6-image matrix synthesis.
 * Contains all prompts for blind comparison.
 */
export interface SixPromptSynthesisResult {
  /** All synthesis results, keyed by source */
  results: Partial<Record<GenerationSource, SynthesisResult>>;
  
  /** Which sources were actually generated (had sufficient data) */
  generatedSources: GenerationSource[];
  
  /** Which sources were skipped due to missing data */
  skippedSources: GenerationSource[];
  
  /** Quality reports for all sources (including skipped ones) */
  qualityReports: SourceQualityReport[];
  
  /** Shuffled order for blind display (array of sources) */
  displayOrder: GenerationSource[];
  
  /** Inspiration images for InspirationReference source (base64) */
  inspirationImages?: string[];
  
  /** Metadata about the generation */
  metadata: {
    totalPrompts: number;
    synthesisTimestamp: string;
    roomType: string;
  };
}

/** @deprecated Use SixPromptSynthesisResult */
export type FivePromptSynthesisResult = SixPromptSynthesisResult;

export interface SynthesisOptions {
  useLLMRefinement?: boolean;   // Default: false
  targetTokens?: number;         // Default: 65
  verbose?: boolean;             // Log detailed info
  sourceType?: GenerationSource; // Which source this prompt is for (affects style normalization)
}

/**
 * Generates explainability metadata tracking sources of each element
 */
function generateExplainabilityMetadata(
  weights: PromptWeights,
  inputs: PromptInputs,
  sourceType?: GenerationSource | string
): ExplainabilityMetadata {
  // Determine style source
  const hasImplicitStyles = inputs.aestheticDNA.implicit.dominantStyles.length > 0;
  const hasExplicitStyle = !!inputs.aestheticDNA.explicit.selectedStyle || !!inputs.aestheticDNA.explicit.selectedPalette;
  const hasPersonality = !!inputs.personality;
  const hasInspirations = (inputs.inspirations?.length || 0) > 0;
  
  let styleSource: 'implicit' | 'explicit' | 'personality' | 'blended' | 'inspiration';
  let styleConfidence = weights.styleConfidence;
  let styleDetails = '';
  
  if (sourceType === GenerationSource.InspirationReference && hasInspirations) {
    styleSource = 'inspiration';
    styleDetails = 'from VLM-analyzed inspiration images';
  } else if (hasImplicitStyles && hasExplicitStyle) {
    styleSource = 'blended';
    styleDetails = 'blended from implicit (Tinder) and explicit preferences';
    styleConfidence = Math.min(1, styleConfidence * 1.2);
  } else if (hasImplicitStyles) {
    styleSource = 'implicit';
    styleDetails = 'from Tinder swipe patterns';
  } else if (hasExplicitStyle) {
    styleSource = 'explicit';
    styleDetails = 'from user-declared preferences';
  } else if (hasPersonality) {
    styleSource = 'personality';
    styleDetails = 'derived from Big Five personality traits';
  } else {
    styleSource = 'explicit';
    styleDetails = 'fallback';
    styleConfidence = 0.5;
  }
  
  // Determine colors source
  const hasImplicitColors = inputs.aestheticDNA.implicit.colors.length > 0;
  const hasExplicitColors = !!inputs.aestheticDNA.explicit.selectedPalette;
  const inspirationColors = inputs.inspirations?.some(i => i.tags?.colors && i.tags.colors.length > 0);
  
  let colorSource: 'implicit' | 'explicit' | 'inspiration' | 'temperature-based';
  let colorConfidence = 0.8;
  let colorDetails = '';
  
  if (inspirationColors && sourceType === GenerationSource.InspirationReference) {
    colorSource = 'inspiration';
    colorDetails = 'from inspiration image tags';
  } else if (hasImplicitColors && hasExplicitColors) {
    colorSource = 'explicit';
    colorDetails = 'blended from implicit and explicit preferences';
  } else if (hasImplicitColors) {
    colorSource = 'implicit';
    colorDetails = 'from Tinder swipe patterns';
  } else if (hasExplicitColors) {
    colorSource = 'explicit';
    colorDetails = 'from user-selected palette';
  } else {
    colorSource = 'temperature-based';
    colorDetails = `derived from temperature preference (${weights.colorTemperature > 0.6 ? 'warm' : weights.colorTemperature < 0.4 ? 'cool' : 'neutral'})`;
    colorConfidence = 0.6;
  }
  
  // Determine materials source
  const hasImplicitMaterials = inputs.aestheticDNA.implicit.materials.length > 0;
  const hasExplicitMaterials = inputs.aestheticDNA.explicit.topMaterials.length > 0;
  const inspirationMaterials = inputs.inspirations?.some(i => i.tags?.materials && i.tags.materials.length > 0);
  
  let materialSource: 'implicit' | 'explicit' | 'personality' | 'inspiration';
  let materialConfidence = 0.7;
  let materialDetails = '';
  
  if (inspirationMaterials && sourceType === GenerationSource.InspirationReference) {
    materialSource = 'inspiration';
    materialDetails = 'from inspiration image tags';
  } else if (hasImplicitMaterials && hasExplicitMaterials) {
    materialSource = 'explicit';
    materialDetails = 'blended from implicit and explicit preferences';
  } else if (hasImplicitMaterials) {
    materialSource = 'implicit';
    materialDetails = 'from Tinder swipe patterns';
  } else if (hasExplicitMaterials) {
    materialSource = 'explicit';
    materialDetails = 'from user-selected materials';
  } else if (hasPersonality) {
    materialSource = 'personality';
    materialDetails = 'derived from personality traits';
  } else {
    materialSource = 'explicit';
    materialDetails = 'fallback';
    materialConfidence = 0.5;
  }
  
  // Layout source
  const layoutSource = sourceType ? 'source-type' : 'functional';
  const layoutVariation = sourceType ? `${sourceType} layout strategy` : 'functional layout';
  
  // Biophilia source
  const hasExplicitBiophilia = inputs.psychologicalBaseline.biophiliaScore !== undefined && inputs.psychologicalBaseline.biophiliaScore > 0;
  const hasImplicitBiophilia = inputs.psychologicalBaseline.implicitBiophiliaScore !== undefined && inputs.psychologicalBaseline.implicitBiophiliaScore > 0;
  const hasMoodTransformation = weights.moodTransformation && weights.moodTransformation.biophiliaModifier !== 0;
  const inspirationBiophilia = inputs.inspirations?.some(i => i.tags?.biophilia !== undefined && i.tags.biophilia > 0);
  
  let biophiliaSource: 'explicit' | 'implicit' | 'inspiration' | 'mood-transformation';
  if (inspirationBiophilia && sourceType === GenerationSource.InspirationReference) {
    biophiliaSource = 'inspiration';
  } else if (hasMoodTransformation && weights.moodTransformation!.biophiliaModifier > 0.1) {
    biophiliaSource = 'mood-transformation';
  } else if (hasImplicitBiophilia) {
    biophiliaSource = 'implicit';
  } else {
    biophiliaSource = 'explicit';
  }
  
  return {
    style: {
      source: styleSource,
      confidence: styleConfidence,
      details: styleDetails
    },
    colors: {
      source: colorSource,
      confidence: colorConfidence,
      details: colorDetails
    },
    materials: {
      source: materialSource,
      confidence: materialConfidence,
      details: materialDetails
    },
    layout: {
      source: layoutSource as 'source-type' | 'personality' | 'functional',
      variation: layoutVariation
    },
    biophilia: {
      source: biophiliaSource,
      level: weights.natureDensity
    }
  };
}

/**
 * Main prompt synthesis pipeline
 * 
 * @param inputs - All user data from 4 layers (profile, household, room, photo)
 * @param roomType - Type of room being designed
 * @param options - Synthesis options
 * @returns Structured synthesis result with final prompt
 */
export async function synthesizePrompt(
  inputs: PromptInputs,
  roomType: string,
  options: SynthesisOptions = {}
): Promise<SynthesisResult> {
  const {
    useLLMRefinement = false,
    targetTokens = 65,
    verbose = false
  } = options;
  
  if (verbose) {
    console.log('[Prompt Synthesis] Starting synthesis pipeline...');
    console.log('[Prompt Synthesis] Room type:', roomType);
  }
  
  // STEP 1: Calculate weighted scores
  if (verbose) console.log('[Prompt Synthesis] Step 1: Calculating weights...');
  const weights = calculatePromptWeights(inputs, options.sourceType);
  
  if (verbose) {
    console.log('[Prompt Synthesis] Weights calculated:');
    console.log('  - Needs calming:', weights.needsCalming.toFixed(2));
    console.log('  - Needs energizing:', weights.needsEnergizing.toFixed(2));
    console.log('  - Needs inspiration:', weights.needsInspiration.toFixed(2));
    console.log('  - Dominant style:', weights.dominantStyle);
    console.log('  - Nature density:', weights.natureDensity.toFixed(2));
  }
  
  // STEP 2: Build explainability metadata
  const explainability = generateExplainabilityMetadata(weights, inputs, options.sourceType);
  
  // STEP 3: Build FLUX 2 JSON structured prompt
  if (verbose) console.log('[Prompt Synthesis] Step 2: Building FLUX 2 JSON prompt...');
  let finalPrompt = buildFlux2Prompt(weights, roomType, options.sourceType);
  let isRefined = false; // JSON prompts don't need refinement, but keep variable for compatibility
  
  // For compatibility, create a buildResult-like structure
  const buildResult = {
    prompt: finalPrompt,
    components: {
      roomType: roomType,
      style: weights.dominantStyle || '',
      mood: weights.needsCalming > 0.6 ? 'calming' : 'energizing',
      colors: weights.colorPalette?.join(', ') || '',
      materials: weights.primaryMaterials?.join(', ') || '',
      lighting: weights.lightingMood || '',
      biophilia: weights.biophilicElements?.join(', ') || '',
      functional: weights.primaryActivity || '',
      layout: ''
    },
    metadata: {
      tokenCount: estimateTokens(finalPrompt),
      weights: weights
    }
  };
  
  if (verbose) {
    console.log('[Prompt Synthesis] Base prompt:', finalPrompt);
    console.log('[Prompt Synthesis] Token count:', buildResult.metadata.tokenCount);
  }
  
  // STEP 3: Validate prompt (FLUX 2 supports long prompts, so we skip LLM refinement for JSON)
  const validation = validatePromptLength(finalPrompt);
  
  // For FLUX 2 JSON prompts, we don't use LLM refinement as JSON structure is already optimal
  // But keep the validation for logging purposes
  if (verbose) {
    console.log('[Prompt Synthesis] Step 3: Prompt validation:', validation.recommendation);
    console.log('[Prompt Synthesis] Skipping LLM refinement for JSON structured prompts');
  }
  
  // STEP 4: Return structured result
  const result: SynthesisResult = {
    prompt: finalPrompt,
    components: buildResult.components,
    weights: weights,
    metadata: {
      tokenCount: estimateTokens(finalPrompt),
      isRefined,
      validationStatus: validation.recommendation,
      synthesisTimestamp: new Date().toISOString(),
      explainability: explainability
    }
  };
  
  if (verbose) {
    console.log('[Prompt Synthesis] ✓ Synthesis complete');
    console.log('[Prompt Synthesis] Final token count:', result.metadata.tokenCount);
  }
  
  return result;
}

// =========================
// 6-IMAGE MATRIX SYNTHESIS
// =========================

/**
 * Synthesizes 6 prompts from different data sources for blind comparison.
 * 
 * Sources:
 * 1. Implicit - Tinder swipes + Inspirations (behavioral)
 * 2. Explicit - CoreProfile / room preferences (stated)
 * 3. Personality - Big Five IPIP-NEO-120 facets (psychological)
 * 4. Mixed - All aesthetic sources combined
 * 5. MixedFunctional - Mixed + activities, pain points, PRS gap
 * 6. InspirationReference - Multi-reference with inspiration images
 * 
 * @param sessionData - Full session data from the app
 * @param roomType - Type of room being designed
 * @param options - Synthesis options
 * @returns SixPromptSynthesisResult with all prompts and display order
 */
export async function synthesizeSixPrompts(
  sessionData: SessionData,
  roomType: string,
  options: SynthesisOptions = {}
): Promise<SixPromptSynthesisResult> {
  const { verbose = false } = options;
  
  if (verbose) {
    console.log('[6-Image Matrix] Starting 6-prompt synthesis...');
    console.log('[6-Image Matrix] Room type:', roomType);
  }
  
  // Convert SessionData to PromptInputs
  const fullInputs = buildPromptInputsFromSession(sessionData);
  
  // Extract Tinder swipes for quality assessment
  // Check both tinderData.swipes and tinderResults (for backward compatibility)
  const typedSessionData = sessionData as any;
  const tinderSwipesArray = typedSessionData?.tinderData?.swipes || typedSessionData?.tinderResults || [];
  const tinderSwipes: TinderSwipe[] | undefined = Array.isArray(tinderSwipesArray) && tinderSwipesArray.length > 0
    ? tinderSwipesArray.map((s: any) => ({
        direction: s.direction,
        imageId: s.imageId || s.id,
        categories: s.categories,
        tags: s.tags
      }))
    : undefined;
  
  // DEBUG: Comprehensive data availability check
  console.log('[6-Image Matrix] ========================================');
  console.log('[6-Image Matrix] DATA AVAILABILITY CHECK:');
  console.log('[6-Image Matrix] ========================================');
  console.log('[6-Image Matrix] SessionData keys:', Object.keys(typedSessionData || {}));
  console.log('[6-Image Matrix] Tinder data:', {
    hasTinderData: !!typedSessionData?.tinderData,
    hasTinderResults: !!typedSessionData?.tinderResults,
    tinderDataSwipes: typedSessionData?.tinderData?.swipes?.length || 0,
    tinderResultsLength: typedSessionData?.tinderResults?.length || 0,
    finalTinderSwipes: tinderSwipes?.length || 0,
    tinderDataStructure: typedSessionData?.tinderData ? Object.keys(typedSessionData.tinderData) : null,
    tinderResultsSample: typedSessionData?.tinderResults?.slice(0, 2)
  });
  console.log('[6-Image Matrix] Big Five data:', {
    hasBigFive: !!typedSessionData?.bigFive,
    hasScores: !!typedSessionData?.bigFive?.scores,
    scores: typedSessionData?.bigFive?.scores,
    fullBigFive: typedSessionData?.bigFive
  });
  console.log('[6-Image Matrix] Inspirations:', {
    count: typedSessionData?.inspirations?.length || 0,
    hasInspirations: !!(typedSessionData?.inspirations && typedSessionData.inspirations.length > 0),
    firstInspiration: typedSessionData?.inspirations?.[0],
    allInspirations: typedSessionData?.inspirations
  });
  console.log('[6-Image Matrix] VisualDNA:', {
    hasVisualDNA: !!typedSessionData?.visualDNA,
    dominantStyle: typedSessionData?.visualDNA?.dominantStyle,
    preferences: typedSessionData?.visualDNA?.preferences,
    fullVisualDNA: typedSessionData?.visualDNA
  });
  console.log('[6-Image Matrix] Room data:', {
    hasActivities: !!(typedSessionData?.roomActivities && typedSessionData.roomActivities.length > 0),
    activitiesCount: typedSessionData?.roomActivities?.length || 0,
    hasPainPoints: !!(typedSessionData?.roomPainPoints && typedSessionData.roomPainPoints.length > 0),
    painPointsCount: typedSessionData?.roomPainPoints?.length || 0,
    activities: typedSessionData?.roomActivities,
    painPoints: typedSessionData?.roomPainPoints
  });
  console.log('[6-Image Matrix] ColorsAndMaterials:', {
    hasColorsAndMaterials: !!typedSessionData?.colorsAndMaterials,
    selectedStyle: typedSessionData?.colorsAndMaterials?.selectedStyle,
    selectedPalette: typedSessionData?.colorsAndMaterials?.selectedPalette,
    topMaterials: typedSessionData?.colorsAndMaterials?.topMaterials,
    fullColorsAndMaterials: typedSessionData?.colorsAndMaterials
  });
  console.log('[6-Image Matrix] PromptInputs summary:', {
    hasImplicitStyles: fullInputs.aestheticDNA.implicit.dominantStyles.length > 0,
    implicitStyles: fullInputs.aestheticDNA.implicit.dominantStyles,
    hasExplicitStyle: !!fullInputs.aestheticDNA.explicit.selectedStyle,
    explicitStyle: fullInputs.aestheticDNA.explicit.selectedStyle,
    hasPersonality: !!fullInputs.personality,
    personality: fullInputs.personality,
    hasInspirations: !!(fullInputs.inspirations && fullInputs.inspirations.length > 0),
    inspirationsCount: fullInputs.inspirations?.length || 0,
    hasActivities: !!(fullInputs.activities && fullInputs.activities.length > 0),
    activitiesCount: fullInputs.activities?.length || 0,
    hasPainPoints: !!(fullInputs.painPoints && fullInputs.painPoints.length > 0),
    painPointsCount: fullInputs.painPoints?.length || 0
  });
  console.log('[6-Image Matrix] ========================================');
  
  // Assess quality for all sources using strict quality gates
  const qualityReports = assessAllSourcesQuality(fullInputs, tinderSwipes);
  const availableSources = getViableSources(qualityReports);
  const allSources = Object.values(GenerationSource);
  const skippedSources = allSources.filter(s => !availableSources.includes(s));
  
  if (verbose) {
    console.log('[6-Image Matrix] Quality assessment complete');
    console.log('[6-Image Matrix] Available sources:', availableSources);
    console.log('[6-Image Matrix] Skipped sources:', skippedSources);
    qualityReports.forEach(report => {
      if (!report.shouldGenerate) {
        console.log(`[6-Image Matrix] ${report.source} skipped:`, report.warnings.join(', '));
      }
    });
  }
  
  // Extract inspiration images if available (for InspirationReference source)
  let inspirationImages: string[] | undefined;
  
  // Debug: log what we have
  console.log('[6-Image Matrix] Checking for inspiration images...');
  
  // Try multiple sources for inspiration images:
  // 1. Direct inspirations array with url/imageBase64/image
  // 2. Spaces with inspiration images
  // FLUX.2 [dev] supports up to 6 reference images
  // Reference: https://docs.bfl.ai/flux_2/flux2_image_editing
  
  const MAX_INSPIRATION_IMAGES = 6; // FLUX.2 [dev] recommended max
  
  if (typedSessionData?.inspirations && Array.isArray(typedSessionData.inspirations)) {
    // Debug: log first inspiration to see structure
    console.log('[6-Image Matrix] First inspiration structure:', JSON.stringify(typedSessionData.inspirations[0], null, 2));
    
    // Get images from inspirations - check multiple possible fields
    // Priority: imageBase64 (already base64) > image (base64) > url (need to fetch)
    const allImages = typedSessionData.inspirations
      .filter((insp: any) => insp.imageBase64 || insp.image || insp.url)
      .map((insp: any) => insp.imageBase64 || insp.image || insp.url);
    
    if (allImages.length > 0) {
      inspirationImages = allImages.slice(0, MAX_INSPIRATION_IMAGES);
      console.log('[6-Image Matrix] Found', allImages.length, 'images from inspirations array, using', inspirationImages.length);
    }
  }
  
  // Fallback: try to get from spaces
  if ((!inspirationImages || inspirationImages.length === 0) && typedSessionData?.spaces) {
    const allSpaceImages: string[] = [];
    for (const space of typedSessionData.spaces) {
      if (space.inspirations && Array.isArray(space.inspirations)) {
        for (const insp of space.inspirations) {
          // Check for base64 first, then URL
          if (insp.imageBase64) allSpaceImages.push(insp.imageBase64);
          else if (insp.url) allSpaceImages.push(insp.url);
        }
      }
    }
    if (allSpaceImages.length > 0) {
      inspirationImages = allSpaceImages.slice(0, MAX_INSPIRATION_IMAGES);
      console.log('[6-Image Matrix] Found', allSpaceImages.length, 'images from spaces, using', inspirationImages.length);
    }
  }
  
  console.log('[6-Image Matrix] Total inspiration images found:', inspirationImages?.length || 0);
  if (inspirationImages && inspirationImages.length > 0) {
    console.log('[6-Image Matrix] First image URL (truncated):', inspirationImages[0]?.substring(0, 100));
  }
  
  // Synthesize prompts for each available source (in parallel)
  const results: Partial<Record<GenerationSource, SynthesisResult>> = {};
  
  const synthesisPromises = availableSources.map(async (source) => {
    const filteredInputs = filterInputsBySource(fullInputs, source);
    
    // DEBUG: Log what data each source has after filtering
    console.log(`[${source}] After filtering:`, {
      hasImplicitStyles: filteredInputs.aestheticDNA.implicit.dominantStyles.length > 0,
      hasImplicitColors: filteredInputs.aestheticDNA.implicit.colors.length > 0,
      hasExplicitStyle: !!filteredInputs.aestheticDNA.explicit.selectedStyle,
      hasExplicitPalette: !!filteredInputs.aestheticDNA.explicit.selectedPalette,
      hasPersonality: !!filteredInputs.personality,
      hasLifestyle: !!filteredInputs.lifestyle.vibe,
      hasSensory: !!filteredInputs.sensory.light,
      hasInspirations: !!(filteredInputs.inspirations && filteredInputs.inspirations.length > 0),
      inspirationsCount: filteredInputs.inspirations?.length || 0,
      implicitStyles: filteredInputs.aestheticDNA.implicit.dominantStyles,
      explicitStyle: filteredInputs.aestheticDNA.explicit.selectedStyle,
      personality: filteredInputs.personality ? {
        O: filteredInputs.personality.openness,
        C: filteredInputs.personality.conscientiousness,
        E: filteredInputs.personality.extraversion
      } : null
    });
    
    // DEBUG: For InspirationReference, also log full inspirations structure
    if (source === GenerationSource.InspirationReference) {
      console.log(`[${source}] Full inspirations structure:`, JSON.stringify(filteredInputs.inspirations, null, 2));
    }
    
    // Special handling for InspirationReference - use concrete VLM tags from gamma model (Gemma3VisionModel)
    // Tags are stored in Supabase user_profiles.inspirations and loaded into sessionData.inspirations
    let result: SynthesisResult;
    if (source === GenerationSource.InspirationReference) {
      // Extract concrete tags from inspiration images (from Supabase user_profiles.inspirations)
      // Tags are generated by gamma model (Gemma3VisionModel) and stored in Supabase
      // Structure: { tags: { styles, colors, materials, biophilia }, description }
      const extractInspirationTags = (inspirations: PromptInputs['inspirations']) => {
        if (!inspirations || inspirations.length === 0) {
          return { additionalStyles: [], additionalColors: [], additionalMaterials: [], biophiliaBoost: 0, descriptions: [] };
        }
        const allStyles = new Set<string>();
        const allColors = new Set<string>();
        const allMaterials = new Set<string>();
        const descriptions: string[] = [];
        let totalBiophilia = 0;
        let validInspirations = 0;
        
        // Updated list of valid styles (includes all new styles)
        const validStyleList = [
          'modern', 'scandinavian', 'industrial', 'minimalist', 'rustic', 'bohemian',
          'contemporary', 'traditional', 'mid-century', 'japandi', 'coastal', 'farmhouse',
          'mediterranean', 'art-deco', 'maximalist', 'eclectic', 'hygge', 'zen', 'vintage', 
          'transitional', 'japanese', 'gothic', 'tropical'
        ];
        
        inspirations.forEach((inspiration, index) => {
          console.log(`[InspirationReference] Processing inspiration ${index}:`, {
            hasTags: !!inspiration.tags,
            tagsType: typeof inspiration.tags,
            tagsValue: inspiration.tags,
            hasDescription: !!inspiration.description
          });
          
          if (inspiration.tags) {
            // Process styles
            if (inspiration.tags.styles && Array.isArray(inspiration.tags.styles)) {
              inspiration.tags.styles.forEach(style => {
                // Extract valid style (case-insensitive check)
                const validStyle = style.toLowerCase().trim();
                if (validStyleList.includes(validStyle)) {
                  allStyles.add(validStyle);
                  console.log(`[InspirationReference] Added style: ${validStyle}`);
                } else {
                  console.warn(`[InspirationReference] Style not in valid list: ${style} (normalized: ${validStyle})`);
                }
              });
            } else {
              console.warn(`[InspirationReference] No styles array in tags:`, inspiration.tags.styles);
            }
            
            // Process colors - accept both hex codes and color names
            if (inspiration.tags.colors && Array.isArray(inspiration.tags.colors)) {
              inspiration.tags.colors.forEach(color => {
                // Accept both hex codes (#FFFFFF) and color names (white, beige, etc.)
                allColors.add(color);
                console.log(`[InspirationReference] Added color: ${color}`);
              });
            } else {
              console.warn(`[InspirationReference] No colors array in tags:`, inspiration.tags.colors);
            }
            
            // Process materials
            if (inspiration.tags.materials && Array.isArray(inspiration.tags.materials)) {
              inspiration.tags.materials.forEach(material => {
                allMaterials.add(material);
                console.log(`[InspirationReference] Added material: ${material}`);
              });
            } else {
              console.warn(`[InspirationReference] No materials array in tags:`, inspiration.tags.materials);
            }
            
            // Process biophilia
            if (inspiration.tags.biophilia !== undefined && inspiration.tags.biophilia !== null) {
              totalBiophilia += inspiration.tags.biophilia;
              validInspirations++;
              console.log(`[InspirationReference] Added biophilia: ${inspiration.tags.biophilia}`);
            } else {
              console.warn(`[InspirationReference] No biophilia value in tags`);
            }
          } else {
            console.warn(`[InspirationReference] Inspiration ${index} has no tags object`);
          }
          
          // Collect description from Gemma analysis if available
          if (inspiration.description && inspiration.description.trim()) {
            descriptions.push(inspiration.description.trim());
            console.log(`[InspirationReference] Added description: ${inspiration.description.substring(0, 50)}...`);
          }
        });
        
        return {
          additionalStyles: Array.from(allStyles),
          additionalColors: Array.from(allColors),
          additionalMaterials: Array.from(allMaterials),
          biophiliaBoost: validInspirations > 0 ? Math.max(0, Math.min(1, totalBiophilia / validInspirations)) : 0,
          descriptions: descriptions
        };
      };
      
      // DEBUG: Log inspirations structure before extraction - FULL DETAILS
      console.log('[InspirationReference] ========================================');
      console.log('[InspirationReference] INSPIRATIONS BEFORE EXTRACTION:');
      console.log('[InspirationReference] ========================================');
      console.log('[InspirationReference] Count:', filteredInputs.inspirations?.length || 0);
      console.log('[InspirationReference] Full structure:', JSON.stringify(filteredInputs.inspirations, null, 2));
      
      if (filteredInputs.inspirations && filteredInputs.inspirations.length > 0) {
        filteredInputs.inspirations.forEach((insp: any, idx: number) => {
          console.log(`[InspirationReference] Inspiration ${idx + 1}:`, {
            hasTags: !!insp.tags,
            tagsType: typeof insp.tags,
            tagsIsObject: insp.tags && typeof insp.tags === 'object',
            tagsIsEmptyObject: insp.tags && typeof insp.tags === 'object' && Object.keys(insp.tags).length === 0,
            tagsKeys: insp.tags ? Object.keys(insp.tags) : [],
            tagsValue: insp.tags,
            hasDescription: !!insp.description,
            description: insp.description
          });
        });
      } else {
        console.warn('[InspirationReference] WARNING: No inspirations found in filteredInputs!');
        console.warn('[InspirationReference] This means inspirations were not passed or were filtered out.');
      }
      console.log('[InspirationReference] ========================================');
      
      const inspirationTags = extractInspirationTags(filteredInputs.inspirations);
      
      // DEBUG: Log extracted tags
      console.log('[InspirationReference] Extracted tags from gamma model:', {
        styles: inspirationTags.additionalStyles,
        colors: inspirationTags.additionalColors,
        materials: inspirationTags.additionalMaterials,
        biophiliaBoost: inspirationTags.biophiliaBoost,
        descriptions: inspirationTags.descriptions
      });
      
      // For InspirationReference, use ONLY tags from inspirations, ignore other sources
      // Build weights ONLY from inspiration tags
      const inspirationOnlyWeights: PromptWeights = {
        needsCalming: 0,
        needsEnergizing: 0,
        needsInspiration: 0,
        needsGrounding: 0,
        dominantStyle: inspirationTags.additionalStyles.length > 0 
          ? inspirationTags.additionalStyles[0] 
          : 'modern', // Fallback if no style tags
        styleConfidence: inspirationTags.additionalStyles.length > 0 ? 0.8 : 0.5,
        colorPalette: inspirationTags.additionalColors.length > 0 
          ? inspirationTags.additionalColors.slice(0, 4)
          : ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#D3D3D3'], // Neutral fallback
        colorTemperature: 0.5, // Neutral
        primaryMaterials: inspirationTags.additionalMaterials.length > 0
          ? inspirationTags.additionalMaterials.slice(0, 3)
          : ['wood', 'fabric', 'metal'], // Generic fallback
        lightingMood: 'neutral',
        naturalLightImportance: 0.5,
        natureDensity: inspirationTags.biophiliaBoost,
        biophilicElements: inspirationTags.biophiliaBoost > 0.5 
          ? ['indoor plants', 'natural materials']
          : [],
        primaryActivity: 'relax',
        secondaryActivities: [],
        functionalPriorities: [],
        requiresZoning: false,
        privateVsShared: 0.5,
        visualComplexity: 0.5,
        storageNeeds: 0.5,
        harmonyLevel: 0.5,
        facetPreferences: {
          aestheticSensitivity: 0.5,
          orderPreference: 0.5,
          warmthPreference: 0.5,
          socialOpenness: 0.5,
          excitementSeeking: 0.5,
          tenderMindedness: 0.5
        },
        addressPainPoints: [],
        moodTransformation: null,
        socialContext: null,
        activityNeeds: null
      };
      
      // Build JSON prompt (same format as other sources) with concrete tags from inspirations ONLY
      // FLUX 2 dev supports JSON structured prompts - use same format as other sources
      const roomName = roomType === 'living room' ? 'living room' : 
                      roomType === 'bedroom' ? 'bedroom' :
                      roomType === 'kitchen' ? 'kitchen' : roomType;
      
      const promptJson: any = {
        scene: `${roomName} interior design transformation`,
        instruction: "Transform using specific style elements from reference images while preserving all architectural structure - walls, windows, doors, ceiling, floor positions, and perspective must remain exactly as in the input image",
        preserve: ["walls", "windows", "doors", "ceiling", "floor layout", "room perspective", "architectural elements"],
        photography: "professional interior photography, high quality"
      };
      
      // Add concrete tags from gamma model (Gemma3VisionModel) analysis - ONLY from inspirations
      // These tags come from Supabase user_profiles.inspirations (generated by gamma model)
      if (inspirationTags.additionalStyles.length > 0) {
        const primaryStyle = inspirationTags.additionalStyles[0];
        const secondaryStyles = inspirationTags.additionalStyles.slice(1, 3);
        promptJson.style = primaryStyle;
        if (secondaryStyles.length > 0) {
          promptJson.style_influences = secondaryStyles;
          promptJson.style_instruction = `Apply ${primaryStyle} style with ${secondaryStyles.join(' and ')} influences from reference images`;
        } else {
          promptJson.style_instruction = `Apply ${primaryStyle} style elements from reference images`;
        }
      }
      
      if (inspirationTags.additionalColors.length > 0) {
        // Convert colors to hex if needed (FLUX.2 JSON requires hex codes)
        // Filter out non-color values (like "Bold colors", "vibrant", "multicolored") and convert valid colors to hex
        const hexColors = inspirationTags.additionalColors
          .slice(0, 6) // Take more colors initially to have enough after filtering
          .map(color => {
            // Skip descriptive color terms that aren't actual colors
            const descriptiveTerms = ['bold colors', 'vibrant', 'multicolored', 'colorful', 'bright', 'muted', 'neutral'];
            if (descriptiveTerms.includes(color.toLowerCase())) {
              return null;
            }
            // Convert to hex using ensureHexColor
            return ensureHexColor(color);
          })
          .filter((color): color is string => color !== null && color !== '#808080') // Remove nulls and default gray
          .slice(0, 4); // Take first 4 valid hex colors
        
        if (hexColors.length > 0) {
          promptJson.color_palette = hexColors;
          promptJson.color_instruction = `Use color palette from reference images: ${hexColors.slice(0, 3).join(', ')}`;
        } else {
          console.warn('[InspirationReference] No valid hex colors found after conversion. Original colors:', inspirationTags.additionalColors);
        }
      }
      
      if (inspirationTags.additionalMaterials.length > 0) {
        promptJson.materials = inspirationTags.additionalMaterials.slice(0, 3);
        promptJson.material_instruction = `Incorporate materials from reference images: ${inspirationTags.additionalMaterials.slice(0, 2).join(', ')}`;
      }
      
      if (inspirationTags.biophiliaBoost > 0.1) {
        const biophiliaLevel = inspirationTags.biophiliaBoost > 0.5 ? 'abundant' : 'moderate';
        promptJson.biophilia = {
          level: biophiliaLevel,
          description: `${biophiliaLevel} natural elements from reference images`,
          natural_elements: ['indoor plants', 'natural materials']
        };
      }
      
      // Add descriptions from Gemma analysis if available
      if (inspirationTags.descriptions && inspirationTags.descriptions.length > 0) {
        const combinedDescription = inspirationTags.descriptions
          .slice(0, 2) // Limit to first 2 descriptions
          .join('; '); // Join with semicolon
        promptJson.reference_description = combinedDescription;
        promptJson.atmosphere = `Create atmosphere matching reference images: ${combinedDescription.substring(0, 150)}`;
      }
      
      // Fallback if no tags available
      if (inspirationTags.additionalStyles.length === 0 && 
          inspirationTags.additionalColors.length === 0 && 
          inspirationTags.additionalMaterials.length === 0 && 
          (!inspirationTags.descriptions || inspirationTags.descriptions.length === 0)) {
        console.warn('[InspirationReference] WARNING: No tags from gamma model found! Using fallback prompt.');
        console.warn('[InspirationReference] This means inspirations either have no tags or tags are not in expected format.');
        console.warn('[InspirationReference] Inspirations structure:', JSON.stringify(filteredInputs.inspirations, null, 2));
        promptJson.reference_usage = "Combine style, colors, and mood from the inspiration images into this room";
      } else {
        console.log('[InspirationReference] Successfully built JSON prompt with gamma tags:', {
          hasStyle: inspirationTags.additionalStyles.length > 0,
          hasColors: inspirationTags.additionalColors.length > 0,
          hasMaterials: inspirationTags.additionalMaterials.length > 0,
          hasDescription: inspirationTags.descriptions && inspirationTags.descriptions.length > 0,
          promptPreview: JSON.stringify(promptJson, null, 2).substring(0, 500)
        });
      }
      
      // Generate explainability metadata for InspirationReference
      const explainability = generateExplainabilityMetadata(inspirationOnlyWeights, filteredInputs, source);
      
      result = {
        prompt: JSON.stringify(promptJson, null, 2),
        components: {
          roomType: roomType,
          style: inspirationOnlyWeights.dominantStyle,
          mood: '',
          colors: inspirationTags.additionalColors.slice(0, 3).join(', ') || '',
          materials: inspirationTags.additionalMaterials.slice(0, 2).join(', ') || '',
          lighting: '',
          biophilia: inspirationTags.biophiliaBoost > 0.1 ? 'moderate to abundant' : '',
          functional: '',
          layout: ''
        },
        weights: inspirationOnlyWeights,
        source: source,
        metadata: {
          tokenCount: estimateTokens(JSON.stringify(promptJson)),
          isRefined: false,
          validationStatus: 'JSON structured prompt for multi-reference',
          synthesisTimestamp: new Date().toISOString(),
          sourceLabel: GENERATION_SOURCE_LABELS[source],
          explainability: explainability
        }
      };
    } else {
      result = await synthesizePrompt(filteredInputs, roomType, { ...options, sourceType: source });
    }
    
    // Add source info to result
    result.source = source;
    result.metadata.sourceLabel = GENERATION_SOURCE_LABELS[source];
    
    // DEBUG: Log final result for this source
    console.log(`[${source}] Final result:`, {
      dominantStyle: result.weights.dominantStyle,
      colorPalette: result.weights.colorPalette.slice(0, 4),
      mood: result.weights.needsCalming > 0.6 ? 'calming' : 
            result.weights.needsEnergizing > 0.6 ? 'energizing' : 'balanced',
      promptLength: result.prompt.length,
      promptPreview: result.prompt.substring(0, 200) + '...'
    });
    
    return { source, result };
  });
  
  const synthesisResults = await Promise.all(synthesisPromises);
  
  synthesisResults.forEach(({ source, result }) => {
    results[source] = result;
  });
  
  // Create shuffled display order for blind comparison
  const displayOrder = shuffleArray([...availableSources]);
  
  if (verbose) {
    console.log('[6-Image Matrix] Display order (shuffled):', displayOrder);
    console.log('[6-Image Matrix] Synthesis complete');
  }
  
  return {
    results,
    generatedSources: availableSources,
    skippedSources,
    qualityReports,
    displayOrder,
    inspirationImages,
    metadata: {
      totalPrompts: availableSources.length,
      synthesisTimestamp: new Date().toISOString(),
      roomType
    }
  };
}

/**
 * @deprecated Use synthesizeSixPrompts instead
 */
export async function synthesizeFivePrompts(
  sessionData: SessionData,
  roomType: string,
  options: SynthesisOptions = {}
): Promise<SixPromptSynthesisResult> {
  return synthesizeSixPrompts(sessionData, roomType, options);
}

/**
 * Synthesizes prompts for specific sources only.
 * Useful when you want to regenerate only certain sources.
 */
export async function synthesizeSelectedPrompts(
  sessionData: SessionData,
  roomType: string,
  sources: GenerationSource[],
  options: SynthesisOptions = {}
): Promise<Partial<Record<GenerationSource, SynthesisResult>>> {
  const fullInputs = buildPromptInputsFromSession(sessionData);
  const results: Partial<Record<GenerationSource, SynthesisResult>> = {};
  
  const synthesisPromises = sources.map(async (source) => {
    const filteredInputs = filterInputsBySource(fullInputs, source);
    const result = await synthesizePrompt(filteredInputs, roomType, options);
    result.source = source;
    result.metadata.sourceLabel = GENERATION_SOURCE_LABELS[source];
    return { source, result };
  });
  
  const synthesisResults = await Promise.all(synthesisPromises);
  synthesisResults.forEach(({ source, result }) => {
    results[source] = result;
  });
  
  return results;
}

/**
 * Fisher-Yates shuffle for display order randomization.
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// =========================
// CONVENIENCE FUNCTIONS
// =========================

/**
 * Quick synthesis without LLM refinement (default, fast)
 */
export async function synthesizePromptFast(
  inputs: PromptInputs,
  roomType: string
): Promise<SynthesisResult> {
  return synthesizePrompt(inputs, roomType, { useLLMRefinement: false });
}

/**
 * High-quality synthesis with optional LLM polish
 */
export async function synthesizePromptHighQuality(
  inputs: PromptInputs,
  roomType: string
): Promise<SynthesisResult> {
  return synthesizePrompt(inputs, roomType, { useLLMRefinement: true });
}

/**
 * Debug synthesis with verbose logging
 */
export async function synthesizePromptDebug(
  inputs: PromptInputs,
  roomType: string
): Promise<SynthesisResult> {
  return synthesizePrompt(inputs, roomType, { verbose: true });
}

// =========================
// UTILITIES
// =========================

function estimateTokens(text: string): number {
  return text.split(/\s+/).length;
}

// =========================
// EXPORTS
// =========================

export type {
  PromptInputs,
  PromptWeights,
  PromptComponents,
};

// Re-export from other modules
export {
  // Core functions from scoring
  calculatePromptWeights,
  // Core functions from builder
  buildPromptFromWeights,
  buildFlux2Prompt,
  validatePromptLength,
  // Sources from modes
  GenerationSource,
  filterInputsBySource,
  GENERATION_SOURCE_LABELS,
  // Input builder
  buildPromptInputsFromSession
  // synthesizeSixPrompts and synthesizeFivePrompts are already exported above as named exports
};

