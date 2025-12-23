import { useState, useCallback } from 'react';
import { GenerationSource } from '@/lib/prompt-synthesis/modes';

interface GenerationRequest {
  prompt: string;
  base_image?: string;
  inspiration_images?: string[]; // Base64 images for multi-reference (FLUX 2 supports up to 8)
  style: string;
  modifications: string[];
  strength: number;
  steps: number;
  guidance: number;
  num_images: number;
  image_size?: number;
}

interface GenerationResponse {
  images: string[];
  parameters: {
    prompt: string;
    steps: number;
    guidance: number;
    model: string;
    style: string;
    modifications: string[];
  };
  processing_time: number;
  cost_estimate: number;
}

/**
 * Request for generating multiple images from different sources (6-image matrix)
 */
interface MultiSourceGenerationRequest {
  prompts: Array<{
    source: GenerationSource;
    prompt: string;
  }>;
  base_image?: string;
  inspiration_images?: string[]; // Base64 images for multi-reference (InspirationReference source)
  style: string;
  parameters: {
    strength: number;
    steps: number;
    guidance: number;
    image_size?: number;
  };
}

/**
 * Result of a single source generation
 */
interface SourceGenerationResult {
  source: GenerationSource;
  image: string; // base64
  prompt: string;
  processing_time: number;
  success: boolean;
  error?: string;
}

/**
 * Response from multi-source generation (5-image matrix)
 */
interface MultiSourceGenerationResponse {
  results: SourceGenerationResult[];
  total_processing_time: number;
  successful_count: number;
  failed_count: number;
}

interface RoomAnalysisRequestMetadata {
  source?: string;
  session_id?: string;
  cache_key?: string;
  client_timestamp?: string;
  request_id?: string;
  cache_hit?: boolean;
}

interface RoomAnalysisRequest {
  image: string; // base64 encoded image
  metadata?: RoomAnalysisRequestMetadata;
}

interface RoomAnalysisResponse {
  detected_room_type: string;
  confidence: number;
  room_description: string;
  suggestions: string[];
  comment: string; // Gemma 3 4B-PT generated comment
  human_comment?: string; // Human Polish comment from IDA
}

interface LLMCommentRequest {
  room_type: string;
  room_description: string;
  context?: string;
}

interface LLMCommentResponse {
  comment: string;
  suggestions: string[];
}

interface RoomAnalysisResult {
  detected_room_type: string;
  confidence: number;
  room_description: string;
  suggestions: string[];
  comment: string;
  human_comment: string;
}

interface LLMCommentResult {
  comment: string;
  suggestions: string[];
}

interface InspirationAnalysisRequest {
  image: string; // base64 encoded image
}

interface InspirationAnalysisResponse {
  styles: string[];
  colors: string[];
  materials: string[];
  biophilia: number; // 0-3 scale
  description: string;
}

// Increased limit since we're using Google Gemini (cheaper than Modal/Gemma 3)
// Users may want to analyze multiple photos during room setup
const ROOM_ANALYSIS_LIMIT =
  Number(process.env.NEXT_PUBLIC_ROOM_ANALYSIS_LIMIT ?? '10') > 0
    ? Number(process.env.NEXT_PUBLIC_ROOM_ANALYSIS_LIMIT ?? '10')
    : 10;
const ROOM_ANALYSIS_WINDOW_MS =
  (Number(process.env.NEXT_PUBLIC_ROOM_ANALYSIS_WINDOW_SECONDS ?? '3600') || 3600) * 1000;
const ROOM_ANALYSIS_SESSION_KEY = 'aura_room_analysis_session_id';
const ROOM_ANALYSIS_USAGE_KEY = 'aura_room_analysis_usage_v1';
const ROOM_ANALYSIS_CACHE_PREFIX = 'aura_room_analysis_cache_v1:';
const roomAnalysisMemoryCache = new Map<string, RoomAnalysisResponse>();
const textEncoder = new TextEncoder();

interface RoomAnalysisUsageEntry {
  count: number;
  timestamp: number;
}

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch (error) {
    console.warn('Session storage unavailable:', error);
    return null;
  }
};

const generateRandomId = () => {
  const cryptoRef = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const hashBase64Data = async (value: string): Promise<string> => {
  if (!value) {
    return 'empty';
  }

  const cryptoRef = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  try {
    if (!cryptoRef?.subtle) {
      throw new Error('SubtleCrypto unavailable');
    }
    const buffer = await cryptoRef.subtle.digest('SHA-256', textEncoder.encode(value));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.warn('Falling back to simple hash for room analysis cache:', error);
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return `fallback-${hash}-${value.length}`;
  }
};

const getRoomAnalysisSessionId = () => {
  const storage = getSessionStorage();
  if (!storage) {
    return 'unknown';
  }

  const existing = storage.getItem(ROOM_ANALYSIS_SESSION_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = generateRandomId();
  storage.setItem(ROOM_ANALYSIS_SESSION_KEY, sessionId);
  return sessionId;
};

const checkAndIncrementRoomAnalysisUsage = () => {
  const storage = getSessionStorage();
  if (!storage) {
    return { allowed: true, count: 0 };
  }

  const now = Date.now();
  const raw = storage.getItem(ROOM_ANALYSIS_USAGE_KEY);
  let entry: RoomAnalysisUsageEntry | null = null;
  if (raw) {
    try {
      entry = JSON.parse(raw) as RoomAnalysisUsageEntry;
    } catch (error) {
      console.warn('Failed to parse room analysis usage entry:', error);
    }
  }

  if (!entry || now - entry.timestamp > ROOM_ANALYSIS_WINDOW_MS) {
    entry = { count: 0, timestamp: now };
  }

  if (entry.count >= ROOM_ANALYSIS_LIMIT) {
    return { allowed: false, count: entry.count };
  }

  entry.count += 1;
  storage.setItem(ROOM_ANALYSIS_USAGE_KEY, JSON.stringify(entry));
  return { allowed: true, count: entry.count };
};

const getCachedRoomAnalysis = (cacheKey?: string | null): RoomAnalysisResponse | null => {
  if (!cacheKey) {
    return null;
  }

  if (roomAnalysisMemoryCache.has(cacheKey)) {
    return roomAnalysisMemoryCache.get(cacheKey)!;
  }

  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(`${ROOM_ANALYSIS_CACHE_PREFIX}${cacheKey}`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as RoomAnalysisResponse;
    roomAnalysisMemoryCache.set(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.warn('Failed to parse cached room analysis entry:', error);
    storage.removeItem(`${ROOM_ANALYSIS_CACHE_PREFIX}${cacheKey}`);
    return null;
  }
};

const persistRoomAnalysisCache = (cacheKey: string, data: RoomAnalysisResponse) => {
  roomAnalysisMemoryCache.set(cacheKey, data);
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(`${ROOM_ANALYSIS_CACHE_PREFIX}${cacheKey}`, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to persist room analysis cache entry:', error);
  }
};

// Centralized generation parameters - single source of truth
export const getGenerationParameters = (
  mode: 'preview' | 'full' | 'upscale' | 'initial' | 'micro' | 'macro',
  iterationCount: number = 0
) => {
  // New preview/upscale modes
  if (mode === 'preview') {
    return {
      steps: 25,  // Więcej kroków dla lepszej jakości początkowej
      guidance: 2.5,
      strength: 0.6,
      image_size: 1024, // Wyższa rozdzielczość początkowa
      width: 1024,
      height: 1024,
      num_images: 1,
    };
  }
  
  if (mode === 'upscale') {
    return {
      steps: 35,
      guidance: 2.5,
      image_size: 1536,  // Up to 2MP per BFL docs
      width: 1536,
      height: 1536,
      num_images: 1,
    };
  }
  
  if (mode === 'full') {
    return {
      steps: 35,
      guidance: 2.5,
      image_size: 1024,
      width: 1024,
      height: 1024,
      num_images: 1,
    };
  }
  
  // Legacy modes (initial, micro, macro)
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

  return baseParams[mode as 'initial' | 'micro' | 'macro'];
};

/**
 * @deprecated Use useModalAPI with Google methods or dedicated Google AI hooks.
 * This hook originally pointed to Modal/FLUX but is now being transitioned to Google Nano Banana.
 */
export const useModalAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImages = useCallback(async (request: GenerationRequest): Promise<GenerationResponse> => {
    setIsLoading(true);
    setError(null);

    let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';
    
    // Fix for incorrect dev URL in Vercel
    if (apiBase.includes('-dev')) {
      apiBase = 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';
    }
    
    if (!apiBase) {
      const msg = 'Brak konfiguracji ENDPOINTU generacji (NEXT_PUBLIC_MODAL_API_URL)';
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
    
    try {
      console.log('Rozpoczynam generowanie z parametrami:', request);
      
      // MODAL API TEMPORARILY DISABLED - Using Google API instead
      // TODO: Uncomment below to re-enable Modal API when needed
      /*
      // Use base_image directly - it's already clean base64 without MIME header
      const base64Image = request.base_image;

      // Use Next.js API route as proxy to avoid CORS issues with Modal API redirects
      const response = await fetch('/api/modal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, base_image: base64Image }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Błąd serwera: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Generowanie zakończone! Otrzymano wynik:', result);
      
      setIsLoading(false);
      return result;
      */
      
      // Currently using Google API - Modal API is disabled
      throw new Error('Modal API is currently disabled. Please use Google API (useGoogleAI hook) instead.');

    } catch (err: any) {
      console.error('Wystąpił błąd w useModalAPI:', err);
      setError(err.message || 'Wystąpił nieznany błąd.');
      setIsLoading(false);
      throw err;
    }
  }, []);

  const analyzeRoom = useCallback(async (request: RoomAnalysisRequest): Promise<RoomAnalysisResponse> => {
    setIsLoading(true);
    setError(null);

    // Check cache first
    const cacheKey = request.image ? await hashBase64Data(request.image) : null;
    const cachedResult = cacheKey ? getCachedRoomAnalysis(cacheKey) : null;

    if (cachedResult) {
      console.log('Zwracam wynik analizy pokoju z cache (bez dodatkowego zapytania).');
      setIsLoading(false);
      return cachedResult;
    }

    // Check quota
    const quota = checkAndIncrementRoomAnalysisUsage();
    if (!quota.allowed) {
      const msg = `Limit analiz pokoju (${ROOM_ANALYSIS_LIMIT}) został osiągnięty dla tej sesji. Odśwież stronę lub wróć później.`;
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }

    const requestId = generateRandomId();
    const source = request.metadata?.source || 'unknown';

    try {
      console.log('Rozpoczynam analizę pokoju (Google Gemini)...', { requestId, source });

      // Use Google Gemini API instead of Modal/Gemma 3
      const response = await fetch('/api/google/analyze-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: request.image }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Room analysis API error response:', errorText);
        throw new Error(`Błąd analizy pokoju: ${response.status} - ${errorText}`);
      }

      const result: RoomAnalysisResponse = await response.json();
      console.log('Analiza pokoju zakończona! Otrzymano wynik:', { requestId, result });

      // Cache the result
      if (cacheKey) {
        persistRoomAnalysisCache(cacheKey, result);
      }

      return result;
    } catch (err: any) {
      console.error('Wystąpił błąd w analizie pokoju:', err);
      setError(err.message || 'Wystąpił nieznany błąd podczas analizy pokoju.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkHealth = async () => {
    try {
      // Use correct API URL, fallback to default if env var is wrong
      let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';
      
      // Fix for incorrect dev URL in Vercel
      if (apiBase.includes('-dev')) {
        apiBase = 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';
      }
      
      if (!apiBase) {
        console.log('Brak NEXT_PUBLIC_MODAL_API_URL');
        return false;
      }
      
      console.log('Sprawdzam health endpoint:', `${apiBase}/health`);
      const response = await fetch(`${apiBase}/health`, {
        redirect: 'follow', // Follow redirects
        mode: 'cors', // Explicitly enable CORS
      });
      console.log('Health check response:', response.status, response.ok);
      return response.ok;
    } catch (err) {
      console.error('Health check failed:', err);
      return false;
    }
  };

  const generateLLMComment = useCallback(async (roomType: string, roomDescription: string, context: string = 'room_analysis'): Promise<LLMCommentResponse> => {
    console.log('Generating LLM comment with Groq...');
    setIsLoading(true);
    setError(null);
    
    try {
      let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';

      // Fix for incorrect dev URL in Vercel
      if (apiBase.includes('-dev')) {
        apiBase = 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';
      }
      
      const response = await fetch(`${apiBase}/llm-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_type: roomType,
          room_description: roomDescription,
          context: context
        }),
        redirect: 'follow', // Follow redirects
        mode: 'cors', // Explicitly enable CORS
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('LLM comment result:', result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('LLM comment generation failed:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzeInspiration = useCallback(async (request: InspirationAnalysisRequest): Promise<InspirationAnalysisResponse> => {
    setIsLoading(true);
    setError(null);

    let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';

    // Fix for incorrect dev URL in Vercel
    if (apiBase.includes('-dev')) {
      apiBase = 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';
    }
    
    if (!apiBase) {
      const msg = 'Brak konfiguracji ENDPOINTU analizy inspirations (NEXT_PUBLIC_MODAL_API_URL)';
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
    
    try {
      console.log('Rozpoczynam analizę inspiracji...');
      
      const response = await fetch(`${apiBase}/analyze-inspiration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        redirect: 'follow', // Follow redirects
        mode: 'cors', // Explicitly enable CORS
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Błąd serwera: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Analiza inspiracji zakończona! Otrzymano wynik:', result);
      
      setIsLoading(false);
      return result;

    } catch (err: any) {
      console.error('Wystąpił błąd w analyzeInspiration:', err);
      setError(err.message || 'Wystąpił nieznany błąd.');
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * Generates images for multiple sources in parallel (6-image matrix).
   * Each source gets one image generated with its specific prompt.
   * InspirationReference source uses multi-reference with inspiration images.
   * 
   * @param request - Generation request with prompts for each source
   * @param onImageReady - Optional callback called when each image is ready (for progressive display)
   * @param abortSignal - Optional AbortSignal to cancel the generation
   */
  const generateSixImagesParallel = useCallback(async (
    request: MultiSourceGenerationRequest,
    onImageReady?: (result: SourceGenerationResult) => void,
    abortSignal?: AbortSignal
  ): Promise<MultiSourceGenerationResponse> => {
    setIsLoading(true);
    setError(null);

    let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';
    
    if (apiBase.includes('-dev')) {
      apiBase = 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';
    }

    if (!apiBase) {
      const msg = 'Brak konfiguracji ENDPOINTU generacji (NEXT_PUBLIC_MODAL_API_URL)';
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }

    // Check if already aborted
    if (abortSignal?.aborted) {
      setIsLoading(false);
      throw new Error('Generation cancelled');
    }

    const startTime = Date.now();
    const results: SourceGenerationResult[] = [];

    console.log(`[6-Image Matrix] Generating ${request.prompts.length} images sequentially (one at a time)...`);

    try {
      // Generate all images sequentially (one at a time) to avoid multiple containers
      // This is slower but ensures only one container is used at a time
      const results: SourceGenerationResult[] = [];
      
      const cleanInspirationImages = (imgs?: string[]) => {
        if (!imgs) return undefined;
        const filtered = imgs
          .map(img => {
            if (!img) return null;
            if (img.startsWith('blob:')) return null;
            if (img.startsWith('data:')) {
              const parts = img.split(',');
              return parts.length > 1 ? parts[1] : null;
            }
            return img;
          })
          .filter((x): x is string => !!x);
        return filtered.length > 0 ? filtered : undefined;
      };

      for (const { source, prompt } of request.prompts) {
        const sourceStartTime = Date.now();
        
        try {
          console.log(`[6-Image Matrix] Starting generation for source: ${source}`);
          
          // Do NOT send inspiration_images to backend (to avoid VRAM blow-up).
          // Style/material cues are already baked into the prompt.
          const inspirationImages = undefined;
          
          // Log base_image for debugging
          console.log(`[6-Image Matrix] base_image for ${source}:`, {
            present: !!request.base_image,
            length: request.base_image?.length || 0,
            startsWith: request.base_image?.substring(0, 50) || 'N/A',
            isDataUrl: request.base_image?.startsWith('data:') || false
          });
          
          if (!request.base_image) {
            console.error(`[6-Image Matrix] ERROR: base_image is missing for source ${source}!`);
            throw new Error(`base_image is required for FLUX 2 image-to-image generation (source: ${source})`);
          }
          
          // Build generation request - exclude inspiration_images if undefined
          // IMPORTANT: Use image_size from parameters, default to 512 for preview
          const finalImageSize = request.parameters.image_size ?? 512;
          console.log(`[6-Image Matrix] Building request for ${source}:`, {
            'request.parameters.image_size': request.parameters.image_size,
            'finalImageSize (will be sent)': finalImageSize,
            steps: request.parameters.steps,
            guidance: request.parameters.guidance,
            strength: request.parameters.strength
          });
          
          const generationRequest: GenerationRequest = {
            prompt,
            base_image: request.base_image,
            style: request.style,
            modifications: [],
            strength: request.parameters.strength,
            steps: request.parameters.steps,
            guidance: request.parameters.guidance,
            num_images: 1, // One image per source
            image_size: finalImageSize  // Use 512 for preview - MUST be included
            // NOTE: DO NOT include width/height - backend uses max(width, height) as fallback
            // which can override image_size. We want backend to use image_size only.
          };
          
          // Debug: verify image_size is included BEFORE sending
          console.log(`[6-Image Matrix] generationRequest object:`, {
            has_image_size: 'image_size' in generationRequest,
            image_size_value: generationRequest.image_size,
            image_size_type: typeof generationRequest.image_size,
            all_keys: Object.keys(generationRequest)
          });
          
          if (!generationRequest.image_size || generationRequest.image_size !== 512) {
            console.warn(`[6-Image Matrix] WARNING: image_size is ${generationRequest.image_size}, expected 512 for preview!`);
          }
          
          // Inspiration images intentionally omitted

          // Check if aborted before making request
          if (abortSignal?.aborted) {
            throw new Error('Generation cancelled');
          }

          // MODAL API TEMPORARILY DISABLED - Using Google API instead
          // TODO: Uncomment below to re-enable Modal API when needed
          /*
          // Use Next.js API route as proxy to avoid CORS issues with Modal API redirects
          // Server-side proxy can handle 303 redirects without CORS restrictions
          console.log(`[6-Image Matrix] Sending request to /api/modal/generate for source: ${source}`);
          
          // Debug: verify JSON serialization includes image_size
          // CRITICAL: Ensure image_size is explicitly included even if it's optional
          const jsonBody = JSON.stringify({
            ...generationRequest,
            image_size: generationRequest.image_size // Explicitly include even if undefined
          });
          const parsedBack = JSON.parse(jsonBody);
          console.log(`[6-Image Matrix] JSON serialization check:`, {
            'image_size in JSON': 'image_size' in parsedBack,
            'image_size value': parsedBack.image_size,
            'image_size type': typeof parsedBack.image_size,
            'JSON keys': Object.keys(parsedBack),
            'JSON preview': jsonBody.substring(0, 300),
            'full JSON has image_size': jsonBody.includes('"image_size"')
          });
          
          console.log(`[6-Image Matrix] About to fetch /api/modal/generate for ${source}...`);
          console.log(`[6-Image Matrix] Request body size:`, jsonBody.length, 'bytes');
          const fetchStartTime = Date.now();
          
          // Create a timeout controller for client-side timeout (10 minutes for image generation)
          const clientTimeoutMs = 10 * 60 * 1000; // 10 minutes
          const clientController = new AbortController();
          const clientTimeoutId = setTimeout(() => {
            clientController.abort();
            console.error(`[6-Image Matrix] Client-side timeout after ${clientTimeoutMs}ms for ${source}`);
          }, clientTimeoutMs);
          
          // Combine abort signals
          const combinedController = new AbortController();
          if (abortSignal) {
            abortSignal.addEventListener('abort', () => combinedController.abort());
          }
          clientController.signal.addEventListener('abort', () => combinedController.abort());
          
          try {
            const response = await fetch('/api/modal/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: jsonBody,
              signal: combinedController.signal,
            });
            
            clearTimeout(clientTimeoutId);
            const fetchTime = Date.now() - fetchStartTime;
            console.log(`[6-Image Matrix] Response received for ${source} after ${fetchTime}ms:`, response.status, response.statusText);
          
            if (!response.ok) {
              console.error(`[6-Image Matrix] Response not OK for ${source}:`, response.status, response.statusText);
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result: GenerationResponse = await response.json();
            const processingTime = Date.now() - sourceStartTime;

            console.log(`[6-Image Matrix] Source ${source} completed in ${processingTime}ms`);

            const successResult: SourceGenerationResult = {
              source,
              image: result.images[0],
              prompt,
              processing_time: processingTime,
              success: true
            };

            // Call callback to show image immediately
            if (onImageReady) {
              onImageReady(successResult);
            }

            results.push(successResult);
          } catch (fetchErr: any) {
            clearTimeout(clientTimeoutId);
            const fetchTime = Date.now() - fetchStartTime;
            console.error(`[6-Image Matrix] Fetch error for ${source} after ${fetchTime}ms:`, fetchErr);
            
            if (fetchErr.name === 'AbortError') {
              throw new Error(`Request timeout after ${fetchTime}ms - generation took too long`);
            }
            throw fetchErr;
          }
          */
          
          // Currently using Google API - Modal API is disabled
          throw new Error(`Modal API is currently disabled for source ${source}. Please use Google API (useGoogleAI hook) instead.`);

        } catch (err: any) {
          const processingTime = Date.now() - sourceStartTime;
          console.error(`[6-Image Matrix] Source ${source} failed after ${processingTime}ms:`, err);
          console.error(`[6-Image Matrix] Error details:`, {
            name: err.name,
            message: err.message,
            stack: err.stack?.substring(0, 500),
            isAbortError: err.name === 'AbortError',
            isNetworkError: err.message?.includes('fetch') || err.message?.includes('network'),
            isTimeout: err.message?.includes('timeout')
          });
          
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

      console.log(`[6-Image Matrix] All generations complete. Success: ${successCount}, Failed: ${failCount}, Total time: ${totalTime}ms`);

      setIsLoading(false);

      return {
        results,
        total_processing_time: totalTime,
        successful_count: successCount,
        failed_count: failCount
      };

    } catch (err: any) {
      console.error('[6-Image Matrix] Fatal error:', err);
      setError(err.message || 'Wystąpił nieznany błąd.');
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * @deprecated Use generateSixImagesParallel instead
   */
  const generateFiveImagesParallel = generateSixImagesParallel;

  /**
   * Generate preview images at 512x512 for fast selection
   */

  return {
    generateImages,
    generateFiveImagesParallel,
    generateSixImagesParallel,
    analyzeRoom,
    generateLLMComment,
    analyzeInspiration,
    checkHealth,
    isLoading,
    error,
    setError,
  };
};

// Export types for external use
export type {
  GenerationRequest,
  GenerationResponse,
  MultiSourceGenerationRequest,
  MultiSourceGenerationResponse,
  SourceGenerationResult
};
