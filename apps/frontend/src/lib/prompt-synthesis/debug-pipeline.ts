// Debug utility to trace prompt synthesis pipeline
// Use this to understand what data flows through each step

import { PromptInputs } from './scoring';
import { GenerationSource, filterInputsBySource } from './modes';
import { calculatePromptWeights } from './scoring';
import { buildFlux2Prompt } from './builder';

export interface PipelineDebugInfo {
  source: GenerationSource;
  beforeFilter: {
    hasImplicit: boolean;
    hasExplicit: boolean;
    hasPersonality: boolean;
    implicitStyles: string[];
    explicitStyle?: string;
    personalityScores?: { O: number; C: number; E: number; A: number; N: number };
  };
  afterFilter: {
    hasImplicit: boolean;
    hasExplicit: boolean;
    hasPersonality: boolean;
    implicitStyles: string[];
    explicitStyle?: string;
    personalityScores?: { O: number; C: number; E: number; A: number; N: number };
  };
  weights: {
    dominantStyle: string;
    colorPalette: string[];
    mood: string;
  };
  finalPrompt: string;
}

export function debugPipeline(
  fullInputs: PromptInputs,
  source: GenerationSource,
  roomType: string
): PipelineDebugInfo {
  // BEFORE FILTER
  const beforeFilter = {
    hasImplicit: (fullInputs.aestheticDNA.implicit.dominantStyles.length > 0) || 
                  (fullInputs.aestheticDNA.implicit.colors.length > 0),
    hasExplicit: !!fullInputs.aestheticDNA.explicit.selectedStyle || 
                 !!fullInputs.aestheticDNA.explicit.selectedPalette,
    hasPersonality: !!fullInputs.personality,
    implicitStyles: fullInputs.aestheticDNA.implicit.dominantStyles,
    explicitStyle: fullInputs.aestheticDNA.explicit.selectedStyle,
    personalityScores: fullInputs.personality ? {
      O: fullInputs.personality.openness,
      C: fullInputs.personality.conscientiousness,
      E: fullInputs.personality.extraversion,
      A: fullInputs.personality.agreeableness,
      N: fullInputs.personality.neuroticism
    } : undefined
  };

  // FILTER
  const filteredInputs = filterInputsBySource(fullInputs, source);

  // AFTER FILTER
  const afterFilter = {
    hasImplicit: (filteredInputs.aestheticDNA.implicit.dominantStyles.length > 0) || 
                  (filteredInputs.aestheticDNA.implicit.colors.length > 0),
    hasExplicit: !!filteredInputs.aestheticDNA.explicit.selectedStyle || 
                 !!filteredInputs.aestheticDNA.explicit.selectedPalette,
    hasPersonality: !!filteredInputs.personality,
    implicitStyles: filteredInputs.aestheticDNA.implicit.dominantStyles,
    explicitStyle: filteredInputs.aestheticDNA.explicit.selectedStyle,
    personalityScores: filteredInputs.personality ? {
      O: filteredInputs.personality.openness,
      C: filteredInputs.personality.conscientiousness,
      E: filteredInputs.personality.extraversion,
      A: filteredInputs.personality.agreeableness,
      N: filteredInputs.personality.neuroticism
    } : undefined
  };

  // CALCULATE WEIGHTS
  const weights = calculatePromptWeights(filteredInputs, source);

  // BUILD PROMPT
  const finalPrompt = buildFlux2Prompt(weights, roomType, source);

  return {
    source,
    beforeFilter,
    afterFilter,
    weights: {
      dominantStyle: weights.dominantStyle,
      colorPalette: weights.colorPalette,
      mood: weights.needsCalming > 0.6 ? 'calming' : 
            weights.needsEnergizing > 0.6 ? 'energizing' : 
            weights.needsInspiration > 0.6 ? 'inspiring' : 'balanced'
    },
    finalPrompt
  };
}

export function debugAllSources(
  fullInputs: PromptInputs,
  roomType: string
): Record<GenerationSource, PipelineDebugInfo> {
  const allSources = Object.values(GenerationSource);
  const results: Partial<Record<GenerationSource, PipelineDebugInfo>> = {};

  for (const source of allSources) {
    results[source] = debugPipeline(fullInputs, source, roomType);
  }

  return results as Record<GenerationSource, PipelineDebugInfo>;
}

