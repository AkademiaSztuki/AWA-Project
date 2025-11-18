import { useState, useCallback } from 'react';

interface GenerationRequest {
  prompt: string;
  base_image?: string;
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

const ROOM_ANALYSIS_LIMIT =
  Number(process.env.NEXT_PUBLIC_ROOM_ANALYSIS_LIMIT ?? '1') > 0
    ? Number(process.env.NEXT_PUBLIC_ROOM_ANALYSIS_LIMIT ?? '1')
    : 1;
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
export const getGenerationParameters = (modificationType: 'initial' | 'micro' | 'macro', iterationCount: number = 0) => {
  const qualityAdjustment = Math.max(0.1, 1 - (iterationCount * 0.1));
  
  const baseParams = {
    initial: {
      strength: 0.6,
      steps: 25,
      guidance: 4.5,
      num_images: 1,
      image_size: 1024,
      width: 1024,
      height: 1024
    },
    micro: {
      strength: 0.25 * qualityAdjustment,
      steps: 18,
      guidance: 3.5,
      num_images: 1,
      image_size: 1024,
      width: 1024,
      height: 1024
    },
    macro: {
      strength: 0.75,
      steps: 28,
      guidance: 5.5,
      num_images: 1,
      image_size: 1024,
      width: 1024,
      height: 1024
    }
  };

  return baseParams[modificationType];
};

export const useModalAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImages = useCallback(async (request: GenerationRequest): Promise<GenerationResponse> => {
    setIsLoading(true);
    setError(null);

    let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
    
    // Fix for incorrect dev URL in Vercel
    if (apiBase.includes('-dev')) {
      apiBase = 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
    }
    
    if (!apiBase) {
      const msg = 'Brak konfiguracji ENDPOINTU generacji (NEXT_PUBLIC_MODAL_API_URL)';
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
    
    try {
      console.log('Rozpoczynam generowanie z parametrami:', request);
      
      // Use base_image directly - it's already clean base64 without MIME header
      const base64Image = request.base_image;

      // Send generation request - now expecting synchronous response
      const response = await fetch(`${apiBase}/generate`, {
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

    let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';

    // Fix for incorrect dev URL in Vercel
    if (apiBase.includes('-dev')) {
      apiBase = 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
    }

    if (!apiBase) {
      const msg = 'Brak konfiguracji ENDPOINTU analizy (NEXT_PUBLIC_MODAL_API_URL)';
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }

    const cacheKey = request.image ? await hashBase64Data(request.image) : null;
    const cachedResult = cacheKey ? getCachedRoomAnalysis(cacheKey) : null;

    if (cachedResult) {
      console.log('Zwracam wynik analizy pokoju z cache (bez dodatkowego zapytania).');
      setIsLoading(false);
      return cachedResult;
    }

    const quota = checkAndIncrementRoomAnalysisUsage();
    if (!quota.allowed) {
      const msg = `Limit analiz pokoju (${ROOM_ANALYSIS_LIMIT}) został osiągnięty dla tej sesji. Odśwież stronę lub wróć później.`;
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }

    const sessionId = getRoomAnalysisSessionId();
    const requestId = generateRandomId();
    const payload: RoomAnalysisRequest = {
      ...request,
      metadata: {
        ...request.metadata,
        source: request.metadata?.source || 'unknown',
        session_id: sessionId,
        cache_key: cacheKey ?? undefined,
        request_id: requestId,
        client_timestamp: new Date().toISOString(),
        cache_hit: false,
      },
    };

    try {
      console.log('Rozpoczynam analizę pokoju...', { requestId, source: payload.metadata?.source });

      const response = await fetch(`${apiBase}/analyze-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Room analysis API error response:', errorText);
        throw new Error(`Błąd analizy pokoju: ${response.status} - ${errorText}`);
      }

      const result: RoomAnalysisResponse = await response.json();
      console.log('Analiza pokoju zakończona! Otrzymano wynik:', { requestId, result });

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
      let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
      
      // Fix for incorrect dev URL in Vercel
      if (apiBase.includes('-dev')) {
        apiBase = 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
      }
      
      if (!apiBase) {
        console.log('Brak NEXT_PUBLIC_MODAL_API_URL');
        return false;
      }
      
      console.log('Sprawdzam health endpoint:', `${apiBase}/health`);
      const response = await fetch(`${apiBase}/health`);
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
      let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
      
      // Fix for incorrect dev URL in Vercel
      if (apiBase.includes('-dev')) {
        apiBase = 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
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

    let apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
    
    // Fix for incorrect dev URL in Vercel
    if (apiBase.includes('-dev')) {
      apiBase = 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
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

  return {
    generateImages,
    analyzeRoom,
    generateLLMComment,
    analyzeInspiration,
    checkHealth,
    isLoading,
    error,
    setError,
  };
};
