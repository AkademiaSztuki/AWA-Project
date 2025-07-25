'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useSession } from '@/hooks';
import GlassSurface from 'src/components/ui/GlassSurface';
import { GlassCard } from '@/components/ui/GlassCard';
import { Heart, X, RotateCcw } from 'lucide-react';
import Image from 'next/image';

// Sample interior images with tags for analysis
const INTERIOR_IMAGES = [
  { id: 1, url: '/images/interiors/modern-living-1.jpg', tags: ['modern', 'minimal', 'neutral', 'clean'] },
  { id: 2, url: '/images/interiors/cozy-bedroom-1.jpg', tags: ['cozy', 'warm', 'textured', 'natural'] },
  { id: 3, url: '/images/interiors/industrial-kitchen-1.jpg', tags: ['industrial', 'dark', 'metal', 'urban'] },
  { id: 4, url: '/images/interiors/bohemian-living-1.jpg', tags: ['bohemian', 'colorful', 'eclectic', 'artistic'] },
  { id: 5, url: '/images/interiors/scandinavian-bedroom-1.jpg', tags: ['scandinavian', 'light', 'wood', 'simple'] },
  { id: 30, url: '/images/interiors/luxurious-bathroom-1.jpg', tags: ['luxury', 'marble', 'gold', 'elegant'] },
];

export default function TinderTestPage() {
  const router = useRouter();
  const { sessionData, updateSession } = useSession();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [swipeResults, setSwipeResults] = useState<Array<{
    imageId: number;
    direction: 'left' | 'right';
    timestamp: number;
    reactionTime: number;
  }>>([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const currentImage = INTERIOR_IMAGES[currentImageIndex];
  const progress = ((currentImageIndex + 1) / INTERIOR_IMAGES.length) * 100;

  useEffect(() => {
    setStartTime(Date.now());
  }, [currentImageIndex]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentImage) return;
    const reactionTime = Date.now() - startTime;
    const swipeData = {
      imageId: currentImage.id,
      direction,
      timestamp: Date.now(),
      reactionTime,
      tags: currentImage.tags,
    };
    const newResults = [...swipeResults, swipeData];
    setSwipeResults(newResults);
    if (currentImageIndex + 1 >= INTERIOR_IMAGES.length) {
      setIsComplete(true);
      updateSession({ tinderData: { swipes: newResults } });
      setTimeout(() => {
        router.push('/flow/dna');
      }, 2000);
    } else {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    const power = 200;
    if (info.offset.x > threshold || info.velocity.x > power) {
      handleSwipe('right');
    } else if (info.offset.x < -threshold || info.velocity.x < -power) {
      handleSwipe('left');
    }
  };

  if (showInstructions) {
    return (
      <div className="min-h-screen flex items-center justify-center w-full">
        <div className="w-full max-w-3xl mx-auto">
          <GlassCard className="w-full p-6 md:p-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl max-h-[90vh] overflow-auto">
            <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">Wnętrzarski Tinder</h1>
            <p className="text-base md:text-lg text-gray-700 font-modern mb-3 leading-relaxed">
              Pokażę Ci {INTERIOR_IMAGES.length} różnych wnętrz. Przesuwaj w prawo (❤️) jeśli Ci się podobają,
               w lewo (✕) jeśli Ci się nie podobają.
            </p>
            <div className="flex justify-center space-x-8 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-3 bg-red-100 rounded-full">
                  <X className="text-red-500" size={24} />
                </div>
                <span className="text-graphite">Nie podoba mi się</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-3 bg-green-100 rounded-full">
                  <Heart className="text-green-500" size={24} />
                </div>
                <span className="text-graphite">Podoba mi się</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-6 justify-center mt-6">
              <GlassSurface
                width={220}
                height={56}
                borderRadius={32}
                className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
                onClick={() => router.push('/flow/photo')}
                aria-label="Powrót"
                style={{ opacity: 1 }}
              >
                ← Powrót
              </GlassSurface>
              <GlassSurface
                width={260}
                height={56}
                borderRadius={32}
                className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
                onClick={() => setShowInstructions(false)}
                aria-label="Rozpocznij"
                style={{ opacity: 1 }}
              >
                Rozpocznij Test
              </GlassSurface>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center w-full">
      <div className="w-full max-w-3xl mx-auto">
        <GlassCard className="w-full p-6 md:p-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl max-h-[90vh] overflow-auto">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-silver-dark">Postęp</span>
              <span className="text-sm text-silver-dark">
                {currentImageIndex + 1} / {INTERIOR_IMAGES.length}
              </span>
            </div>
            <div className="w-full bg-silver/20 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-gold to-champagne h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="relative h-96 mb-8">
            <AnimatePresence>
              {!isComplete && currentImage && (
                <motion.div
                  key={currentImage.id}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ 
                    scale: 0, 
                    opacity: 0,
                    transition: { duration: 0.2 }
                  }}
                  whileDrag={{ scale: 1.05, rotate: 5 }}
                >
                  <GlassCard className="h-full p-2">
                    <div className="relative h-full rounded-lg overflow-hidden">
                      <Image
                        src={currentImage.url}
                        alt="Interior"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <GlassCard className="p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-gold to-champagne flex items-center justify-center"
                  >
                    <RotateCcw className="text-white" size={32} />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-graphite mb-2">
                    Analiza w toku...
                  </h3>
                  <p className="text-silver-dark">
                    Odkrywam Twoje wizualne DNA
                  </p>
                </GlassCard>
              </motion.div>
            )}
          </div>
          {!isComplete && (
            <div className="flex justify-center space-x-4">
              <GlassSurface
                width={64}
                height={64}
                borderRadius={32}
                className="cursor-pointer select-none transition-transform duration-200 hover:scale-110 shadow-xl focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center justify-center bg-red-100"
                onClick={() => handleSwipe('left')}
                aria-label="Nie podoba mi się"
                style={{ opacity: 1 }}
              >
                <X className="text-red-500" size={24} />
              </GlassSurface>
              <GlassSurface
                width={64}
                height={64}
                borderRadius={32}
                className="cursor-pointer select-none transition-transform duration-200 hover:scale-110 shadow-xl focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center justify-center bg-green-100"
                onClick={() => handleSwipe('right')}
                aria-label="Podoba mi się"
                style={{ opacity: 1 }}
              >
                <Heart className="text-green-500" size={24} />
              </GlassSurface>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
