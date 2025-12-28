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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gamma-tagging.ts:beforeAPI',message:'About to call Gemini API for tagging',data:{fileName:file.name,fileSize:file.size,fileType:file.type},timestamp:Date.now(),sessionId:'debug-session',runId:'gemini-tags',hypothesisId:'H0'})}).catch(()=>{});
      // #endregion
      
      try {
        const base64 = await fileToNormalizedBase64(file);
        const response = await callInspirationAPI(base64);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gamma-tagging.ts:callInspirationAPI',message:'RAW Gemini response from API',data:{rawResponse:JSON.stringify(response),hasStyles:!!response.styles,stylesValue:response.styles,hasColors:!!response.colors,colorsValue:response.colors,hasMaterials:!!response.materials,materialsValue:response.materials,hasBiophilia:response.biophilia!==undefined,biophiliaValue:response.biophilia,hasDescription:!!response.description,descriptionValue:response.description},timestamp:Date.now(),sessionId:'debug-session',runId:'gemini-tags',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
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
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gamma-tagging.ts:buildTagsObject',message:'Built tags object from Gemini response',data:{tagsObject:JSON.stringify(tagsObject),stylesCount:tagsObject.styles.length,colorsCount:tagsObject.colors.length,materialsCount:tagsObject.materials.length,biophilia:tagsObject.biophilia,description:response.description||'default'},timestamp:Date.now(),sessionId:'debug-session',runId:'gemini-tags',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        
        results.push({
          tags: tagsObject,
          description: response.description || "Interior design inspiration"
        });
      } catch (error: any) {
        console.error('[GoogleAI] Error analyzing inspiration:', error);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gamma-tagging.ts:catch',message:'ERROR in Gemini tagging',data:{errorMessage:error?.message||String(error),errorName:error?.name,errorStack:error?.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'gemini-tags',hypothesisId:'H-ERROR'})}).catch(()=>{});
        // #endregion
        
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gamma-tagging.ts:finalResults',message:'Final results from Gemini tagging',data:{resultsCount:results.length,results:results.map((r,i)=>({index:i,hasTags:!!r.tags,tagsKeys:r.tags?Object.keys(r.tags):[],stylesCount:r.tags?.styles?.length||0,colorsCount:r.tags?.colors?.length||0,materialsCount:r.tags?.materials?.length||0,biophilia:r.tags?.biophilia,hasDescription:!!r.description}))},timestamp:Date.now(),sessionId:'debug-session',runId:'gemini-tags',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    return results;
  };

  const queuedTask = inspirationQueue.current.then(processSequentially, processSequentially);
  inspirationQueue.current = queuedTask.then(
    () => undefined,
    () => undefined
  );
  return queuedTask;
}


