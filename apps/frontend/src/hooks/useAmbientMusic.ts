"use client";

import { useState, useEffect } from 'react';
import { isAmbientMusicSuppressed } from '@/lib/ambient-music-duck';
import {
  readAmbientMusicPrefs,
  setAmbientMusicUserPaused,
  shouldAutoPlayAmbientMusic,
  writeAmbientMusicVolume,
} from '@/lib/ambient-music-prefs';

interface AmbientMusicControls {
  volume: number;
  setVolume: (volume: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  mute: () => void;
  unmute: () => void;
}

function getAmbientAudioElement(): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement | null;
}

export const useAmbientMusic = (): AmbientMusicControls => {
  const [volume, setVolumeState] = useState(0.3);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const prefs = readAmbientMusicPrefs();
    setVolumeState(prefs.volume);

    const audioElement = getAmbientAudioElement();
    if (audioElement) {
      audioElement.volume = prefs.volume;
      setIsPlaying(!audioElement.paused && shouldAutoPlayAmbientMusic(prefs.volume));
    }
  }, []);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    let cleanup: (() => void) | undefined;
    let retryTimeout: NodeJS.Timeout | undefined;

    const setupAudioListeners = (): (() => void) | undefined => {
      const audioElement = getAmbientAudioElement();
      if (!audioElement) {
        if (retryCount < maxRetries) {
          retryCount += 1;
          retryTimeout = setTimeout(setupAudioListeners, 100);
        }
        return undefined;
      }

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);

      audioElement.addEventListener('play', handlePlay);
      audioElement.addEventListener('pause', handlePause);
      audioElement.addEventListener('ended', handleEnded);
      setIsPlaying(!audioElement.paused && shouldAutoPlayAmbientMusic(audioElement.volume));

      return () => {
        audioElement.removeEventListener('play', handlePlay);
        audioElement.removeEventListener('pause', handlePause);
        audioElement.removeEventListener('ended', handleEnded);
      };
    };

    cleanup = setupAudioListeners();

    const syncInterval = setInterval(() => {
      const audioElement = getAmbientAudioElement();
      if (!audioElement) return;

      const actualIsPlaying = !audioElement.paused && shouldAutoPlayAmbientMusic(audioElement.volume);
      setIsPlaying((prev) => (prev === actualIsPlaying ? prev : actualIsPlaying));
    }, 1000);

    const handleGlobalInteraction = () => {
      const audioElement = getAmbientAudioElement();
      if (!audioElement || !shouldAutoPlayAmbientMusic(volume)) return;
      if (audioElement.paused) {
        void audioElement.play().catch(() => {});
      }
    };

    document.addEventListener('click', handleGlobalInteraction, { passive: true });
    document.addEventListener('touchstart', handleGlobalInteraction, { passive: true });

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      cleanup?.();
      clearInterval(syncInterval);
      document.removeEventListener('click', handleGlobalInteraction);
      document.removeEventListener('touchstart', handleGlobalInteraction);
    };
  }, [volume]);

  const setVolume = (newVolume: number) => {
    const clampedVolume = writeAmbientMusicVolume(newVolume);
    setVolumeState(clampedVolume);

    const audioElement = getAmbientAudioElement();
    if (audioElement) {
      audioElement.volume = clampedVolume;
    }

    if (clampedVolume > 0) {
      setAmbientMusicUserPaused(false);
      if (audioElement?.paused) {
        void audioElement.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        setIsPlaying(true);
      }
    } else {
      setAmbientMusicUserPaused(true);
      audioElement?.pause();
      setIsPlaying(false);
    }

    if (typeof window !== 'undefined' && (window as Window & { setAmbientMusicVolume?: (value: number) => void }).setAmbientMusicVolume) {
      try {
        (window as Window & { setAmbientMusicVolume?: (value: number) => void }).setAmbientMusicVolume?.(clampedVolume);
      } catch {
        // ignore sync errors
      }
    }
  };

  const togglePlay = () => {
    const audioElement = getAmbientAudioElement();
    if (!audioElement) return;

    if (audioElement.paused) {
      setAmbientMusicUserPaused(false);
      const resumeVolume = volume > 0 ? volume : 0.3;
      if (volume <= 0) {
        setVolume(resumeVolume);
        return;
      }

      void audioElement.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
      return;
    }

    setAmbientMusicUserPaused(true);
    audioElement.pause();
    setIsPlaying(false);
  };

  const mute = () => {
    setVolume(0);
  };

  const unmute = () => {
    const prefs = readAmbientMusicPrefs();
    const restoreVolume = prefs.volume > 0 ? prefs.volume : 0.3;
    setAmbientMusicUserPaused(false);
    setVolume(restoreVolume > 0 ? restoreVolume : 0.3);
  };

  return {
    volume,
    setVolume,
    isPlaying,
    togglePlay,
    mute,
    unmute,
  };
};
