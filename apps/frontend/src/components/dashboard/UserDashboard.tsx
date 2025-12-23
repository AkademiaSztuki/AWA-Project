"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { supabase, fetchLatestSessionSnapshot, DISABLE_SESSION_SYNC, safeLocalStorage, safeSessionStorage } from '@/lib/supabase';
import { getUserHouseholds, saveHousehold, getCompletionStatus, getUserProfile } from '@/lib/supabase-deep-personalization';
import { fetchParticipantImages, fetchParticipantSpaces, createParticipantSpace, toggleParticipantImageFavorite, deleteParticipantImage, updateSpaceName, deleteSpace } from '@/lib/remote-spaces';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Plus, 
  Image as ImageIcon,
  Clock,
  Heart,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  User,
  Eye,
  Pencil,
  Trash2,
  Check,
  X
} from 'lucide-react';
import Image from 'next/image';
import {
  PreferencesOverviewSection,
  RoomAnalysisSection,
  InspirationsPreviewSection,
  GenerationStatsSection
} from '@/components/dashboard/ProfileSections';
import { CompletionStatus } from '@/types/deep-personalization';

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
  const { sessionData, updateSessionData } = useSessionData();
  const { language } = useLanguage();
  const { user, linkUserHashToAuth } = useAuth();
  
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [remoteSession, setRemoteSession] = useState<any>(null);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionSpaceId, setActionSpaceId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const getUserHash = useCallback((): string | undefined => {
    let userHash = sessionData?.userHash as string | undefined;

    if (!userHash) {
      userHash = safeLocalStorage.getItem('aura_user_hash') || 
                 safeSessionStorage.getItem('aura_user_hash') || undefined;
    }

    return userHash;
  }, [sessionData?.userHash]);

  const sortSpacesDescending = useCallback((list: Space[]): Space[] => {
    return [...(list || [])].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, []);
  
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
  

  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.userHash]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      // Try to get userHash from multiple sources
      let userHash = sessionData?.userHash;
      
      if (!userHash) {
        userHash = safeLocalStorage.getItem('aura_user_hash') || 
                   safeSessionStorage.getItem('aura_user_hash') || '';
      }
      
      if (!userHash) {
        console.log('[Dashboard] No user hash found - showing empty dashboard');
        setSpaces([]);
        setIsLoading(false);
        return;
      }

      console.log('[Dashboard] Loading data for user:', userHash);
      
      // Link user_hash to auth user if logged in (one-time operation)
      if (user && userHash) {
        try {
          await linkUserHashToAuth(userHash);
        } catch (e) {
          console.warn('[Dashboard] Failed to link user_hash to auth:', e);
        }
      }
      
      // Pull freshest session snapshot from Supabase (used for completion flags)
      if (!DISABLE_SESSION_SYNC) {
      try {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserDashboard.tsx:loadUserData-remoteSnapshot-start',message:'Fetching remote participant snapshot for dashboard',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
        // #endregion
        const remote = await fetchLatestSessionSnapshot(userHash);
        if (remote) {
          setRemoteSession(remote);
        }
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserDashboard.tsx:loadUserData-remoteSnapshot-done',message:'Remote participant snapshot loaded for dashboard',data:{userHash,remoteFound:!!remote,remoteHasBigFive:!!remote?.bigFive,remoteHasVisualDNA:!!remote?.visualDNA,remoteHasColorsAndMaterials:!!remote?.colorsAndMaterials},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
        // #endregion
      } catch (e) {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserDashboard.tsx:loadUserData-remoteSnapshot-error',message:'Failed to load remote participant snapshot for dashboard',data:{error:e instanceof Error?e.message:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H12'})}).catch(()=>{});
        // #endregion
        console.warn('[Dashboard] Failed to load remote session snapshot', e);
        }
      }

      // Load user profile from Supabase (Big Five, explicit preferences, etc.)
      try {
        const userProfile = await getUserProfile(userHash);
        console.log('[Dashboard] getUserProfile result:', {
          hasProfile: !!userProfile,
          hasPersonality: !!userProfile?.personality,
          hasAestheticDNA: !!userProfile?.aestheticDNA,
          personalityKeys: userProfile?.personality ? Object.keys(userProfile.personality) : [],
          aestheticDNAKeys: userProfile?.aestheticDNA ? Object.keys(userProfile.aestheticDNA) : []
        });
        
        if (userProfile) {
          // Map Supabase profile data back to sessionData format
          const mappedData: any = {};
          
          // Big Five / Personality
          if (userProfile.personality) {
            mappedData.bigFive = {
              instrument: userProfile.personality.instrument || 'IPIP-NEO-120',
              scores: {
                domains: userProfile.personality.domains || {},
                facets: userProfile.personality.facets || {}
              },
              completedAt: userProfile.personality.completedAt || new Date().toISOString()
            };
            console.log('[Dashboard] Mapped Big Five:', {
              instrument: mappedData.bigFive.instrument,
              hasScores: !!mappedData.bigFive.scores,
              hasDomains: !!mappedData.bigFive.scores.domains,
              domainsKeys: mappedData.bigFive.scores.domains ? Object.keys(mappedData.bigFive.scores.domains) : []
            });
          }
          
          // Explicit preferences (colors, materials, styles)
          if (userProfile.aestheticDNA?.explicit) {
            mappedData.colorsAndMaterials = {
              selectedPalette: userProfile.aestheticDNA.explicit.selectedPalette,
              topMaterials: userProfile.aestheticDNA.explicit.topMaterials || []
            };
            mappedData.semanticDifferential = (() => {
              const semantic = {
                warmth: userProfile.aestheticDNA.explicit.warmthPreference,
                brightness: userProfile.aestheticDNA.explicit.brightnessPreference,
                complexity: userProfile.aestheticDNA.explicit.complexityPreference
              };
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserDashboard.tsx:loadUserData-semanticDifferential',message:'Mapping semanticDifferential for dashboard display',data:{warmth:semantic.warmth,brightness:semantic.brightness,complexity:semantic.complexity,hasExplicit:!!userProfile.aestheticDNA?.explicit,rawExplicit:userProfile.aestheticDNA?.explicit},timestamp:Date.now(),sessionId:'debug-session',runId:'dashboard-load',hypothesisId:'E'})}).catch(()=>{});
              // #endregion
              return semantic;
            })();
            console.log('[Dashboard] Mapped explicit preferences:', {
              hasPalette: !!mappedData.colorsAndMaterials.selectedPalette,
              materialsCount: mappedData.colorsAndMaterials.topMaterials?.length || 0,
              hasSemantic: !!mappedData.semanticDifferential
            });
          }
          
          // Implicit preferences (visual DNA) - UKRYTE PREFERENCJE
          if (userProfile.aestheticDNA?.implicit) {
            mappedData.visualDNA = {
              dominantStyle: userProfile.aestheticDNA.implicit.dominantStyles?.[0],
              preferences: {
                colors: userProfile.aestheticDNA.implicit.colors || [],
                materials: userProfile.aestheticDNA.implicit.materials || [],
                styles: userProfile.aestheticDNA.implicit.dominantStyles || []
              }
            };
            
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'sync-check',
                hypothesisId: 'H4',
                location: 'UserDashboard.tsx:loadUserData-implicit',
                message: 'Loaded implicit preferences from Supabase',
                data: {
                  hasImplicit: true,
                  dominantStyle: mappedData.visualDNA.dominantStyle,
                  colorsCount: mappedData.visualDNA.preferences.colors?.length || 0,
                  materialsCount: mappedData.visualDNA.preferences.materials?.length || 0,
                  stylesCount: mappedData.visualDNA.preferences.styles?.length || 0
                },
                timestamp: Date.now()
              })
            }).catch(() => {});
            // #endregion
            
            console.log('[Dashboard] Mapped implicit preferences (UKRYTE):', {
              dominantStyle: mappedData.visualDNA.dominantStyle,
              colorsCount: mappedData.visualDNA.preferences.colors?.length || 0,
              materialsCount: mappedData.visualDNA.preferences.materials?.length || 0
            });
          } else {
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'sync-check',
                hypothesisId: 'H4',
                location: 'UserDashboard.tsx:loadUserData-implicit-missing',
                message: 'No implicit preferences in Supabase profile',
                data: {
                  hasImplicit: false,
                  hasAestheticDNA: !!userProfile.aestheticDNA
                },
                timestamp: Date.now()
              })
            }).catch(() => {});
            // #endregion
          }
          
          // Update sessionData with Supabase data
          if (Object.keys(mappedData).length > 0) {
            updateSessionData(mappedData);
            console.log('[Dashboard] Loaded user profile from Supabase:', {
              hasBigFive: !!mappedData.bigFive,
              hasExplicit: !!mappedData.colorsAndMaterials,
              hasImplicit: !!mappedData.visualDNA
            });
          } else {
            console.warn('[Dashboard] User profile exists but no mappable data found');
          }
        } else {
          console.log('[Dashboard] No user profile found in Supabase for userHash:', userHash);
        }
      } catch (e) {
        console.warn('[Dashboard] Failed to load user profile from Supabase:', e);
      }

      // Completion status (RPC) – may fail on unauthenticated clients
      try {
        const status = await getCompletionStatus(userHash);
        if (status) setCompletionStatus(status);
      } catch (e) {
        console.warn('[Dashboard] getCompletionStatus failed (likely unauthenticated):', e);
      }

      // Fetch spaces + images from participant_* (source of truth)
      try {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserDashboard.tsx:loadUserData-fetch',message:'Fetching participant spaces+images for dashboard',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H11'})}).catch(()=>{});
        // #endregion

        const [participantSpaces, participantImages] = await Promise.all([
          fetchParticipantSpaces(userHash),
          fetchParticipantImages(userHash)
        ]);

        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserDashboard.tsx:loadUserData-fetched',message:'Fetched participant spaces+images',data:{userHash,spaceCount:participantSpaces?.length||0,imageCount:participantImages?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H11'})}).catch(()=>{});
        // #endregion

        // Build spaces from participant_spaces, fallback to default if missing
        const fallbackName = (sessionData as any)?.roomName || 'Moja Przestrzeń';
        const fallbackType = (sessionData as any)?.roomType || 'personal';

        let spacesSource = participantSpaces;
        if (!spacesSource || spacesSource.length === 0) {
          const created = await createParticipantSpace(userHash, { name: fallbackName, type: fallbackType, is_default: true });
          if (created?.id) {
            spacesSource = [{ id: created.id, name: fallbackName, type: fallbackType, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
          }
        }

        const defaultId =
          (spacesSource || []).find(s => s.isDefault)?.id ||
          (spacesSource || [])[0]?.id ||
          'default-space';

        const bySpaceId = new Map<string, SpaceImage[]>();
        for (const img of participantImages || []) {
          if (img.type !== 'generated' && img.type !== 'inspiration') continue;
          const sid = (img as any).spaceId || defaultId;
          if (!bySpaceId.has(sid)) bySpaceId.set(sid, []);
          bySpaceId.get(sid)!.push({
            id: img.id,
            url: img.url,
            type: img.type === 'generated' ? 'generated' : 'inspiration',
            addedAt: img.createdAt,
            isFavorite: img.isFavorite,
            thumbnailUrl: img.thumbnailUrl,
            tags: img.tags ? (Object.values(img.tags).flat().filter((t): t is string => typeof t === 'string')) : []
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
            updatedAt: imgs.length > 0 ? imgs[0].addedAt : s.updatedAt
          };
        });

        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserDashboard.tsx:spaces-grouped',message:'Grouped participant_images into participant_spaces',data:{userHash,spaceCount:mappedSpaces.length,imageCount:participantImages?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'SP1'})}).catch(()=>{});
        // #endregion

        setSpaces(sortSpacesDescending(mappedSpaces));
        updateSessionData({ spaces: mappedSpaces } as any);
        setIsLoading(false);
        return;
      } catch (e) {
        console.warn('[Dashboard] fetch participant_spaces/images failed, fallback to local/session', e);
      }

      // Fallback: sessionData
      if (sessionData?.spaces && sessionData.spaces.length > 0) {
        setSpaces(sortSpacesDescending(sessionData.spaces));
        setIsLoading(false);
        return;
      }
      
      // Fallback: localStorage
      const localSessionData = safeLocalStorage.getItem('aura_session');
      if (localSessionData) {
        try {
          const parsed = JSON.parse(localSessionData);
          if (parsed.spaces && parsed.spaces.length > 0) {
            setSpaces(sortSpacesDescending(parsed.spaces));
            setIsLoading(false);
            return;
          }
        } catch {}
      }

          setSpaces([]);
      setIsLoading(false);
    } catch (error) {
      console.error('[Dashboard] Failed to load user data:', error);
      // Only set empty if we don't have localStorage data
      const localSessionData = safeLocalStorage.getItem('aura_session');
      if (!localSessionData) {
        setSpaces([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

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

      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserDashboard.tsx:handleAddSpace-created',message:'Created participant_space',data:{userHash,spaceId:newSpaceId,spaceName:newSpaceName},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'SP2'})}).catch(()=>{});
      // #endregion

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
      updateSessionData({ spaces: updatedSpaces, currentSpaceId: newSpaceId } as any);

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
      const removed = await deleteSpace(userHash, spaceId);
      if (removed) {
        const updatedSpaces = sortSpacesDescending(spaces.filter(space => space.id !== spaceId));
        setSpaces(updatedSpaces);
        const sessionUpdate: any = { spaces: updatedSpaces };
        if ((sessionData as any)?.currentSpaceId === spaceId) {
          sessionUpdate.currentSpaceId = undefined;
        }
        updateSessionData(sessionUpdate);
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

  const handleOpenSpace = (spaceId: string) => {
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

    // Reload data from Supabase to ensure sync (especially important after deletion)
    if (deletedFromSupabase || userHash) {
      try {
        // Reload images from Supabase to sync
        const participantImages = await fetchParticipantImages(userHash!);
        const remoteSpaces: Space[] = participantImages ? [{
          id: 'all-images',
          name: 'Moja Przestrzeń',
          type: 'personal',
          images: participantImages.map(img => ({
            id: img.id,
            url: img.url,
            type: img.type === 'generated' ? 'generated' : 'inspiration',
            addedAt: img.createdAt,
            isFavorite: img.isFavorite,
            thumbnailUrl: img.thumbnailUrl,
            tags: img.tags
          })),
          createdAt: participantImages[0]?.createdAt || new Date().toISOString(),
          updatedAt: participantImages[0]?.createdAt || new Date().toISOString()
        }] : [];
        if (remoteSpaces && Array.isArray(remoteSpaces)) {
          const mapped: Space[] = remoteSpaces.map((entry: any) => {
            const s = entry.space || entry;
            const imgs = (entry.images || []).map((img: any) => ({
              id: img.id,
              url: img.url,
              type: img.type,
              addedAt: img.created_at || img.added_at || img.addedAt || new Date().toISOString(),
              isFavorite: img.is_favorite ?? img.isFavorite,
              thumbnailUrl: img.thumbnail_url || img.thumbnailUrl,
              tags: img.tags
            }));
            return {
              id: s.id,
              name: s.name,
              type: s.type || 'personal',
              images: imgs,
              createdAt: s.created_at || s.createdAt,
              updatedAt: s.updated_at || s.updatedAt
            };
          });
          const ordered = sortSpacesDescending(mapped);
          setSpaces(ordered);
          updateSessionData({ spaces: ordered } as any);
          
          // Also update inspirations from spaces
          const inspirationImages = ordered
            .flatMap(space => space.images || [])
            .filter(img => img.type === 'inspiration')
            .map(img => ({
              id: img.id,
              url: img.url,
              imageBase64: img.url,
              tags: img.tags || {},
              description: undefined,
              addedAt: img.addedAt
            }));
          
          // Only update inspirations if we got data from Supabase
          if (inspirationImages.length !== currentInspirations.length || deletedFromSupabase) {
            updateSessionData({ inspirations: inspirationImages } as any);
          }
        }
      } catch (error) {
        console.warn('[Dashboard] Failed to reload data from Supabase after deletion:', error);
        // Don't revert local changes if reload fails
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

  return (
    <div className="flex flex-col w-full relative">
      {authError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xl p-3 rounded-lg glass-panel border border-gold/30">
          <p className="text-sm text-graphite font-modern text-center">
            {language === 'pl' ? 'Błąd logowania: ' : 'Sign-in error: '}
            {authError}
          </p>
        </div>
      )}
      
      {/* Dialog IDA na dole - cała szerokość - pokazuje komentarz IDA jeśli dostępny */}
      {(() => {
        const roomComment = (sessionData as any)?.roomAnalysis?.human_comment;
        if (roomComment) {
          console.log('[Dashboard] Room comment found, showing in dialogue:', roomComment);
          return (
      <div className="w-full">
        <AwaDialogue 
                currentStep="room_analysis" 
          fullWidth={true}
                autoHide={false}
                customMessage={roomComment}
        />
      </div>
          );
        }
        return null;
      })()}

      <div className="flex-1 p-4 lg:p-8 pb-32">
        <div className="max-w-3xl lg:max-w-none mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4"
          >
            <div className="mb-4">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-2">
                {language === 'pl' ? 'Moje Przestrzenie' : 'My Spaces'}
              </h1>
            </div>

            {/* Quick Stats */}
            {(() => {
              // Calculate stats from multiple sources
              const typedSession = sessionData as any;
              
              // Rooms/Spaces count
              const roomCount = typedSession?.roomType ? 1 : 0;
              const spacesCount = Math.max(spaces.length, roomCount);
              
              // Generated images - check multiple sources
              const generatedFromSpaces = spaces.reduce((sum, s) => 
                sum + (s.images?.filter(img => img.type === 'generated').length || 0), 0);
              const generatedFromSession = typedSession?.generatedImages?.length || 0;
              const generatedFromGenerations = typedSession?.generations?.length || 0;
              const generatedCount = Math.max(generatedFromSpaces, generatedFromSession, generatedFromGenerations);
              
              // Inspirations - check multiple sources
              const inspirationsFromSpaces = spaces.reduce((sum, s) => 
                sum + (s.images?.filter(img => img.type === 'inspiration').length || 0), 0);
              const inspirationsFromSession = typedSession?.inspirations?.length || 0;
              const inspirationsCount = Math.max(inspirationsFromSpaces, inspirationsFromSession);
              
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  <GlassCard className="p-4 sm:p-6 min-h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                        <Home size={20} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-nasalization text-graphite">{spacesCount}</p>
                        <p className="text-xs text-silver-dark font-modern">
                          {language === 'pl' ? 'Pomieszczenia' : 'Rooms'}
                        </p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4 sm:p-6 min-h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                        <ImageIcon size={20} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-nasalization text-graphite">{generatedCount}</p>
                        <p className="text-xs text-silver-dark font-modern">
                          {language === 'pl' ? 'Wygenerowane' : 'Generated'}
                        </p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4 sm:p-6 min-h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                        <Sparkles size={20} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-nasalization text-graphite">{inspirationsCount}</p>
                        <p className="text-xs text-silver-dark font-modern">
                          {language === 'pl' ? 'Inspiracje' : 'Inspirations'}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              );
            })()}
          </motion.div>

          {/* User Profile Overview */}
          <ProfileOverview
            sessionData={sessionData}
            remoteSession={remoteSession}
            completionStatus={completionStatus}
          />

          {/* Big Five Results - Enhanced with details link */}
          <BigFiveResults userHash={(sessionData as any)?.userHash} />

          {/* Połączone preferencje (ukryte + jawne) */}
          {(() => {
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'dashboard-render',
                hypothesisId: 'D2',
                location: 'UserDashboard.tsx:render-PreferencesOverviewSection',
                message: 'UserDashboard sessionData before render',
                data: {
                  hasVisualDNA: !!(sessionData as any)?.visualDNA,
                  visualDNAStyle: (sessionData as any)?.visualDNA?.dominantStyle,
                  visualDNAColors: (sessionData as any)?.visualDNA?.preferences?.colors,
                  visualDNAMaterials: (sessionData as any)?.visualDNA?.preferences?.materials,
                  hasColorsAndMaterials: !!sessionData?.colorsAndMaterials,
                  colorsAndMaterialsPalette: sessionData?.colorsAndMaterials?.selectedPalette,
                  colorsAndMaterialsMaterials: sessionData?.colorsAndMaterials?.topMaterials,
                  hasSemanticDifferential: !!sessionData?.semanticDifferential,
                  semanticWarmth: sessionData?.semanticDifferential?.warmth,
                  semanticBrightness: sessionData?.semanticDifferential?.brightness,
                  semanticComplexity: sessionData?.semanticDifferential?.complexity
                },
                timestamp: Date.now()
              })
            }).catch(() => {});
            // #endregion
            return null;
          })()}
          <PreferencesOverviewSection
            sessionData={sessionData}
            visualDNA={(sessionData as any)?.visualDNA}
          />

          {/* Room Analysis - ukryte, komentarz wyświetlany w dialogu na dole */}
          {/* <RoomAnalysisSection 
            roomAnalysis={(sessionData as any)?.roomAnalysis}
            roomImage={(sessionData as any)?.roomImage}
          /> */}

          {/* Inspirations Preview */}
          <InspirationsPreviewSection 
            inspirations={(() => {
              // Get inspirations from multiple sources
              const typedSession = sessionData as any;
              
              // First try sessionData.inspirations
              if (typedSession?.inspirations && typedSession.inspirations.length > 0) {
                return typedSession.inspirations;
              }
              
              // Then try spaces - extract inspiration images
              const inspirationImages = spaces
                .flatMap(space => space.images || [])
                .filter(img => img.type === 'inspiration')
                .map(img => ({
                  id: img.id,
                  url: img.url,
                  imageBase64: img.url,
                  tags: img.tags || {},
                  description: undefined,
                  addedAt: img.addedAt
                }));
              
              return inspirationImages;
            })()}
            explicitBiophilia={
              (sessionData as any)?.roomPreferences?.biophiliaScore ??
              (sessionData as any)?.biophiliaScore
            }
            onViewAll={() => {
              const spaces = (sessionData as any)?.spaces || [];
              if (spaces.length > 0) {
                router.push(`/space/${spaces[0].id}?filter=inspiration`);
              }
            }}
            onAddInspirations={() => router.push('/flow/inspirations?from=dashboard')}
            onDeleteInspiration={handleDeleteInspiration}
          />

          {/* Generation Stats */}
          <GenerationStatsSection 
            generations={(sessionData as any)?.generations || []}
            generatedImages={allGeneratedImages}
            onToggleFavorite={(imageId, imageUrl) => handleToggleFavorite(imageId, imageUrl)}
          />

          {/* Quick access: add new space near generated images */}
          {spaces.length > 0 && (
            <AddSpaceCallout
              language={language}
              onAddSpace={handleAddSpace}
            />
          )}

          {/* Spaces List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-silver-dark font-modern">
                {language === 'pl' ? 'Ładowanie...' : 'Loading...'}
              </p>
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
        </div>
      </div>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur">
          <GlassCard className="max-w-md w-full p-6 border border-gold/30 shadow-2xl">
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

function ProfileOverview({ sessionData, remoteSession, completionStatus }: { sessionData: any; remoteSession: any; completionStatus: CompletionStatus | null }) {
  const { language } = useLanguage();
  const router = useRouter();

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  const source = remoteSession || sessionData;

  // Calculate profile completion (prefer remote snapshot / RPC)
  const hasVisualDNA =
    !!source?.visualDNA ||
    !!completionStatus?.coreProfileComplete;

  const hasExplicitPreferences =
    !!(source?.colorsAndMaterials?.selectedStyle ||
      source?.colorsAndMaterials?.selectedPalette ||
      source?.sensoryPreferences?.light ||
      source?.sensoryPreferences?.texture ||
      completionStatus?.coreProfileComplete);

  const hasBigFive = !!source?.bigFive || !!completionStatus?.coreProfileComplete;
  const hasInspirations = (source?.inspirations?.length || 0) > 0;
  const hasRoom = !!source?.roomImage || !!source?.currentRoomId || !!(completionStatus?.roomCount && completionStatus.roomCount > 0);

  const completedItems = [hasVisualDNA, hasExplicitPreferences, hasBigFive, hasInspirations, hasRoom].filter(Boolean).length;
  const totalItems = 5;
  const completionPercentage = Math.round((completedItems / totalItems) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
            <User size={24} className="sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-nasalization text-graphite">
              {t('Twój Profil', 'Your Profile')}
            </h2>
            <p className="text-xs sm:text-sm text-silver-dark font-modern">
              {t(`Ukończono ${completionPercentage}%`, `${completionPercentage}% Complete`)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-2 sm:h-3 mb-4">
          <div
            className="bg-gradient-to-r from-gold to-champagne h-2 sm:h-3 rounded-full transition-all duration-1000"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Profile Items */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <ProfileItem completed={hasVisualDNA} label={t('Ukryte preferencje', 'Implicit preferences')} />
          <ProfileItem completed={hasExplicitPreferences} label={t('Jawne preferencje', 'Explicit preferences')} />
          <ProfileItem completed={hasBigFive} label={t('Big Five', 'Big Five')} />
          <ProfileItem completed={hasInspirations} label={t('Inspiracje', 'Inspirations')} />
          <ProfileItem completed={hasRoom} label={t('Pokój', 'Room')} />
        </div>
      </GlassCard>
    </motion.div>
  );
}

function ProfileItem({ completed, label }: { completed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
        completed ? 'bg-gold' : 'bg-white/20'
      }`}>
        {completed && <span className="text-white text-xs">✓</span>}
      </div>
      <span className={`font-modern ${completed ? 'text-graphite' : 'text-silver-dark'}`}>
        {label}
      </span>
    </div>
  );
}

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
  
  // In "Moja Główna Przestrzeń" show only generated images, not inspirations
  // Inspirations should be shown in the separate "Inspiracje" section
  const displayImages = generatedImages.slice(0, 6);
  const remainingCount = generatedImages.length - displayImages.length;

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
      <GlassCard className="p-4 sm:p-6 lg:p-8 hover:border-gold/50 transition-all duration-300">
        {/* Space Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
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
                    {generatedImages.length} {language === 'pl' ? 'wyg.' : 'gen.'} • {inspirationImages.length} {language === 'pl' ? 'insp.' : 'insp.'}
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

        {/* Images Gallery Preview */}
        {displayImages.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {displayImages.map((image, idx) => (
              <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden glass-panel group">
                <Image
                  src={image.url}
                  alt={image.type === 'generated' ? 'Generated' : 'Inspiration'}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Badge indicating type */}
                <div className="absolute top-1 right-1">
                  {image.type === 'generated' ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center shadow-lg">
                      <Sparkles size={12} className="sm:w-3.5 sm:h-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-champagne to-platinum flex items-center justify-center shadow-lg">
                      <Heart size={12} className="sm:w-3.5 sm:h-3.5 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="relative aspect-square rounded-lg overflow-hidden glass-panel flex items-center justify-center bg-gradient-to-br from-gold/20 to-champagne/20">
                <span className="text-base sm:text-xl font-nasalization text-graphite">+{remainingCount}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-silver-dark font-modern">
              {language === 'pl' ? 'Brak obrazów w tej przestrzeni' : 'No images in this space yet'}
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
      <GlassCard className="p-12 text-center">
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

function AddSpaceCallout({ onAddSpace, language }: { onAddSpace: () => void; language: 'pl' | 'en' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <GlassCard className="p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
              <Plus size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-nasalization text-graphite truncate">
                {language === 'pl' ? 'Dodaj nową przestrzeń' : 'Add a new space'}
              </p>
              <p className="text-sm text-silver-dark font-modern truncate">
                {language === 'pl'
                  ? 'Dodaj kolejną przestrzeń w swoim projekcie.'
                  : 'Add another space to your project.'}
              </p>
            </div>
          </div>
          <GlassButton
            onClick={onAddSpace}
            className="w-full sm:w-auto justify-center px-4 py-2 flex items-center gap-2"
          >
            <Plus size={16} />
            <span>{language === 'pl' ? 'Dodaj przestrzeń' : 'Add space'}</span>
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ========== HELPER FUNCTIONS ==========

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
        <GlassCard className="p-4 sm:p-6 hover:border-gold/50 transition-all duration-300">
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
      <GlassCard className="p-4 sm:p-6 hover:border-gold/50 transition-all duration-300">
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
            // IPIP-NEO-120 format only (O/C/E/A/N)
            const domainsMap: Array<{ domain: string; score: number }> = [];
            
            if (bigFiveData.scores.domains) {
              Object.entries(bigFiveData.scores.domains).forEach(([key, value]) => {
                if (['O', 'C', 'E', 'A', 'N'].includes(key) && typeof value === 'number') {
                  domainsMap.push({ domain: key, score: value });
                }
              });
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

