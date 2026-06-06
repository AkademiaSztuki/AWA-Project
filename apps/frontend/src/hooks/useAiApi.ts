import { useState, useCallback, useRef } from 'react';

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
  language?: 'pl' | 'en';
}

interface RoomAnalysisResponse {
  detected_room_type: string;
  confidence: number;
  room_description: string;
  suggestions: string[];
  comment: string;
  comment_pl?: string;
  comment_en?: string;
  human_comment?: string;
}

interface LLMCommentResponse {
  comment: string;
  suggestions: string[];
}

// Increased limit since we're using Google Gemini (cheaper than the old backend).
// Users may want to analyze multiple photos during room setup.
const ROOM_ANALYSIS_LIMIT =
  Number(process.env.NEXT_PUBLIC_ROOM_ANALYSIS_LIMIT ?? '10') > 0
    ? Number(process.env.NEXT_PUBLIC_ROOM_ANALYSIS_LIMIT ?? '10')
    : 10;
const ROOM_ANALYSIS_WINDOW_MS =
  (Number(process.env.NEXT_PUBLIC_ROOM_ANALYSIS_WINDOW_SECONDS ?? '3600') || 3600) * 1000;
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

/**
 * AI helper hook for room analysis and IDA commentary, backed by Google Gemini.
 * Image generation lives in `useGoogleAI`.
 */
export const useAiApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRoomAnalysisRef = useRef<Map<string, Promise<RoomAnalysisResponse>>>(new Map());

  const analyzeRoom = useCallback(async (request: RoomAnalysisRequest): Promise<RoomAnalysisResponse> => {
    // Check cache first
    const cacheKey = request.image ? await hashBase64Data(request.image) : null;
    const cachedResult = cacheKey ? getCachedRoomAnalysis(cacheKey) : null;

    if (cachedResult) {
      console.log('Zwracam wynik analizy pokoju z cache (bez dodatkowego zapytania).');
      setIsLoading(false);
      return cachedResult;
    }

    if (cacheKey) {
      const existingRequest = inFlightRoomAnalysisRef.current.get(cacheKey);
      if (existingRequest) {
        return await existingRequest;
      }
    }

    setIsLoading(true);
    setError(null);

    const requestPromise = (async () => {
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

        const response = await fetch('/api/google/analyze-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: request.image, language: request.language }),
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
    })();

    if (cacheKey) {
      inFlightRoomAnalysisRef.current.set(cacheKey, requestPromise);
    }

    try {
      return await requestPromise;
    } finally {
      if (cacheKey) {
        inFlightRoomAnalysisRef.current.delete(cacheKey);
      }
    }
  }, []);

  const generateLLMComment = useCallback(
    async (
      _roomType: string,
      _roomDescription: string,
      _context: string = 'room_analysis',
    ): Promise<LLMCommentResponse> => {
      // Standalone LLM comment endpoint is no longer used; comments come from analyzeRoom.
      return { comment: '', suggestions: [] };
    },
    [],
  );

  return {
    analyzeRoom,
    generateLLMComment,
    isLoading,
    error,
    setError,
  };
};
