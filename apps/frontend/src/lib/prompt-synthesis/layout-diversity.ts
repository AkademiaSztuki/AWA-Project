// PROMPT SYNTHESIS - Layout Diversity Module
// Ensures visual diversity in spatial arrangements across different sources
// Research-backed layout patterns for interior design

import { GenerationSource } from './modes';
import { PromptWeights } from './scoring';

/**
 * Layout variation configuration
 * Different sources get different layout strategies to ensure visual diversity
 */
export interface LayoutVariation {
  arrangement: 'symmetrical' | 'asymmetrical' | 'balanced';
  focalPoint: 'centered' | 'off-center' | 'multiple';
  furnitureGrouping: 'clustered' | 'distributed' | 'zones';
  zoning: 'open' | 'defined' | 'flexible';
  description: string; // Human-readable description for prompt
}

/**
 * Generates layout variation based on source type and weights
 * Each source gets a different layout strategy to ensure diversity
 */
export function generateLayoutVariation(
  sourceType: GenerationSource,
  weights: PromptWeights
): LayoutVariation {
  // Base layout on source type to ensure diversity
  switch (sourceType) {
    case GenerationSource.Implicit:
      // Implicit: Organic, intuitive layouts
      return {
        arrangement: 'asymmetrical',
        focalPoint: 'off-center',
        furnitureGrouping: 'clustered',
        zoning: 'flexible',
        description: 'organic, intuitive arrangement with off-center focal point, clustered furniture creating cozy zones'
      };
      
    case GenerationSource.Explicit:
      // Explicit: Structured, intentional layouts
      return {
        arrangement: 'balanced',
        focalPoint: 'centered',
        furnitureGrouping: 'distributed',
        zoning: 'defined',
        description: 'balanced, structured layout with centered focal point, evenly distributed furniture creating clear zones'
      };
      
    case GenerationSource.Personality:
      // Personality: Based on personality traits
      if (weights.facetPreferences?.orderPreference > 0.6) {
        // High order preference = symmetrical
        return {
          arrangement: 'symmetrical',
          focalPoint: 'centered',
          furnitureGrouping: 'distributed',
          zoning: 'defined',
          description: 'symmetrical, organized layout with centered focal point, evenly distributed furniture'
        };
      } else if (weights.facetPreferences?.excitementSeeking > 0.6) {
        // High excitement seeking = dynamic
        return {
          arrangement: 'asymmetrical',
          focalPoint: 'multiple',
          furnitureGrouping: 'clustered',
          zoning: 'flexible',
          description: 'dynamic, asymmetrical layout with multiple focal points, clustered furniture for visual interest'
        };
      } else {
        // Default: balanced
        return {
          arrangement: 'balanced',
          focalPoint: 'centered',
          furnitureGrouping: 'distributed',
          zoning: 'open',
          description: 'balanced layout with centered focal point, open flow'
        };
      }
      
    case GenerationSource.Mixed:
      // Mixed: Harmonious blend
      return {
        arrangement: 'balanced',
        focalPoint: 'centered',
        furnitureGrouping: 'zones',
        zoning: 'flexible',
        description: 'harmonious, balanced layout with flexible zoning, furniture arranged in functional zones'
      };
      
    case GenerationSource.MixedFunctional:
      // MixedFunctional: Functional, activity-based
      if (weights.requiresZoning) {
        return {
          arrangement: 'balanced',
          focalPoint: 'multiple',
          furnitureGrouping: 'zones',
          zoning: 'defined',
          description: 'functional layout with defined zones for different activities, multiple focal points'
        };
      } else {
        return {
          arrangement: 'balanced',
          focalPoint: 'centered',
          furnitureGrouping: 'distributed',
          zoning: 'open',
          description: 'open, functional layout optimized for activities, centered focal point'
        };
      }
      
    case GenerationSource.InspirationReference:
      // InspirationReference: Follow reference images (but add variation)
      return {
        arrangement: 'asymmetrical',
        focalPoint: 'off-center',
        furnitureGrouping: 'clustered',
        zoning: 'flexible',
        description: 'inspired arrangement following reference images, organic flow with clustered furniture'
      };
      
    default:
      // Fallback: balanced
      return {
        arrangement: 'balanced',
        focalPoint: 'centered',
        furnitureGrouping: 'distributed',
        zoning: 'open',
        description: 'balanced layout with open flow'
      };
  }
}

/**
 * Converts layout variation to prompt phrase
 */
export function layoutVariationToPhrase(variation: LayoutVariation): string {
  return variation.description;
}

/**
 * Gets layout-specific furniture arrangement instructions
 */
export function getLayoutFurnitureInstructions(variation: LayoutVariation): string {
  const instructions: string[] = [];
  
  if (variation.furnitureGrouping === 'clustered') {
    instructions.push('furniture arranged in cozy clusters');
  } else if (variation.furnitureGrouping === 'distributed') {
    instructions.push('furniture evenly distributed throughout space');
  } else if (variation.furnitureGrouping === 'zones') {
    instructions.push('furniture arranged in distinct functional zones');
  }
  
  if (variation.arrangement === 'symmetrical') {
    instructions.push('symmetrical arrangement');
  } else if (variation.arrangement === 'asymmetrical') {
    instructions.push('asymmetrical, dynamic arrangement');
  }
  
  if (variation.focalPoint === 'multiple') {
    instructions.push('multiple focal points');
  } else if (variation.focalPoint === 'off-center') {
    instructions.push('off-center focal point');
  }
  
  return instructions.join(', ');
}

