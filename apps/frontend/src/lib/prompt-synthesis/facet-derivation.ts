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
  let usesFacets = false;
  let usesDomains = false;
  
  // Check each condition
  for (const [key, condition] of Object.entries(conditions)) {
    totalConditions++;
    const value = getValue(personality, key);
    
    if (value === null) {
      // Condition references unavailable data - skip or penalize
      continue;
    }
    
    // Track if this mapping uses facets or domains
    if (key.length > 1 && (key[1] === '1' || key[1] === '2' || key[1] === '3' || key[1] === '4' || key[1] === '5' || key[1] === '6')) {
      usesFacets = true;
    } else if (['O', 'C', 'E', 'A', 'N'].includes(key)) {
      usesDomains = true;
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
    // CRITICAL FIX: If all domains are neutral, penalize default mapping even more
    const allDomainsNeutral = 
      Math.abs((personality.openness / 100) - 0.5) < 0.05 &&
      Math.abs((personality.conscientiousness / 100) - 0.5) < 0.05 &&
      Math.abs((personality.extraversion / 100) - 0.5) < 0.05 &&
      Math.abs((personality.agreeableness / 100) - 0.5) < 0.05 &&
      Math.abs((personality.neuroticism / 100) - 0.5) < 0.05;
    const hasFacets = !!personality.facets && Object.keys(personality.facets).length > 0;
    
    if (allDomainsNeutral && hasFacets) {
      // Penalize default mapping heavily when we have facet data
      // This ensures facet-based mappings win over default
      const defaultScore = 0.3; // Lower than penalized transitional (0.42) and boosted japandi (0.48)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'facet-derivation.ts:188',message:'Penalizing default mapping (modern_classic) - all domains neutral but has facets',data:{mappingId:mapping.id,style:mapping.style,defaultScore,allDomainsNeutral,hasFacets},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return defaultScore;
    }
    return 0.5;
  }
  
  // Base score: proportion of conditions met
  const baseScore = matchedConditions / totalConditions;
  
  // Weighted score: considers extremity of matches
  const avgWeighted = totalConditions > 0 ? weightedScore / totalConditions : 0;
  
  // Combined score
  let finalScore = (baseScore * 0.6) + (avgWeighted * 0.4);
  
  // CRITICAL FIX: If all domains are 50 (neutral), prefer mappings that use facets
  // This prevents "transitional" from always winning when domains are neutral
  const allDomainsNeutral = 
    Math.abs((personality.openness / 100) - 0.5) < 0.05 &&
    Math.abs((personality.conscientiousness / 100) - 0.5) < 0.05 &&
    Math.abs((personality.extraversion / 100) - 0.5) < 0.05 &&
    Math.abs((personality.agreeableness / 100) - 0.5) < 0.05 &&
    Math.abs((personality.neuroticism / 100) - 0.5) < 0.05;
  
  const hasFacets = !!personality.facets && Object.keys(personality.facets).length > 0;
  
  if (allDomainsNeutral && hasFacets) {
    // Penalize mappings that only use domains (like transitional_balance)
    if (usesDomains && !usesFacets) {
      const originalScore = finalScore;
      finalScore *= 0.7; // Reduce score by 30% for domain-only mappings
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'facet-derivation.ts:207',message:'Penalizing domain-only mapping (all domains neutral)',data:{mappingId:mapping.id,style:mapping.style,originalScore,penalizedScore:finalScore,usesDomains,usesFacets},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    }
    // Boost mappings that use facets - with diversity bonus
    if (usesFacets) {
      const originalScore = finalScore;
      
      // DIVERSITY BONUS: Calculate how many different facets are used and how extreme they are
      const facetKeys = Object.keys(conditions).filter(key => {
        const facetMatch = key.match(/^([OCEAN])([1-6])_/);
        return facetMatch !== null;
      });
      
      // Count unique facets used
      const uniqueFacets = new Set(facetKeys.map(key => {
        const match = key.match(/^([OCEAN])([1-6])_/);
        return match ? `${match[1]}${match[2]}` : null;
      }).filter(Boolean));
      
      // Count unique DOMAINS used in facets (O, C, E, A, N)
      const uniqueDomains = new Set(facetKeys.map(key => {
        const match = key.match(/^([OCEAN])([1-6])_/);
        return match ? match[1] : null;
      }).filter(Boolean));
      
      // Calculate extremity bonus: how extreme are the facet values used?
      let extremitySum = 0;
      let extremityCount = 0;
      facetKeys.forEach(key => {
        const value = getValue(personality, key);
        if (value !== null) {
          const extremity = Math.abs(value - 0.5) * 2; // 0-1, where 1 = most extreme
          extremitySum += extremity;
          extremityCount++;
        }
      });
      const avgExtremity = extremityCount > 0 ? extremitySum / extremityCount : 0;
      
      // Base boost: 20% for using facets
      let boostMultiplier = 1.2;
      
      // Diversity bonus: +5% per unique facet (max +30% for 6+ facets)
      const diversityBonus = Math.min(0.3, uniqueFacets.size * 0.05);
      boostMultiplier += diversityBonus;
      
      // Cross-domain bonus: +15% if using facets from 3+ different domains (O, C, E, A, N)
      // This encourages using diverse personality aspects, not just one domain
      if (uniqueDomains.size >= 3) {
        boostMultiplier += 0.15;
      } else if (uniqueDomains.size === 2) {
        boostMultiplier += 0.08; // Smaller bonus for 2 domains
      }
      
      // Extremity bonus: +10% if average extremity > 0.4 (using extreme facet values)
      if (avgExtremity > 0.4) {
        boostMultiplier += 0.1;
      }
      
      finalScore *= boostMultiplier;
      finalScore = Math.min(1.0, finalScore); // Cap at 1.0
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'facet-derivation.ts:215',message:'Boosting facet-based mapping with diversity bonus',data:{mappingId:mapping.id,style:mapping.style,originalScore,boostedScore:finalScore,usesDomains,usesFacets,uniqueFacetsCount:uniqueFacets.size,uniqueDomainsCount:uniqueDomains.size,uniqueDomains:Array.from(uniqueDomains),avgExtremity,boostMultiplier},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    }
  }
  
  return finalScore;
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
  
  // #region agent log - Log top 5 mappings for debugging
  const topMappings = mappingScores.slice(0, 5).map(m => {
    // Calculate which conditions matched for this mapping
    const matchedConditions: string[] = [];
    const failedConditions: string[] = [];
    for (const [key, condition] of Object.entries(m.mapping.conditions)) {
      const value = getValue(personality, key);
      if (value !== null) {
        if (evaluateCondition(value, condition)) {
          matchedConditions.push(`${key}:${condition} (value: ${value.toFixed(2)})`);
        } else {
          failedConditions.push(`${key}:${condition} (value: ${value.toFixed(2)})`);
        }
      }
    }
    return {
      id: m.mapping.id,
      style: m.mapping.style,
      score: m.score,
      conditions: m.mapping.conditions,
      matchedConditions,
      failedConditions
    };
  });
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'facet-derivation.ts:195',message:'Top 5 style mappings scores with condition details',data:{personalityScores:{O:personality.openness,C:personality.conscientiousness,E:personality.extraversion,A:personality.agreeableness,N:personality.neuroticism},normalizedScores:{O:(personality.openness/100).toFixed(2),C:(personality.conscientiousness/100).toFixed(2),E:(personality.extraversion/100).toFixed(2),A:(personality.agreeableness/100).toFixed(2),N:(personality.neuroticism/100).toFixed(2)},topMappings},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  // Get best match
  const bestMatch = mappingScores[0];
  
  if (!bestMatch || bestMatch.score < 0.3) {
    // No good match - use default
    const defaultMapping = BIGFIVE_STYLE_MAPPINGS.find(m => m.id === 'modern_classic')!;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'facet-derivation.ts:200',message:'FALLBACK: Using default modern_classic style - no good personality match',data:{bestMatchScore:bestMatch?.score||0,hasBestMatch:!!bestMatch,personalityScores:{O:personality.openness,C:personality.conscientiousness,E:personality.extraversion,A:personality.agreeableness,N:personality.neuroticism},hasFacets:!!personality.facets,facetCount:personality.facets?Object.values(personality.facets).reduce((sum:number,domain:any)=>sum+Object.keys(domain||{}).length,0):0,allMappingsScores:mappingScores.slice(0,3).map(m=>({id:m.mapping.id,score:m.score}))},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
    const domainMap: Record<string, { domain: 'O' | 'C' | 'E' | 'A' | 'N', index: number }> = {
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
  
    const domainMap: Record<string, { domain: 'O' | 'C' | 'E' | 'A' | 'N', index: number }> = {
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

