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
  const apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
  
  // Abort after 20s to avoid endless spinners
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  
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

// Real API integration with Gemma 3 4B-IT - returns only tags
export async function analyzeInspirationsWithGamma(files: File[]): Promise<InspirationTaggingResult[]> {
  try {
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          // Convert file to base64
          const base64 = await fileToBase64(file);
          
          // Call real API
          const response = await callInspirationAPI(base64);
          
          return {
            tags: {
              styles: response.styles || [],
              colors: response.colors || [],
              materials: response.materials || [],
              biophilia: response.biophilia || 1
            },
            description: response.description || "Interior design inspiration"
          };
        } catch (error) {
          console.error('Error analyzing inspiration:', error);
          // Return fallback data
          return {
            tags: {
              styles: ["modern"],
              colors: ["neutral"],
              materials: ["wood"],
              biophilia: 1
            },
            description: "Modern interior design inspiration"
          };
        }
      })
    );
    
    return results;
  } catch (error) {
    console.error('Error in analyzeInspirationsWithGamma:', error);
    // Return fallback data for all files
    return files.map(() => ({
      tags: {
        styles: ["modern"],
        colors: ["neutral"],
        materials: ["wood"],
        biophilia: 1
      },
      description: "Modern interior design inspiration"
    }));
  }
}


