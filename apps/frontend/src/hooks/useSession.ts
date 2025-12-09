import { useState, useEffect } from 'react';
import { SessionData, FlowStep } from '@/types';
import { fetchLatestSessionSnapshot, supabase, DISABLE_SESSION_SYNC } from '@/lib/supabase';
import { uploadSpaceImage, saveSpaceImagesMetadata } from '@/lib/remote-spaces';

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
  // Base copy with trimmed histories
  const sanitized: SessionData = {
    ...data,
    generations: Array.isArray(data.generations)
      ? data.generations.slice(-MAX_GENERATIONS_HISTORY)
      : [],
  };

  // Always drop heavy blobs from localStorage; they are cached separately (sessionStorage / Supabase)
  sanitized.roomImage = undefined;
  sanitized.uploadedImage = undefined;
  sanitized.selectedImage = null;

  // Trim swipe history
  if (sanitized.tinderData?.swipes && sanitized.tinderData.swipes.length > MAX_TINDER_SWIPES) {
    sanitized.tinderData = {
      ...sanitized.tinderData,
      swipes: sanitized.tinderData.swipes.slice(-MAX_TINDER_SWIPES),
    };
  }

  // Remove generated images (already persisted remotely)
  if (sanitized.generatedImages) {
    sanitized.generatedImages = undefined;
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
  if (!userHash || !Array.isArray(spaces)) return spaces || [];

  const migrated: any[] = [];

  for (const space of spaces) {
    const spaceId = space.id || `space_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const spaceName = space.name || 'Moja Przestrzeń';
    const spaceType = space.type || 'personal';

    // Ensure space exists in Supabase
    try {
      await supabase
        .from('spaces')
        .upsert({
          id: spaceId,
          user_hash: userHash,
          name: spaceName,
          type: spaceType,
          created_at: space.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[useSession] migrate: upsert space failed', e);
    }

    const images = Array.isArray(space.images) ? space.images : [];
    const uploadedMeta: Array<{
      url: string;
      thumbnail_url?: string;
      type: 'generated' | 'inspiration';
      tags?: any;
      is_favorite?: boolean;
      source?: string;
      generation_set_id?: string;
    }> = [];
    const newImages: any[] = [];

    for (const img of images) {
      const imgId = img.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      let finalUrl = img.url;

      if (typeof img.url === 'string' && img.url.startsWith('data:')) {
        const uploaded = await uploadSpaceImage(userHash, spaceId, imgId, img.url);
        if (uploaded?.publicUrl) {
          finalUrl = uploaded.publicUrl;
        }
      }

      uploadedMeta.push({
        url: finalUrl,
        thumbnail_url: img.thumbnailUrl,
        type: img.type || 'generated',
        tags: img.tags,
        is_favorite: img.isFavorite || false
      });

      newImages.push({
        id: imgId,
        url: finalUrl,
        type: img.type || 'generated',
        addedAt: img.addedAt || new Date().toISOString(),
        isFavorite: img.isFavorite || false,
        thumbnailUrl: img.thumbnailUrl,
        tags: img.tags
      });
    }

    if (uploadedMeta.length > 0) {
      await saveSpaceImagesMetadata(userHash, spaceId, uploadedMeta);
    }

    migrated.push({
      ...space,
      id: spaceId,
      name: spaceName,
      type: spaceType,
      images: newImages,
      createdAt: space.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return migrated;
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

  // Usuń inline base64 tam, gdzie mamy już publiczny URL
  const cleaned = stripInlineBlobs(sanitizeSessionDataForStorage(data));

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cleaned));
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
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(withoutSpaces));
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
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(minimal));
      } catch (err) {
        console.error('[useSession] Nie udało się zapisać nawet minimalnych danych sesji – czyszczę.', err);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } else {
      console.error('[useSession] Nie udało się zapisać minimalnych danych sesji.', error);
    }
  }
};

const persistSessionData = (data: SessionData) => {
  if (typeof window === 'undefined') return;

  manageRoomImageCache(data.roomImage);

  const cleanedForStorage = stripInlineBlobs(data);

  const needsSanitization = shouldSanitizeSessionData(data);

  if (!needsSanitization) {
    try {
      const serialized = JSON.stringify(cleanedForStorage);

      if (serialized.length > STORAGE_SIZE_THRESHOLD) {
        console.warn('[useSession] Dane sesji są bardzo duże – stosuję sanitizację przed zapisem.');
        persistSanitizedSessionData(cleanedForStorage);
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

  persistSanitizedSessionData(cleanedForStorage);
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

      let mergedLocalSession: Partial<SessionData> | null = null;
      const savedData = localStorage.getItem(SESSION_STORAGE_KEY);

      if (savedData) {
        try {
          mergedLocalSession = JSON.parse(savedData) as SessionData;
        } catch (error) {
          console.error('Failed to load session data from localStorage:', error);
        }
      }

      const sessionRoomImage = sessionStorage.getItem(ROOM_IMAGE_SESSION_KEY);
      if (sessionRoomImage && (!mergedLocalSession?.roomImage || mergedLocalSession.roomImage.length < sessionRoomImage.length)) {
        mergedLocalSession = { ...(mergedLocalSession || {}), roomImage: sessionRoomImage };
      }

      // Zawsze pobierz najnowszy snapshot z Supabase i połącz z danymi lokalnymi
      let remoteSession: SessionData | null = null;
      if (userHash && !DISABLE_SESSION_SYNC) {
        try {
          remoteSession = await fetchLatestSessionSnapshot(userHash);
        } catch (error) {
          console.warn('[useSession] Nie udało się pobrać sesji z Supabase.', error);
        }
      }

      let mergedSession: SessionData = {
        ...createEmptySession(),
        ...(remoteSession || {}),
        ...(mergedLocalSession || {}),
        userHash,
      };

      // Load inspirations with gamma tags from user_profiles.inspirations
      if (userHash) {
        try {
          const { getUserProfile } = await import('@/lib/supabase-deep-personalization');
          const userProfile = await getUserProfile(userHash);
          if (userProfile?.inspirations && Array.isArray(userProfile.inspirations) && userProfile.inspirations.length > 0) {
            // Convert user_profiles.inspirations format to SessionData.inspirations format
            const inspirationsFromProfile = userProfile.inspirations.map((insp: any) => {
              const result = {
                id: insp.fileId || `insp_${Date.now()}_${Math.random().toString(36).substring(2)}`,
                fileId: insp.fileId,
                url: insp.url,
                tags: insp.tags, // Tags from gamma model (Gemma3VisionModel)
                description: insp.description, // Description from gamma model
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

      // Upewnij się, że najświeższe roomImage z sessionStorage ma priorytet
      if (sessionRoomImage && (!mergedSession.roomImage || mergedSession.roomImage.length < sessionRoomImage.length)) {
        mergedSession = { ...mergedSession, roomImage: sessionRoomImage };
      }

      // Migrate legacy spaces with data URLs to Supabase (one-time per browser)
      const legacyMigratedFlag = localStorage.getItem('aura_spaces_migrated');
      if (hasDataUrlSpaces(mergedSession.spaces) && legacyMigratedFlag !== '1') {
        try {
          const migratedSpaces = await migrateLegacySpacesToSupabase(mergedSession.spaces || [], userHash);
          mergedSession = { ...mergedSession, spaces: migratedSpaces };
          localStorage.setItem('aura_spaces_migrated', '1');
        } catch (e) {
          console.warn('[useSession] Legacy spaces migration failed', e);
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