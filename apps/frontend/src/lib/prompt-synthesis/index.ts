// PROMPT SYNTHESIS - Main Pipeline
// Orchestrates: Scoring → Building → Optional LLM Refinement
// Exports main synthesizePrompt() function for use throughout app

import { PromptInputs, PromptWeights, calculatePromptWeights } from './scoring';
import { buildPromptFromWeights, validatePromptLength, PromptComponents } from './builder';
import { refineSyntaxWithLLM } from './refinement';
import { 
  GenerationSource, 
  filterInputsBySource, 
  getAvailableSources,
  GENERATION_SOURCE_LABELS 
} from './modes';
import { buildPromptInputsFromSession } from './input-builder';
import { SessionData } from '@/types';

// =========================
// MAIN SYNTHESIS FUNCTION
// =========================

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
  };
}

/**
 * Result of 5-image matrix synthesis.
 * Contains all prompts for blind comparison.
 */
export interface FivePromptSynthesisResult {
  /** All synthesis results, keyed by source */
  results: Partial<Record<GenerationSource, SynthesisResult>>;
  
  /** Which sources were actually generated (had sufficient data) */
  generatedSources: GenerationSource[];
  
  /** Which sources were skipped due to missing data */
  skippedSources: GenerationSource[];
  
  /** Shuffled order for blind display (array of sources) */
  displayOrder: GenerationSource[];
  
  /** Metadata about the generation */
  metadata: {
    totalPrompts: number;
    synthesisTimestamp: string;
    roomType: string;
  };
}

export interface SynthesisOptions {
  useLLMRefinement?: boolean;   // Default: false
  targetTokens?: number;         // Default: 65
  verbose?: boolean;             // Log detailed info
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
  const weights = calculatePromptWeights(inputs);
  
  if (verbose) {
    console.log('[Prompt Synthesis] Weights calculated:');
    console.log('  - Needs calming:', weights.needsCalming.toFixed(2));
    console.log('  - Needs energizing:', weights.needsEnergizing.toFixed(2));
    console.log('  - Needs inspiration:', weights.needsInspiration.toFixed(2));
    console.log('  - Dominant style:', weights.dominantStyle);
    console.log('  - Nature density:', weights.natureDensity.toFixed(2));
  }
  
  // STEP 2: Build template-based prompt
  if (verbose) console.log('[Prompt Synthesis] Step 2: Building prompt template...');
  const buildResult = buildPromptFromWeights(weights, roomType);
  
  let finalPrompt = buildResult.prompt;
  let isRefined = false;
  
  if (verbose) {
    console.log('[Prompt Synthesis] Base prompt:', finalPrompt);
    console.log('[Prompt Synthesis] Token count:', buildResult.metadata.tokenCount);
  }
  
  // STEP 3: Validate and optionally refine with LLM
  const validation = validatePromptLength(finalPrompt);
  
  if (!validation.isValid || (useLLMRefinement && validation.tokenCount > targetTokens)) {
    if (verbose) {
      console.log('[Prompt Synthesis] Step 3: Prompt needs refinement');
      console.log('[Prompt Synthesis] Calling LLM for syntax optimization...');
    }
    
    try {
      finalPrompt = await refineSyntaxWithLLM(finalPrompt, targetTokens);
      isRefined = true;
      
      if (verbose) {
        console.log('[Prompt Synthesis] Refined prompt:', finalPrompt);
        console.log('[Prompt Synthesis] New token count:', estimateTokens(finalPrompt));
      }
    } catch (error) {
      console.error('[Prompt Synthesis] LLM refinement failed:', error);
      console.warn('[Prompt Synthesis] Using base prompt despite length');
      // Fallback to base prompt
    }
  } else {
    if (verbose) {
      console.log('[Prompt Synthesis] Step 3: Prompt is valid, skipping LLM refinement');
    }
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
      synthesisTimestamp: new Date().toISOString()
    }
  };
  
  if (verbose) {
    console.log('[Prompt Synthesis] ✓ Synthesis complete');
    console.log('[Prompt Synthesis] Final token count:', result.metadata.tokenCount);
  }
  
  return result;
}

// =========================
// 5-IMAGE MATRIX SYNTHESIS
// =========================

/**
 * Synthesizes 5 prompts from different data sources for blind comparison.
 * 
 * Sources:
 * 1. Implicit - Tinder swipes + Inspirations (behavioral)
 * 2. Explicit - CoreProfile / room preferences (stated)
 * 3. Personality - Big Five IPIP-NEO-120 facets (psychological)
 * 4. Mixed - All aesthetic sources combined
 * 5. MixedFunctional - Mixed + activities, pain points, PRS gap
 * 
 * @param sessionData - Full session data from the app
 * @param roomType - Type of room being designed
 * @param options - Synthesis options
 * @returns FivePromptSynthesisResult with all prompts and display order
 */
export async function synthesizeFivePrompts(
  sessionData: SessionData,
  roomType: string,
  options: SynthesisOptions = {}
): Promise<FivePromptSynthesisResult> {
  const { verbose = false } = options;
  
  if (verbose) {
    console.log('[5-Image Matrix] Starting 5-prompt synthesis...');
    console.log('[5-Image Matrix] Room type:', roomType);
  }
  
  // Convert SessionData to PromptInputs
  const fullInputs = buildPromptInputsFromSession(sessionData);
  
  // Determine which sources have sufficient data
  const availableSources = getAvailableSources(fullInputs);
  const allSources = Object.values(GenerationSource);
  const skippedSources = allSources.filter(s => !availableSources.includes(s));
  
  if (verbose) {
    console.log('[5-Image Matrix] Available sources:', availableSources);
    console.log('[5-Image Matrix] Skipped sources:', skippedSources);
  }
  
  // Synthesize prompts for each available source (in parallel)
  const results: Partial<Record<GenerationSource, SynthesisResult>> = {};
  
  const synthesisPromises = availableSources.map(async (source) => {
    const filteredInputs = filterInputsBySource(fullInputs, source);
    const result = await synthesizePrompt(filteredInputs, roomType, options);
    
    // Add source info to result
    result.source = source;
    result.metadata.sourceLabel = GENERATION_SOURCE_LABELS[source];
    
    return { source, result };
  });
  
  const synthesisResults = await Promise.all(synthesisPromises);
  
  synthesisResults.forEach(({ source, result }) => {
    results[source] = result;
  });
  
  // Create shuffled display order for blind comparison
  const displayOrder = shuffleArray([...availableSources]);
  
  if (verbose) {
    console.log('[5-Image Matrix] Display order (shuffled):', displayOrder);
    console.log('[5-Image Matrix] Synthesis complete');
  }
  
  return {
    results,
    generatedSources: availableSources,
    skippedSources,
    displayOrder,
    metadata: {
      totalPrompts: availableSources.length,
      synthesisTimestamp: new Date().toISOString(),
      roomType
    }
  };
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
  FivePromptSynthesisResult,
};

// Re-export from other modules
export {
  // Core functions from scoring
  calculatePromptWeights,
  // Core functions from builder
  buildPromptFromWeights,
  validatePromptLength,
  // Sources from modes
  GenerationSource,
  filterInputsBySource,
  getAvailableSources,
  GENERATION_SOURCE_LABELS,
  // Input builder
  buildPromptInputsFromSession
};

