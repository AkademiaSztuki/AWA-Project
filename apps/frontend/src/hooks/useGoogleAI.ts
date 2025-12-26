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

  /**
   * Generate images using Google Nano Banana (for 6 slots)
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
      for (const { source, prompt } of request.prompts) {
        const sourceStartTime = Date.now();
        
        try {
          console.log(`[Google AI] Starting generation for source: ${source}`);
          
          if (!request.base_image) {
            console.error(`[Google AI] ERROR: base_image is missing for source ${source}!`);
            throw new Error(`base_image is required for image generation (source: ${source})`);
          }

          if (abortSignal?.aborted) {
            throw new Error('Generation cancelled');
          }

          const generationRequest = {
            prompt,
            base_image: request.base_image,
            style: request.style,
            modifications: request.modifications || [],
            width: request.parameters.width || request.parameters.image_size || 1024,
            height: request.parameters.height || request.parameters.image_size || 1024,
          };
          
          const clientTimeoutMs = 10 * 60 * 1000; // 10 minutes
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
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result: GenerationResponse = await response.json();
            const processingTime = Date.now() - sourceStartTime;

            console.log(`[Google AI] Source ${source} completed in ${processingTime}ms`);

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

            results.push(successResult);
          } catch (fetchErr: any) {
            clearTimeout(clientTimeoutId);
            if (fetchErr.name === 'AbortError') {
              throw new Error('Request timeout - generation took too long');
            }
            throw fetchErr;
          }

        } catch (err: any) {
          const processingTime = Date.now() - sourceStartTime;
          console.error(`[Google AI] Source ${source} failed after ${processingTime}ms:`, err);
          
          results.push({
            source,
            image: '',
            prompt,
            processing_time: processingTime,
            success: false,
            error: err.message || 'Unknown error'
          } as SourceGenerationResult);
        }
      }

      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log(`[Google AI] All generations complete. Success: ${successCount}, Failed: ${failCount}, Total time: ${totalTime}ms`);

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

