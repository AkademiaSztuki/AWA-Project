import { useEffect, useSyncExternalStore } from 'react';
import { SessionData, FlowStep } from '@/types';
import {
  fetchSessionSnapshotFromGcp,
  saveSessionToGcp,
  DISABLE_SESSION_SYNC,
  isSessionSyncDebugEnabled,
  safeLocalStorage,
  safeSessionStorage,
} from '@/lib/gcp-data';
import { uploadSpaceImage, saveSpaceImagesMetadata, fetchParticipantImages } from '@/lib/remote-spaces';
import { gcpApi } from '@/lib/gcp-api-client';

const SESSION_STORAGE_KEY = 'aura_session';
const USER_HASH_STORAGE_KEY = 'aura_user_hash';
const ROOM_IMAGE_SESSION_KEY = 'aura_session_room_image';
const ROOM_IMAGE_EMPTY_SESSION_KEY = 'aura_session_room_image_empty';
const ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY = 'aura_session_room_image_empty_source_sig';
const STORAGE_SIZE_THRESHOLD = 4_500_000; // ~4,5MB
const MAX_INLINE_DATA_LENGTH = 120_000; // ~120KB
const MAX_GENERATIONS_HISTORY = 120;
const MAX_TINDER_SWIPES = 250;
const MAX_SESSION_INSPIRATIONS = 10;

function inspirationMergeKey(item: any): string {
  const u = item?.url || item?.imageBase64;
  if (typeof u === 'string' && u.length > 0) return `u:${u.slice(0, 2048)}`;
  if (item?.id != null && String(item.id).length > 0) return `id:${String(item.id)}`;
  return '';
}

/** Union remote + local by URL/id, newest wins, cap at MAX_SESSION_INSPIRATIONS. */
function mergeInspirationLists(a: any[], b: any[]): any[] {
  const map = new Map<string, any>();
  const put = (item: any) => {
    const k = inspirationMergeKey(item);
    if (!k) return;
    const prev = map.get(k);
    const tNew = new Date(item.addedAt || item.createdAt || 0).getTime();
    const tOld = prev ? new Date(prev.addedAt || prev.createdAt || 0).getTime() : 0;
    if (!prev || tNew >= tOld) {
      map.set(k, { ...prev, ...item });
    }
  };
  for (const x of a) put(x);
  for (const x of b) put(x);
  return Array.from(map.values())
    .sort(
      (x, y) =>
        new Date(y.addedAt || y.createdAt || 0).getTime() -
        new Date(x.addedAt || x.createdAt || 0).getTime(),
    )
    .slice(0, MAX_SESSION_INSPIRATIONS);
}

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
  // Preserve selected image with base64 and parameters (needed for modifications to work after refresh)
  // Note: base64 is large but necessary for the modify flow - only one image at a time
  (sanitized as any).selectedImage = data.selectedImage
    ? (typeof (data as any).selectedImage === 'string'
        ? { id: (data as any).selectedImage }
        : { 
            id: (data as any).selectedImage?.id, 
            url: (data as any).selectedImage?.url, 
            base64: (data as any).selectedImage?.base64, // Keep base64 for modifications!
            source: (data as any).selectedImage?.source, 
            provider: (data as any).selectedImage?.provider,
            parameters: (data as any).selectedImage?.parameters // Keep parameters for modifications!
          })
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

  // Keep matrixHistory but strip base64 to save space (imageUrl is kept for display)
  // Base64 is only needed for selectedImage (for modifications)
  const selectedId = (sanitized as any).selectedImage?.id;
  if (Array.isArray((sanitized as any).matrixHistory)) {
    (sanitized as any).matrixHistory = (sanitized as any).matrixHistory.map((item: any) => ({
      id: item.id,
      label: item.label,
      timestamp: item.timestamp,
      imageUrl: item.imageUrl || item.url,
      source: item.source,
      isSelected: item.id === selectedId,
      // Keep base64 only for selected image (needed for modifications if page refreshes)
      base64: item.id === selectedId ? item.base64 : undefined
    }));
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

  const existingInStorage = safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY);
  const existingSig = safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY);
  const currentSig = makeImageSig(roomImage);

  if (roomImageEmpty) {
    try {
      safeSessionStorage.setItem(ROOM_IMAGE_EMPTY_SESSION_KEY, roomImageEmpty);
      // Store signature of the roomImage this empty-room cache belongs to (prevents stale cross-space reuse)
      safeSessionStorage.setItem(ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY, currentSig);
    } catch (e) {
    }
  } else {
    // If there's nothing in storage, ensure both keys are removed
    if (!existingInStorage) {
      try {
        safeSessionStorage.removeItem(ROOM_IMAGE_EMPTY_SESSION_KEY);
        safeSessionStorage.removeItem(ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY);
      } catch (e) {
      }
    } else {
      // Existing cache present: only preserve if it matches current roomImage signature.
      // Otherwise, it belongs to an older room image (often from another space) and must be discarded.
      const sigMatches = !!existingSig && existingSig === currentSig;
      if (roomImage && existingSig && !sigMatches) {
        try {
          safeSessionStorage.removeItem(ROOM_IMAGE_EMPTY_SESSION_KEY);
          safeSessionStorage.removeItem(ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY);
        } catch (e) {
        }
        return;
      }
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

  manageRoomImageCache(data.roomImage);
  manageRoomImageEmptyCache(data.roomImageEmpty, data.roomImage);
  

  // Preserve existing Big Five/userHash/colorsAndMaterials/visualDNA from stored snapshot if incoming data lacks them
  try {
    const existingRaw = safeLocalStorage.getItem(SESSION_STORAGE_KEY);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as SessionData;
      const willPreserveBigFive = !data.bigFive && !!existing.bigFive;
      const willPreservePathType = !data.pathType && !!existing.pathType;
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
      if (willPreservePathType) {
        data = { ...data, pathType: existing.pathType };
        if (isSessionSyncDebugEnabled()) {
          console.log('[session-sync:debug] preserved pathType from localStorage', {
            pathType: existing.pathType,
          });
        }
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
    }
  } catch (e) {
    // ignore parse errors
  }

  const cleanedForStorage = stripInlineBlobs(data);
  const storagePayload: SessionData = {
    ...cleanedForStorage,
    coreProfileComplete: undefined,
    coreProfileCompletedAt: undefined
  };

  const needsSanitization = shouldSanitizeSessionData(data);

  if (!needsSanitization) {
    try {
      const serialized = JSON.stringify(storagePayload);

      if (serialized.length > STORAGE_SIZE_THRESHOLD) {
        console.warn('[useSession] Dane sesji są bardzo duże – stosuję sanitizację przed zapisem.');
        persistSanitizedSessionData(storagePayload);
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

  persistSanitizedSessionData(storagePayload);
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

      // STEP 2: Load from GCP in background (async, can take time)
      let authUserId: string | undefined;

      // If no userHash in localStorage, try to restore it from GCP if user is authenticated
      try {
        const storedGoogleAuthId = safeLocalStorage.getItem('aura_google_auth_user_id');
        authUserId = storedGoogleAuthId ?? undefined;
        if (!userHash && authUserId) {
          const { getUserHashFromAuth } = await import('@/lib/gcp-participant-profile');
          const restoredUserHash = await getUserHashFromAuth(authUserId);
          if (restoredUserHash) {
            userHash = restoredUserHash;
            safeLocalStorage.setItem(USER_HASH_STORAGE_KEY, userHash);
            console.log('[useSession] Restored userHash from GCP:', userHash);
          }
        }
      } catch (error) {
        console.warn('[useSession] Failed to restore userHash from GCP:', error);
      }

      // If authenticated, check if there's an existing profile with data linked to auth_user_id
      // If yes, use that userHash instead of creating a new one
      if (authUserId && userHash) {
        try {
          const { getBestProfileForAuth, getUserHashFromAuth } = await import('@/lib/gcp-participant-profile');
          
          const bestProfile = await getBestProfileForAuth(authUserId);
          if (bestProfile && bestProfile.userHash) {
            if (bestProfile.userHash !== userHash) {
              userHash = bestProfile.userHash;
              safeLocalStorage.setItem(USER_HASH_STORAGE_KEY, userHash);
            }
          } else {
            const existingHash = await getUserHashFromAuth(authUserId);
            if (!existingHash) {
              const linked = await gcpApi.participants.linkAuth({
                userHash,
                authUserId,
              });
              if (!linked.ok) {
                console.warn('[useSession] link-auth failed:', linked.error);
              }
            } else if (existingHash !== userHash) {
              userHash = existingHash;
              safeLocalStorage.setItem(USER_HASH_STORAGE_KEY, userHash);
            }
          }
        } catch (error) {
          console.warn('[useSession] Failed to link userHash to auth_user_id:', error);
        }
      }

      // Use mergedLocalSession from step 1 (already loaded from localStorage)

      // Zawsze pobierz najnowszy snapshot z GCP i połącz z danymi lokalnymi
      let remoteSession: SessionData | null = null;
      if (userHash && !DISABLE_SESSION_SYNC) {
        try {
          remoteSession = await fetchSessionSnapshotFromGcp(userHash);
        } catch (error) {
          console.warn('[useSession] Nie udało się pobrać sesji z GCP.', error);
        }
      }

      let mergedSession: SessionData = {
        ...createEmptySession(),
        ...(remoteSession || {}),
        ...(mergedLocalSession || {}),
        userHash,
      };

      const localCoreProfileComplete = !!mergedLocalSession?.coreProfileComplete;
      const remoteCoreProfileComplete = !!remoteSession?.coreProfileComplete;

      if (remoteCoreProfileComplete && !mergedSession.coreProfileComplete) {
        mergedSession = {
          ...mergedSession,
          coreProfileComplete: true,
          coreProfileCompletedAt:
            remoteSession?.coreProfileCompletedAt ||
            mergedSession.coreProfileCompletedAt ||
            new Date().toISOString()
        };
      }

      if (localCoreProfileComplete && !remoteCoreProfileComplete && userHash && !DISABLE_SESSION_SYNC) {
        const completionTimestamp =
          mergedLocalSession?.coreProfileCompletedAt ||
          mergedSession.coreProfileCompletedAt ||
          new Date().toISOString();
        queueMicrotask(() => {
          void saveSessionToGcp({
            ...mergedSession,
            userHash,
            coreProfileComplete: true,
            coreProfileCompletedAt: completionTimestamp
          });
        });
      }

      // Ensure roomImageEmpty from sessionStorage has priority (most recent)
      // First check the earlier read (sessionRoomImageEmpty), then check again to be sure we have the latest
      const sessionRoomImageEmptyLatest = safeSessionStorage.getItem(ROOM_IMAGE_EMPTY_SESSION_KEY) || sessionRoomImageEmpty;
      if (sessionRoomImageEmptyLatest) {
        mergedSession.roomImageEmpty = sessionRoomImageEmptyLatest;
        
      }

      // Load profile data (Big Five, explicit preferences, biophiliaScore, inspirations) from user_profiles
      if (userHash) {
        try {
          const { getUserProfile } = await import('@/lib/gcp-participant-profile');
          const { mapUserProfileToSessionData } = await import('@/lib/profile-mapper');
          const userProfile = await getUserProfile(userHash);
          
          if (userProfile) {
            // Check if profile has auth_user_id and try to restore userHash if needed
            if (userProfile.auth_user_id && authUserId === userProfile.auth_user_id) {
              try {
                const { getUserHashFromAuth } = await import('@/lib/gcp-participant-profile');
                const restoredUserHash = await getUserHashFromAuth(authUserId);
                if (restoredUserHash && restoredUserHash !== userHash) {
                  userHash = restoredUserHash;
                  safeLocalStorage.setItem(USER_HASH_STORAGE_KEY, userHash);
                  console.log('[useSession] Restored userHash after profile load:', userHash);
                  const correctUserProfile = await getUserProfile(userHash);
                  if (correctUserProfile) {
                    const correctProfileSessionData = mapUserProfileToSessionData(correctUserProfile);
                    mergedSession = {
                      ...mergedSession,
                      ...correctProfileSessionData,
                      userHash,
                    };
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
                
                const result = {
                  id: insp.fileId || `insp_${Date.now()}_${Math.random().toString(36).substring(2)}`,
                  fileId: insp.fileId,
                  url: insp.url,
                  tags: insp.tags, // Tags from Gemini 2.5 Flash-Lite
                  description: insp.description, // Description from Gemini
                  addedAt: insp.addedAt || new Date().toISOString()
                };
                
                
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
                mergedSession = {
                  ...(mergedSession || {}),
                  inspirations: mergeInspirationLists(
                    existingInspirations,
                    inspirationsFromProfile,
                  ),
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

          mergedSession = {
            ...(mergedSession || {}),
            inspirations: mergeInspirationLists(
              effectiveRemoteInspirations,
              localInspirations,
            ),
          };

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
      
      
      if (sessionRoomImageEmptyFinal && (!mergedSession.roomImageEmpty || mergedSession.roomImageEmpty.length < sessionRoomImageEmptyFinal.length)) {
        mergedSession = { ...mergedSession, roomImageEmpty: sessionRoomImageEmptyFinal };
        
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
      

      const persisted = persistSessionData(finalSession);
      

      if (isMounted) {
        setSessionStoreState({ sessionData: persisted, isInitialized: true });
        if (!DISABLE_SESSION_SYNC && userHash) {
          queueMicrotask(() => {
            void saveSessionToGcp(getSessionStoreSnapshot());
          });
        }
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
      
      
      const persisted = persistSessionData(newData);
      
      
      return { ...prev, sessionData: persisted };
    });
    if (!DISABLE_SESSION_SYNC) {
      scheduleDebouncedGcpSave();
    }
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

/** Latest session from the shared store (synchronous). Safe to call right after `updateSession`. */
export function getSessionStoreSnapshot() {
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

/** Debounce rapid session updates into fewer POST /session calls; flush on tab hide / pagehide. */
const GCP_SAVE_DEBOUNCE_MS = 450;
let gcpSaveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let gcpSaveFlushListenersRegistered = false;

function ensureGcpSaveFlushListeners(): void {
  if (typeof window === 'undefined' || gcpSaveFlushListenersRegistered) return;
  gcpSaveFlushListenersRegistered = true;
  const flushPending = () => {
    if (!gcpSaveDebounceTimer) return;
    clearTimeout(gcpSaveDebounceTimer);
    gcpSaveDebounceTimer = null;
    if (isSessionSyncDebugEnabled()) {
      console.log('[session-sync:debug] flush GCP save (pagehide / hidden tab)');
    }
    void saveSessionToGcp(getSessionStoreSnapshot());
  };
  window.addEventListener('pagehide', flushPending);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending();
  });
}

function scheduleDebouncedGcpSave(): void {
  if (typeof window === 'undefined' || DISABLE_SESSION_SYNC) return;
  ensureGcpSaveFlushListeners();
  if (gcpSaveDebounceTimer) clearTimeout(gcpSaveDebounceTimer);
  if (isSessionSyncDebugEnabled()) {
    console.log('[session-sync:debug] debounced GCP save scheduled', {
      ms: GCP_SAVE_DEBOUNCE_MS,
      step: getSessionStoreSnapshot().currentStep,
    });
  }
  gcpSaveDebounceTimer = setTimeout(() => {
    gcpSaveDebounceTimer = null;
    void saveSessionToGcp(getSessionStoreSnapshot());
  }, GCP_SAVE_DEBOUNCE_MS);
}