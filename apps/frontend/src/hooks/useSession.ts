import { useState, useEffect } from 'react';
import { SessionData, FlowStep } from '@/types';
import { fetchLatestSessionSnapshot } from '@/lib/supabase';

const SESSION_STORAGE_KEY = 'aura_session';
const USER_HASH_STORAGE_KEY = 'aura_user_hash';
const ROOM_IMAGE_SESSION_KEY = 'aura_session_room_image';
const STORAGE_SIZE_THRESHOLD = 4_500_000; // ~4,5MB
const MAX_INLINE_DATA_LENGTH = 120_000; // ~120KB
const MAX_GENERATIONS_HISTORY = 120;
const MAX_TINDER_SWIPES = 250;

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
  const sanitized: SessionData = {
    ...data,
    generations: Array.isArray(data.generations)
      ? data.generations.slice(-MAX_GENERATIONS_HISTORY)
      : [],
  };

  if (sanitized.tinderData?.swipes && sanitized.tinderData.swipes.length > MAX_TINDER_SWIPES) {
    sanitized.tinderData = {
      ...sanitized.tinderData,
      swipes: sanitized.tinderData.swipes.slice(-MAX_TINDER_SWIPES),
    };
  }

  if (sanitized.roomImage && isLargeDataUrl(sanitized.roomImage)) {
    sanitized.roomImage = undefined;
  }

  if (sanitized.generatedImages) {
    sanitized.generatedImages = undefined;
  }

  if (sanitized.selectedImage) {
    sanitized.selectedImage = null;
  }

  if (Array.isArray(sanitized.spaces)) {
    sanitized.spaces = sanitized.spaces
      .map(space => ({
        ...space,
        images: Array.isArray(space.images)
          ? space.images
              .filter(image => !isLargeDataUrl(image.url))
              .map(image => ({
                ...image,
                thumbnailUrl:
                  image.thumbnailUrl && isLargeDataUrl(image.thumbnailUrl)
                    ? undefined
                    : image.thumbnailUrl,
              }))
          : [],
      }))
      .filter(space => space.images.length > 0);
  }

  return sanitized;
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

  try {
    if (roomImage) {
      sessionStorage.setItem(ROOM_IMAGE_SESSION_KEY, roomImage);
    } else {
      sessionStorage.removeItem(ROOM_IMAGE_SESSION_KEY);
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn('[useSession] Przekroczono limit sessionStorage podczas zapisu roomImage.');
    } else {
      console.error('[useSession] Nie udało się zarządzać roomImage w sessionStorage.', error);
    }
  }
};

const persistSanitizedSessionData = (data: SessionData) => {
  if (typeof window === 'undefined') return;

  const sanitizedData = sanitizeSessionDataForStorage(data);

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sanitizedData));
    return;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      console.error('[useSession] Nie udało się zapisać danych sesji po sanitizacji.', error);
      return;
    }
    console.warn('[useSession] Dane sesji po sanitizacji nadal przekraczają limit. Usuwam dane obrazów w spaces.');
  }

  const withoutSpaces: SessionData = {
    ...sanitizedData,
    spaces: undefined,
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(withoutSpaces));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.error('[useSession] LocalStorage nadal pełny – czyszczę dane sesji.', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      console.error('[useSession] Nie udało się zapisać minimalnych danych sesji.', error);
    }
  }
};

const persistSessionData = (data: SessionData) => {
  if (typeof window === 'undefined') return;

  manageRoomImageCache(data.roomImage);

  const needsSanitization = shouldSanitizeSessionData(data);

  if (!needsSanitization) {
    try {
      const serialized = JSON.stringify(data);

      if (serialized.length > STORAGE_SIZE_THRESHOLD) {
        console.warn('[useSession] Dane sesji są bardzo duże – stosuję sanitizację przed zapisem.');
        persistSanitizedSessionData(data);
        return;
      }

      localStorage.setItem(SESSION_STORAGE_KEY, serialized);
      return;
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        console.error('[useSession] Nie udało się zapisać danych sesji.', error);
        return;
      }

      console.warn('[useSession] Przekroczono limit localStorage – zapisuję dane odchudzone.');
    }
  }

  persistSanitizedSessionData(data);
};

const createEmptySession = (): SessionData => ({
  userHash: '',
  consentTimestamp: '',
  currentStep: 'landing',
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
  const [sessionData, setSessionData] = useState<SessionData>(createEmptySession());

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      if (typeof window === 'undefined') return;

      // Ensure user hash exists
      let userHash = localStorage.getItem(USER_HASH_STORAGE_KEY);
      if (!userHash) {
        userHash = generateUserHash();
        localStorage.setItem(USER_HASH_STORAGE_KEY, userHash);
      }

      let mergedSession: Partial<SessionData> | null = null;
      const savedData = localStorage.getItem(SESSION_STORAGE_KEY);

      if (savedData) {
        try {
          mergedSession = JSON.parse(savedData) as SessionData;
        } catch (error) {
          console.error('Failed to load session data from localStorage:', error);
        }
      }

      const sessionRoomImage = sessionStorage.getItem(ROOM_IMAGE_SESSION_KEY);
      if (sessionRoomImage && (!mergedSession?.roomImage || mergedSession.roomImage.length < sessionRoomImage.length)) {
        mergedSession = { ...(mergedSession || {}), roomImage: sessionRoomImage };
      }

      if ((!mergedSession || !mergedSession.roomImage) && userHash) {
        try {
          const remoteSession = await fetchLatestSessionSnapshot(userHash);
          if (remoteSession) {
            mergedSession = {
              ...(remoteSession as SessionData),
              ...(mergedSession || {}),
            };
          }
        } catch (error) {
          console.warn('[useSession] Nie udało się pobrać sesji z Supabase.', error);
        }
      }

      // Load inspirations with gamma tags from user_profiles.inspirations
      if (userHash) {
        try {
          const { getUserProfile } = await import('@/lib/supabase-deep-personalization');
          const userProfile = await getUserProfile(userHash);
          if (userProfile?.inspirations && Array.isArray(userProfile.inspirations) && userProfile.inspirations.length > 0) {
            // Convert user_profiles.inspirations format to SessionData.inspirations format
            const inspirationsFromProfile = userProfile.inspirations.map((insp: any) => ({
              id: insp.fileId || `insp_${Date.now()}_${Math.random().toString(36).substring(2)}`,
              fileId: insp.fileId,
              url: insp.url,
              tags: insp.tags, // Tags from gamma model (Gemma3VisionModel)
              description: insp.description, // Description from gamma model
              addedAt: insp.addedAt || new Date().toISOString()
            }));

            // Merge inspirations: prefer Supabase (with gamma tags) over localStorage
            const existingInspirations = mergedSession?.inspirations || [];
            const hasLocalInspirations = existingInspirations.length > 0;
            const hasSupabaseInspirations = inspirationsFromProfile.length > 0;

            if (hasSupabaseInspirations) {
              // Use Supabase inspirations (with gamma tags) if available
              mergedSession = {
                ...(mergedSession || {}),
                inspirations: inspirationsFromProfile
              };
              console.log('[useSession] Loaded inspirations with gamma tags from user_profiles.inspirations:', inspirationsFromProfile.length);
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
        } catch (error) {
          console.warn('[useSession] Nie udało się pobrać inspirations z user_profiles:', error);
        }
      }

      const finalSession: SessionData = {
        ...createEmptySession(),
        ...(mergedSession || {}),
        userHash,
      };

      persistSessionData(finalSession);

      if (isMounted) {
        setSessionData(finalSession);
        setIsInitialized(true);
      }
    };

    void initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateSession = (updates: Partial<SessionData>) => {
    setSessionData(prev => {
      const newData = { ...prev, ...updates };
      persistSessionData(newData);
      return newData;
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

function generateUserHash(): string {
  return 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}