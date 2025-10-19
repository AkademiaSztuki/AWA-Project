// PROMPT SYNTHESIS - STEP 3: Optional LLM Refinement
// Uses MiniCPM (or similar lightweight LLM) to polish syntax only
// Does NOT change content, only improves flow and reduces tokens

/**
 * Refines prompt syntax using LLM
 * - Removes redundancy
 * - Improves flow
 * - Reduces token count
 * - Maintains semantic meaning
 * 
 * @param basePrompt - Template-built prompt
 * @param targetTokens - Desired token count (default: 65)
 * @returns Refined prompt
 */
export async function refineSyntaxWithLLM(
  basePrompt: string,
  targetTokens: number = 65
): Promise<string> {
  // Call Modal API endpoint for prompt refinement
  try {
    const response = await fetch('/api/modal/refine-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: basePrompt,
        targetTokens,
        instructions: [
          'Condense to natural, flowing description',
          'Remove redundant words',
          'Maintain all key information',
          'Keep descriptive, avoid lists',
          'Optimize for FLUX image generation',
          `Target ${targetTokens} tokens or less`
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`LLM refinement failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.refinedPrompt;
    
  } catch (error) {
    console.error('[Prompt Refinement] Error:', error);
    // Fallback: simple truncation if LLM fails
    return fallbackTruncation(basePrompt, targetTokens);
  }
}

/**
 * Fallback truncation if LLM is unavailable
 * Simple but predictable
 */
function fallbackTruncation(prompt: string, targetTokens: number): string {
  const words = prompt.split(/\s+/);
  
  if (words.length <= targetTokens) {
    return prompt;
  }
  
  // Truncate and add ellipsis
  const truncated = words.slice(0, targetTokens - 1).join(' ');
  return truncated + '...';
}

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

