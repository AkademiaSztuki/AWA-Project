import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIClient } from '@/lib/google-ai/client';
import { ImageGenerationRequest, ImageGenerationResponse } from '@/lib/google-ai/types';
import { buildGoogleNanoBananaPrompt } from '@/lib/prompt-synthesis/builder';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Server-side retry with exponential backoff and jitter for rate limit errors and NO_IMAGE responses
 * Optimized for parallel requests - longer delays and more jitter to avoid thundering herd
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 5, // More retries for parallel mode
  baseDelay: number = 8000 // 8s base (8s, 16s, 32s, 64s, 128s)
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      const isRateLimit = error.message?.includes('429') || 
                          error.message?.includes('RESOURCE_EXHAUSTED') ||
                          error.message?.includes('Resource exhausted');
      
      const isNoImage = error.message?.includes('NO_IMAGE');
      
      // Retry on rate limits or NO_IMAGE (transient errors)
      if ((isRateLimit || isNoImage) && attempt < maxRetries - 1) {
        // Exponential backoff: 8s, 16s, 32s, 64s
        const delay = baseDelay * Math.pow(2, attempt);
        // Add larger random jitter (0-5s) to spread out parallel retries
        const jitter = Math.random() * 5000;
        const totalDelay = delay + jitter;
        
        const errorType = isNoImage ? 'NO_IMAGE' : 'Rate limit (429)';
        console.log(`[Google API] ${errorType} on attempt ${attempt + 1}/${maxRetries}, retrying in ${Math.round(totalDelay)}ms (base: ${delay}ms + jitter: ${Math.round(jitter)}ms)`);
        await sleep(totalDelay);
        continue;
      }
      
      // If not a retryable error or max retries reached, throw
      throw error;
    }
  }
  
  throw lastError;
};

export async function POST(request: NextRequest) {
  // All 6 requests come in parallel from client
  // Server processes them in parallel with server-side retry for rate limits
  try {
    const body = await request.json();
    const {
      prompt,
      base_image,
      style,
      modifications,
      inspiration_images,
      width,
      height,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!base_image) {
      return NextResponse.json(
        { error: 'base_image is required' },
        { status: 400 }
      );
    }

    // #region prompt debug
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/google/generate-image/route.ts:prompt-building:start',message:'Starting prompt building for Google API',data:{originalPrompt:prompt.substring(0,300),originalPromptLength:prompt.length,isJson:prompt.trim().startsWith('{'),style,modifications,hasModifications:modifications?.length>0,modificationsCount:modifications?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
    // #endregion

    // Convert JSON structured prompt to text prompt for Google Nano Banana
    let fullPrompt: string;
    
    if (prompt.trim().startsWith('{')) {
      // JSON structured prompt - convert to text
      fullPrompt = buildGoogleNanoBananaPrompt(prompt);
      
      // #region prompt debug
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/google/generate-image/route.ts:prompt-building:after-conversion',message:'Prompt after JSON to text conversion',data:{fullPrompt:fullPrompt.substring(0,800),fullPromptLength:fullPrompt.length,hasRepaint:fullPrompt.includes('REPAINT'),hasErase:fullPrompt.includes('ERASE'),hasCritical:fullPrompt.includes('CRITICAL')},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
      // #endregion
    } else {
      // Text prompt - use as-is but add style/modifications if needed
      fullPrompt = prompt;
      
      // Add style if not present (for backward compatibility and RoomSetup)
      if (style && style !== 'empty' && !fullPrompt.toLowerCase().includes(style.toLowerCase())) {
        fullPrompt = `${style} style, ${fullPrompt}`;
      }
      
      // Special handling for 'empty' style (RoomSetup)
      if (style === 'empty' && !fullPrompt.includes('empty room')) {
        fullPrompt = `empty room, ${fullPrompt}`;
      }

      if (modifications && modifications.length > 0) {
        const modificationsText = modifications.join(', ');
        if (!fullPrompt.includes(modificationsText)) {
          fullPrompt = `${fullPrompt}, ${modificationsText}`;
        }
      }

      // #region prompt debug
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/google/generate-image/route.ts:prompt-building:after-base',message:'Prompt is text, using as-is',data:{fullPrompt:fullPrompt.substring(0,300),fullPromptLength:fullPrompt.length,style,modifications},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
      // #endregion
    }

    // #region prompt debug
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/google/generate-image/route.ts:prompt-building:final',message:'FINAL PROMPT for Google Nano Banana',data:{finalPrompt:fullPrompt.substring(0,2000),finalPromptLength:fullPrompt.length,wordCount:fullPrompt.split(/\s+/).length},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
    // #endregion

    // #region prompt debug
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/google/generate-image/route.ts:final-request',message:'Final generation request received in API',data:{fullPrompt:fullPrompt.substring(0,2000),width,height,style,modifications,hasSystemInstruction:fullPrompt.includes('SYSTEM INSTRUCTION'),isFurnitureRemoval:fullPrompt.includes('EMPTY ARCHITECTURAL SHELL')},timestamp:Date.now(),sessionId:'debug-session',runId:'geometry-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    const client = new GoogleAIClient();
    const generationRequest: ImageGenerationRequest = {
      prompt: fullPrompt,
      base_image,
      style,
      modifications,
      inspiration_images: inspiration_images && Array.isArray(inspiration_images) && inspiration_images.length > 0
        ? inspiration_images
        : undefined,
      width: width || 1024,
      height: height || 1024,
    };

    // Server-side retry with exponential backoff and jitter for rate limit errors
    // Optimized for parallel requests: more retries, longer delays, more jitter
    const result = await retryWithBackoff(
      () => client.generateImageWithNanoBanana(generationRequest)
      // Uses defaults: maxRetries=5, baseDelay=8000 (8s, 16s, 32s, 64s, 128s)
    );

    return NextResponse.json({
      images: [result.image],
      generation_info: result.generation_info,
    });
  } catch (error: any) {
    console.error('[Google API] Error in generate-image:', error);
    
    // Detect rate limit errors and NO_IMAGE errors for proper status code
    const isRateLimit = error.message?.includes('429') || 
                        error.message?.includes('RESOURCE_EXHAUSTED') ||
                        error.message?.includes('Resource exhausted');
    
    const isNoImage = error.message?.includes('NO_IMAGE');
    
    // Return 429 for rate limits, 503 for NO_IMAGE (service unavailable/transient), 500 for other errors
    const status = isRateLimit ? 429 : (isNoImage ? 503 : 500);
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({ message: 'OK' });
}
