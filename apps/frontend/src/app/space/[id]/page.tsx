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

interface SpaceImage {
  id: string;
  url: string;
  type: 'generated' | 'inspiration';
  addedAt: string;
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
    // Load space data
    const spaces = (sessionData as any)?.spaces || [];
    const foundSpace = spaces.find((s: Space) => s.id === spaceId);
    if (foundSpace) {
      setSpace(foundSpace);
    }
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
    
    const updatedImages = space.images.filter(img => img.id !== imageId);
    const updatedSpace = { ...space, images: updatedImages, updatedAt: new Date().toISOString() };
    
    // Update spaces in session data
    const spaces = (sessionData as any)?.spaces || [];
    const updatedSpaces = spaces.map((s: Space) => s.id === spaceId ? updatedSpace : s);
    
    updateSessionData({ spaces: updatedSpaces });
    setSpace(updatedSpace);
    
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
    }
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
