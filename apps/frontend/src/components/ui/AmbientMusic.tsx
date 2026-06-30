"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { isAmbientMusicSuppressed } from '@/lib/ambient-music-duck';
import {
  readAmbientMusicPrefs,
  shouldAutoPlayAmbientMusic,
  writeAmbientMusicVolume,
} from '@/lib/ambient-music-prefs';

interface AmbientMusicProps {
  volume?: number;
  audioFile?: string;
}

export const AmbientMusic: React.FC<AmbientMusicProps> = ({
  volume = 0.3,
  audioFile = '/audio/ambient.mp3',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitializedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(volume);
  const [, setIsLoaded] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let initTimeout: NodeJS.Timeout;

    const prefs = readAmbientMusicPrefs();
    const initialVolume = prefs.volume;
    const autoStart = shouldAutoPlayAmbientMusic(initialVolume);

    setCurrentVolume(initialVolume);

    const initializeAudio = () => {
      if (audioRef.current && !isInitializedRef.current) {
        isInitializedRef.current = true;
        cleanup = createAudioElement(initialVolume, autoStart);
      } else if (!audioRef.current) {
        initTimeout = setTimeout(initializeAudio, 100);
      }
    };

    initTimeout = setTimeout(initializeAudio, 100);

    return () => {
      isInitializedRef.current = false;
      clearTimeout(initTimeout);
      cleanup?.();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioFile, volume]);

  const createAudioElement = (startVolume: number, autoStart: boolean) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    audio.src = audioFile;
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, startVolume));
    audio.dataset.type = 'ambient';

    const canStartPlayback = () => shouldAutoPlayAmbientMusic(audio.volume);

    const tryPlay = () => {
      if (!audioRef.current || !canStartPlayback()) {
        audioRef.current?.pause();
        return;
      }

      void audioRef.current.play().catch(() => {
        // Autoplay policy — wait for explicit user interaction.
      });
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoaded = () => setIsLoaded(true);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadeddata', handleLoaded);
    audio.addEventListener('canplay', handleLoaded);

    if (!autoStart || !canStartPlayback()) {
      audio.pause();
    }

    const restartInterval = setInterval(() => {
      if (!audioRef.current || isAmbientMusicSuppressed() || !canStartPlayback()) return;
      if (isPlaying && audioRef.current.paused) {
        void audioRef.current.play().catch(() => {});
      }
    }, 2000);

    const startMusic = () => {
      if (!canStartPlayback()) return;
      tryPlay();
      removeInteractionListeners();
    };

    const handleUserInteraction = () => {
      startMusic();
    };

    const removeInteractionListeners = () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    // Only deliberate activations — touchstart/touchend fire during scroll on mobile.
    document.addEventListener('click', handleUserInteraction, { passive: true });
    document.addEventListener('keydown', handleUserInteraction, { passive: true });

    if (autoStart && canStartPlayback()) {
      setTimeout(tryPlay, 500);
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadeddata', handleLoaded);
      audio.removeEventListener('canplay', handleLoaded);
      clearInterval(restartInterval);
      removeInteractionListeners();
    };
  };

  useEffect(() => {
    if (isAmbientMusicSuppressed()) return;
    if (!audioRef.current) return;

    audioRef.current.volume = currentVolume;

    if (!shouldAutoPlayAmbientMusic(currentVolume)) {
      audioRef.current.pause();
    }
  }, [currentVolume]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = writeAmbientMusicVolume(newVolume);
    setCurrentVolume(clampedVolume);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as Window & { setAmbientMusicVolume?: (value: number) => void }).setAmbientMusicVolume = setVolume;
    }
  }, [setVolume]);

  return (
    <audio
      ref={audioRef}
      style={{ display: 'none' }}
      data-type="ambient"
      loop
      preload="auto"
    />
  );
};

export default AmbientMusic;
