// PROMPT SYNTHESIS - Main Pipeline
// Orchestrates: Scoring → Building → Optional LLM Refinement
// Exports main synthesizePrompt() function for use throughout app

import { PromptInputs, PromptWeights, calculatePromptWeights } from './scoring';
import { buildPromptFromWeights, validatePromptLength, PromptComponents } from './builder';
import { refineSyntaxWithLLM } from './refinement';

// =========================
// MAIN SYNTHESIS FUNCTION
// =========================

export interface SynthesisResult {
  prompt: string;              // Final prompt for FLUX
  components: PromptComponents; // Breakdown of prompt parts
  weights: PromptWeights;       // Calculated weights
  metadata: {
    tokenCount: number;
    isRefined: boolean;          // Was LLM refinement used?
    validationStatus: string;
    synthesisTimestamp: string;
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
export {
  calculatePromptWeights,
  buildPromptFromWeights,
  validatePromptLength
};

