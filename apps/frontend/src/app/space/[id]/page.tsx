"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ArrowLeft, Heart, Sparkles, Trash2, Download, X } from 'lucide-react';
import Image from 'next/image';
import { deleteParticipantImage, fetchParticipantImages, fetchParticipantSpaces } from '@/lib/remote-spaces';
import { safeLocalStorage } from '@/lib/supabase';

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

export default function SpaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const spaceId = params?.id as string;
  const searchParams = useSearchParams();
  const { sessionData, updateSessionData } = useSessionData();
  const { language } = useLanguage();

  const [space, setSpace] = useState<Space | null>(null);
  const [selectedImage, setSelectedImage] = useState<SpaceImage | null>(null);
  const [filter, setFilter] = useState<'all' | 'generated' | 'inspiration'>('all');

  useEffect(() => {
    (async () => {
      if (!spaceId) return;
      const userHash = (sessionData as any)?.userHash ||
        safeLocalStorage.getItem('aura_user_hash') || '';

      // NOTE: After radical refactor, Space view is derived from participant_images (source of truth).
      try {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'space/[id]/page.tsx:load-space-entry',message:'Loading space detail',data:{spaceId,hasUserHash:!!userHash,userHash:userHash||null,sessionSpaceCount:((sessionData as any)?.spaces||[]).length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'SD1'})}).catch(()=>{});
        // #endregion

        const [participantImages, participantSpaces] = await Promise.all([
          userHash ? fetchParticipantImages(userHash) : Promise.resolve([]),
          userHash ? fetchParticipantSpaces(userHash) : Promise.resolve([])
        ]);

        const defaultSpaceId =
          (participantSpaces || []).find((s: any) => s.isDefault)?.id ||
          (participantSpaces || [])[0]?.id ||
          null;
        const normalizedDefaultSpaceId = defaultSpaceId?.startsWith('space_') ? defaultSpaceId.substring(6) : defaultSpaceId;

        // Normalize spaceId: remove "space_" prefix if present, for matching
        const normalizedSpaceId = spaceId?.startsWith('space_') ? spaceId.substring(6) : spaceId;

        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'space/[id]/page.tsx:load-space-fetched',message:'Fetched participant_images for space detail',data:{spaceId,normalizedSpaceId,userHash:userHash||null,imageCount:participantImages.length,generatedCount:participantImages.filter(i=>i.type==='generated').length,inspirationCount:participantImages.filter(i=>i.type==='inspiration').length,imagesWithSpaceId:participantImages.filter((i:any)=>i.spaceId).length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'SD2'})}).catch(()=>{});
        // #endregion

        // Inspirations from session (global) to display inside the space
        const sessionInspirations = ((sessionData as any)?.inspirations || []).map((insp: any) => ({
          id: insp.id || `insp-${insp.url || Math.random()}`,
          url: insp.url || insp.imageBase64,
          type: 'inspiration' as const,
          addedAt: insp.addedAt || new Date().toISOString(),
          isFavorite: false,
          thumbnailUrl: insp.thumbnailUrl,
          tags: insp.tags
        }));

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

          // Session inspirations are global, so don't filter by spaceId
          sessionInspirations.forEach(add);
          
          const result = sortImagesDescending(Array.from(byKey.values()));
          
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'space/[id]/page.tsx:load-space-filtered',message:'Filtered images by spaceId',data:{spaceId,normalizedSpaceId,filteredCount:result.length,generatedCount:result.filter(i=>i.type==='generated').length,inspirationCount:result.filter(i=>i.type==='inspiration').length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'SD4'})}).catch(()=>{});
          // #endregion
          
          return result;
        })();

        const roomName = (sessionData as any)?.roomName || 'Moja Przestrzeń';
        const roomType = (sessionData as any)?.roomType || 'personal';

        const newSpace: Space = {
          id: spaceId,
          name: roomName,
          type: roomType,
          images: mergedImages,
          createdAt: mergedImages.length > 0 ? mergedImages[mergedImages.length - 1].addedAt : new Date().toISOString(),
          updatedAt: mergedImages.length > 0 ? mergedImages[0].addedAt : new Date().toISOString()
        };

        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'space/[id]/page.tsx:load-space-set',message:'Setting space state from participant_images',data:{spaceId,userHash:userHash||null,totalImages:newSpace.images.length,totalGenerated:newSpace.images.filter(i=>i.type==='generated').length,totalInspirations:newSpace.images.filter(i=>i.type==='inspiration').length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'SD3'})}).catch(()=>{});
        // #endregion

        setSpace(newSpace);
        return;
      } catch (e) {
        console.warn('[SpacePage] remote fetch failed, fallback to session/local', e);
      }

      // Fallback to session data
    const spaces = (sessionData as any)?.spaces || [];
    const foundSpace = spaces.find((s: Space) => s.id === spaceId);
    if (foundSpace) {
      // Merge inspirations from session so they are visible here too
      const sessionInspirations = ((sessionData as any)?.inspirations || []).map((insp: any) => ({
        id: insp.id || `insp-${insp.url || Math.random()}`,
        url: insp.url || insp.imageBase64,
        type: 'inspiration' as const,
        addedAt: insp.addedAt || new Date().toISOString(),
        isFavorite: false,
        thumbnailUrl: insp.thumbnailUrl,
        tags: insp.tags
      }));

      const byKey = new Map<string, SpaceImage>();
      const add = (img: SpaceImage) => {
        if (!img.url) return;
        const key = `${img.type}:${img.url}`;
        if (!byKey.has(key)) byKey.set(key, img);
      };

      (foundSpace.images || []).forEach(add);
      sessionInspirations.forEach(add);

      setSpace({ ...foundSpace, images: sortImagesDescending(Array.from(byKey.values())) });
      return;
    }

    // If nothing found, still stop infinite loading state
    setSpace({
      id: spaceId,
      name: (sessionData as any)?.roomName || 'Moja Przestrzeń',
      type: (sessionData as any)?.roomType || 'personal',
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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

  const handleDeleteImage = (imageId: string) => {
    if (!space) return;

    const userHash = (sessionData as any)?.userHash || safeLocalStorage.getItem('aura_user_hash') || '';
    const isUuid = (id: string) =>
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);

    (async () => {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'space/[id]/page.tsx:delete-image',message:'Deleting image from space detail',data:{spaceId,userHash:userHash||null,imageId,isUuid:isUuid(imageId)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'SD4'})}).catch(()=>{});
      // #endregion

      if (userHash && isUuid(imageId)) {
        await deleteParticipantImage(userHash, imageId);
      }

      // Refresh from participant_images
      const participantImages = userHash ? await fetchParticipantImages(userHash) : [];
      const refreshed = participantImages
        .filter((img: any) => img.type === 'generated' || img.type === 'inspiration')
        .map((img: any) => ({
          id: img.id,
          url: img.url,
          type: img.type,
          addedAt: img.createdAt || img.created_at || new Date().toISOString(),
          isFavorite: img.isFavorite ?? img.is_favorite,
          thumbnailUrl: img.thumbnailUrl || img.thumbnail_url,
          tags: img.tags
        })) as SpaceImage[];

      setSpace((prev) =>
        prev
          ? { ...prev, images: sortImagesDescending(refreshed), updatedAt: new Date().toISOString() }
          : prev
      );
      if (selectedImage?.id === imageId) setSelectedImage(null);
    })();
  };

  const handleDownloadImage = (url: string) => {
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <GlassButton
              onClick={() => router.push('/dashboard')}
              variant="secondary"
              className="mb-4"
            >
              <ArrowLeft size={20} className="mr-2" />
              {language === 'pl' ? 'Powrót do Dashboard' : 'Back to Dashboard'}
            </GlassButton>

            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-2">
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
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
            
            <div className="relative aspect-square rounded-2xl overflow-hidden">
              <Image
                src={selectedImage.url}
                alt={selectedImage.type}
                fill
                className="object-contain"
              />
            </div>

            <div className="mt-4 flex gap-2 justify-center">
              <GlassButton
                onClick={() => handleDownloadImage(selectedImage.url)}
                variant="secondary"
              >
                <Download size={20} className="mr-2" />
                {language === 'pl' ? 'Pobierz' : 'Download'}
              </GlassButton>
              <GlassButton
                onClick={() => handleDeleteImage(selectedImage.id)}
                variant="secondary"
                className="bg-red-500/20 hover:bg-red-500/40"
              >
                <Trash2 size={20} className="mr-2" />
                {language === 'pl' ? 'Usuń' : 'Delete'}
              </GlassButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
