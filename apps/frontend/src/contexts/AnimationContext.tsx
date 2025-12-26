"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type AnimationType = 'idle1' | 'loading_anim' | 'talk1' | 'talk2' | 'talk3';

interface AnimationContextType {
  currentAnimation: AnimationType;
  isPlaying: boolean;
  playAnimation: (animation: AnimationType) => void;
  onAnimationEnd: () => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    // Return a no-op implementation if context is not available
    // This allows AwaDialogue to work even if AnimationProvider is not present
    console.warn('useAnimation called outside AnimationProvider, using no-op implementation');
    return {
      currentAnimation: 'idle1' as AnimationType,
      isPlaying: false,
      playAnimation: () => {},
      onAnimationEnd: () => {},
    };
  }
  return context;
};

interface AnimationProviderProps {
  children: ReactNode;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>('idle1');
  const [isPlaying, setIsPlaying] = useState(false);

  const playAnimation = useCallback((animation: AnimationType) => {
    console.log('[AnimationContext] Playing animation:', animation);
    setCurrentAnimation(animation);
    setIsPlaying(true);
  }, []);

  const onAnimationEnd = useCallback(() => {
    console.log('[AnimationContext] Animation ended, returning to idle1');
    setCurrentAnimation('idle1');
    setIsPlaying(false);
  }, []);

  return (
    <AnimationContext.Provider
      value={{
        currentAnimation,
        isPlaying,
        playAnimation,
        onAnimationEnd,
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
};

