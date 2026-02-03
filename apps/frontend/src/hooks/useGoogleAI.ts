import { useState, useCallback } from 'react';
import { GenerationSource } from '@/lib/prompt-synthesis/modes';
import { addWatermarkToImage } from '@/lib/watermark';

interface GenerationRequest {
  prompt: string;
  base_image?: string;
  style: string;
  modifications: string[];
  width?: number;
  height?: number;
  image_size?: number;
}

interface GenerationResponse {
  images: string[];
  generation_info: any;
}

interface MultiSourceGenerationRequest {
  prompts: Array<{
    source: GenerationSource;
    prompt: string;
  }>;
  base_image?: string;
  style: string;
  modifications?: string[];
  inspiration_images?: string[]; // Base64 images for multi-reference (InspirationReference source)
  generation_run_id?: string;
  parameters: {
    strength: number;
    steps: number;
    guidance: number;
    image_size?: number;
    width?: number;
    height?: number;
  };
}

interface SourceGenerationResult {
  source: GenerationSource;
  image: string; // base64
  prompt: string;
  processing_time: number;
  success: boolean;
  error?: string;
}

interface MultiSourceGenerationResponse {
  results: SourceGenerationResult[];
  total_processing_time: number;
  successful_count: number;
  failed_count: number;
}

// Module-level deduplication to prevent duplicate requests across multiple function calls
const globalProcessedPrompts = new Map<string, number>(); // Map<key, timestamp>
const CLEANUP_AGE_MS = 5 * 60 * 1000; // Clean up entries older than 5 minutes

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) {
    reject(new Error('Generation cancelled'));
    return;
  }
  
  const timeout = setTimeout(resolve, ms);
  
  if (signal) {
    signal.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Generation cancelled'));
    }, { once: true });
  }
});

const getPromptKey = (runId: string, source: string) => `${runId}:${source}`;

const clearProcessedPrompts = (runId: string) => {
  // Clear entries for this run after completion
  for (const [key] of globalProcessedPrompts) {
    if (key.startsWith(runId + ':')) {
      globalProcessedPrompts.delete(key);
    }
  }
};

const cleanupOldProcessedPrompts = () => {
  const now = Date.now();
  for (const [key, timestamp] of globalProcessedPrompts) {
    if (now - timestamp > CLEANUP_AGE_MS) {
      globalProcessedPrompts.delete(key);
    }
  }
};

// Centralized generation parameters for Google Nano Banana
export const getGenerationParameters = (
  mode: 'preview' | 'full' | 'upscale' | 'initial' | 'micro' | 'macro',
  iterationCount: number = 0
) => {
  if (mode === 'preview') {
    return {
      steps: 25,
      guidance: 2.5,
      strength: 0.6,
      image_size: 1024,
      width: 1024,
      height: 1024,
      num_images: 1,
    };
  }
  
  if (mode === 'upscale') {
    return {
      steps: 35,
      guidance: 2.5,
      image_size: 1536,
      width: 1536,
      height: 1536,
      num_images: 1,
    };
  }
  
  const qualityAdjustment = Math.max(0.1, 1 - (iterationCount * 0.1));
  
  const baseParams = {
    initial: {
      strength: 0.6,
      steps: 25,
      guidance: 2.5,
      num_images: 1,
      image_size: 1024,
      width: 1024,
      height: 1024
    },
    micro: {
      strength: 0.25 * qualityAdjustment,
      steps: 18,
      guidance: 2.5,
      num_images: 1,
      image_size: 1024,
      width: 1024,
      height: 1024
    },
    macro: {
      strength: 0.75,
      steps: 28,
      guidance: 2.5,
      num_images: 1,
      image_size: 1024,
      width: 1024,
      height: 1024
    }
  };

  return baseParams[mode as 'initial' | 'micro' | 'macro'] || baseParams.initial;
};

export const useGoogleAI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRateLimitError = (error: any) =>
    error?.message?.includes('429') ||
    error?.message?.includes('RESOURCE_EXHAUSTED') ||
    error?.message?.includes('Resource exhausted') ||
    error?.message?.includes('NO_IMAGE') ||
    error?.isRateLimit === true;

  /**
   * Retry helper with exponential backoff for rate limit errors (429)
   */
  const retryWithBackoff = async <T>(
    fn: (attempt: number) => Promise<T>,
    maxRetries: number = 2,
    baseDelay: number = 8000,
    abortSignal?: AbortSignal
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (abortSignal?.aborted) {
        throw new Error('Generation cancelled');
      }

      try {
        console.log(`[Google AI] Attempt ${attempt + 1}/${maxRetries} starting...`);
        return await fn(attempt);
      } catch (error: any) {
        lastError = error;
        
        const isRateLimit = isRateLimitError(error);
        const isNoImage = error?.message?.includes('NO_IMAGE');
        
        if (isRateLimit && attempt < maxRetries - 1) {
          // Exponential backoff: 8s, 16s (baseDelay=8000)
          const delay = baseDelay * Math.pow(2, attempt);
          // Add random jitter (0-2s) to prevent synchronized retries
          const jitter = Math.random() * 2000;
          const totalDelay = delay + jitter;
          const errorType = isNoImage ? 'NO_IMAGE' : 'Rate limit (429)';
          console.log(`[Google AI] ⚠️ ${errorType} hit, retrying in ${Math.round(totalDelay)}ms (base: ${delay}ms + jitter: ${Math.round(jitter)}ms, attempt ${attempt + 1}/${maxRetries})...`);
          await sleep(totalDelay, abortSignal);
          continue;
        }
        
        // If not a rate limit error or max retries reached, throw
        if (isRateLimit) {
          (error as any).isRateLimit = true;
        }
        throw error;
      }
    }
    
    throw lastError;
  };

  /**
   * Generate images using Google Nano Banana (for 6 slots)
   * Now includes retry logic for rate limit errors and staggered requests
   */
  const generateSixImagesParallelWithGoogle = useCallback(async (
    request: MultiSourceGenerationRequest,
    onImageReady?: (result: SourceGenerationResult) => void,
    abortSignal?: AbortSignal
  ): Promise<MultiSourceGenerationResponse> => {
    setIsLoading(true);
    setError(null);

    if (abortSignal?.aborted) {
      setIsLoading(false);
      throw new Error('Generation cancelled');
    }

    const startTime = Date.now();
    const results: SourceGenerationResult[] = [];

    console.log(`[Google AI] Generating ${request.prompts.length} images with Nano Banana...`);

    try {
      // PARALLEL PROCESSING MODE: Send all 6 requests simultaneously
      // Server-side retry handles any 429 errors with exponential backoff
      // This is faster than sequential because successful requests complete immediately
      const maxRetries = 2; // Client retry is backup only (server handles main retry)
      const baseDelay = 8000; // 8s base delay for client retry
      console.log(`[Google AI] 🚀 PARALLEL MODE: Sending all ${request.prompts.length} requests simultaneously`);

      // Cleanup old entries periodically
      cleanupOldProcessedPrompts();

      // Helper function to generate a single image
      const generateSingleImage = async (item: { source: GenerationSource; prompt: string }): Promise<SourceGenerationResult> => {
        const { source, prompt } = item;
        const promptKey = getPromptKey(request.generation_run_id || 'no-run-id', source);
        const sourceStartTime = Date.now();

        // Global deduplication: skip if already processed (across all function calls)
        if (globalProcessedPrompts.has(promptKey)) {
          console.log(`[Google AI] ⚠️ Prompt already processed globally, skipping: ${source} (runId=${request.generation_run_id}, key=${promptKey})`);
          return {
            source,
            image: '',
            prompt,
            processing_time: 0,
            success: false,
            error: 'Already processed'
          } as SourceGenerationResult;
        }

        // Mark as processed immediately to prevent duplicates (with timestamp for cleanup)
        globalProcessedPrompts.set(promptKey, Date.now());
        console.log(`[Google AI] ✅ Processing prompt once: ${source} (runId=${request.generation_run_id}, key=${promptKey})`);

        try {
          if (abortSignal?.aborted) {
            throw new Error('Generation cancelled');
          }

          if (!request.base_image) {
            console.error(`[Google AI] ERROR: base_image is missing for source ${source}!`);
            throw new Error(`base_image is required for image generation (source: ${source})`);
          }

          // Only pass inspiration_images for InspirationReference source
          const inspirationImages = source === GenerationSource.InspirationReference && request.inspiration_images
            ? request.inspiration_images
            : undefined;

          const generationRequest = {
            prompt,
            base_image: request.base_image,
            style: request.style,
            modifications: request.modifications || [],
            inspiration_images: inspirationImages,
            width: request.parameters.width || request.parameters.image_size || 1024,
            height: request.parameters.height || request.parameters.image_size || 1024,
          };
          console.log('[Google AI] Generation request details:', {
            source,
            runId: request.generation_run_id,
            total: request.prompts.length,
            baseImageLength: request.base_image?.length || 0,
            hasInspirationImages: !!inspirationImages?.length,
            inspirationImagesCount: inspirationImages?.length || 0,
            width: generationRequest.width,
            height: generationRequest.height
          });

          const clientTimeoutMs = 10 * 60 * 1000; // 10 minutes

          // Wrap the fetch in retry logic for rate limit errors
          const fetchWithRetry = async (attempt: number): Promise<GenerationResponse> => {
            const clientController = new AbortController();
            const clientTimeoutId = setTimeout(() => {
              clientController.abort();
              console.error(`[Google AI] Client-side timeout after ${clientTimeoutMs}ms for ${source}`);
            }, clientTimeoutMs);

            const combinedController = new AbortController();
            if (abortSignal) {
              abortSignal.addEventListener('abort', () => combinedController.abort());
            }
            clientController.signal.addEventListener('abort', () => combinedController.abort());

            try {
              console.log(`[Google AI] 📤 Request attempt ${attempt + 1}/${maxRetries} for source ${source} (runId=${request.generation_run_id}, key=${promptKey})`);
              const response = await fetch('/api/google/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(generationRequest),
                signal: combinedController.signal,
              });

              clearTimeout(clientTimeoutId);
              const fetchTime = Date.now() - sourceStartTime;
              console.log(`[Google AI] Response received for ${source} after ${fetchTime}ms:`, response.status);

              if (!response.ok) {
                const errorText = await response.text();
                const error: any = new Error(`HTTP ${response.status}: ${errorText}`);
                // Mark rate limit errors and NO_IMAGE errors explicitly for better detection
                if (response.status === 429 || response.status === 503 || 
                    errorText.includes('429') || errorText.includes('RESOURCE_EXHAUSTED') || 
                    errorText.includes('NO_IMAGE')) {
                  error.isRateLimit = true;
                }
                throw error;
              }

              const result: GenerationResponse = await response.json();
              return result;
            } catch (fetchErr: any) {
              clearTimeout(clientTimeoutId);
              if (fetchErr.name === 'AbortError') {
                throw new Error('Request timeout - generation took too long');
              }
              throw fetchErr;
            }
          };

          // Use retry logic with exponential backoff for rate limit errors (client-side backup only)
          // Server handles main retry, client retry is backup: 5s → 10s → 20s backoff
          const result = await retryWithBackoff(fetchWithRetry, maxRetries, baseDelay, abortSignal);

          const processingTime = Date.now() - sourceStartTime;
          console.log(`[Google AI] ✅ Source ${source} completed successfully in ${processingTime}ms (runId=${request.generation_run_id})`);

          // Add subtle watermark to generated image
          let watermarkedImage = result.images[0];
          try {
            watermarkedImage = await addWatermarkToImage(result.images[0]);
            // Extract base64 if it's a data URL
            if (watermarkedImage.startsWith('data:')) {
              watermarkedImage = watermarkedImage.split(',')[1];
            }
          } catch (watermarkError) {
            console.warn('[Google AI] Failed to add watermark, using original:', watermarkError);
            // Continue with original image if watermark fails
          }

          const successResult: SourceGenerationResult = {
            source,
            image: watermarkedImage,
            prompt,
            processing_time: processingTime,
            success: true
          };

          if (onImageReady) {
            onImageReady(successResult);
          }

          return successResult;
        } catch (err: any) {
          const processingTime = Date.now() - sourceStartTime;
          console.error(`[Google AI] ❌ Source ${source} failed after ${processingTime}ms:`, err);

          return {
            source,
            image: '',
            prompt,
            processing_time: processingTime,
            success: false,
            error: err.message || 'Unknown error'
          } as SourceGenerationResult;
        }
      };

      // Process ALL prompts in PARALLEL
      // Server-side retry handles 429 errors - we just fire all requests at once
      // This is much faster because successful requests complete immediately
      console.log(`[Google AI] 🔄 Starting parallel generation of ${request.prompts.length} images...`);
      
      const parallelPromises = request.prompts.map(async (item, index) => {
        if (abortSignal?.aborted) {
          throw new Error('Generation cancelled');
        }
        console.log(`[Google AI] 📤 Launching request ${index + 1}/${request.prompts.length} (${item.source})`);
        const result = await generateSingleImage(item);
        
        // Notify caller as each image completes (for progressive UI updates)
        if (result.success) {
          console.log(`[Google AI] ✅ Image ${index + 1} (${item.source}) completed!`);
        }
        
        results.push(result);
        return result;
      });
      
      // Wait for all images to complete (or fail)
      await Promise.allSettled(parallelPromises);

      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log(`[Google AI] All generations complete. Success: ${successCount}, Failed: ${failCount}, Total time: ${totalTime}ms`);

      // Cleanup processed prompts for this run after completion
      if (request.generation_run_id) {
        clearProcessedPrompts(request.generation_run_id);
      }

      setIsLoading(false);

      return {
        results,
        total_processing_time: totalTime,
        successful_count: successCount,
        failed_count: failCount
      };

    } catch (err: any) {
      console.error('[Google AI] Fatal error:', err);
      setError(err.message || 'Wystąpił nieznany błąd.');
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * Upscale image using Google Nano Banana Pro
   */
  const upscaleImageWithGoogle = useCallback(async (
    previewImage: string,
    seed: number,
    prompt: string,
    targetSize: number = 1536
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[Google AI] Upscaling image with Nano Banana Pro...');
      
      let imageBase64 = previewImage;
      if (imageBase64.includes(',')) {
        imageBase64 = imageBase64.split(',')[1];
      }

      const response = await fetch('/api/google/upscale-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          prompt,
          target_size: targetSize,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      setIsLoading(false);
      
      // Add subtle watermark to upscaled image
      let watermarkedImage = result.image;
      try {
        watermarkedImage = await addWatermarkToImage(result.image);
        // Extract base64 if it's a data URL
        if (watermarkedImage.startsWith('data:')) {
          watermarkedImage = watermarkedImage.split(',')[1];
        }
      } catch (watermarkError) {
        console.warn('[Google AI] Failed to add watermark to upscaled image, using original:', watermarkError);
        // Continue with original image if watermark fails
      }
      
      return watermarkedImage;

    } catch (err: any) {
      console.error('[Google AI] Error upscaling image:', err);
      setError(err.message || 'Nie udało się upscalować obrazu.');
      setIsLoading(false);
      throw err;
    }
  }, []);

  return {
    generateSixImagesParallelWithGoogle,
    upscaleImageWithGoogle,
    isLoading,
    error,
    setError,
  };
};

export type {
  MultiSourceGenerationRequest,
  MultiSourceGenerationResponse,
  SourceGenerationResult
};

