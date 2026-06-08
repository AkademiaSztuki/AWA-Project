"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { getSessionStoreSnapshot } from '@/hooks/useSession';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { safeLocalStorage, safeSessionStorage, saveSessionToGcp } from '@/lib/gcp-data';
import { getUserProfile } from '@/lib/gcp-participant-profile';
import { mapUserProfileToSessionData } from '@/lib/profile-mapper';
import {
  getFullFlowDashboardStepHref,
  resolveCompletedFullFlowStepIndices,
} from '@/lib/flow/full-flow-progress';
import { fetchParticipantImages, fetchParticipantSpaces, createParticipantSpace, toggleParticipantImageFavorite, deleteParticipantImage, updateSpaceName, deleteSpace, updateParticipantImageMetadata } from '@/lib/remote-spaces';
import {
  inferRecentSpaceIdFromImages,
  resolveActiveSpaceId,
  saveSessionWithActiveSpace,
} from '@/lib/current-space-sync';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Plus,
  Heart,
  Sparkles,
  ChevronRight,
  User,
  Eye,
  Pencil,
  Trash2,
  Check,
  X,
  ArrowUp,
} from 'lucide-react';
import Image from 'next/image';
import {
  PreferencesOverviewSection,
  InspirationsPreviewSection,
  GenerationStatsSection,
} from '@/components/dashboard/ProfileSections';
import { CreditBalance } from '@/components/subscription/CreditBalance';
import { AppContentFloatingAnchor } from '@/components/layout/AppContentFloatingAnchor';
import { mergeInspirationLists } from '@/lib/inspiration-merge';
import { DashboardTopPanel } from '@/components/dashboard/DashboardTopPanel';
import { DashboardJourneySteps } from '@/components/dashboard/DashboardJourneySteps';
import type { SessionData } from '@/types';

/** sessionStorage — IDA na dashboardzie: raz na sesję karty (nowa karta = dialog znów). */
const IDA_SESSION_DASHBOARD_IDA_DIALOGUE_SHOWN_KEY = 'awa_session_dashboard_ida_dialogue_shown';
const DASHBOARD_RETURN_SCROLL_Y_KEY = 'awa_dashboard_return_scroll_y';
const DASHBOARD_LOAD_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

interface Space {
  id: string;
  name: string;
  type: string;
  images: SpaceImage[];
  createdAt: string;
  updatedAt: string;
}

interface SpaceImage {
  id: string;
  url: string;
  type: 'generated' | 'inspiration';
  addedAt: string;
  isFavorite?: boolean;
  thumbnailUrl?: string;
  tags?: string[];
}

function sortImagesDescending(images: SpaceImage[]): SpaceImage[] {
  return [...(images || [])].sort((a, b) => {
    const ta = new Date(a.addedAt || 0).getTime();
    const tb = new Date(b.addedAt || 0).getTime();
    return tb - ta;
  });
}

function spacesListSignature(spaces: Space[]): string {
  return JSON.stringify(
    spaces.map((s) => ({
      id: s.id,
      name: s.name,
      images: (s.images || []).map((i) => `${i.id}:${i.type}:${i.isFavorite ? 1 : 0}`).sort(),
    })),
  );
}

function profilePatchSignature(patch: Partial<SessionData>): string {
  return JSON.stringify({
    bigFive: patch.bigFive?.scores?.domains ?? null,
    visualDNA: patch.visualDNA?.dominantStyle ?? null,
    colorsAndMaterials: patch.colorsAndMaterials
      ? {
          style: (patch.colorsAndMaterials as { selectedStyle?: string }).selectedStyle,
          palette: (patch.colorsAndMaterials as { selectedPalette?: string }).selectedPalette,
        }
      : null,
    sensoryPreferences: patch.sensoryPreferences ?? null,
    biophiliaScore: patch.biophiliaScore ?? null,
  });
}

function sessionProfileSignature(session: SessionData | Record<string, unknown>): string {
  const s = session as SessionData;
  return profilePatchSignature({
    bigFive: s.bigFive,
    visualDNA: s.visualDNA,
    colorsAndMaterials: s.colorsAndMaterials,
    sensoryPreferences: s.sensoryPreferences,
    biophiliaScore: s.biophiliaScore,
  });
}

/**
 * UserDashboard - Main control panel for image spaces
 * 
 * Shows:
 * - User's spaces (simplified from households)
 * - Generated images in each space
 * - Inspiration images in each space
 * - Quick actions
 */
export function UserDashboard() {
  const router = useRouter();
  const { sessionData, updateSessionData, isInitialized } = useSessionData();
  const { language } = useLanguage();
  const { user, linkUserHashToAuth, isLoading: authLoading } = useAuth();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    // Only pin funnel step for signed-in users; guests are redirected out of dashboard.
    if (!user) return;
    if (sessionData.currentStep === 'dashboard') return;
    void updateSessionData({ currentStep: 'dashboard' });
  }, [isInitialized, user, sessionData.currentStep, updateSessionData]);

  useEffect(() => {
    const updateBackToTopVisibility = () => {
      setShowBackToTop(window.scrollY > 420);
    };

    updateBackToTopVisibility();
    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateBackToTopVisibility);
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('restoreScroll') !== '1') return;

    const savedScrollY = Number(safeSessionStorage.getItem(DASHBOARD_RETURN_SCROLL_Y_KEY));
    url.searchParams.delete('restoreScroll');
    window.history.replaceState({}, '', url.toString());

    if (!Number.isFinite(savedScrollY) || savedScrollY <= 0) return;

    let attempts = 0;
    const restoreScroll = () => {
      attempts += 1;
      window.scrollTo({ top: savedScrollY, behavior: attempts === 1 ? 'smooth' : 'auto' });

      if (attempts < 30 && Math.abs(window.scrollY - savedScrollY) > 16) {
        window.setTimeout(restoreScroll, 150);
      } else {
        safeSessionStorage.removeItem(DASHBOARD_RETURN_SCROLL_Y_KEY);
      }
    };

    window.setTimeout(restoreScroll, 150);
  }, []);

  /** Guests never use dashboard — send them back to funnel (or resume matrix after login). */
  useEffect(() => {
    if (authLoading || !isInitialized) return;
    if (user) return;
    const pending = (sessionData as { matrixAnonPending?: unknown[] })?.matrixAnonPending;
    if (Array.isArray(pending) && pending.length > 0) {
      router.replace('/flow/generate');
      return;
    }
    router.replace('/flow/path-selection');
  }, [authLoading, user, isInitialized, sessionData, router]);
  
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);
  const profileHydratedForHashRef = useRef<string | null>(null);
  const spacesLoadedForHashRef = useRef<string | null>(null);
  const authLinkedForHashRef = useRef<string | null>(null);
  const preferenceComparisonPersistedRef = useRef<string | null>(null);
  const updateSessionDataRef = useRef(updateSessionData);
  const sessionFallbackRef = useRef<{
    roomName?: string;
    roomType?: string;
    spaces?: Space[];
  }>({});

  updateSessionDataRef.current = updateSessionData;
  const [actionSpaceId, setActionSpaceId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  /** Kredyty opierają się na localStorage — bez tego SSR nie ma userHash, a klient tak → błąd hydratacji. */
  const [creditsSectionMounted, setCreditsSectionMounted] = useState(false);
  useEffect(() => {
    setCreditsSectionMounted(true);
  }, []);

  const [showDashboardIdaDialogue, setShowDashboardIdaDialogue] = useState<boolean | null>(null);
  useEffect(() => {
    setShowDashboardIdaDialogue(
      safeSessionStorage.getItem(IDA_SESSION_DASHBOARD_IDA_DIALOGUE_SHOWN_KEY) !== '1'
    );
  }, []);

  const markDashboardIdaDialogueShown = useCallback(() => {
    safeSessionStorage.setItem(IDA_SESSION_DASHBOARD_IDA_DIALOGUE_SHOWN_KEY, '1');
    setShowDashboardIdaDialogue(false);
  }, []);

  // Blokada dashboardu po core profile została wyłączona – dashboard jest dostępny
  // dla każdego zalogowanego użytkownika, nawet jeśli profil nie jest w 100% kompletny.

  const getUserHash = useCallback((): string | undefined => {
    // After login, localStorage is updated before session store — prefer it when authenticated.
    if (user) {
      const stored =
        safeLocalStorage.getItem('aura_user_hash') ||
        safeSessionStorage.getItem('aura_user_hash');
      if (stored) return stored;
    }

    const sessionHash = sessionData?.userHash as string | undefined;
    if (sessionHash) return sessionHash;

    return (
      safeLocalStorage.getItem('aura_user_hash') ||
      safeSessionStorage.getItem('aura_user_hash') ||
      undefined
    );
  }, [sessionData?.userHash, user]);

  const sortSpacesDescending = useCallback((list: Space[]): Space[] => {
    return [...(list || [])].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, []);

  useEffect(() => {
    sessionFallbackRef.current = {
      roomName: (sessionData as any)?.roomName,
      roomType: (sessionData as any)?.roomType,
      spaces: (sessionData as any)?.spaces,
    };
  }, [sessionData]);
  
  const extractUrl = useCallback((item: any): string | null => {
    if (!item) return null;
    if (typeof item === 'string') {
      return item.startsWith('data:') ? item : `data:image/png;base64,${item}`;
    }
    if (item.url) return item.url;
    if (item.imageBase64) return item.imageBase64;
    if (item.image) return item.image;
    if (item.base64) return item.base64.startsWith('data:') ? item.base64 : `data:image/png;base64,${item.base64}`;
    if (item.previewUrl) return item.previewUrl;
    if (item.thumbnailUrl) return item.thumbnailUrl;
    return null;
  }, []);

  const allGeneratedImages = useMemo(() => {
    const generatedFromSpaces = spaces.flatMap(space =>
      sortImagesDescending(space.images || [])
        .filter(img => img.type === 'generated')
        .map(img => ({ ...img }))
    );

    const seen = new Set<string>();
    return generatedFromSpaces
      .filter((img: any) => {
      const url = extractUrl(img);
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
      })
      .sort((a, b) => {
        const ta = new Date((a as any).addedAt || 0).getTime();
        const tb = new Date((b as any).addedAt || 0).getTime();
        return tb - ta;
      });
  }, [spaces, extractUrl]);

  const primarySpaceId = useMemo(() => {
    const sid = (sessionData as any)?.currentSpaceId as string | undefined;
    if (sid && spaces.some((s) => s.id === sid)) return sid;
    return spaces[0]?.id;
  }, [sessionData, spaces]);

  const dashboardStats = useMemo(() => {
    const typedSession = sessionData as any;
    const roomCount = typedSession?.roomType ? 1 : 0;
    const spacesCount = Math.max(spaces.length, roomCount);
    const generatedFromSpaces = spaces.reduce(
      (sum, s) => sum + (s.images?.filter((img) => img.type === 'generated').length || 0),
      0,
    );
    const generatedFromSession = spaces.length === 0 ? typedSession?.generatedImages?.length || 0 : 0;
    const generatedCount = generatedFromSpaces > 0 ? generatedFromSpaces : generatedFromSession;
    const inspirationsFromSpaces = spaces.reduce(
      (sum, s) => sum + (s.images?.filter((img) => img.type === 'inspiration').length || 0),
      0,
    );
    const inspirationsFromSession = typedSession?.inspirations?.length || 0;
    const inspirationsCount = Math.max(inspirationsFromSpaces, inspirationsFromSession);
    return { spacesCount, generatedCount, inspirationsCount };
  }, [spaces, sessionData]);

  const completedJourneyStepIndices = useMemo(() => {
    return resolveCompletedFullFlowStepIndices({
      sessionData,
      spaces,
      spacesCount: dashboardStats.spacesCount,
      generatedCount: dashboardStats.generatedCount,
      inspirationsCount: dashboardStats.inspirationsCount,
      hasUserHash: !!(sessionData?.userHash || getUserHash()),
    });
  }, [dashboardStats, getUserHash, sessionData, spaces]);

  const handleToggleFavorite = useCallback(async (imageId?: string, imageUrl?: string) => {
    if (!imageUrl && !imageId) return;
    const userHash = (sessionData as any)?.userHash;
    // Optimistic update
    const updatedSpaces = spaces.map(space => ({
      ...space,
      images: (space.images || []).map(img =>
        (img.id === imageId || img.url === imageUrl)
          ? { ...img, isFavorite: !img.isFavorite }
          : img
      )
    }));
    setSpaces(updatedSpaces);
    updateSessionData({ spaces: updatedSpaces } as any);

    if (userHash && imageId) {
      await toggleParticipantImageFavorite(userHash, imageId, !!updatedSpaces.flatMap(s => s.images).find(i => i.id === imageId)?.isFavorite);
    }
  }, [spaces, sessionData, updateSessionData]);

  const handleDeleteGeneratedImage = async (imageId: string) => {
    const userHash = getUserHash();
    const isUuid = (str: string | undefined): boolean =>
      !!str &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(str);

    if (!userHash || !isUuid(imageId)) return;

    try {
      await deleteParticipantImage(userHash, imageId);
      await loadUserData({ force: true });
    } catch (error) {
      console.error('[Dashboard] Failed to delete generated image:', error);
    }
  };
  

  const applySessionOrLocalSpacesFallback = useCallback((): boolean => {
    const sessionSpaces = sessionFallbackRef.current.spaces;
    if (sessionSpaces && sessionSpaces.length > 0) {
      setSpaces(sortSpacesDescending(sessionSpaces));
      return true;
    }
    const localSessionData = safeLocalStorage.getItem('aura_session');
    if (localSessionData) {
      try {
        const parsed = JSON.parse(localSessionData);
        if (parsed.spaces && parsed.spaces.length > 0) {
          setSpaces(sortSpacesDescending(parsed.spaces));
          return true;
        }
      } catch {
        /* ignore */
      }
    }
    setSpaces([]);
    return false;
  }, [sortSpacesDescending]);

  const persistPreferenceComparisonToGcp = useCallback(async (userHash: string) => {
    if (!user || preferenceComparisonPersistedRef.current === userHash) return;
    const snap = getSessionStoreSnapshot();
    if (!Array.isArray(snap.spaces) || snap.spaces.length === 0) return;
    try {
      const ok = await saveSessionWithActiveSpace();
      if (ok) {
        preferenceComparisonPersistedRef.current = userHash;
      }
    } catch (e) {
      console.warn('[Dashboard] saveSessionWithActiveSpace (preference comparison) failed:', e);
    }
  }, [user]);

  const hydrateProfileFromGcp = useCallback(async (userHash: string, isStale: () => boolean) => {
    if (profileHydratedForHashRef.current === userHash) {
      void persistPreferenceComparisonToGcp(userHash);
      return;
    }

    try {
      const userProfile = await withTimeout(
        getUserProfile(userHash),
        DASHBOARD_LOAD_TIMEOUT_MS,
        'getUserProfile',
      );
      if (isStale() || !userProfile) return;

      const mappedData = mapUserProfileToSessionData(userProfile);
      if (Object.keys(mappedData).length === 0) {
        profileHydratedForHashRef.current = userHash;
        void persistPreferenceComparisonToGcp(userHash);
        return;
      }

      const nextSig = profilePatchSignature(mappedData);
      const currentSig = sessionProfileSignature(getSessionStoreSnapshot());
      if (nextSig !== currentSig) {
        updateSessionDataRef.current(mappedData);
      }
      profileHydratedForHashRef.current = userHash;
      void persistPreferenceComparisonToGcp(userHash);
    } catch (e) {
      console.warn('[Dashboard] Failed to load user profile:', e);
    }
  }, [persistPreferenceComparisonToGcp]);

  const loadUserData = useCallback(async (options?: { force?: boolean }) => {
    const loadId = ++loadGenerationRef.current;
    const isStale = () => loadId !== loadGenerationRef.current;
    const force = options?.force === true;

    setIsLoading(true);
    setLoadError(null);

    try {
      const userHash = getUserHash() || '';

      if (!userHash) {
        if (!isStale()) setSpaces([]);
        return;
      }

      if (user && userHash && authLinkedForHashRef.current !== userHash) {
        authLinkedForHashRef.current = userHash;
        void linkUserHashToAuth(userHash).catch((e) => {
          console.warn('[Dashboard] Failed to link user_hash to auth:', e);
          authLinkedForHashRef.current = null;
        });
      }

      void hydrateProfileFromGcp(userHash, isStale);
      void persistPreferenceComparisonToGcp(userHash);

      if (!force && spacesLoadedForHashRef.current === userHash) {
        return;
      }
      if (force) {
        spacesLoadedForHashRef.current = null;
      }

      try {
        const [participantSpaces, participantImages] = await withTimeout(
          Promise.all([fetchParticipantSpaces(userHash), fetchParticipantImages(userHash)]),
          DASHBOARD_LOAD_TIMEOUT_MS,
          'fetchParticipantSpaces/images',
        );

        if (isStale()) return;

        const fallbackName = sessionFallbackRef.current.roomName || 'Moja Przestrzeń';
        const fallbackType = sessionFallbackRef.current.roomType || 'personal';

        let spacesSource = participantSpaces;
        if (!spacesSource || spacesSource.length === 0) {
          const created = await withTimeout(
            createParticipantSpace(userHash, {
              name: fallbackName,
              type: fallbackType,
              is_default: true,
            }),
            DASHBOARD_LOAD_TIMEOUT_MS,
            'createParticipantSpace',
          );
          if (isStale()) return;
          if (created?.id) {
            spacesSource = [
              {
                id: created.id,
                name: fallbackName,
                type: fallbackType,
                isDefault: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ];
          }
        }

        const defaultId =
          (spacesSource || []).find((s) => s.isDefault)?.id ||
          (spacesSource || [])[0]?.id ||
          null;

        const knownSpaceIds = new Set((spacesSource || []).map((s) => s.id));
        const bySpaceId = new Map<string, SpaceImage[]>();
        for (const img of participantImages || []) {
          if (img.type !== 'generated' && img.type !== 'inspiration') continue;
          const rawSid = (img as { spaceId?: string | null }).spaceId;
          let sid: string | null =
            rawSid && knownSpaceIds.has(rawSid) ? rawSid : null;
          if (!sid && !rawSid && defaultId && (spacesSource || []).length === 1) {
            sid = defaultId;
          }
          if (!sid) continue;
          if (!bySpaceId.has(sid)) bySpaceId.set(sid, []);
          bySpaceId.get(sid)!.push({
            id: img.id,
            url: img.url,
            type: img.type === 'generated' ? 'generated' : 'inspiration',
            addedAt: img.createdAt,
            isFavorite: img.isFavorite,
            thumbnailUrl: img.thumbnailUrl,
            tags: img.tags
              ? (Object.values(img.tags).flat().filter((t): t is string => typeof t === 'string'))
              : [],
          });
        }

        const mappedSpaces: Space[] = (spacesSource || []).map((s) => {
          const imgs = sortImagesDescending(bySpaceId.get(s.id) || []);
          return {
            id: s.id,
            name: s.name,
            type: s.type || 'personal',
            images: imgs,
            createdAt: imgs.length > 0 ? imgs[imgs.length - 1].addedAt : s.createdAt,
            updatedAt: imgs.length > 0 ? imgs[0].addedAt : s.updatedAt,
          };
        });

        const displaySpaces = sortSpacesDescending(mappedSpaces);
        setSpaces(displaySpaces);
        spacesLoadedForHashRef.current = userHash;

        const recentSpaceId = inferRecentSpaceIdFromImages(
          displaySpaces,
          (participantImages || []).map((img) => ({
            spaceId: (img as { spaceId?: string | null }).spaceId,
            createdAt: img.createdAt,
          })),
        );
        const activeSpaceId = resolveActiveSpaceId(
          displaySpaces,
          getSessionStoreSnapshot().currentSpaceId,
          recentSpaceId ? [recentSpaceId] : undefined,
        );

        const nextSpacesSig = spacesListSignature(displaySpaces);
        const currentSpacesSig = spacesListSignature(sessionFallbackRef.current.spaces || []);
        const sessionPatch: Partial<SessionData> = { spaces: displaySpaces };
        if (activeSpaceId) {
          sessionPatch.currentSpaceId = activeSpaceId;
        }
        if (
          nextSpacesSig !== currentSpacesSig ||
          activeSpaceId !== getSessionStoreSnapshot().currentSpaceId
        ) {
          updateSessionDataRef.current(sessionPatch);
        }

        try {
          await saveSessionWithActiveSpace(sessionPatch);
        } catch (e) {
          console.warn('[Dashboard] saveSessionWithActiveSpace after spaces load failed:', e);
        }

        const emptySpaces = mappedSpaces.filter((space) => {
          const sourceSpace = spacesSource.find((s) => s.id === space.id);
          return space.images.length === 0 && !sourceSpace?.isDefault;
        });
        if (emptySpaces.length > 0) {
          void (async () => {
            for (const emptySpace of emptySpaces) {
              try {
                await deleteSpace(userHash, emptySpace.id);
              } catch (e) {
                console.warn(`[Dashboard] Failed to delete empty space ${emptySpace.id}:`, e);
              }
            }
            if (isStale()) return;
            const pruned = displaySpaces.filter((space) => {
              const sourceSpace = spacesSource.find((s) => s.id === space.id);
              return space.images.length > 0 || sourceSpace?.isDefault;
            });
            if (pruned.length !== displaySpaces.length) {
              setSpaces(pruned);
              const prunedSig = spacesListSignature(pruned);
              if (prunedSig !== spacesListSignature(sessionFallbackRef.current.spaces || [])) {
                updateSessionDataRef.current({ spaces: pruned } as Partial<SessionData>);
              }
            }
          })();
        }
        return;
      } catch (e) {
        console.warn('[Dashboard] fetch participant_spaces/images failed, fallback to local/session', e);
        if (!isStale()) {
          setLoadError(
            e instanceof Error ? e.message : 'Nie udało się załadować pomieszczeń z serwera',
          );
          applySessionOrLocalSpacesFallback();
        }
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load user data:', error);
      if (!isStale()) {
        setLoadError(error instanceof Error ? error.message : 'Błąd ładowania dashboardu');
        applySessionOrLocalSpacesFallback();
      }
    } finally {
      if (!isStale()) setIsLoading(false);
    }
  }, [
    applySessionOrLocalSpacesFallback,
    getUserHash,
    hydrateProfileFromGcp,
    linkUserHashToAuth,
    persistPreferenceComparisonToGcp,
    sortSpacesDescending,
    user,
  ]);

  const loadUserDataRef = useRef(loadUserData);
  loadUserDataRef.current = loadUserData;

  const resolvedUserHash =
    sessionData?.userHash ||
    (user
      ? safeLocalStorage.getItem('aura_user_hash') || safeSessionStorage.getItem('aura_user_hash')
      : undefined) ||
    undefined;

  useEffect(() => {
    if (authLoading || !isInitialized || !user || !resolvedUserHash) return;
    void loadUserDataRef.current();
  }, [authLoading, isInitialized, user?.id, resolvedUserHash]);

  useEffect(() => {
    if (!isLoading) return;
    const safetyTimer = window.setTimeout(() => {
      console.warn('[Dashboard] Load safety timeout — clearing spinner');
      setIsLoading(false);
      setLoadError((prev) => prev ?? 'Ładowanie trwa zbyt długo — spróbuj odświeżyć stronę');
      applySessionOrLocalSpacesFallback();
    }, DASHBOARD_LOAD_TIMEOUT_MS + 2_000);
    return () => window.clearTimeout(safetyTimer);
  }, [isLoading, applySessionOrLocalSpacesFallback]);

  const handleAddSpace = async () => {
    try {
      // Ensure we have a user hash
      const userHash = getUserHash();

      if (!userHash) {
        console.error('[Dashboard] No user hash found for adding space');
        router.push('/'); // fallback
        return;
      }

      const newSpaceName = `Przestrzeń ${spaces.length + 1}`;
      const created = await createParticipantSpace(userHash, { name: newSpaceName, type: (sessionData as any)?.roomType || 'personal' });
      const newSpaceId = created?.id;
      if (!newSpaceId) return;

      const newSpace: Space = {
        id: newSpaceId,
        name: newSpaceName,
        type: (sessionData as any)?.roomType || 'personal',
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedSpaces = sortSpacesDescending([newSpace, ...spaces]);
      setSpaces(updatedSpaces);
      const sessionPatch = { spaces: updatedSpaces, currentSpaceId: newSpaceId } as Partial<SessionData>;
      updateSessionData(sessionPatch);
      try {
        await saveSessionWithActiveSpace(sessionPatch);
      } catch (e) {
        console.warn('[Dashboard] saveSessionWithActiveSpace after add space failed:', e);
      }

      router.push(`/setup/room/${newSpaceId}`);
    } catch (error) {
      console.error('[Dashboard] Error in handleAddSpace:', error);
    }
  };

  const handleRenameSpace = useCallback(async (spaceId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const userHash = getUserHash();
    if (!userHash) {
      console.error('[Dashboard] No user hash found for renaming space');
      return;
    }

    setActionSpaceId(spaceId);
    try {
      const updated = await updateSpaceName(userHash, spaceId, trimmed);
      const updatedSpaces = sortSpacesDescending(spaces.map(space =>
        space.id === spaceId
          ? { ...space, name: trimmed, updatedAt: (updated as any)?.updated_at || space.updatedAt }
          : space)
      );
      setSpaces(updatedSpaces);
      updateSessionData({ spaces: updatedSpaces } as any);
    } catch (error) {
      console.error('[Dashboard] Error in handleRenameSpace:', error);
    } finally {
      setActionSpaceId(null);
    }
  }, [getUserHash, spaces, updateSessionData]);

  const handleDeleteSpace = useCallback(async (spaceId: string) => {
    const userHash = getUserHash();
    if (!userHash) {
      console.error('[Dashboard] No user hash found for deleting space');
      return;
    }

    setActionSpaceId(spaceId);
    try {
      // Delete all images currently shown in this space (by id), even if their participant_images.space_id is NULL.
      // Otherwise they would "migrate" to another space due to fallback grouping logic.
      const targetSpace = spaces.find(s => s.id === spaceId);
      const candidateImageIds = (targetSpace?.images || [])
        .map((img: any) => img?.id)
        .filter((id: any) => typeof id === 'string');

      const isUuid = (str: string | undefined): boolean =>
        !!str && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(str);

      const imageIdsToDelete = candidateImageIds.filter((id: string) => isUuid(id));

      for (const imageId of imageIdsToDelete) {
        try {
          await deleteParticipantImage(userHash, imageId);
        } catch (e) {
          console.warn('[Dashboard] Failed to delete image while deleting space', { spaceId, imageId, e });
        }
      }

      const removed = await deleteSpace(userHash, spaceId);
      if (removed) {
        const updatedSpaces = sortSpacesDescending(spaces.filter(space => space.id !== spaceId));
        setSpaces(updatedSpaces);
        const sessionUpdate: Partial<SessionData> = { spaces: updatedSpaces };
        if ((sessionData as any)?.currentSpaceId === spaceId) {
          sessionUpdate.currentSpaceId = resolveActiveSpaceId(updatedSpaces);
        }
        updateSessionData(sessionUpdate);
        try {
          await saveSessionWithActiveSpace(sessionUpdate);
        } catch (e) {
          console.warn('[Dashboard] saveSessionWithActiveSpace after delete space failed:', e);
        }
      }
    } catch (error) {
      console.error('[Dashboard] Error in handleDeleteSpace:', error);
    } finally {
      setActionSpaceId(null);
    }
  }, [getUserHash, sessionData, spaces, updateSessionData]);

  const requestDeleteSpace = useCallback((spaceId: string, spaceName: string) => {
    setPendingDelete({ id: spaceId, name: spaceName });
  }, []);

  const confirmDeleteSpace = useCallback(async () => {
    if (!pendingDelete) return;
    await handleDeleteSpace(pendingDelete.id);
    setPendingDelete(null);
  }, [handleDeleteSpace, pendingDelete]);

  const cancelDeleteSpace = useCallback(() => {
    setPendingDelete(null);
  }, []);

  const saveDashboardReturnPosition = useCallback(() => {
    safeSessionStorage.setItem(DASHBOARD_RETURN_SCROLL_Y_KEY, String(window.scrollY));
  }, []);

  const handleOpenSpace = (spaceId: string) => {
    saveDashboardReturnPosition();
    router.push(`/space/${spaceId}`);
  };

  const handleDeleteInspiration = async (inspiration: any) => {
    const id = inspiration?.id;
    const url = inspiration?.url || inspiration?.imageBase64 || inspiration?._imageUrl;
    const userHash = getUserHash();
    
    // Check if ID is a valid UUID (Supabase format)
    const isUuid = (str: string | undefined): boolean => {
      if (!str) return false;
      return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(str);
    };
    
    // Optimistic update - remove from local state immediately
    const currentInspirations = (sessionData as any)?.inspirations || [];
    const filteredInspirations = currentInspirations.filter((insp: any) => {
      const matchId = id && insp.id === id;
      const matchUrl = url && (insp.url === url || insp.imageBase64 === url || insp._imageUrl === url);
      return !(matchId || matchUrl);
    });

    const currentSpaces = (sessionData as any)?.spaces || [];
    const updatedSpaces = currentSpaces.map((space: any) => ({
      ...space,
      images: (space.images || []).filter((img: any) => {
        if (img.type !== 'inspiration') return true;
        const matchId = id && img.id === id;
        const matchUrl = url && (img.url === url || img.thumbnailUrl === url);
        return !(matchId || matchUrl);
      })
    }));

    // Update local state immediately
    updateSessionData({ inspirations: filteredInspirations, spaces: updatedSpaces } as any);
    setSpaces(updatedSpaces);

    // Delete from Supabase if we have a valid UUID and userHash
    let deletedFromSupabase = false;
    if (userHash) {
      let imageIdToDelete: string | null = null;
      
      // First, try to use the provided ID if it's a valid UUID
      if (id && isUuid(id)) {
        imageIdToDelete = id;
      } else {
        // If no valid UUID, search for the image in spaces by URL
        // Search in currentSpaces (before filtering) to find the original UUID
        for (const space of currentSpaces) {
          const imageToDelete = (space.images || []).find((img: any) => {
            if (img.type !== 'inspiration') return false;
            // Match by URL or by ID (even if not UUID)
            const urlMatch = url && (img.url === url || img.thumbnailUrl === url);
            const idMatch = id && img.id === id;
            return urlMatch || idMatch;
          });
          
          if (imageToDelete?.id && isUuid(imageToDelete.id)) {
            imageIdToDelete = imageToDelete.id;
            break;
          }
        }
      }
      
      // Delete from space_images table if we found a valid UUID
      if (imageIdToDelete) {
        try {
          deletedFromSupabase = await deleteParticipantImage(userHash, imageIdToDelete);
          if (deletedFromSupabase) {
            console.log('[Dashboard] Successfully deleted inspiration from space_images:', imageIdToDelete);
          } else {
            console.warn('[Dashboard] Failed to delete inspiration from space_images, but local state updated');
          }
        } catch (error) {
          console.error('[Dashboard] Error deleting inspiration from space_images:', error);
        }
      } else {
        console.log('[Dashboard] Inspiration deleted locally (no Supabase UUID found in space_images)');
      }

      // NOTE: After radical refactor inspirations are persisted only in participant_images.
    }

    // Reload via the normal dashboard source-of-truth path to avoid corrupting space grouping.
    if (userHash) {
      try {
        await loadUserData({ force: true });
      } catch (error) {
        console.warn('[Dashboard] Failed to reload data after deletion:', error);
      }
    }
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('auth') === 'error') {
      setAuthError(decodeURIComponent(url.searchParams.get('msg') || ''));
      url.searchParams.delete('auth');
      url.searchParams.delete('msg');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Guests: avoid flashing the full dashboard while redirect runs
  if (!authLoading && !user && isInitialized) {
    return (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        <p className="text-graphite font-modern text-sm">
          {language === 'pl' ? 'Przekierowanie…' : 'Redirecting…'}
        </p>
      </div>
    );
  }

  return (
    <div id="dashboard-top" className="flex flex-col w-full relative scroll-mt-24">
      {authError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xl p-3 rounded-lg glass-panel border border-gold/30">
          <p className="text-sm text-graphite font-modern text-center">
            {language === 'pl' ? 'Błąd logowania: ' : 'Sign-in error: '}
            {authError}
          </p>
        </div>
      )}
      
      {/* Dialog IDA — raz na sesję karty (sessionStorage) */}
      {showDashboardIdaDialogue === true && (
        <div className="w-full">
          <AwaDialogue
            currentStep="dashboard"
            fullWidth={true}
            autoHide={true}
            onDialogueEnd={markDashboardIdaDialogueShown}
          />
        </div>
      )}

      <div className="flex-1 p-4 lg:p-8 pb-32">
        <div className="mx-auto max-w-3xl lg:max-w-none">
          <DashboardTopPanel
            language={language}
            onAddSpace={handleAddSpace}
            spacesCount={dashboardStats.spacesCount}
            generatedCount={dashboardStats.generatedCount}
            inspirationsCount={dashboardStats.inspirationsCount}
            creditsSlot={(() => {
              try {
                if (!creditsSectionMounted) return null;
                const userHash = getUserHash();
                if (!userHash || !user) return null;
                return <CreditBalance userHash={userHash} embedded />;
              } catch (error) {
                console.error('Error rendering credits/subscription:', error);
                return null;
              }
            })()}
          />

          <DashboardJourneySteps
            primarySpaceId={primarySpaceId}
            completedStepIndices={completedJourneyStepIndices}
            onNeedSpace={handleAddSpace}
          />

          <BigFiveResults userHash={getUserHash()} />

          <PreferencesOverviewSection
            sessionData={sessionData}
            visualDNA={(sessionData as any)?.visualDNA}
            onRetakeImplicit={() => router.push(getFullFlowDashboardStepHref(2))}
            onRetakeExplicit={() => router.push(getFullFlowDashboardStepHref(4))}
          />

          {/* Room Analysis - disabled; copy surfaced in dialogue */}
          {/* <RoomAnalysisSection 
            roomAnalysis={(sessionData as any)?.roomAnalysis}
            roomImage={(sessionData as any)?.roomImage}
          /> */}

          <section id="dashboard-inspirations" className="scroll-mt-24">
            <InspirationsPreviewSection
              inspirations={(() => {
                const typedSession = sessionData as any;
                if (typedSession?.inspirations && typedSession.inspirations.length > 0) {
                  return mergeInspirationLists(typedSession.inspirations, []);
                }
                const inspirationImages = spaces
                  .flatMap((space) => space.images || [])
                  .filter((img) => img.type === 'inspiration')
                  .map((img) => ({
                    id: img.id,
                    url: img.url,
                    imageBase64: img.url,
                    tags: img.tags || {},
                    description: undefined,
                    addedAt: img.addedAt,
                  }));
                return mergeInspirationLists(inspirationImages, []);
              })()}
              explicitBiophilia={
                (sessionData as any)?.roomPreferences?.biophiliaScore ??
                (sessionData as any)?.biophiliaScore
              }
              onViewAll={() => {
                const sessSpaces = (sessionData as any)?.spaces || [];
                if (sessSpaces.length > 0) {
                  saveDashboardReturnPosition();
                  router.push(`/space/${sessSpaces[0].id}?filter=inspiration`);
                }
              }}
              onAddInspirations={() => router.push('/flow/inspirations?from=dashboard')}
              onDeleteInspiration={handleDeleteInspiration}
            />
          </section>

          <section id="dashboard-generated-images" className={`scroll-mt-24${!user ? ' opacity-60' : ''}`}>
            <GenerationStatsSection
              generations={(sessionData as any)?.generations || []}
              generatedImages={allGeneratedImages}
              onToggleFavorite={(imageId, imageUrl) => handleToggleFavorite(imageId, imageUrl)}
              onDeleteGeneratedImage={handleDeleteGeneratedImage}
            />
          </section>

          <section id="dashboard-rooms" className="scroll-mt-24">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mb-4 mt-10"
            >
              <h2 className="font-nasalization text-xl text-graphite sm:text-2xl">
                {language === 'pl' ? 'Twoje pomieszczenia' : 'Your rooms'}
              </h2>
              <p className="mt-1 font-modern text-sm text-silver-dark">
                {language === 'pl'
                  ? 'Twoje pomieszczenia w jednym miejscu — kliknij kartę i zajrzyj do środka.'
                  : 'Your spaces, all in one place—tap a card to step inside.'}
              </p>
            </motion.div>

            {isLoading ? (
              <div className="py-12 text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent" />
                <p className="mt-4 font-modern text-silver-dark">
                  {language === 'pl' ? 'Ładowanie...' : 'Loading...'}
                </p>
              </div>
            ) : loadError && spaces.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-modern text-sm text-graphite">{loadError}</p>
                <GlassButton
                  type="button"
                  className="mt-4"
                  onClick={() => void loadUserData({ force: true })}
                >
                  {language === 'pl' ? 'Spróbuj ponownie' : 'Try again'}
                </GlassButton>
              </div>
            ) : spaces.length === 0 ? (
              <EmptyState onAddSpace={handleAddSpace} />
            ) : (
              <div className="space-y-6">
                {spaces.map((space, index) => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    index={index}
                    onOpenSpace={() => handleOpenSpace(space.id)}
                    onRenameSpace={handleRenameSpace}
                    onDeleteSpace={(id, name) => requestDeleteSpace(id, name)}
                    isBusy={actionSpaceId === space.id}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      <FloatingDashboardActions
        language={language}
        onAddSpace={handleAddSpace}
        showAddSpace={spaces.length > 0}
        showBackToTop={showBackToTop}
      />

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur">
          <GlassCard variant="flatOnMobile" className="max-w-md w-full p-6 border border-gold/30 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-nasalization text-graphite mb-1">
                  {language === 'pl' ? 'Usunąć przestrzeń?' : 'Delete this space?'}
                </h3>
                <p className="text-sm text-silver-dark font-modern">
                  {language === 'pl'
                    ? `„${pendingDelete.name}” oraz wszystkie obrazy zostaną usunięte.`
                    : `"${pendingDelete.name}" and all images inside will be removed.`}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <GlassButton
                onClick={cancelDeleteSpace}
                className="w-full sm:w-auto justify-center bg-white/20 hover:bg-white/30 text-graphite"
              >
                {language === 'pl' ? 'Anuluj' : 'Cancel'}
              </GlassButton>
              <GlassButton
                onClick={confirmDeleteSpace}
                className="w-full sm:w-auto justify-center bg-gradient-to-r from-gold to-champagne text-white hover:brightness-110"
              >
                {language === 'pl' ? 'Usuń' : 'Delete'}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  );
}

// ========== SUB-COMPONENTS ==========

function SpaceCard({ space, index, onOpenSpace, onRenameSpace, onDeleteSpace, isBusy }: {
  space: Space;
  index: number;
  onOpenSpace: () => void;
  onRenameSpace?: (spaceId: string, newName: string) => void;
  onDeleteSpace?: (spaceId: string, spaceName: string) => void;
  isBusy?: boolean;
}) {
  const { language } = useLanguage();
  const [isEditing, setIsEditing] = React.useState(false);
  const [nameValue, setNameValue] = React.useState(space.name);

  React.useEffect(() => {
    setNameValue(space.name);
  }, [space.name]);

  const busy = !!isBusy;

  const submitName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === space.name) {
      setIsEditing(false);
      setNameValue(space.name);
      return;
    }
    onRenameSpace?.(space.id, trimmed);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setNameValue(space.name);
  };

  const orderedImages = sortImagesDescending(space.images || []);
  const generatedImages = orderedImages.filter(img => img.type === 'generated');
  const inspirationImages = orderedImages.filter(img => img.type === 'inspiration');
  const previewLimit = orderedImages.length > 5 ? 4 : 5;
  const previewImages = orderedImages.slice(0, previewLimit);
  const remainingCount = orderedImages.length - previewImages.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={() => {
        if (isEditing || busy) return;
        onOpenSpace();
      }}
      className="cursor-pointer"
    >
      <GlassCard variant="flatOnMobile" className="p-4 sm:p-5 lg:p-6 hover:border-gold/50 transition-all duration-300">
        {/* Space Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
              <Home size={20} className="sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
              {isEditing ? (
                <form onSubmit={submitName} className="flex items-center gap-2 max-w-xl">
                  <input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                    className="w-full rounded-xl glass-panel bg-white/30 border border-white/20 px-3 py-2 text-graphite font-modern outline-none focus:border-gold focus:ring-0"
                    placeholder={language === 'pl' ? 'Nazwa przestrzeni' : 'Space name'}
                    disabled={busy}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center text-white hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="w-9 h-9 rounded-full glass-panel border border-white/30 flex items-center justify-center text-silver-dark hover:text-graphite transition"
                  >
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <>
                  <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-nasalization text-graphite truncate">
                    {space.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-silver-dark font-modern">
                    {generatedImages.length} {language === 'pl' ? 'wygenerowanych' : 'generated'} • {inspirationImages.length} {language === 'pl' ? 'inspiracji' : 'inspirations'}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              disabled={busy}
              className={`w-9 h-9 rounded-full glass-panel border flex items-center justify-center transition-colors ${
                busy
                  ? 'border-white/15 text-silver-dark opacity-60 cursor-not-allowed'
                  : 'border-white/25 text-silver-dark hover:text-graphite hover:border-gold/50'
              }`}
              aria-label={language === 'pl' ? 'Edytuj nazwę' : 'Edit name'}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSpace?.(space.id, space.name);
              }}
              className={`w-9 h-9 rounded-full glass-panel border flex items-center justify-center transition-colors ${
                busy
                  ? 'border-white/15 text-silver-dark opacity-60 cursor-not-allowed'
                  : 'border-white/25 text-silver-dark hover:text-gold hover:border-gold/50'
              }`}
              aria-label={language === 'pl' ? 'Usuń przestrzeń' : 'Delete space'}
            >
              <Trash2 size={16} />
            </button>
            <ChevronRight size={20} className="sm:w-6 sm:h-6 text-gold flex-shrink-0" />
          </div>
        </div>

        {previewImages.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {previewImages.map((image) => (
              <div key={image.id} className="relative aspect-[4/3] w-[128px] flex-none overflow-hidden rounded-xl glass-panel sm:w-[150px] lg:w-[170px]">
                <Image
                  src={image.url}
                  alt={image.type === 'generated' ? 'Generated interior preview' : 'Inspiration preview'}
                  fill
                  sizes="(max-width: 640px) 25vw, 160px"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/70 shadow-sm backdrop-blur">
                  {image.type === 'generated'
                    ? <Sparkles size={11} className="text-gold" aria-hidden />
                    : <Heart size={11} className="text-gold" aria-hidden />}
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="flex aspect-[4/3] w-[128px] flex-none items-center justify-center rounded-xl border border-gold/20 bg-gold/10 sm:w-[150px] lg:w-[170px]">
                <span className="font-nasalization text-sm text-graphite">+{remainingCount}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gold/25 bg-white/[0.04] px-4 py-5 text-center">
            <p className="font-modern text-sm text-silver-dark">
              {language === 'pl'
                ? 'Jeszcze bez obrazów — otwórz pomieszczenie, żeby zacząć generowanie.'
                : 'No images yet — open the room to start generating.'}
            </p>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

function EmptyState({ onAddSpace }: { onAddSpace: () => void }) {
  const { language } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
            <GlassCard variant="flatOnMobile" className="p-12 text-center">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center"
        >
          <Home size={48} className="text-white" />
        </motion.div>

        <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-4">
          {language === 'pl' ? 'Zacznij Swoją Podróż' : 'Start Your Journey'}
        </h2>

        <p className="text-base text-graphite font-modern max-w-md mx-auto mb-8">
          {language === 'pl'
            ? 'Dodaj swoją pierwszą przestrzeń aby zacząć tworzyć spersonalizowane wnętrza z IDA'
            : 'Add your first space to start creating personalized interiors with IDA'}
        </p>

        <GlassButton onClick={onAddSpace} className="px-8 py-4">
          <Plus size={20} className="mr-2" />
          {language === 'pl' ? 'Dodaj Pierwszą Przestrzeń' : 'Add First Space'}
        </GlassButton>
      </GlassCard>
    </motion.div>
  );
}

function FloatingDashboardActions({
  onAddSpace,
  language,
  showAddSpace,
  showBackToTop,
}: {
  onAddSpace: () => void;
  language: 'pl' | 'en';
  showAddSpace: boolean;
  showBackToTop: boolean;
}) {
  if (!showAddSpace && !showBackToTop) return null;

  const scrollToTop = () => {
    document.getElementById('dashboard-top')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
  };

  const floatSpring = { type: 'spring' as const, stiffness: 280, damping: 28 };

  return (
    <AppContentFloatingAnchor columnClassName="px-4 lg:px-8">
      <motion.div
        layout
        initial={{ opacity: 0, y: 36, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className={`pointer-events-auto flex min-h-[56px] w-full items-center gap-3 sm:gap-4${!showAddSpace && showBackToTop ? ' justify-end' : ''}`}
      >
        {showAddSpace && (
          <motion.div
            layout
            transition={floatSpring}
            className="flex min-w-0 flex-1 justify-center"
          >
            <GlassButton
              type="button"
              onClick={onAddSpace}
              className="min-h-[56px] w-full max-w-2xl gap-2 rounded-full border border-white/35 bg-white/45 px-6 py-3 font-modern text-sm font-semibold shadow-[0_20px_60px_rgba(68,49,20,0.18)] backdrop-blur-glass transition hover:-translate-y-0.5 hover:bg-white/60 hover:shadow-[0_26px_70px_rgba(68,49,20,0.22)] sm:px-8"
            >
              <Plus size={18} aria-hidden className="shrink-0" />
              <span className="truncate">
                {language === 'pl' ? 'Dodaj pomieszczenie' : 'Add a room'}
              </span>
            </GlassButton>
          </motion.div>
        )}

        <AnimatePresence initial={false} mode="popLayout">
          {showBackToTop && (
            <motion.div
              key="dashboard-back-to-top"
              layout
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={floatSpring}
              className="shrink-0 -translate-x-5 sm:-translate-x-7 lg:-translate-x-9"
            >
              <GlassButton
                type="button"
                variant="secondary"
                onClick={scrollToTop}
                className="min-h-[56px] whitespace-nowrap rounded-full px-4 py-3 text-sm drop-shadow-[0_14px_28px_rgba(68,49,20,0.16)]"
              >
                <ArrowUp size={16} aria-hidden className="shrink-0" />
                {language === 'pl' ? 'Wróć na górę' : 'Back to top'}
              </GlassButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AppContentFloatingAnchor>
  );
}

// ========== HELPER FUNCTIONS ==========

/** Big Five domain scores from Cloud SQL / JSON may be number or numeric string (node-pg). */
function coerceBigFivePercent(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function BigFiveResults({ userHash }: { userHash?: string }) {
  const { language } = useLanguage();
  const router = useRouter();
  const { sessionData } = useSessionData();
  const [bigFiveData, setBigFiveData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!userHash) { setBigFiveData(null); setLoading(false); return; }
        
        // Priority 1: Check sessionData (already loaded from Supabase user_profiles)
        const sessionBigFive = (sessionData as any)?.bigFive;
        if (sessionBigFive?.scores) {
          if (mounted) {
            setBigFiveData(sessionBigFive);
            setLoading(false);
            return;
          }
        }
        
        // Priority 2: Try localStorage (immediate)
        const localSession = safeLocalStorage.getItem('aura_session');
        if (localSession) {
          const parsed = JSON.parse(localSession);
          const bigFive = parsed?.bigFive;
          if (mounted && bigFive?.scores) {
            setBigFiveData(bigFive);
            setLoading(false);
            return;
          }
        }
        
        // NOTE: Legacy fallbacks to user_profiles/sessions removed after radical refactor.
        // Big Five should come from participants snapshot (sessionData) or localStorage.
        if (mounted) setBigFiveData(null);
      } catch (e) {
        console.warn('[Dashboard] Big Five fetch failed', e);
        if (mounted) setBigFiveData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userHash, sessionData]);

  if (loading) return null;
  
  // Show empty state with add button if no Big Five
  if (!bigFiveData?.scores) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <GlassCard variant="flatOnMobile" className="p-4 sm:p-6 hover:border-gold/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                <User size={16} className="sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg lg:text-xl font-nasalization text-graphite truncate">
                  {language === 'pl' ? 'Profil Osobowości' : 'Personality Profile'}
                </h3>
                <p className="text-xs sm:text-sm text-silver-dark font-modern">
                  {language === 'pl' ? 'Big Five (IPIP-NEO-120)' : 'Big Five (IPIP-NEO-120)'}
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/flow/big-five?from=dashboard');
            }}
            className="w-full py-4 border-2 border-dashed border-gold/30 rounded-lg 
                     hover:border-gold/60 hover:bg-gold/5 transition-all duration-200
                     flex items-center justify-center gap-2 text-gold font-modern"
          >
            <Plus size={20} />
            {language === 'pl' ? 'Dodaj test Big Five' : 'Add Big Five Test'}
          </button>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard variant="flatOnMobile" className="p-4 sm:p-6 hover:border-gold/50 transition-all duration-300">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => router.push('/dashboard/personality')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
              <User size={16} className="sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg lg:text-xl font-nasalization text-graphite truncate">
                {language === 'pl' ? 'Profil Osobowości' : 'Personality Profile'}
              </h3>
              <p className="text-xs sm:text-sm text-silver-dark font-modern">
                {language === 'pl' ? 'Big Five (IPIP-NEO-120)' : 'Big Five (IPIP-NEO-120)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-gold cursor-pointer flex-shrink-0" onClick={() => router.push('/dashboard/personality')}>
            <Eye size={16} className="sm:w-5 sm:h-5" />
            <ChevronRight size={16} className="sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {(() => {
            // IPIP-NEO-120: stable O–N order; values may be numbers or strings from PostgreSQL
            const OCEAN = ['O', 'C', 'E', 'A', 'N'] as const;
            const domainsMap: Array<{ domain: string; score: number }> = [];
            const scores = bigFiveData.scores;
            const dom = scores?.domains;
            for (const key of OCEAN) {
              const raw = dom?.[key] ?? (scores as Record<string, unknown>)?.[key];
              const n = coerceBigFivePercent(raw);
              if (n !== null) domainsMap.push({ domain: key, score: n });
            }

            return domainsMap.map(({ domain, score }, index) => (
              <motion.div
                key={domain}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mb-2">
                  <div className="text-xl sm:text-2xl font-bold text-gold mb-1">{Number(score)}%</div>
                  <div className="text-xs sm:text-sm font-nasalization text-graphite">
                    {getDomainLabel(domain, language)}
                  </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-gold to-champagne h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </motion.div>
            ));
          })()}
        </div>
        <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
          <p className="text-xs sm:text-sm text-silver-dark font-modern cursor-pointer hover:text-gold transition-colors"
             onClick={() => router.push('/dashboard/personality')}>
            {language === 'pl' ? 'Kliknij aby zobaczyć szczegółową analizę' : 'Click to see detailed analysis'}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/flow/big-five?from=dashboard&retake=true');
            }}
            className="flex items-center gap-1 text-sm text-gold hover:text-champagne transition-colors font-modern"
          >
            <Plus size={16} />
            {language === 'pl' ? 'Ponów' : 'Retake'}
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function getDomainLabel(domain: string, language: 'pl' | 'en'): string {
  const labels = {
    // IPIP-NEO-120 format only
    O: { pl: 'Otwartość', en: 'Openness' },
    C: { pl: 'Sumienność', en: 'Conscientiousness' },
    E: { pl: 'Ekstrawersja', en: 'Extraversion' },
    A: { pl: 'Ugodowość', en: 'Agreeableness' },
    N: { pl: 'Neurotyczność', en: 'Neuroticism' }
  };
  return labels[domain as keyof typeof labels]?.[language] || domain;
}

function getRelativeTime(dateString: string, language: 'pl' | 'en'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return language === 'pl' ? 'Dzisiaj' : 'Today';
  } else if (diffDays === 1) {
    return language === 'pl' ? 'Wczoraj' : 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} ${language === 'pl' ? 'dni temu' : 'days ago'}`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${language === 'pl' ? (weeks === 1 ? 'tydzień temu' : 'tygodni temu') : (weeks === 1 ? 'week ago' : 'weeks ago')}`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} ${language === 'pl' ? (months === 1 ? 'miesiąc temu' : 'miesięcy temu') : (months === 1 ? 'month ago' : 'months ago')}`;
  }
}

