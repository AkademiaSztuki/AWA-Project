"use client";

import { useState, useEffect } from 'react';

interface AmbientMusicControls {
  volume: number;
  setVolume: (volume: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  mute: () => void;
  unmute: () => void;
}

export const useAmbientMusic = (): AmbientMusicControls => {
  const [volume, setVolumeState] = useState(0.4);
  const [isPlaying, setIsPlaying] = useState(false);

  // Zapisz głośność w localStorage i synchronizuj z audio
  useEffect(() => {
    const savedVolume = localStorage.getItem('ambient-music-volume');
    if (savedVolume) {
      const parsedVolume = parseFloat(savedVolume);
      setVolumeState(parsedVolume);
      
      // Synchronizuj z audio elementem
      const audioElement = document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement;
      if (audioElement) {
        audioElement.volume = parsedVolume;
        setIsPlaying(!audioElement.paused);
      }
    }
  }, []);

  // Nasłuchuj zmian w audio elemencie
  useEffect(() => {
    const audioElement = document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement;
    if (!audioElement) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);

    // Sprawdź początkowy stan
    setIsPlaying(!audioElement.paused);

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, []);

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    localStorage.setItem('ambient-music-volume', clampedVolume.toString());
    
    // Użyj funkcji z AmbientMusic komponentu
    if (typeof window !== 'undefined' && (window as any).setAmbientMusicVolume) {
      (window as any).setAmbientMusicVolume(clampedVolume);
    } else {
      // Fallback - aktualizuj głośność bezpośrednio w elemencie audio
      const audioElement = document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement;
      if (audioElement) {
        audioElement.volume = clampedVolume;
      }
    }
  };

  const togglePlay = () => {
    const audioElement = document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement;
    if (audioElement) {
      if (audioElement.paused) {
        audioElement.play().catch(error => {
          console.error('Failed to play ambient music:', error);
        });
      } else {
        audioElement.pause();
      }
    }
  };

  const mute = () => {
    setVolume(0);
  };

  const unmute = () => {
    setVolume(0.4); // Przywróć domyślną głośność
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