import { useEffect, useSyncExternalStore } from 'react';
import { SessionData, FlowStep } from '@/types';
import { fetchLatestSessionSnapshot, supabase, DISABLE_SESSION_SYNC, safeLocalStorage, safeSessionStorage } from '@/lib/supabase';
import { uploadSpaceImage, saveSpaceImagesMetadata, fetchParticipantImages } from '@/lib/remote-spaces';

const SESSION_STORAGE_KEY = 'aura_session';
const USER_HASH_STORAGE_KEY = 'aura_user_hash';
const ROOM_IMAGE_SESSION_KEY = 'aura_session_room_image';
const ROOM_IMAGE_EMPTY_SESSION_KEY = 'aura_session_room_image_empty';
const ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY = 'aura_session_room_image_empty_source_sig';
const STORAGE_SIZE_THRESHOLD = 4_500_000; // ~4,5MB
const MAX_INLINE_DATA_LENGTH = 120_000; // ~120KB
const MAX_GENERATIONS_HISTORY = 120;
const MAX_TINDER_SWIPES = 250;

const makeImageSig = (img?: string | null): string => {
  if (!img) return 'none';
  const len = img.length;
  const head = img.slice(0, 64);
  const tail = len > 64 ? img.slice(-64) : '';
  return `${len}:${head}:${tail}`;
};

const isLargeDataUrl = (value?: string | null): boolean => {
  if (!value) return false;
  return value.startsWith('data:') && value.length > MAX_INLINE_DATA_LENGTH;
};

const shouldSanitizeSessionData = (data: SessionData): boolean => {
  if (isLargeDataUrl(data.roomImage)) {
    return true;
  }

  if (Array.isArray(data.spaces)) {
    for (const space of data.spaces) {
      if (space?.images?.some(image => isLargeDataUrl(image.url))) {
        return true;
      }
    }
  }

  if (Array.isArray(data.generations) && data.generations.length > MAX_GENERATIONS_HISTORY) {
    return true;
  }

  if (data.tinderData?.swipes && data.tinderData.swipes.length > MAX_TINDER_SWIPES) {
    return true;
  }

  return false;
};

const sanitizeSessionDataForStorage = (data: SessionData): SessionData => {
  // Base copy with trimmed histories
  const sanitized: SessionData = {
    ...data,
    generations: Array.isArray(data.generations)
      ? data.generations.slice(-MAX_GENERATIONS_HISTORY)
      : [],
  };

  // Always drop heavy blobs from localStorage; they are cached separately (sessionStorage / Supabase)
  sanitized.roomImage = undefined;
  sanitized.roomImageEmpty = undefined; // Also cached in sessionStorage
  sanitized.uploadedImage = undefined;
  // Preserve minimal selected image reference so refresh doesn't jump steps/regenerate
  (sanitized as any).selectedImage = data.selectedImage
    ? (typeof (data as any).selectedImage === 'string'
        ? { id: (data as any).selectedImage }
        : { id: (data as any).selectedImage?.id, url: (data as any).selectedImage?.url, source: (data as any).selectedImage?.source, provider: (data as any).selectedImage?.provider })
    : null;
  (sanitized as any).blindSelectionMade = (data as any).blindSelectionMade || false;

  // Trim swipe history
  if (sanitized.tinderData?.swipes && sanitized.tinderData.swipes.length > MAX_TINDER_SWIPES) {
    sanitized.tinderData = {
      ...sanitized.tinderData,
      swipes: sanitized.tinderData.swipes.slice(-MAX_TINDER_SWIPES),
    };
  }

  // Keep only lightweight generatedImages (id + http url) to allow restore without regeneration
  if (Array.isArray((sanitized as any).generatedImages)) {
    (sanitized as any).generatedImages = (sanitized as any).generatedImages
      .map((g: any) => ({ id: g.id, url: g.url }))
      .filter((g: any) => typeof g.url === 'string' && g.url.startsWith('http'))
      .slice(-12);
  }

  // Strip heavy base64 from inspirations but keep tags/descriptions/URLs
  if (Array.isArray((sanitized as any).inspirations)) {
    sanitized.inspirations = (sanitized as any).inspirations.map((insp: any) => {
      const safeUrl = typeof insp.url === 'string' && (insp.url.startsWith('http') || insp.url.startsWith('data:'))
        ? insp.url
        : undefined;
      return {
        id: insp.id,
        fileId: insp.fileId,
        url: safeUrl,
        tags: insp.tags,
        description: insp.description,
        addedAt: insp.addedAt
      };
    });
  }

  // Clean spaces; if anything looks heavy, drop images or entire spaces
  if (Array.isArray(sanitized.spaces)) {
    const trimmedSpaces = sanitized.spaces
      .map(space => ({
        ...space,
        images: Array.isArray(space.images)
          ? space.images.map(image => ({
                ...image,
                thumbnailUrl:
                  image.thumbnailUrl && isLargeDataUrl(image.thumbnailUrl)
                    ? undefined
                    : image.thumbnailUrl,
              }))
          : [],
      }));

    sanitized.spaces = trimmedSpaces;
  }

  return sanitized;
};

// Lightweight trim: jeśli mamy publiczny URL, usuń base64, ale zostaw tagi/opisy
const stripInlineBlobs = (data: SessionData): SessionData => {
  const cloned: SessionData = { ...data };

  if (Array.isArray((cloned as any).inspirations)) {
    cloned.inspirations = (cloned as any).inspirations.map((insp: any) => {
      const hasHttp = typeof insp.url === 'string' && insp.url.startsWith('http');
      return {
        ...insp,
        imageBase64: hasHttp ? undefined : insp.imageBase64,
      };
    });
  }

  if (Array.isArray((cloned as any).generatedImages)) {
    cloned.generatedImages = (cloned as any).generatedImages.map((img: any) => {
      const url = img.url || img.image_url || img.imageUrl;
      const hasHttp = typeof url === 'string' && url.startsWith('http');
      const cleaned = { ...img };
      if (hasHttp) {
        cleaned.imageBase64 = undefined;
        cleaned.base64 = undefined;
      }
      return cleaned;
    });
  }

  return cloned;
};

const hasDataUrlSpaces = (spaces?: any[]): boolean =>
  Array.isArray(spaces) &&
  spaces.some(space => (space?.images || []).some((img: any) => typeof img?.url === 'string' && img.url.startsWith('data:')));

const migrateLegacySpacesToSupabase = async (spaces: any[], userHash: string): Promise<any[]> => {
  // Legacy spaces tables removed after radical refactor; keep local-only.
  return Array.isArray(spaces) ? spaces : [];
};

const isQuotaExceededError = (error: unknown): boolean => {
  if (!error) return false;

  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      (typeof error.code === 'number' && (error.code === 22 || error.code === 1014))
    );
  }

  const maybeError = error as { name?: string; code?: number };
  return (
    maybeError?.name === 'QuotaExceededError' ||
    maybeError?.code === 22 ||
    maybeError?.code === 1014
  );
};

const manageRoomImageCache = (roomImage?: string) => {
  if (typeof window === 'undefined') return;

  if (roomImage) {
    safeSessionStorage.setItem(ROOM_IMAGE_SESSION_KEY, roomImage);
  } else {
    safeSessionStorage.removeItem(ROOM_IMAGE_SESSION_KEY);
  }
};

const manageRoomImageEmptyCache = (roomImageEmpty?: string, roomImage?: string) => {
  if (typeof window === 'undefined') return;

  // #region agent log
  const existingInStorage = safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY);
  const existingSig = safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY);
  const currentSig = makeImageSig(roomImage);
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:manageRoomImageEmptyCache:entry',message:'Managing roomImageEmpty cache - entry',data:{hasRoomImageEmpty:!!roomImageEmpty,roomImageEmptyLength:roomImageEmpty?.length||0,hasExistingInStorage:!!existingInStorage,existingInStorageLength:existingInStorage?.length||0,willSave:!!roomImageEmpty,action:roomImageEmpty?'save':(existingInStorage?'preserve':'remove')},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  if (roomImageEmpty) {
    try {
      safeSessionStorage.setItem(ROOM_IMAGE_EMPTY_SESSION_KEY, roomImageEmpty);
      // Store signature of the roomImage this empty-room cache belongs to (prevents stale cross-space reuse)
      safeSessionStorage.setItem(ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY, currentSig);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:manageRoomImageEmptyCache:after-save',message:'roomImageEmpty saved to sessionStorage',data:{savedLength:roomImageEmpty.length,key:ROOM_IMAGE_EMPTY_SESSION_KEY,verifyExists:!!safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY)},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:manageRoomImageEmptyCache:save-error',message:'Failed to save roomImageEmpty to sessionStorage',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
    }
  } else {
    // If there's nothing in storage, ensure both keys are removed
    if (!existingInStorage) {
      try {
        safeSessionStorage.removeItem(ROOM_IMAGE_EMPTY_SESSION_KEY);
        safeSessionStorage.removeItem(ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:manageRoomImageEmptyCache:after-remove',message:'roomImageEmpty removed from sessionStorage (was not in storage)',data:{key:ROOM_IMAGE_EMPTY_SESSION_KEY,verifyRemoved:!safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY)},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:manageRoomImageEmptyCache:remove-error',message:'Failed to remove roomImageEmpty from sessionStorage',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
      }
    } else {
      // Existing cache present: only preserve if it matches current roomImage signature.
      // Otherwise, it belongs to an older room image (often from another space) and must be discarded.
      const sigMatches = !!existingSig && existingSig === currentSig;
      if (roomImage && existingSig && !sigMatches) {
        try {
          safeSessionStorage.removeItem(ROOM_IMAGE_EMPTY_SESSION_KEY);
          safeSessionStorage.removeItem(ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:manageRoomImageEmptyCache:discard-mismatch',message:'Discarded stale roomImageEmpty cache (signature mismatch)',data:{hadExisting:true,hadSig:!!existingSig,sigMatches:false,currentSigPrefix:currentSig.substring(0,24),existingSigPrefix:(existingSig||'').substring(0,24)},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
        } catch (e) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:manageRoomImageEmptyCache:discard-mismatch-error',message:'Failed to discard stale roomImageEmpty cache',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
        }
        return;
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:manageRoomImageEmptyCache:preserve',message:'Preserving roomImageEmpty in sessionStorage (exists in storage but not in data)',data:{key:ROOM_IMAGE_EMPTY_SESSION_KEY,existingInStorageLength:existingInStorage.length},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
    }
  }
};

const persistSanitizedSessionData = (data: SessionData) => {
  if (typeof window === 'undefined') return;

  // Usuń inline base64 tam, gdzie mamy już publiczny URL
  const cleaned = stripInlineBlobs(sanitizeSessionDataForStorage(data));

  try {
    safeLocalStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cleaned));
    return;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      console.error('[useSession] Nie udało się zapisać danych sesji po sanitizacji.', error);
      return;
    }
    console.warn('[useSession] Dane sesji po sanitizacji nadal przekraczają limit. Usuwam dane obrazów w spaces.');
  }

  const withoutSpaces: SessionData = {
    ...cleaned,
    spaces: undefined,
  };

  try {
    safeLocalStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(withoutSpaces));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.error('[useSession] LocalStorage nadal pełny – zapisuję minimalne dane.', error);
      const minimal: SessionData = {
        ...createEmptySession(),
        userHash: data.userHash,
        currentStep: data.currentStep,
        consentTimestamp: data.consentTimestamp,
      };
      try {
        safeLocalStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(minimal));
      } catch (err) {
        console.error('[useSession] Nie udało się zapisać nawet minimalnych danych sesji – czyszczę.', err);
        safeLocalStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } else {
      console.error('[useSession] Nie udało się zapisać minimalnych danych sesji.', error);
    }
  }
};

const persistSessionData = (data: SessionData): SessionData => {
  if (typeof window === 'undefined') return data;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:persistSessionData:entry',message:'persistSessionData called',data:{hasRoomImage:!!data.roomImage,roomImageLength:data.roomImage?.length||0,hasRoomImageEmpty:!!data.roomImageEmpty,roomImageEmptyLength:data.roomImageEmpty?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  manageRoomImageCache(data.roomImage);
  manageRoomImageEmptyCache(data.roomImageEmpty, data.roomImage);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:persistSessionData:after-cache',message:'After calling manageRoomImageEmptyCache',data:{hasRoomImageEmpty:!!data.roomImageEmpty,roomImageEmptyLength:data.roomImageEmpty?.length||0,verifyInStorage:!!safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY),storageLength:safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY)?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  // Preserve existing Big Five/userHash/colorsAndMaterials/visualDNA from stored snapshot if incoming data lacks them
  try {
    const existingRaw = safeLocalStorage.getItem(SESSION_STORAGE_KEY);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as SessionData;
      const willPreserveBigFive = !data.bigFive && !!existing.bigFive;
      const willPreserveUserHash = !data.userHash && !!existing.userHash;
      
      // CRITICAL: Check if data.colorsAndMaterials has actual data (not just empty values)
      const dataHasColorsAndMaterials = !!data.colorsAndMaterials && (
        (data.colorsAndMaterials.selectedStyle && data.colorsAndMaterials.selectedStyle.length > 0) ||
        (data.colorsAndMaterials.selectedPalette && data.colorsAndMaterials.selectedPalette.length > 0) ||
        (data.colorsAndMaterials.topMaterials && data.colorsAndMaterials.topMaterials.length > 0)
      );
      const existingHasColorsAndMaterials = !!existing.colorsAndMaterials && (
        (existing.colorsAndMaterials.selectedStyle && existing.colorsAndMaterials.selectedStyle.length > 0) ||
        (existing.colorsAndMaterials.selectedPalette && existing.colorsAndMaterials.selectedPalette.length > 0) ||
        (existing.colorsAndMaterials.topMaterials && existing.colorsAndMaterials.topMaterials.length > 0)
      );
      const willPreserveColorsAndMaterials = !dataHasColorsAndMaterials && existingHasColorsAndMaterials;
      
      const existingHasVisualDNA = !!existing.visualDNA && (
        (existing.visualDNA.preferences?.colors && existing.visualDNA.preferences.colors.length > 0) ||
        (existing.visualDNA.preferences?.materials && existing.visualDNA.preferences.materials.length > 0) ||
        (existing.visualDNA.preferences?.styles && existing.visualDNA.preferences.styles.length > 0) ||
        !!existing.visualDNA.dominantStyle
      );
      const dataHasVisualDNA = !!data.visualDNA && (
        (data.visualDNA.preferences?.colors && data.visualDNA.preferences.colors.length > 0) ||
        (data.visualDNA.preferences?.materials && data.visualDNA.preferences.materials.length > 0) ||
        (data.visualDNA.preferences?.styles && data.visualDNA.preferences.styles.length > 0) ||
        !!data.visualDNA.dominantStyle
      );
      const willPreserveVisualDNA = !dataHasVisualDNA && existingHasVisualDNA;
      if (willPreserveBigFive) {
        data = { ...data, bigFive: existing.bigFive };
      }
      if (willPreserveUserHash) {
        data = { ...data, userHash: existing.userHash };
      }
      if (willPreserveColorsAndMaterials) {
        data = { ...data, colorsAndMaterials: existing.colorsAndMaterials };
      }
      if (willPreserveVisualDNA) {
        data = { ...data, visualDNA: existing.visualDNA };
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:persistSessionData-merge-existing',message:'Merging stored snapshot before persist',data:{willPreserveBigFive,willPreserveUserHash,willPreserveColorsAndMaterials,willPreserveVisualDNA,hasBigFive:!!data.bigFive,completedAt:data.bigFive?.completedAt,userHash:data.userHash,hasColorsAndMaterials:!!data.colorsAndMaterials,explicitStyle:data.colorsAndMaterials?.selectedStyle||null,explicitPalette:data.colorsAndMaterials?.selectedPalette||null,explicitMaterialsCount:data.colorsAndMaterials?.topMaterials?.length||0,existingHasColorsAndMaterials:!!existing.colorsAndMaterials,existingExplicitStyle:existing.colorsAndMaterials?.selectedStyle||null,existingExplicitPalette:existing.colorsAndMaterials?.selectedPalette||null,existingExplicitMaterialsCount:existing.colorsAndMaterials?.topMaterials?.length||0,existingHasVisualDNA,dataHasVisualDNA},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'H14'})}).catch(()=>{});
      // #endregion
    }
  } catch (e) {
    // ignore parse errors
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:persistSessionData',message:'Persisting session data',data:{hasBigFive:!!data.bigFive,completedAt:data.bigFive?.completedAt,hasColorsAndMaterials:!!data.colorsAndMaterials,explicitStyle:data.colorsAndMaterials?.selectedStyle||null,explicitPalette:data.colorsAndMaterials?.selectedPalette||null,explicitMaterialsCount:data.colorsAndMaterials?.topMaterials?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'H11'})}).catch(()=>{});
  // #endregion

  const cleanedForStorage = stripInlineBlobs(data);

  const needsSanitization = shouldSanitizeSessionData(data);

  if (!needsSanitization) {
    try {
      const serialized = JSON.stringify(cleanedForStorage);

      if (serialized.length > STORAGE_SIZE_THRESHOLD) {
        console.warn('[useSession] Dane sesji są bardzo duże – stosuję sanitizację przed zapisem.');
        persistSanitizedSessionData(cleanedForStorage);
        return data;
      }

      safeLocalStorage.setItem(SESSION_STORAGE_KEY, serialized);
      return data;
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        console.error('[useSession] Nie udało się zapisać danych sesji.', error);
        return data;
      }

      console.warn('[useSession] Przekroczono limit localStorage – zapisuję dane odchudzone.');
    }
  }

  persistSanitizedSessionData(cleanedForStorage);
  return data;
};

const createEmptySession = (): SessionData => ({
  userHash: '',
  consentTimestamp: '',
  currentStep: 'landing',
  currentSpaceId: undefined,
  tinderResults: [],
  visualDNA: {
    dominantTags: [],
    preferences: {
      colors: [],
      materials: [],
      styles: [],
      lighting: []
    },
    accuracyScore: 0
  },
  generations: [],
  finalSurvey: {
    satisfaction: { easeOfUse: 0, engagement: 0, clarity: 0, overall: 0 },
    agency: { control: 0, collaboration: 0, creativity: 0, ownership: 0 },
    preferences: { evolution: 0, crystallization: 0, discovery: 0 }
  }
});

interface UseSessionReturn {
  sessionData: SessionData;
  updateSession: (updates: Partial<SessionData>) => void;
  currentStep: FlowStep;
  setCurrentStep: (step: FlowStep) => void;
  userHash: string;
  isInitialized: boolean;
}

export const useSession = (): UseSessionReturn => {
  // NOTE: this hook is used in many components. It must share ONE session state.
  // Previously, each call created an independent useState() session store, causing UI desync
  // (e.g. RoomSetup not seeing roomAnalysis updates done inside PhotoUploadStep).
  const sessionData = useSyncExternalStore(subscribeSessionStore, getSessionStoreSnapshot, getSessionStoreSnapshot);
  const isInitialized = useSyncExternalStore(subscribeSessionStore, getSessionStoreInitSnapshot, getSessionStoreInitSnapshot);

  useEffect(() => {
    if (sessionStoreInitStarted) return;
    sessionStoreInitStarted = true;
    let isMounted = true;

    const initializeSession = async () => {
      if (typeof window === 'undefined') return;

      // STEP 1: Quick load from localStorage first (synchronous) - for fast initial render
      let userHash = safeLocalStorage.getItem(USER_HASH_STORAGE_KEY);
      let mergedLocalSession: Partial<SessionData> | null = null;
      const savedData = safeLocalStorage.getItem(SESSION_STORAGE_KEY);

      if (savedData) {
        try {
          mergedLocalSession = JSON.parse(savedData) as SessionData;
        } catch (error) {
          console.error('Failed to load session data from localStorage:', error);
        }
      }

      // Get room images from sessionStorage (fast)
      const sessionRoomImage = safeSessionStorage.getItem(ROOM_IMAGE_SESSION_KEY);
      const sessionRoomImageEmpty = safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY);

      // Generate userHash if missing (fast, synchronous)
      if (!userHash) {
        userHash = generateUserHash();
        safeLocalStorage.setItem(USER_HASH_STORAGE_KEY, userHash);
        
        // Przyznaj darmowe kredyty dla nowego użytkownika anonimowego
        void fetch('/api/credits/grant-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userHash }),
        }).catch(err => console.warn('Failed to grant free credits to new anonymous user:', err));
      }

      // Create initial session from localStorage (fast)
      let initialSession: SessionData = {
        ...createEmptySession(),
        ...(mergedLocalSession || {}),
        userHash,
      };

      // Add room images from sessionStorage
      if (sessionRoomImage) {
        initialSession.roomImage = sessionRoomImage;
      }
      if (sessionRoomImageEmpty) {
        initialSession.roomImageEmpty = sessionRoomImageEmpty;
      }

      // Set initial session immediately (for fast render)
      setSessionStoreState({ sessionData: initialSession, isInitialized: true });

      // STEP 2: Load from Supabase in background (async, can take time)
      let authUserId: string | undefined;

      // If no userHash in localStorage, try to restore it from Supabase if user is authenticated
      try {
        const { data: { session } } = await supabase.auth.getSession();
        authUserId = session?.user?.id ?? undefined;
        if (!userHash && authUserId) {
          const { getUserHashFromAuth } = await import('@/lib/supabase-deep-personalization');
          const restoredUserHash = await getUserHashFromAuth(authUserId);
          if (restoredUserHash) {
            userHash = restoredUserHash;
            safeLocalStorage.setItem(USER_HASH_STORAGE_KEY, userHash);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:restore-userHash',message:'Restored userHash from Supabase',data:{userHash:userHash,hasAuthUser:!!session?.user,userId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'incognito-fix',hypothesisId:'I1'})}).catch(()=>{});
            // #endregion
            console.log('[useSession] Restored userHash from Supabase:', userHash);
          }
        }
      } catch (error) {
        console.warn('[useSession] Failed to restore userHash from Supabase:', error);
      }

      // If authenticated, check if there's an existing profile with data linked to auth_user_id
      // If yes, use that userHash instead of creating a new one
      if (authUserId && userHash) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id === authUserId) {
            const { getBestProfileForAuth, getUserHashFromAuth } = await import('@/lib/supabase-deep-personalization');
            
            // First, check if there's a profile with data linked to auth_user_id
            const bestProfile = await getBestProfileForAuth(authUserId);
            if (bestProfile && bestProfile.userHash) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:best-profile-found',message:'Best profile for auth_user_id found',data:{authUserId,foundUserHash:bestProfile.userHash,hasPersonality:!!bestProfile.personality,hasImplicit:!!bestProfile.aestheticDNA?.implicit,hasExplicit:!!bestProfile.aestheticDNA?.explicit,hasSensory:!!bestProfile.sensoryPreferences,hasBiophilia:bestProfile.psychologicalBaseline?.biophiliaScore!==undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'incognito-fix',hypothesisId:'I17'})}).catch(()=>{});
              // #endregion
              if (bestProfile.userHash !== userHash) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:switch-to-profile-with-data',message:'Switching to userHash from profile with data',data:{oldUserHash:userHash,newUserHash:bestProfile.userHash,authUserId,hasPersonality:!!bestProfile.personality,hasImplicit:!!bestProfile.aestheticDNA?.implicit,hasExplicit:!!bestProfile.aestheticDNA?.explicit,hasSensory:!!bestProfile.sensoryPreferences,hasBiophilia:bestProfile.psychologicalBaseline?.biophiliaScore!==undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'incognito-fix',hypothesisId:'I13'})}).catch(()=>{});
                // #endregion
                userHash = bestProfile.userHash;
                safeLocalStorage.setItem(USER_HASH_STORAGE_KEY, userHash);
              }
            } else {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:no-best-profile',message:'No profile with data found for auth_user_id',data:{authUserId,currentUserHash:userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'incognito-fix',hypothesisId:'I18'})}).catch(()=>{});
              // #endregion
              // No profile with data — check if there's any mapping at all
              const existingHash = await getUserHashFromAuth(authUserId);
              if (!existingHash) {
                // No mapping yet — link this userHash to auth_user_id (participants is source of truth)
                const { error } = await supabase
                  .from('participants')
                  .upsert({
                    user_hash: userHash,
                    auth_user_id: authUserId,
                    updated_at: new Date().toISOString()
                  } as any, { onConflict: 'user_hash' } as any);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:link-userHash',message:'Linking userHash to auth_user_id',data:{userHash,authUserId,hadExisting:!!existingHash,upsertError:!!error,errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'incognito-fix',hypothesisId:'I11'})}).catch(()=>{});
                // #endregion
              } else if (existingHash !== userHash) {
                // Mapping exists but different userHash — use the existing one
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:switch-to-existing-hash',message:'Switching to existing userHash from auth_user_id',data:{oldUserHash:userHash,newUserHash:existingHash,authUserId},timestamp:Date.now(),sessionId:'debug-session',runId:'incognito-fix',hypothesisId:'I14'})}).catch(()=>{});
                // #endregion
                userHash = existingHash;
                safeLocalStorage.setItem(USER_HASH_STORAGE_KEY, userHash);
              }
            }
          }
        } catch (error) {
          console.warn('[useSession] Failed to link userHash to auth_user_id:', error);
        }
      }

      // Use mergedLocalSession from step 1 (already loaded from localStorage)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:loaded-local-session',message:'Loaded session from localStorage',data:{hasBigFive:!!mergedLocalSession?.bigFive,completedAt:mergedLocalSession?.bigFive?.completedAt,userHash:mergedLocalSession?.userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'H12'})}).catch(()=>{});
      // #endregion

      // Zawsze pobierz najnowszy snapshot z Supabase i połącz z danymi lokalnymi
      let remoteSession: SessionData | null = null;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:remote-snapshot-check',message:'Checking whether to fetch remote snapshot',data:{hasUserHash:!!userHash,disableSync:DISABLE_SESSION_SYNC},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
      // #endregion
      if (userHash && !DISABLE_SESSION_SYNC) {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:remote-snapshot-fetch',message:'Fetching remote snapshot from Supabase',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
          // #endregion
          remoteSession = await fetchLatestSessionSnapshot(userHash);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:remote-snapshot-result',message:'Remote snapshot fetched',data:{userHash,remoteFound:!!remoteSession,remoteHasBigFive:!!remoteSession?.bigFive,remoteHasVisualDNA:!!remoteSession?.visualDNA,remoteHasColorsAndMaterials:!!remoteSession?.colorsAndMaterials},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
          // #endregion
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:remote-snapshot-error',message:'Failed to fetch remote snapshot',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
          // #endregion
          console.warn('[useSession] Nie udało się pobrać sesji z Supabase.', error);
        }
      }

      let mergedSession: SessionData = {
        ...createEmptySession(),
        ...(remoteSession || {}),
        ...(mergedLocalSession || {}),
        userHash,
      };

      // Ensure roomImageEmpty from sessionStorage has priority (most recent)
      // First check the earlier read (sessionRoomImageEmpty), then check again to be sure we have the latest
      const sessionRoomImageEmptyLatest = safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY) || sessionRoomImageEmpty;
      if (sessionRoomImageEmptyLatest) {
        mergedSession.roomImageEmpty = sessionRoomImageEmptyLatest;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:merged-session-roomImageEmpty',message:'Setting roomImageEmpty in mergedSession from sessionStorage',data:{hasSessionRoomImageEmpty:!!sessionRoomImageEmpty,sessionRoomImageEmptyLength:sessionRoomImageEmpty?.length||0,hasSessionRoomImageEmptyLatest:!!sessionRoomImageEmptyLatest,sessionRoomImageEmptyLatestLength:sessionRoomImageEmptyLatest?.length||0,hasMergedSessionRoomImageEmpty:!!mergedSession.roomImageEmpty,mergedSessionRoomImageEmptyLength:mergedSession.roomImageEmpty?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:434',message:'After merging remote/local session snapshot',data:{hasBigFive:!!mergedSession.bigFive,domains:mergedSession.bigFive?.scores?.domains||mergedSession.bigFive?.scores?.domains||null,facetsPresent:!!mergedSession.bigFive?.scores?.facets,facetCounts:mergedSession.bigFive?.scores?.facets?{O:Object.keys(mergedSession.bigFive.scores.facets.O||{}).length,C:Object.keys(mergedSession.bigFive.scores.facets.C||{}).length,E:Object.keys(mergedSession.bigFive.scores.facets.E||{}).length,A:Object.keys(mergedSession.bigFive.scores.facets.A||{}).length,N:Object.keys(mergedSession.bigFive.scores.facets.N||{}).length}:null,completedAt:mergedSession.bigFive?.completedAt,explicitStyle:mergedSession.colorsAndMaterials?.selectedStyle||null,explicitPalette:mergedSession.colorsAndMaterials?.selectedPalette||null,explicitMaterialsCount:mergedSession.colorsAndMaterials?.topMaterials?.length||0,remoteHasColorsAndMaterials:!!remoteSession?.colorsAndMaterials,remoteExplicitStyle:remoteSession?.colorsAndMaterials?.selectedStyle||null,localHasColorsAndMaterials:!!mergedLocalSession?.colorsAndMaterials,localExplicitStyle:mergedLocalSession?.colorsAndMaterials?.selectedStyle||null},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'S1'})}).catch(()=>{});
      // #endregion

      // Load profile data (Big Five, explicit preferences, biophiliaScore, inspirations) from user_profiles
      if (userHash) {
        try {
          const { getUserProfile } = await import('@/lib/supabase-deep-personalization');
          const { mapUserProfileToSessionData } = await import('@/lib/profile-mapper');
          const userProfile = await getUserProfile(userHash);
          
          if (userProfile) {
            // Check if profile has auth_user_id and try to restore userHash if needed
            if (userProfile.auth_user_id) {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session && session.user && session.user.id === userProfile.auth_user_id) {
                  // Profile has auth_user_id matching current session
                  // If current userHash doesn't match, try to restore the correct one
                  const { getUserHashFromAuth } = await import('@/lib/supabase-deep-personalization');
                  const restoredUserHash = await getUserHashFromAuth(session.user.id);
                  if (restoredUserHash && restoredUserHash !== userHash) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:restore-userHash-after-profile-load',message:'Restored userHash after profile load',data:{oldUserHash:userHash,newUserHash:restoredUserHash,authUserId:session.user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'incognito-fix',hypothesisId:'I9'})}).catch(()=>{});
                    // #endregion
                    userHash = restoredUserHash;
                    safeLocalStorage.setItem(USER_HASH_STORAGE_KEY, userHash);
                    console.log('[useSession] Restored userHash after profile load:', userHash);
                    // Reload profile with correct userHash
                    const correctUserProfile = await getUserProfile(userHash);
                    if (correctUserProfile) {
                      const correctProfileSessionData = mapUserProfileToSessionData(correctUserProfile);
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:profile-loaded-correct',message:'Loaded profile data with correct userHash',data:{hasBigFive:!!correctProfileSessionData.bigFive,hasImplicit:!!correctProfileSessionData.visualDNA,hasExplicit:!!correctProfileSessionData.colorsAndMaterials,hasSensory:!!correctProfileSessionData.sensoryPreferences,hasBiophilia:correctProfileSessionData.biophiliaScore!==undefined,biophiliaScore:correctProfileSessionData.biophiliaScore,hasLifestyle:!!correctProfileSessionData.lifestyle,profileCompletedAt:correctUserProfile.profileCompletedAt,implicitStyle:correctProfileSessionData.visualDNA?.dominantStyle,implicitColorsCount:correctProfileSessionData.visualDNA?.preferences?.colors?.length||0,implicitMaterialsCount:correctProfileSessionData.visualDNA?.preferences?.materials?.length||0,explicitPalette:correctProfileSessionData.colorsAndMaterials?.selectedPalette,explicitMaterialsCount:correctProfileSessionData.colorsAndMaterials?.topMaterials?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'profile-load',hypothesisId:'P3'})}).catch(()=>{});
                      // #endregion
                      // Update mergedSession with correct profile data
                      mergedSession = {
                        ...mergedSession,
                        ...correctProfileSessionData,
                        userHash
                      };
                    }
                  }
                }
              } catch (error) {
                console.warn('[useSession] Failed to restore userHash after profile load:', error);
              }
            }
            
            // Map UserProfile to SessionData (Big Five, explicit preferences, biophiliaScore, etc.)
            const profileSessionData = mapUserProfileToSessionData(userProfile);
            const { bigFive: profileBigFive, visualDNA: profileVisualDNA, colorsAndMaterials: profileColorsAndMaterials, ...profileRest } = profileSessionData;
            const profileExplicit = profileColorsAndMaterials;
            const profileHasExplicit =
              !!profileExplicit &&
              (
                (profileExplicit.selectedPalette && profileExplicit.selectedPalette.length > 0) ||
                (profileExplicit.selectedStyle && profileExplicit.selectedStyle.length > 0) ||
                (profileExplicit.topMaterials && profileExplicit.topMaterials.length > 0)
              );
            const localExplicit = mergedSession.colorsAndMaterials || { selectedPalette: '', selectedStyle: '', topMaterials: [] as string[] };
            const localHasExplicit =
              !!localExplicit &&
              (
                (localExplicit.selectedPalette && localExplicit.selectedPalette.length > 0) ||
                (localExplicit.selectedStyle && localExplicit.selectedStyle.length > 0) ||
                (localExplicit.topMaterials && localExplicit.topMaterials.length > 0)
              );

            // Field-wise merge for explicit:
            // - If lokalne jawne istnieją, daj im priorytet (żeby nie nadpisywać świeżych ustawień profilem z Supabase).
            // - W przeciwnym razie użyj danych z profilu.
            // CRITICAL: Don't overwrite with empty string "" - preserve existing non-empty values
            const mergedExplicit = (() => {
              // Helper to get non-empty value, preferring local over profile
              const getNonEmptyStyle = () => {
                const localStyle = localExplicit.selectedStyle;
                const profileStyle = profileExplicit?.selectedStyle;
                // If local has non-empty style, use it
                if (localStyle && localStyle.length > 0) return localStyle;
                // If profile has non-empty style, use it
                if (profileStyle && profileStyle.length > 0) return profileStyle;
                // If local has style (even if empty), use it (don't overwrite with empty from profile)
                if (localStyle !== undefined) return localStyle;
                // If profile has style (even if empty), use it
                if (profileStyle !== undefined) return profileStyle;
                // Fallback to empty string
                return '';
              };
              
              const getNonEmptyPalette = () => {
                const localPalette = localExplicit.selectedPalette;
                const profilePalette = profileExplicit?.selectedPalette;
                if (localPalette && localPalette.length > 0) return localPalette;
                if (profilePalette && profilePalette.length > 0) return profilePalette;
                if (localPalette !== undefined) return localPalette;
                if (profilePalette !== undefined) return profilePalette;
                return '';
              };
              
              return {
                selectedPalette: getNonEmptyPalette(),
                selectedStyle: getNonEmptyStyle(),
                topMaterials: Array.isArray(localExplicit.topMaterials) && localExplicit.topMaterials.length > 0
                  ? localExplicit.topMaterials
                  : (Array.isArray(profileExplicit?.topMaterials) && profileExplicit.topMaterials.length > 0
                      ? profileExplicit.topMaterials
                      : [])
              };
            })();

            // Field-wise merge for visualDNA (implicit):
            // - If profile has visualDNA with actual data (colors/materials/styles), use it
            // - Otherwise, preserve existing visualDNA from mergedSession
            const mergedVisualDNA = (() => {
              const profileHasVisualDNA = !!profileVisualDNA && (
                (profileVisualDNA.preferences?.colors && profileVisualDNA.preferences.colors.length > 0) ||
                (profileVisualDNA.preferences?.materials && profileVisualDNA.preferences.materials.length > 0) ||
                (profileVisualDNA.preferences?.styles && profileVisualDNA.preferences.styles.length > 0) ||
                !!profileVisualDNA.dominantStyle
              );
              const localHasVisualDNA = !!mergedSession.visualDNA && (
                (mergedSession.visualDNA.preferences?.colors && mergedSession.visualDNA.preferences.colors.length > 0) ||
                (mergedSession.visualDNA.preferences?.materials && mergedSession.visualDNA.preferences.materials.length > 0) ||
                (mergedSession.visualDNA.preferences?.styles && mergedSession.visualDNA.preferences.styles.length > 0) ||
                !!mergedSession.visualDNA.dominantStyle
              );
              // Prefer profile visualDNA if it has data, otherwise keep local
              return profileHasVisualDNA ? profileVisualDNA : (localHasVisualDNA ? mergedSession.visualDNA : profileVisualDNA || mergedSession.visualDNA);
            })();
            
            // Merge profile data into session:
            // - profile data takes precedence, BUT don't overwrite local bigFive if profile has none
            mergedSession = {
              ...mergedSession,
              ...profileRest,
              ...(profileBigFive ? { bigFive: profileBigFive } : {}),
              ...(mergedVisualDNA ? { visualDNA: mergedVisualDNA } : {}),
              colorsAndMaterials: mergedExplicit,
              userHash
            };

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:after-profile-merge',message:'After merging profile data into session',data:{hasColorsAndMaterials:!!mergedSession.colorsAndMaterials,explicitStyle:mergedSession.colorsAndMaterials?.selectedStyle||null,explicitPalette:mergedSession.colorsAndMaterials?.selectedPalette||null,explicitMaterialsCount:mergedSession.colorsAndMaterials?.topMaterials?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E17'})}).catch(()=>{});
            // #endregion

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:explicit-merge',message:'Deciding explicit merge from profile',data:{profileHasExplicit,profilePalette:profileExplicit?.selectedPalette||null,profileStyle:profileExplicit?.selectedStyle||null,profileMaterialsCount:profileExplicit?.topMaterials?.length||0,keptExisting:!profileHasExplicit,finalPalette:mergedExplicit.selectedPalette,finalStyle:mergedExplicit.selectedStyle,finalMaterialsCount:mergedExplicit.topMaterials?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E13'})}).catch(()=>{});
            // #endregion
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:profile-loaded',message:'Loaded profile data from Supabase',data:{hasBigFive:!!profileSessionData.bigFive,hasImplicit:!!profileSessionData.visualDNA,hasExplicit:!!profileSessionData.colorsAndMaterials,hasSensory:!!profileSessionData.sensoryPreferences,hasBiophilia:profileSessionData.biophiliaScore!==undefined,biophiliaScore:profileSessionData.biophiliaScore,hasLifestyle:!!profileSessionData.lifestyle,profileCompletedAt:userProfile.profileCompletedAt,implicitStyle:profileSessionData.visualDNA?.dominantStyle,implicitColorsCount:profileSessionData.visualDNA?.preferences?.colors?.length||0,implicitMaterialsCount:profileSessionData.visualDNA?.preferences?.materials?.length||0,explicitPalette:profileSessionData.colorsAndMaterials?.selectedPalette,explicitMaterialsCount:profileSessionData.colorsAndMaterials?.topMaterials?.length||0,hasAuthUserId:!!userProfile.auth_user_id,authUserId:userProfile.auth_user_id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'profile-load',hypothesisId:'P2'})}).catch(()=>{});
            // #endregion
            
            console.log('[useSession] Loaded profile data from user_profiles:', {
              hasBigFive: !!profileSessionData.bigFive,
              hasImplicit: !!profileSessionData.visualDNA,
              hasExplicit: !!profileSessionData.colorsAndMaterials,
              hasSensory: !!profileSessionData.sensoryPreferences,
              hasBiophilia: profileSessionData.biophiliaScore !== undefined,
              biophiliaScore: profileSessionData.biophiliaScore,
              implicitStyle: profileSessionData.visualDNA?.dominantStyle,
              implicitColors: profileSessionData.visualDNA?.preferences?.colors,
              implicitMaterials: profileSessionData.visualDNA?.preferences?.materials,
              explicitPalette: profileSessionData.colorsAndMaterials?.selectedPalette,
              explicitMaterials: profileSessionData.colorsAndMaterials?.topMaterials
            });
            
            // Load inspirations with Gemini tags from user_profiles.inspirations
            if (userProfile.inspirations && Array.isArray(userProfile.inspirations) && userProfile.inspirations.length > 0) {
              // Convert user_profiles.inspirations format to SessionData.inspirations format
              const inspirationsFromProfile = userProfile.inspirations.map((insp: any) => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:436',message:'Raw inspiration from Supabase before mapping',data:{rawInspTags:insp.tags,rawInspTagsType:typeof insp.tags,rawInspTagsIsObject:insp.tags&&typeof insp.tags==='object',rawInspTagsKeys:insp.tags?Object.keys(insp.tags):[],rawInspTagsValue:JSON.stringify(insp.tags)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                
                const result = {
                  id: insp.fileId || `insp_${Date.now()}_${Math.random().toString(36).substring(2)}`,
                  fileId: insp.fileId,
                  url: insp.url,
                  tags: insp.tags, // Tags from Gemini 2.5 Flash-Lite
                  description: insp.description, // Description from Gemini
                  addedAt: insp.addedAt || new Date().toISOString()
                };
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:448',message:'Mapped inspiration result',data:{id:result.id,hasTags:!!result.tags,tagsType:typeof result.tags,tagsIsObject:result.tags&&typeof result.tags==='object',tagsKeys:result.tags?Object.keys(result.tags):[],tagsValue:JSON.stringify(result.tags)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                
                // DEBUG: Log tags when loading from Supabase
                console.log('[useSession] Loading inspiration from Supabase:', {
                  id: result.id,
                  hasTags: !!result.tags,
                  tagsType: typeof result.tags,
                  tagsIsObject: result.tags && typeof result.tags === 'object',
                  tagsKeys: result.tags ? Object.keys(result.tags) : [],
                  tagsValue: result.tags,
                  rawInspTags: insp.tags,
                  rawInspTagsType: typeof insp.tags
                });
                
                return result;
              });

              // Merge inspirations: prefer Supabase (with Gemini tags) over localStorage
              const existingInspirations = mergedSession?.inspirations || [];
              const hasLocalInspirations = existingInspirations.length > 0;
              const hasSupabaseInspirations = inspirationsFromProfile.length > 0;

              if (hasSupabaseInspirations) {
                // Use Supabase inspirations (with Gemini tags) if available
                mergedSession = {
                  ...(mergedSession || {}),
                  inspirations: inspirationsFromProfile
                };
                console.log('[useSession] Loaded inspirations with Gemini tags from user_profiles.inspirations:', inspirationsFromProfile.length);
                console.log('[useSession] Tags structure:', inspirationsFromProfile.map((i: any) => ({
                  hasTags: !!i.tags,
                  styles: i.tags?.styles?.length || 0,
                  colors: i.tags?.colors?.length || 0,
                  materials: i.tags?.materials?.length || 0,
                  biophilia: i.tags?.biophilia,
                  description: i.description ? 'present' : 'missing'
                })));
              } else if (hasLocalInspirations) {
                // Keep local inspirations if no Supabase data
                console.log('[useSession] Using local inspirations (no Supabase data)');
              }
            }
          }
        } catch (error) {
          console.warn('[useSession] Nie udało się pobrać danych profilu z user_profiles:', error);
        }
      }

      // Load inspirations from participant_images (source of truth after radical refactor).
      // This is crucial for cross-device behavior: dashboard and inspirations flow persist images there,
      // while localStorage/session snapshot may not include them on a fresh device.
      if (userHash) {
        try {
          const participantImages = await fetchParticipantImages(userHash);
          const activeSpaceId = (mergedSession as any)?.currentSpaceId as string | undefined;

          const allRemoteInspirations = participantImages
            .filter((img) => img.type === 'inspiration')
            .map((img) => ({
              id: img.id,
              url: img.url,
              spaceId: img.spaceId || null,
              tags: img.tags,
              description: img.description,
              addedAt: img.createdAt || new Date().toISOString(),
            }));

          // If session is scoped to a space, prefer inspirations from that space,
          // but fall back to "all inspirations" if the space id doesn't match remote data
          // (e.g. first load on a different device / stale local space id).
          const remoteInspirations =
            activeSpaceId
              ? allRemoteInspirations.filter((img: any) => (img as any).spaceId === activeSpaceId)
              : allRemoteInspirations;
          const effectiveRemoteInspirations =
            activeSpaceId && remoteInspirations.length === 0
              ? allRemoteInspirations
              : remoteInspirations;

          const localInspirations = Array.isArray((mergedSession as any)?.inspirations)
            ? ((mergedSession as any).inspirations as any[])
            : [];

          // Merge: prefer remote (participant_images), but keep any local inspirations missing remotely.
          // Dedup by URL when possible, else by id.
          const keyOf = (insp: any) => {
            const url = typeof insp?.url === 'string' ? insp.url : '';
            return url ? `url:${url}` : `id:${insp?.id || ''}`;
          };
          const seen = new Set<string>();
          const merged: any[] = [];
          for (const insp of effectiveRemoteInspirations) {
            const k = keyOf(insp);
            if (!k || seen.has(k)) continue;
            seen.add(k);
            merged.push(insp);
          }
          for (const insp of localInspirations) {
            const k = keyOf(insp);
            if (!k || seen.has(k)) continue;
            seen.add(k);
            merged.push(insp);
          }

          if (effectiveRemoteInspirations.length > 0) {
            mergedSession = {
              ...(mergedSession || {}),
              inspirations: merged,
            };
          }

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'useSession.ts:participant_images-inspirations-merge',
              message: 'Merged inspirations from participant_images into session',
              data: {
                userHash,
                activeSpaceId: activeSpaceId || null,
                remoteCount: effectiveRemoteInspirations.length,
                localCount: localInspirations.length,
                mergedCount: merged.length,
                mergedHasTags: merged.some((i: any) => !!i?.tags),
                mergedTagsSamples: merged.slice(0, 3).map((i: any) => ({
                  id: i.id,
                  stylesCount: i?.tags?.styles?.length || 0,
                  colorsCount: i?.tags?.colors?.length || 0,
                  materialsCount: i?.tags?.materials?.length || 0,
                  hasDescription: !!i?.description,
                })),
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'flow-debug',
              hypothesisId: 'I-PARTICIPANT-IMAGES',
            }),
          }).catch(() => {});
          // #endregion
        } catch (e) {
          console.warn('[useSession] Failed to load inspirations from participant_images:', e);
        }
      }

      // Upewnij się, że najświeższe roomImage z sessionStorage ma priorytet
      if (sessionRoomImage && (!mergedSession.roomImage || mergedSession.roomImage.length < sessionRoomImage.length)) {
        mergedSession = { ...mergedSession, roomImage: sessionRoomImage };
      }

      // CRITICAL: Upewnij się, że najświeższe roomImageEmpty z sessionStorage ma priorytet
      const sessionRoomImageEmptyFinal = safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:sessionRoomImageEmptyFinal-check',message:'Checking sessionRoomImageEmptyFinal before merge',data:{hasSessionRoomImageEmptyFinal:!!sessionRoomImageEmptyFinal,sessionRoomImageEmptyFinalLength:sessionRoomImageEmptyFinal?.length||0,hasMergedSessionRoomImageEmpty:!!mergedSession.roomImageEmpty,mergedSessionRoomImageEmptyLength:mergedSession.roomImageEmpty?.length||0,willMerge:!!sessionRoomImageEmptyFinal&&(!mergedSession.roomImageEmpty||mergedSession.roomImageEmpty.length<sessionRoomImageEmptyFinal.length)},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      
      if (sessionRoomImageEmptyFinal && (!mergedSession.roomImageEmpty || mergedSession.roomImageEmpty.length < sessionRoomImageEmptyFinal.length)) {
        mergedSession = { ...mergedSession, roomImageEmpty: sessionRoomImageEmptyFinal };
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:sessionRoomImageEmptyFinal-merged',message:'sessionRoomImageEmptyFinal merged into mergedSession',data:{sessionRoomImageEmptyFinalLength:sessionRoomImageEmptyFinal.length,mergedSessionRoomImageEmptyLength:mergedSession.roomImageEmpty?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
      }

      // Migrate legacy spaces with data URLs to Supabase (one-time per browser)
      const legacyMigratedFlag = safeLocalStorage.getItem('aura_spaces_migrated');
      if (hasDataUrlSpaces(mergedSession.spaces) && legacyMigratedFlag !== '1') {
        try {
          const migratedSpaces = await migrateLegacySpacesToSupabase(mergedSession.spaces || [], userHash);
          mergedSession = { ...mergedSession, spaces: migratedSpaces };
          safeLocalStorage.setItem('aura_spaces_migrated', '1');
        } catch (e) {
          console.warn('[useSession] Legacy spaces migration failed', e);
        }
      }

      // CRITICAL: Don't use createEmptySession() as base - it will overwrite data with empty values
      // Instead, use mergedSession directly and only fill in missing fields
      const finalSession: SessionData = {
        ...(mergedSession || createEmptySession()),
        userHash,
      };
      
      // #region agent log
      const finalSessionStorageCheck = typeof window !== 'undefined' ? safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY) : null;
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:final-session:before-persist',message:'Final session before persistSessionData',data:{hasBigFive:!!finalSession.bigFive,completedAt:finalSession.bigFive?.completedAt,userHash:finalSession.userHash,hasColorsAndMaterials:!!finalSession.colorsAndMaterials,explicitStyle:finalSession.colorsAndMaterials?.selectedStyle||null,explicitPalette:finalSession.colorsAndMaterials?.selectedPalette||null,explicitMaterialsCount:finalSession.colorsAndMaterials?.topMaterials?.length||0,mergedHasColorsAndMaterials:!!mergedSession.colorsAndMaterials,mergedExplicitStyle:mergedSession.colorsAndMaterials?.selectedStyle||null,hasFinalSessionRoomImageEmpty:!!finalSession.roomImageEmpty,finalSessionRoomImageEmptyLength:finalSession.roomImageEmpty?.length||0,hasStorageRoomImageEmpty:!!finalSessionStorageCheck,storageRoomImageEmptyLength:finalSessionStorageCheck?.length||0,mergedHasRoomImageEmpty:!!mergedSession.roomImageEmpty,mergedRoomImageEmptyLength:mergedSession.roomImageEmpty?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      const persisted = persistSessionData(finalSession);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:final-session:after-persist',message:'Final session after persistSessionData',data:{hasPersistedRoomImageEmpty:!!persisted.roomImageEmpty,persistedRoomImageEmptyLength:persisted.roomImageEmpty?.length||0,hasFinalSessionRoomImageEmpty:!!finalSession.roomImageEmpty,finalSessionRoomImageEmptyLength:finalSession.roomImageEmpty?.length||0,storageAfterPersist:!!safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY),storageAfterPersistLength:safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY)?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      if (isMounted) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:initializeSession:before-setState',message:'About to call setSessionData in initializeSession',data:{hasPersistedRoomImageEmpty:!!persisted.roomImageEmpty,persistedRoomImageEmptyLength:persisted.roomImageEmpty?.length||0,isMounted},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        setSessionStoreState({ sessionData: persisted, isInitialized: true });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:initializeSession:after-setState',message:'After calling setSessionData in initializeSession',data:{hasPersistedRoomImageEmpty:!!persisted.roomImageEmpty,persistedRoomImageEmptyLength:persisted.roomImageEmpty?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
      }
    };

    void initializeSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateSession = (updates: Partial<SessionData>) => {
    setSessionStoreState((prev) => {
      const prevData = prev.sessionData;
      // Preserve roomImageEmpty from previous state if not explicitly provided in updates
      const hasRoomImageEmptyInUpdates = 'roomImageEmpty' in updates;
      const newData = { 
        ...prevData, 
        ...updates,
        // CRITICAL: Preserve roomImageEmpty from previous state if not explicitly in updates
        roomImageEmpty: hasRoomImageEmptyInUpdates ? updates.roomImageEmpty : prevData.roomImageEmpty
      };
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:updateSession:entry',message:'updateSession called',data:{hasRoomImageEmptyInUpdates,updatesHasRoomImageEmpty:!!updates.roomImageEmpty,updatesRoomImageEmptyLength:updates.roomImageEmpty?.length||0,prevHasRoomImageEmpty:!!prevData.roomImageEmpty,prevRoomImageEmptyLength:prevData.roomImageEmpty?.length||0,newDataHasRoomImageEmpty:!!newData.roomImageEmpty,newDataRoomImageEmptyLength:newData.roomImageEmpty?.length||0,updatesKeys:Object.keys(updates)},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      
      const persisted = persistSessionData(newData);
      
      // #region agent log
      const persistedStorageCheck = typeof window !== 'undefined' ? safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY) : null;
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSession.ts:updateSession:after-persist',message:'After persistSessionData',data:{persistedHasRoomImageEmpty:!!persisted.roomImageEmpty,persistedRoomImageEmptyLength:persisted.roomImageEmpty?.length||0,storageHasRoomImageEmpty:!!persistedStorageCheck,storageRoomImageEmptyLength:persistedStorageCheck?.length||0,storageMatches:persisted.roomImageEmpty===persistedStorageCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      
      return { ...prev, sessionData: persisted };
    });
  };

  const setCurrentStep = (step: FlowStep) => {
    updateSession({ currentStep: step });
  };

  return {
    sessionData,
    updateSession,
    currentStep: sessionData.currentStep,
    setCurrentStep,
    userHash: sessionData.userHash,
    isInitialized
  };
};

// ====== Shared session store (singleton) ======
type SessionStoreState = { sessionData: SessionData; isInitialized: boolean };
type SessionStoreListener = () => void;

let sessionStoreState: SessionStoreState = { sessionData: createEmptySession(), isInitialized: false };
const sessionStoreListeners = new Set<SessionStoreListener>();
let sessionStoreInitStarted = false;

function subscribeSessionStore(listener: SessionStoreListener) {
  sessionStoreListeners.add(listener);
  return () => sessionStoreListeners.delete(listener);
}

function getSessionStoreSnapshot() {
  return sessionStoreState.sessionData;
}

function getSessionStoreInitSnapshot() {
  return sessionStoreState.isInitialized;
}

function setSessionStoreState(
  next:
    | SessionStoreState
    | ((prev: SessionStoreState) => SessionStoreState)
) {
  sessionStoreState = typeof next === 'function' ? (next as any)(sessionStoreState) : next;
  sessionStoreListeners.forEach((l) => l());
}

function generateUserHash(): string {
  return 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}