"use client";

import React, { useState, useEffect } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { TinderCard } from '@/components/ui/TinderCard';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/hooks/useSessionData';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';

// Mock data - replace with real images
const INTERIOR_IMAGES = [
  { id: '1', url: '/images/interiors/scandinavian-1.jpg', style: 'skandynawski', tags: ['jasny', 'minimalistyczny', 'drewno'] },
  { id: '2', url: '/images/interiors/industrial-1.jpg', style: 'industrialny', tags: ['metal', 'surowy', 'loft'] },
  { id: '3', url: '/images/interiors/boho-1.jpg', style: 'boho', tags: ['kolorowy', 'tekstury', 'eklektyczny'] },
  // ... więcej obrazów
];

const TinderScreen: React.FC = () => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeData, setSwipeData] = useState<Array<{
    imageId: string;
    direction: 'left' | 'right';
    reactionTime: number;
    timestamp: string;
  }>>([]);
  const { updateSessionData, sessionData } = useSessionData();

  const handleSwipe = (direction: 'left' | 'right', reactionTime: number) => {
    const currentImage = INTERIOR_IMAGES[currentIndex];

    const newSwipe = {
      imageId: currentImage.id,
      direction,
      reactionTime,
      timestamp: new Date().toISOString()
    };

    setSwipeData(prev => [...prev, newSwipe]);

    // Next card or finish
    if (currentIndex < INTERIOR_IMAGES.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Save results and proceed
      stopAllDialogueAudio(); // Zatrzymaj dźwięk przed nawigacją
      updateSessionData({
        tinderResults: [
          ...(sessionData.tinderResults || []),
          ...swipeData.map(s => ({
            imageId: s.imageId,
            direction: s.direction,
            reactionTimeMs: s.reactionTime,
            timestamp: s.timestamp
          }))
        ]
      });
      router.push('/flow/dna');
    }
  };

  const progress = ((currentIndex + 1) / INTERIOR_IMAGES.length) * 100;

  return (
    <div className="min-h-screen flex flex-col w-full">
      

      <AwaContainer
        currentStep="tinder"
        showDialogue={false}
        fullWidth={true}
        autoHide={false}
      />

      <div className="flex-1 flex flex-col p-8">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="glass-panel rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gold-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 mt-2 font-modern">
            {currentIndex + 1} / {INTERIOR_IMAGES.length}
          </p>
        </div>

        {/* Card Container */}
        <div className="flex-1 relative w-full">
          {INTERIOR_IMAGES.map((image, index) => (
            <div
              key={image.id}
              className={`absolute inset-0 ${
                index === currentIndex ? 'z-20' : 
                index === currentIndex + 1 ? 'z-10' : 'z-0'
              }`}
              style={{
                transform: index > currentIndex ? 'scale(0.95)' : 'scale(1)',
                opacity: index > currentIndex + 1 ? 0 : 1
              }}
            >
              {index <= currentIndex + 1 && (
                <TinderCard
                  image={image.url}
                  title={`Styl ${image.style}`}
                  tags={image.tags}
                  onSwipe={handleSwipe}
                  isActive={index === currentIndex}
                />
              )}
            </div>
          ))}
        </div>

        {/* Instructions */}
        <GlassCard className="mt-4 text-center w-full">
          <div className="flex justify-center items-center gap-8 text-sm font-modern">
            <div className="flex items-center gap-2">
              <span className="text-2xl">←</span>
              <span className="text-red-600">Nie podoba mi się</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">Intryguje mnie</span>
              <span className="text-2xl">→</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Przesuń kartę lub użyj strzałek na klawiaturze
          </p>
        </GlassCard>
      </div>

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="tinder" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
};

export default TinderScreen;