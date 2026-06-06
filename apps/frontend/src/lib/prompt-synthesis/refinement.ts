// PROMPT SYNTHESIS - Local prompt optimization utilities (no LLM).

/**
 * Client-side simple optimization (no LLM)
 * Removes common redundant phrases
 */
export function optimizePromptLocally(prompt: string): string {
  let optimized = prompt;
  
  // Remove redundant phrases
  const redundantPhrases = [
    'featuring a ',
    'with a ',
    'that has ',
    'which includes ',
    ', and also ',
    'very ',
    'really ',
    'quite '
  ];
  
  redundantPhrases.forEach(phrase => {
    optimized = optimized.replace(new RegExp(phrase, 'gi'), '');
  });
  
  // Remove double spaces
  optimized = optimized.replace(/\s+/g, ' ').trim();
  
  // Ensure proper capitalization
  optimized = optimized.charAt(0).toUpperCase() + optimized.slice(1);
  
  return optimized;
}

/**
 * Compare two prompts for semantic similarity
 * Used to verify refinement maintains meaning
 */
export function comparePrompts(original: string, refined: string): {
  tokenReduction: number;
  percentReduction: number;
  maintainsKeywords: boolean;
  keywordsMissing: string[];
} {
  const originalTokens = original.split(/\s+/).length;
  const refinedTokens = refined.split(/\s+/).length;
  
  const tokenReduction = originalTokens - refinedTokens;
  const percentReduction = (tokenReduction / originalTokens) * 100;
  
  // Extract key descriptive words (nouns, adjectives)
  const extractKeywords = (text: string): Set<string> => {
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    return new Set(words);
  };
  
  const originalKeywords = extractKeywords(original);
  const refinedKeywords = extractKeywords(refined);
  
  const keywordsMissing: string[] = [];
  originalKeywords.forEach(keyword => {
    if (!refinedKeywords.has(keyword)) {
      keywordsMissing.push(keyword);
    }
  });
  
  const maintainsKeywords = keywordsMissing.length <= 2; // Allow 2 keywords to be lost
  
  return {
    tokenReduction,
    percentReduction: Math.round(percentReduction),
    maintainsKeywords,
    keywordsMissing
  };
}

