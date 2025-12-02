/**
 * Facet-Driven Style Derivation
 * 
 * Uses IPIP-NEO-120 facets (30 facets, 6 per domain) to derive design preferences
 * with higher precision than domain-level scores alone.
 */

import { PromptInputs } from './scoring';
import { BIGFIVE_STYLE_MAPPINGS, StyleMapping } from './research-mappings';

export interface PersonalityData {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  facets?: {
    O?: { [key: number]: number };
    C?: { [key: number]: number };
    E?: { [key: number]: number };
    A?: { [key: number]: number };
    N?: { [key: number]: number };
  };
}

export interface StyleDerivation {
  dominantStyle: string;
  confidence: number;
  materials: string[];
  complexity: number;
  researchBasis: string;
  matchedMapping: string; // ID of matched mapping
  score: number; // How well this mapping matched (0-1)
}

/**
 * Gets facet score with fallback to domain score
 */
function getFacetScore(
  personality: PersonalityData,
  domain: 'O' | 'C' | 'E' | 'A' | 'N',
  facetNum: number,
  fallbackDomain: number
): number {
  if (personality.facets?.[domain] && typeof personality.facets[domain]![facetNum] === 'number') {
    return personality.facets[domain]![facetNum] / 100; // Convert 0-100 to 0-1
  }
  // Fallback: use domain score as estimation
  return fallbackDomain / 100;
}

/**
 * Evaluates a condition string (e.g., ">0.65", "<0.4", "0.5-0.7")
 */
function evaluateCondition(value: number, condition: string): boolean {
  if (!condition) return true; // No condition = always match
  
  // Range condition: "0.5-0.7"
  if (condition.includes('-')) {
    const [min, max] = condition.split('-').map(parseFloat);
    return value >= min && value <= max;
  }
  
  // Greater than: ">0.65"
  if (condition.startsWith('>')) {
    const threshold = parseFloat(condition.substring(1));
    return value > threshold;
  }
  
  // Less than: "<0.4"
  if (condition.startsWith('<')) {
    const threshold = parseFloat(condition.substring(1));
    return value < threshold;
  }
  
  // Greater or equal: ">=0.6"
  if (condition.startsWith('>=')) {
    const threshold = parseFloat(condition.substring(2));
    return value >= threshold;
  }
  
  // Less or equal: "<=0.3"
  if (condition.startsWith('<=')) {
    const threshold = parseFloat(condition.substring(2));
    return value <= threshold;
  }
  
  // Exact match: "0.5"
  const exact = parseFloat(condition);
  if (!isNaN(exact)) {
    return Math.abs(value - exact) < 0.05; // Allow small tolerance
  }
  
  return false;
}

/**
 * Gets normalized domain or facet value
 */
function getValue(
  personality: PersonalityData,
  key: string
): number | null {
  // Domain values
  if (key === 'O') return personality.openness / 100;
  if (key === 'C') return personality.conscientiousness / 100;
  if (key === 'E') return personality.extraversion / 100;
  if (key === 'A') return personality.agreeableness / 100;
  if (key === 'N') return personality.neuroticism / 100;
  
  // Facet values
  if (key.startsWith('O')) {
    const facetNum = parseInt(key.substring(1).split('_')[0]);
    return getFacetScore(personality, 'O', facetNum, personality.openness);
  }
  if (key.startsWith('C')) {
    const facetNum = parseInt(key.substring(1).split('_')[0]);
    return getFacetScore(personality, 'C', facetNum, personality.conscientiousness);
  }
  if (key.startsWith('E')) {
    const parts = key.substring(1).split('_');
    const facetNum = parseInt(parts[0]);
    return getFacetScore(personality, 'E', facetNum, personality.extraversion);
  }
  if (key.startsWith('A')) {
    const facetNum = parseInt(key.substring(1).split('_')[0]);
    return getFacetScore(personality, 'A', facetNum, personality.agreeableness);
  }
  if (key.startsWith('N')) {
    const facetNum = parseInt(key.substring(1).split('_')[0]);
    return getFacetScore(personality, 'N', facetNum, personality.neuroticism);
  }
  
  return null;
}

/**
 * Calculates how well a personality profile matches a style mapping
 */
function calculateMappingScore(
  personality: PersonalityData,
  mapping: StyleMapping
): number {
  const conditions = mapping.conditions;
  let matchedConditions = 0;
  let totalConditions = 0;
  let weightedScore = 0;
  
  // Check each condition
  for (const [key, condition] of Object.entries(conditions)) {
    totalConditions++;
    const value = getValue(personality, key);
    
    if (value === null) {
      // Condition references unavailable data - skip or penalize
      continue;
    }
    
    if (evaluateCondition(value, condition)) {
      matchedConditions++;
      // Weight by how extreme the value is (more extreme = stronger match)
      const extremity = Math.abs(value - 0.5) * 2; // 0-1, where 1 = most extreme
      weightedScore += extremity;
    }
  }
  
  if (totalConditions === 0) {
    // No conditions = default mapping, lower confidence
    return 0.5;
  }
  
  // Base score: proportion of conditions met
  const baseScore = matchedConditions / totalConditions;
  
  // Weighted score: considers extremity of matches
  const avgWeighted = totalConditions > 0 ? weightedScore / totalConditions : 0;
  
  // Combined score
  return (baseScore * 0.6) + (avgWeighted * 0.4);
}

/**
 * Derives style from personality using facet-level data when available
 */
export function deriveStyleFromFacets(
  personality: PersonalityData
): StyleDerivation {
  // Calculate scores for all style mappings
  const mappingScores = BIGFIVE_STYLE_MAPPINGS.map(mapping => ({
    mapping,
    score: calculateMappingScore(personality, mapping)
  }));
  
  // Sort by score (highest first)
  mappingScores.sort((a, b) => b.score - a.score);
  
  // Get best match
  const bestMatch = mappingScores[0];
  
  if (!bestMatch || bestMatch.score < 0.3) {
    // No good match - use default
    const defaultMapping = BIGFIVE_STYLE_MAPPINGS.find(m => m.id === 'modern_classic')!;
    return {
      dominantStyle: defaultMapping.style,
      confidence: 0.5,
      materials: defaultMapping.materials,
      complexity: defaultMapping.complexity,
      researchBasis: defaultMapping.researchBasis,
      matchedMapping: defaultMapping.id,
      score: 0.3
    };
  }
  
  const selectedMapping = bestMatch.mapping;
  
  // Calculate confidence based on:
  // 1. Match score (how well conditions were met)
  // 2. Mapping's confidence multiplier
  // 3. Whether facets were available (higher confidence with facets)
  const hasFacets = !!personality.facets && 
    Object.keys(personality.facets).length > 0;
  
  const baseConfidence = bestMatch.score;
  const multiplierConfidence = selectedMapping.confidenceMultiplier;
  const facetBonus = hasFacets ? 0.1 : 0;
  
  const confidence = Math.min(0.95, 
    (baseConfidence * 0.6) + 
    (multiplierConfidence * 0.3) + 
    facetBonus
  );
  
  return {
    dominantStyle: selectedMapping.style,
    confidence,
    materials: [...selectedMapping.materials],
    complexity: selectedMapping.complexity,
    researchBasis: selectedMapping.researchBasis,
    matchedMapping: selectedMapping.id,
    score: bestMatch.score
  };
}

/**
 * Gets all facet values as a normalized object
 */
export function getAllFacetValues(personality: PersonalityData): Record<string, number> {
  const values: Record<string, number> = {
    O: personality.openness / 100,
    C: personality.conscientiousness / 100,
    E: personality.extraversion / 100,
    A: personality.agreeableness / 100,
    N: personality.neuroticism / 100
  };
  
  // Add facets if available
  if (personality.facets) {
    for (const [domain, facets] of Object.entries(personality.facets)) {
      if (facets) {
        for (const [facetNum, score] of Object.entries(facets)) {
          const key = `${domain}${facetNum}`;
          values[key] = score / 100;
        }
      }
    }
  }
  
  return values;
}

/**
 * Calculates confidence score for personality-based derivation
 * 
 * Factors:
 * 1. Extremity - how extreme are the scores? (0.3-0.7 = moderate, <0.3 or >0.7 = extreme)
 * 2. Facets availability - higher confidence with full IPIP-NEO-120 data
 * 3. Internal consistency - do facets align with domain scores?
 */
export function calculateConfidence(personality: PersonalityData): number {
  let confidence = 0.5; // Base confidence
  
  // 1. EXTREMITY FACTOR
  // More extreme scores (very high or very low) = higher confidence
  // Moderate scores (0.3-0.7) = lower confidence (could go either way)
  const domains = [
    personality.openness / 100,
    personality.conscientiousness / 100,
    personality.extraversion / 100,
    personality.agreeableness / 100,
    personality.neuroticism / 100
  ];
  
  const extremityScores = domains.map(score => {
    // Distance from 0.5 (neutral)
    const distance = Math.abs(score - 0.5);
    // Extreme (>0.7 or <0.3) = high confidence, moderate (0.3-0.7) = lower
    if (distance > 0.2) {
      return distance * 2; // 0-1 scale, where 1 = most extreme (0 or 1)
    } else {
      return distance; // Moderate zone = lower confidence
    }
  });
  
  const avgExtremity = extremityScores.reduce((a, b) => a + b, 0) / extremityScores.length;
  const extremityBonus = avgExtremity * 0.2; // Up to +20%
  confidence += extremityBonus;
  
  // 2. FACETS AVAILABILITY FACTOR
  // Full IPIP-NEO-120 data (30 facets) = higher confidence
  if (personality.facets) {
    let facetCount = 0;
    const expectedFacets = 30; // 6 facets × 5 domains
    
    for (const domain of ['O', 'C', 'E', 'A', 'N'] as const) {
      if (personality.facets[domain]) {
        facetCount += Object.keys(personality.facets[domain]!).length;
      }
    }
    
    const facetCompleteness = facetCount / expectedFacets;
    const facetBonus = facetCompleteness * 0.15; // Up to +15%
    confidence += facetBonus;
  }
  
  // 3. INTERNAL CONSISTENCY FACTOR
  // Do facets align with domain scores? Higher alignment = higher confidence
  if (personality.facets) {
    let consistencyScores: number[] = [];
    
    // Check each domain
    const domainMap: Record<string, { domain: keyof PersonalityData['facets'], index: number }> = {
      'O': { domain: 'O', index: 0 },
      'C': { domain: 'C', index: 1 },
      'E': { domain: 'E', index: 2 },
      'A': { domain: 'A', index: 3 },
      'N': { domain: 'N', index: 4 }
    };
    
    for (const [domainKey, { domain, index }] of Object.entries(domainMap)) {
      const domainScore = domains[index];
      const facets = personality.facets[domain];
      
      if (facets && Object.keys(facets).length > 0) {
        // Calculate average facet score for this domain
        const facetScores = Object.values(facets).map(s => s / 100);
        const avgFacetScore = facetScores.reduce((a, b) => a + b, 0) / facetScores.length;
        
        // Consistency = how close is domain score to average facet score?
        const difference = Math.abs(domainScore - avgFacetScore);
        const consistency = 1 - (difference * 2); // 0-1, where 1 = perfect alignment
        consistencyScores.push(Math.max(0, consistency));
      }
    }
    
    if (consistencyScores.length > 0) {
      const avgConsistency = consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;
      const consistencyBonus = avgConsistency * 0.1; // Up to +10%
      confidence += consistencyBonus;
    }
  }
  
  // Cap at 0.95 (never 100% - always some uncertainty)
  return Math.min(0.95, Math.max(0.3, confidence));
}

/**
 * Calculates extremity score (how extreme are the personality scores?)
 * Returns 0-1, where 1 = most extreme (all scores very high or very low)
 */
export function calculateExtremity(personality: PersonalityData): number {
  const domains = [
    personality.openness / 100,
    personality.conscientiousness / 100,
    personality.extraversion / 100,
    personality.agreeableness / 100,
    personality.neuroticism / 100
  ];
  
  const extremityScores = domains.map(score => {
    // Distance from 0.5 (neutral)
    return Math.abs(score - 0.5) * 2; // 0-1 scale
  });
  
  return extremityScores.reduce((a, b) => a + b, 0) / extremityScores.length;
}

/**
 * Checks if personality has complete facet data
 */
export function hasAllFacets(personality: PersonalityData): boolean {
  if (!personality.facets) return false;
  
  const expectedFacets = 30; // 6 facets × 5 domains
  let facetCount = 0;
  
  for (const domain of ['O', 'C', 'E', 'A', 'N'] as const) {
    if (personality.facets[domain]) {
      facetCount += Object.keys(personality.facets[domain]!).length;
    }
  }
  
  return facetCount >= expectedFacets * 0.8; // At least 80% of facets
}

/**
 * Calculates internal consistency between domain scores and facet averages
 */
export function calculateInternalConsistency(personality: PersonalityData): number {
  if (!personality.facets) return 0.5; // No facets = moderate consistency assumption
  
  const domains = [
    personality.openness / 100,
    personality.conscientiousness / 100,
    personality.extraversion / 100,
    personality.agreeableness / 100,
    personality.neuroticism / 100
  ];
  
  const domainMap: Record<string, { domain: keyof PersonalityData['facets'], index: number }> = {
    'O': { domain: 'O', index: 0 },
    'C': { domain: 'C', index: 1 },
    'E': { domain: 'E', index: 2 },
    'A': { domain: 'A', index: 3 },
    'N': { domain: 'N', index: 4 }
  };
  
  const consistencyScores: number[] = [];
  
  for (const { domain, index } of Object.values(domainMap)) {
    const domainScore = domains[index];
    const facets = personality.facets[domain];
    
    if (facets && Object.keys(facets).length > 0) {
      const facetScores = Object.values(facets).map(s => s / 100);
      const avgFacetScore = facetScores.reduce((a, b) => a + b, 0) / facetScores.length;
      
      const difference = Math.abs(domainScore - avgFacetScore);
      const consistency = 1 - (difference * 2); // 0-1
      consistencyScores.push(Math.max(0, consistency));
    }
  }
  
  if (consistencyScores.length === 0) return 0.5;
  
  return consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;
}

