"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ArrowLeft, Heart, Sparkles, Trash2, Download, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Image from 'next/image';
import {
  createParticipantSpace,
  deleteParticipantImage,
  fetchParticipantImages,
  fetchParticipantSpaces,
} from '@/lib/remote-spaces';
import { safeLocalStorage, safeSessionStorage } from '@/lib/gcp-data';

interface SpaceImage {
  id: string;
  url: string;
  type: 'generated' | 'inspiration';
  addedAt: string;
  isFavorite?: boolean;
  thumbnailUrl?: string;
  tags?: string[];
}

interface Space {
  id: string;
  name: string;
  type: string;
  images: SpaceImage[];
  createdAt: string;
  updatedAt: string;
}

const sortImagesDescending = (images: SpaceImage[]): SpaceImage[] =>
  [...(images || [])].sort((a, b) => {
    const ta = new Date(a.addedAt || 0).getTime();
    const tb = new Date(b.addedAt || 0).getTime();
    return tb - ta;
  });

const extensionFromMime = (mime: string): string => {
  const m = mime.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('avif')) return 'avif';
  if (m.includes('png')) return 'png';
  return 'png';
};

const extensionFromImageUrl = (url: string): string | null => {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.(png|jpe?g|webp|gif|avif)(?:\?|$)/i);
    if (!m) return null;
    return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  } catch {
    return null;
  }
};

type SpaceNavMeta = {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

const normalizeSpaceId = (id?: string | null): string => {
  if (!id) return '';
  return id.startsWith('space_') ? id.substring(6) : id;
};

const sortSpacesNavDescending = (list: SpaceNavMeta[]): SpaceNavMeta[] =>
  [...(list || [])].sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });

const DASHBOARD_RETURN_SCROLL_Y_KEY = 'awa_dashboard_return_scroll_y';

export default function SpaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const spaceId = params?.id as string;
  const searchParams = useSearchParams();
  const { sessionData, updateSessionData, isInitialized } = useSessionData();
  const { language } = useLanguage();

  const [space, setSpace] = useState<Space | null>(null);
  const [selectedImage, setSelectedImage] = useState<SpaceImage | null>(null);
  const [filter, setFilter] = useState<'all' | 'generated' | 'inspiration'>('all');
  const [navSpaces, setNavSpaces] = useState<SpaceNavMeta[]>([]);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);

  const getUserHash = useCallback((): string | undefined => {
    let userHash = (sessionData as any)?.userHash as string | undefined;

    if (!userHash) {
      userHash =
        safeLocalStorage.getItem('aura_user_hash') || safeSessionStorage.getItem('aura_user_hash') || undefined;
    }

    return userHash;
  }, [sessionData]);

  const normalizedRouteSpaceId = useMemo(() => normalizeSpaceId(spaceId), [spaceId]);

  const sortedNavSpaces = useMemo(() => sortSpacesNavDescending(navSpaces), [navSpaces]);

  const galleryNavIndex = useMemo(() => {
    if (!normalizedRouteSpaceId) return -1;
    return sortedNavSpaces.findIndex((s) => normalizeSpaceId(s.id) === normalizedRouteSpaceId);
  }, [normalizedRouteSpaceId, sortedNavSpaces]);

  const prevGallerySpace = galleryNavIndex > 0 ? sortedNavSpaces[galleryNavIndex - 1] : null;
  const nextGallerySpace =
    galleryNavIndex >= 0 && galleryNavIndex < sortedNavSpaces.length - 1
      ? sortedNavSpaces[galleryNavIndex + 1]
      : null;

  const navigateToGallerySpace = useCallback(
    (targetId: string) => {
      const qs = filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : '';
      setSelectedImage(null);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      router.push(`/space/${targetId}${qs}`);
    },
    [filter, router],
  );

  const handleAddSpace = useCallback(async () => {
    if (isCreatingSpace) return;

    try {
      setIsCreatingSpace(true);

      const userHash = getUserHash();
      if (!userHash) {
        console.error('[SpacePage] No user hash found for adding space');
        router.push('/');
        return;
      }

      const newSpaceName = `${language === 'pl' ? 'Przestrzeń' : 'Space'} ${sortedNavSpaces.length + 1}`;
      const created = await createParticipantSpace(userHash, {
        name: newSpaceName,
        type: (sessionData as any)?.roomType || 'personal',
      });
      const newSpaceId = created?.id;
      if (!newSpaceId) return;

      const nowIso = new Date().toISOString();
      const newNavMeta: SpaceNavMeta = {
        id: newSpaceId,
        name: newSpaceName,
        type: (sessionData as any)?.roomType || 'personal',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setNavSpaces((prev) => sortSpacesNavDescending([newNavMeta, ...prev]));

      const existingSpaces = ((sessionData as any)?.spaces || []) as Space[];
      const newSessionSpace: Space = {
        id: newSpaceId,
        name: newSpaceName,
        type: (sessionData as any)?.roomType || 'personal',
        images: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      updateSessionData({
        spaces: [newSessionSpace, ...existingSpaces],
        currentSpaceId: newSpaceId,
      } as any);

      safeSessionStorage.setItem(DASHBOARD_RETURN_SCROLL_Y_KEY, String(window.scrollY));
      router.push(`/setup/room/${newSpaceId}`);
    } catch (error) {
      console.error('[SpacePage] Error creating space:', error);
    } finally {
      setIsCreatingSpace(false);
    }
  }, [getUserHash, isCreatingSpace, language, router, sessionData, sortedNavSpaces.length, updateSessionData]);

  useEffect(() => {
    if (!isInitialized || !spaceId) return;
    void updateSessionData({
      currentStep: 'space',
      currentSpaceId: spaceId,
    });
  }, [isInitialized, spaceId, updateSessionData]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedImage) return;
      if (!e.altKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      if (e.key === 'ArrowLeft' && prevGallerySpace) {
        e.preventDefault();
        navigateToGallerySpace(prevGallerySpace.id);
      }
      if (e.key === 'ArrowRight' && nextGallerySpace) {
        e.preventDefault();
        navigateToGallerySpace(nextGallerySpace.id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigateToGallerySpace, nextGallerySpace, prevGallerySpace, selectedImage]);

  useEffect(() => {
    (async () => {
      if (!spaceId) return;
      const userHash = (sessionData as any)?.userHash ||
        safeLocalStorage.getItem('aura_user_hash') || '';

      // NOTE: After radical refactor, Space view is derived from participant_images (source of truth).
      try {

        const [participantImages, participantSpaces] = await Promise.all([
          userHash ? fetchParticipantImages(userHash) : Promise.resolve([]),
          userHash ? fetchParticipantSpaces(userHash) : Promise.resolve([])
        ]);

        const remoteNavSpaces = sortSpacesNavDescending(
          (participantSpaces || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            type: s.type || 'personal',
            createdAt: s.createdAt,
            updatedAt: s.updatedAt || s.createdAt,
          })),
        );

        if (remoteNavSpaces.length > 0) {
          setNavSpaces(remoteNavSpaces);
        } else {
          const sessionSpaces = (sessionData as any)?.spaces || [];
          setNavSpaces(
            sortSpacesNavDescending(
              sessionSpaces.map((s: Space) => ({
                id: s.id,
                name: s.name,
                type: s.type,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
              })),
            ),
          );
        }

        const defaultSpaceId =
          (participantSpaces || []).find((s: any) => s.isDefault)?.id ||
          (participantSpaces || [])[0]?.id ||
          null;
        const normalizedDefaultSpaceId = defaultSpaceId?.startsWith('space_') ? defaultSpaceId.substring(6) : defaultSpaceId;

        // Normalize spaceId: remove "space_" prefix if present, for matching
        const normalizedSpaceId = spaceId?.startsWith('space_') ? spaceId.substring(6) : spaceId;

        const mergedImages = (() => {
          const byKey = new Map<string, SpaceImage>();
          const add = (img: SpaceImage) => {
            if (!img.url) return;
            const key = `${img.type}:${img.url}`;
            if (!byKey.has(key)) byKey.set(key, img);
          };

          // Source of truth: participant_images
          // Filter by spaceId: only show images that belong to this space
          (participantImages || [])
            .filter((img: any) => {
              // Only include generated/inspiration images
              if (img.type !== 'generated' && img.type !== 'inspiration') return false;
              // If image has spaceId, it must match normalizedSpaceId
              if (img.spaceId) {
                const imgSpaceId = img.spaceId?.startsWith('space_') ? img.spaceId.substring(6) : img.spaceId;
                return imgSpaceId === normalizedSpaceId;
              }
              // If image has no spaceId, include only if this is the default space (fallback for old data)
              return !!normalizedDefaultSpaceId && normalizedSpaceId === normalizedDefaultSpaceId;
            })
            .forEach((img: any) =>
              add({
                id: img.id,
                url: img.url,
                type: img.type,
                addedAt: img.createdAt || img.created_at || new Date().toISOString(),
                isFavorite: img.isFavorite ?? img.is_favorite,
                thumbnailUrl: img.thumbnailUrl || img.thumbnail_url,
                tags: img.tags
              })
            );
          
          const result = sortImagesDescending(Array.from(byKey.values()));
          
          
          return result;
        })();

        const currentSpaceMeta = (participantSpaces || []).find((s: any) => {
          const sid = s.id?.startsWith('space_') ? s.id.substring(6) : s.id;
          return sid === normalizedSpaceId;
        });

        const roomName = currentSpaceMeta?.name || (sessionData as any)?.roomName || 'Moja Przestrzeń';
        const roomType = currentSpaceMeta?.type || (sessionData as any)?.roomType || 'personal';

        const newSpace: Space = {
          id: spaceId,
          name: roomName,
          type: roomType,
          images: mergedImages,
          createdAt: mergedImages.length > 0 ? mergedImages[mergedImages.length - 1].addedAt : new Date().toISOString(),
          updatedAt: mergedImages.length > 0 ? mergedImages[0].addedAt : new Date().toISOString()
        };

        setSpace(newSpace);
        return;
      } catch (e) {
        console.warn('[SpacePage] remote fetch failed, fallback to session/local', e);
      }

      // Fallback to session data
      const spaces = (sessionData as any)?.spaces || [];
      setNavSpaces(
        sortSpacesNavDescending(
          spaces.map((s: Space) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          })),
        ),
      );
      const foundSpace = spaces.find((s: Space) => s.id === spaceId);
      if (foundSpace) {
        setSpace({ ...foundSpace, images: sortImagesDescending(foundSpace.images || []) });
        return;
      }

      // If nothing found, still stop infinite loading state
      setSpace({
        id: spaceId,
        name: (sessionData as any)?.roomName || 'Moja Przestrzeń',
        type: (sessionData as any)?.roomType || 'personal',
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    })();
  }, [spaceId, sessionData]);

  useEffect(() => {
    const qp = searchParams?.get('filter');
    if (qp === 'inspiration' || qp === 'generated' || qp === 'all') {
      setFilter(qp);
    }
  }, [searchParams]);

  const filteredImages = space?.images.filter(img => {
    if (filter === 'all') return true;
    return img.type === filter;
  }) || [];

  useEffect(() => {
    if (!selectedImage) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
        return;
      }
      const idx = filteredImages.findIndex((img) => img.id === selectedImage.id);
      if (e.key === 'ArrowLeft' && idx > 0) {
        setSelectedImage(filteredImages[idx - 1]);
      } else if (e.key === 'ArrowRight' && idx >= 0 && idx < filteredImages.length - 1) {
        setSelectedImage(filteredImages[idx + 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedImage, filteredImages]);

  const handleDeleteImage = (imageId: string) => {
    if (!space) return;

    const userHash = (sessionData as any)?.userHash || safeLocalStorage.getItem('aura_user_hash') || '';
    const isUuid = (id: string) =>
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);

    (async () => {

      if (userHash && isUuid(imageId)) {
        await deleteParticipantImage(userHash, imageId);
      }

      // Refresh from participant_images
      const participantImages = userHash ? await fetchParticipantImages(userHash) : [];
      const participantSpaces = userHash ? await fetchParticipantSpaces(userHash) : [];

      const defaultSpaceId =
        (participantSpaces || []).find((s: any) => s.isDefault)?.id || (participantSpaces || [])[0]?.id || null;
      const normalizedDefaultSpaceId = defaultSpaceId?.startsWith('space_')
        ? defaultSpaceId.substring(6)
        : defaultSpaceId;

      const refreshed = participantImages
        .filter((img: any) => {
          if (img.type !== 'generated' && img.type !== 'inspiration') return false;
          if (img.spaceId) {
            const imgSpaceId = img.spaceId?.startsWith('space_') ? img.spaceId.substring(6) : img.spaceId;
            return imgSpaceId === normalizedRouteSpaceId;
          }
          return !!normalizedDefaultSpaceId && normalizedRouteSpaceId === normalizedDefaultSpaceId;
        })
        .map((img: any) => ({
          id: img.id,
          url: img.url,
          type: img.type,
          addedAt: img.createdAt || img.created_at || new Date().toISOString(),
          isFavorite: img.isFavorite ?? img.is_favorite,
          thumbnailUrl: img.thumbnailUrl || img.thumbnail_url,
          tags: img.tags,
        })) as SpaceImage[];

      setSpace((prev) =>
        prev
          ? { ...prev, images: sortImagesDescending(refreshed), updatedAt: new Date().toISOString() }
          : prev
      );
      if (selectedImage?.id === imageId) setSelectedImage(null);
    })();
  };

  const handleDownloadImage = async (url: string) => {
    // Cross-origin URLs ignore <a download>; fetch → blob forces a file save when CORS allows.
    const stamp = Date.now();
    const triggerAnchorDownload = (href: string, filename: string) => {
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    try {
      if (url.startsWith('data:')) {
        const semi = url.indexOf(';');
        const mimePart = semi > 5 ? url.slice(5, semi) : 'image/png';
        triggerAnchorDownload(url, `image-${stamp}.${extensionFromMime(mimePart)}`);
        return;
      }

      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const ct = res.headers.get('content-type') || blob.type;
      const ext = extensionFromMime(ct || '') || extensionFromImageUrl(url) || 'png';
      triggerAnchorDownload(objectUrl, `image-${stamp}.${ext}`);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch (e) {
      console.error('[SpacePage] download image failed', e);
      alert(
        language === 'pl'
          ? 'Nie udało się pobrać obrazu (np. polityka CORS lub sieć). Spróbuj ponownie za chwilę.'
          : 'Could not download the image (network or CORS). Please try again in a moment.',
      );
    }
  };

  if (!space) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-silver-dark font-modern">
            {language === 'pl' ? 'Ładowanie...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <GlassButton
                onClick={() => {
                  const hasSavedDashboardPosition = safeSessionStorage.getItem('awa_dashboard_return_scroll_y');
                  router.push(hasSavedDashboardPosition ? '/dashboard?restoreScroll=1' : '/dashboard');
                }}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                <ArrowLeft size={20} className="mr-2" />
                {language === 'pl' ? 'Powrót do Dashboard' : 'Back to Dashboard'}
              </GlassButton>

              {sortedNavSpaces.length > 1 && (
                <div className="flex w-full justify-stretch gap-2 sm:w-auto sm:justify-end">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    disabled={!prevGallerySpace}
                    onClick={() => prevGallerySpace && navigateToGallerySpace(prevGallerySpace.id)}
                    className="flex-1 justify-center sm:flex-none"
                    aria-label={language === 'pl' ? 'Poprzednia galeria' : 'Previous gallery'}
                  >
                    <ChevronLeft size={18} className="mr-2" aria-hidden />
                    {language === 'pl' ? 'Poprzednia' : 'Previous'}
                  </GlassButton>
                  <GlassButton
                    type="button"
                    variant="secondary"
                    disabled={!nextGallerySpace}
                    onClick={() => nextGallerySpace && navigateToGallerySpace(nextGallerySpace.id)}
                    className="flex-1 justify-center sm:flex-none"
                    aria-label={language === 'pl' ? 'Następna galeria' : 'Next gallery'}
                  >
                    {language === 'pl' ? 'Następna' : 'Next'}
                    <ChevronRight size={18} className="ml-2" aria-hidden />
                  </GlassButton>
                </div>
              )}
            </div>

            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization text-graphite mb-2">
              {space.name}
            </h1>
            <p className="text-base lg:text-lg text-graphite font-modern">
              {filteredImages.length} {language === 'pl' ? 'obrazków' : 'images'}
            </p>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-modern transition-all duration-300 ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-gold to-champagne text-white'
                    : 'glass-panel text-graphite hover:bg-white/40'
                }`}
              >
                {language === 'pl' ? 'Wszystkie' : 'All'} ({space.images.length})
              </button>
              <button
                onClick={() => setFilter('generated')}
                className={`px-4 py-2 rounded-lg font-modern transition-all duration-300 flex items-center gap-2 ${
                  filter === 'generated'
                    ? 'bg-gradient-to-r from-gold to-platinum text-white'
                    : 'glass-panel text-graphite hover:bg-white/40'
                }`}
              >
                <Sparkles size={16} />
                {language === 'pl' ? 'Wygenerowane' : 'Generated'} (
                {space.images.filter(img => img.type === 'generated').length})
              </button>
              <button
                onClick={() => setFilter('inspiration')}
                className={`px-4 py-2 rounded-lg font-modern transition-all duration-300 flex items-center gap-2 ${
                  filter === 'inspiration'
                    ? 'bg-gradient-to-r from-champagne to-platinum text-white'
                    : 'glass-panel text-graphite hover:bg-white/40'
                }`}
              >
                <Heart size={16} />
                {language === 'pl' ? 'Inspiracje' : 'Inspirations'} (
                {space.images.filter(img => img.type === 'inspiration').length})
              </button>
            </div>
          </motion.div>

          {/* Images Grid */}
          {filteredImages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <GlassCard className="p-12 text-center">
                <p className="text-silver-dark font-modern">
                  {language === 'pl' ? 'Brak obrazków w tej kategorii' : 'No images in this category'}
                </p>
              </GlassCard>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="relative aspect-square rounded-xl overflow-hidden glass-panel cursor-pointer group"
                  onClick={() => setSelectedImage(image)}
                >
                  <Image
                    src={image.url}
                    alt={image.type}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  
                  {/* Type Badge */}
                  <div className="absolute top-2 left-2">
                    {image.type === 'generated' ? (
                      <div className="w-8 h-8 rounded-full bg-gold/80 flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-champagne/80 flex items-center justify-center">
                        <Heart size={16} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(image.url);
                        }}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                      >
                        <Download size={16} className="text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 border border-gold/30 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-1.5 sm:px-4 md:px-8 py-4 md:py-8 bg-black/80"
            onClick={() => setSelectedImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label={language === 'pl' ? 'Powiększone zdjęcie' : 'Zoomed image'}
          >
            {/* Grid aligned with layout: left col = IDA spacer, right col = header/content */}
            <div className="w-full max-w-screen-2xl mx-auto flex-1 flex flex-col xl:grid xl:grid-cols-[minmax(320px,0.3fr)_minmax(400px,0.7fr)] xl:gap-10 xl:items-start min-h-0">
              <div className="hidden xl:block" aria-hidden="true" />
              <div className="w-full flex flex-col items-center justify-center min-h-0">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="relative flex flex-col items-center justify-center w-full max-h-[calc(100vh-8rem)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                    {/* Lightbox image – full header width, rounded corners, plain img for reliable styling */}
                    <div
                      className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center overflow-hidden rounded-3xl"
                      style={{ borderRadius: '1.5rem' }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(null);
                        }}
                        className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition-colors hover:bg-black/60 sm:right-4 sm:top-4"
                        aria-label={language === 'pl' ? 'Zamknij' : 'Close'}
                      >
                        <X size={22} className="text-white" aria-hidden="true" />
                      </button>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedImage.url}
                        alt={selectedImage.type}
                        className="max-w-full max-h-full w-auto h-auto object-contain object-center"
                        style={{ borderRadius: 'inherit' }}
                      />
                    </div>

                    {/* Prev/next overlaid on image edges – only when multiple images */}
                    {filteredImages.length > 1 && (() => {
                      const idx = filteredImages.findIndex((img) => img.id === selectedImage.id);
                      const canGoPrev = idx > 0;
                      const canGoNext = idx >= 0 && idx < filteredImages.length - 1;
                      return (
                        <>
                          {canGoPrev && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(filteredImages[idx - 1]);
                              }}
                              className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/40"
                              aria-label={language === 'pl' ? 'Poprzednie zdjęcie' : 'Previous image'}
                            >
                              <ChevronLeft size={28} className="text-white" aria-hidden="true" />
                            </button>
                          )}
                          {canGoNext && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(filteredImages[idx + 1]);
                              }}
                              className="absolute right-14 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/40 sm:right-16"
                              aria-label={language === 'pl' ? 'Następne zdjęcie' : 'Next image'}
                            >
                              <ChevronRight size={28} className="text-white" aria-hidden="true" />
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="-mt-2 flex gap-2 justify-center flex-shrink-0 sm:-mt-3">
                    <GlassButton
                      onClick={() => handleDownloadImage(selectedImage.url)}
                      variant="secondary"
                      className="text-white hover:text-white"
                    >
                      <Download size={20} className="mr-2" />
                      {language === 'pl' ? 'Pobierz' : 'Download'}
                    </GlassButton>
                    <GlassButton
                      onClick={() => handleDeleteImage(selectedImage.id)}
                      variant="secondary"
                      className="bg-red-500/25 text-white hover:bg-red-500/45 hover:text-white"
                    >
                      <Trash2 size={20} className="mr-2" />
                      {language === 'pl' ? 'Usuń' : 'Delete'}
                    </GlassButton>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedImage && (
        <SpaceGalleryFloatingAddSpace
          language={language}
          disabled={isCreatingSpace}
          onAddSpace={handleAddSpace}
        />
      )}
    </div>
  );
}

function SpaceGalleryFloatingAddSpace({
  language,
  onAddSpace,
  disabled,
}: {
  language: 'pl' | 'en';
  onAddSpace: () => void;
  disabled: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      className="pointer-events-none fixed bottom-4 inset-x-4 z-[280] flex justify-center sm:bottom-6 lg:inset-x-8 xl:translate-x-[calc(15vw+1.25rem)] 2xl:translate-x-[250px]"
    >
      <GlassButton
        type="button"
        onClick={onAddSpace}
        disabled={disabled}
        className="pointer-events-auto flex min-h-[56px] w-full max-w-xl items-center justify-center gap-2 rounded-full border border-white/35 bg-white/45 px-6 py-3 shadow-[0_20px_60px_rgba(68,49,20,0.18)] backdrop-blur-glass transition hover:-translate-y-0.5 hover:bg-white/60 hover:shadow-[0_26px_70px_rgba(68,49,20,0.22)] sm:px-8 lg:max-w-2xl"
      >
        <Plus size={18} aria-hidden />
        <span className="font-modern text-sm font-semibold">
          {language === 'pl' ? 'Dodaj pomieszczenie' : 'Add a room'}
        </span>
      </GlassButton>
    </motion.div>
  );
}
