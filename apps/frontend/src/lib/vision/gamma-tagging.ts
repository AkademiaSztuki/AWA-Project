// Inspiration tagging helper - real API integration
// Returns tags for inspirations using Gemini 2.0 Flash via Vertex AI (NOT Gamma/Gemma - name is legacy)

import { fileToNormalizedBase64 } from '@/lib/utils';

export interface InspirationTaggingResult {
  tags: {
    styles?: string[];
    colors?: string[];
    materials?: string[];
    biophilia?: number; // 0–3
  };
  description?: string; // short VLM description for Kontext-style prompts
}

// API call to Google AI endpoint (replaces Modal/Gemma 3)
async function callInspirationAPI(image: string) {
  // Use Google AI API endpoint instead of Modal
  const apiUrl = '/api/google/analyze-inspiration';
  
  // Abort after 90s to let Gemini tagging finish
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

const inspirationQueue: { current: Promise<void> } = { current: Promise.resolve() };

// Real API integration with Gemini 2.5 Flash-Lite (replaced Gemma 3) - returns only tags
export async function analyzeInspirationsWithGamma(files: File[]): Promise<InspirationTaggingResult[]> {
  if (!files.length) {
    return [];
  }

  const processSequentially = async (): Promise<InspirationTaggingResult[]> => {
    const results: InspirationTaggingResult[] = [];

    for (const file of files) {
      
      try {
        const base64 = await fileToNormalizedBase64(file);
        const response = await callInspirationAPI(base64);
        
        
        // Gemini zwraca biophilia 0-3; jeśli brak, ustaw 0 (nie windowaj na 1)
        const biophilia = typeof response.biophilia === 'number' && !Number.isNaN(response.biophilia)
          ? response.biophilia
          : 0;
        console.log('[Gemini] Tagged inspiration:', {
          hasBiophilia: typeof response.biophilia === 'number',
          biophiliaValue: response.biophilia,
          finalBiophilia: biophilia,
          stylesCount: response.styles?.length || 0,
          colorsCount: response.colors?.length || 0
        });
        const tagsObject = {
          styles: response.styles || [],
          colors: response.colors || [],
          materials: response.materials || [],
          biophilia
        };
        
        
        results.push({
          tags: tagsObject,
          description: response.description || "Interior design inspiration"
        });
      } catch (error: any) {
        console.error('[GoogleAI] Error analyzing inspiration:', error);
        
        
        results.push({
          tags: {
            styles: [],
            colors: [],
            materials: [],
            biophilia: 0 // Błąd = brak danych, nie windowaj na 1
          },
          description: undefined
        });
      }
    }

    
    return results;
  };

  const queuedTask = inspirationQueue.current.then(processSequentially, processSequentially);
  inspirationQueue.current = queuedTask.then(
    () => undefined,
    () => undefined
  );
  return queuedTask;
}

