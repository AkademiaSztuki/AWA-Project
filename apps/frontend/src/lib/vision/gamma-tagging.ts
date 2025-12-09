// Gamma tagging helper - real API integration
// Returns tags for inspirations using Gemma 3 4B-IT vision model

export interface InspirationTaggingResult {
  tags: {
    styles?: string[];
    colors?: string[];
    materials?: string[];
    biophilia?: number; // 0–3
  };
  description?: string; // short VLM description for Kontext-style prompts
}

// Helper function to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Direct API call to existing Modal endpoint
async function callInspirationAPI(image: string) {
  let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';
  
  // Fix for incorrect dev URL in Vercel
  if (apiBase.includes('-dev')) {
    apiBase = 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';
  }
  
  // Abort after 90s to let Gemma tagging finish on cold starts / GPU load
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  
  const response = await fetch(`${apiBase}/analyze-inspiration`, {
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

// Real API integration with Gemma 3 4B-IT - returns only tags
export async function analyzeInspirationsWithGamma(files: File[]): Promise<InspirationTaggingResult[]> {
  if (!files.length) {
    return [];
  }

  const processSequentially = async (): Promise<InspirationTaggingResult[]> => {
    const results: InspirationTaggingResult[] = [];

    for (const file of files) {
      try {
        const base64 = await fileToBase64(file);
        const response = await callInspirationAPI(base64);
        // Gamma zwraca biophilia 0-3; jeśli brak, ustaw 0 (nie windowaj na 1)
        const biophilia = typeof response.biophilia === 'number' && !Number.isNaN(response.biophilia)
          ? response.biophilia
          : 0;
        console.log('[Gamma] Tagged inspiration:', {
          hasBiophilia: typeof response.biophilia === 'number',
          biophiliaValue: response.biophilia,
          finalBiophilia: biophilia,
          stylesCount: response.styles?.length || 0,
          colorsCount: response.colors?.length || 0
        });
        results.push({
          tags: {
            styles: response.styles || [],
            colors: response.colors || [],
            materials: response.materials || [],
            biophilia
          },
          description: response.description || "Interior design inspiration"
        });
      } catch (error) {
        console.error('[Gamma] Error analyzing inspiration:', error);
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


