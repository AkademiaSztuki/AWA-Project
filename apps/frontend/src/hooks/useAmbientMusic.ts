"use client";

import { useState, useEffect } from 'react';
import { safeLocalStorage } from '@/lib/supabase';

interface AmbientMusicControls {
  volume: number;
  setVolume: (volume: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  mute: () => void;
  unmute: () => void;
}

export const useAmbientMusic = (): AmbientMusicControls => {
  const [volume, setVolumeState] = useState(0.4); // Zmniejszone z 0.8 do 0.4 (połowa)
  const [isPlaying, setIsPlaying] = useState(false);

  // Zapisz głośność w localStorage i synchronizuj z audio
  useEffect(() => {
    const savedVolume = safeLocalStorage.getItem('ambient-music-volume');
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

  // Nasłuchuj zmian w audio elemencie - czekaj aż element będzie dostępny
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    let cleanup: (() => void) | undefined;
    let retryTimeout: NodeJS.Timeout | undefined;
    
    const setupAudioListeners = (): (() => void) | undefined => {
      const audioElement = document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement;
      if (!audioElement) {
        if (retryCount < maxRetries) {
          retryCount++;
          retryTimeout = setTimeout(setupAudioListeners, 100);
        } else {
          console.warn('useAmbientMusic: Audio element not found after retries');
        }
        return undefined;
      }

      console.log('useAmbientMusic: Audio element found, setting up listeners');
      
      const handlePlay = () => {
        console.log('useAmbientMusic: play event');
        setIsPlaying(true);
      };
      const handlePause = () => {
        console.log('useAmbientMusic: pause event');
        setIsPlaying(false);
      };
      const handleEnded = () => {
        console.log('useAmbientMusic: ended event');
        setIsPlaying(false);
      };

      audioElement.addEventListener('play', handlePlay);
      audioElement.addEventListener('pause', handlePause);
      audioElement.addEventListener('ended', handleEnded);

      // Sprawdź początkowy stan
      setIsPlaying(!audioElement.paused);
      console.log('useAmbientMusic: Initial playing state:', !audioElement.paused);

      // Zwróć cleanup function
      return () => {
        audioElement.removeEventListener('play', handlePlay);
        audioElement.removeEventListener('pause', handlePause);
        audioElement.removeEventListener('ended', handleEnded);
      };
    };
    
    cleanup = setupAudioListeners();
    
    // Zwróć cleanup function dla useEffect
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    safeLocalStorage.setItem('ambient-music-volume', clampedVolume.toString());
    
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
    // Spróbuj znaleźć element audio - może być tworzony asynchronicznie
    let audioElement = document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement;
    
    // Jeśli nie znaleziono, spróbuj znaleźć przez wszystkie audio elementy
    if (!audioElement) {
      const allAudio = document.querySelectorAll('audio');
      console.log('useAmbientMusic: Found audio elements:', allAudio.length);
      for (const audio of Array.from(allAudio)) {
        if (audio.dataset.type === 'ambient') {
          audioElement = audio as HTMLAudioElement;
          break;
        }
      }
    }
    
    console.log('useAmbientMusic: togglePlay called, audioElement found:', !!audioElement);
    
    if (!audioElement) {
      console.warn('useAmbientMusic: Audio element not found! Trying to find it...');
      // Spróbuj jeszcze raz po krótkim opóźnieniu
      setTimeout(() => {
        const retryElement = document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement;
        if (retryElement) {
          console.log('useAmbientMusic: Audio element found on retry');
          if (retryElement.paused) {
            retryElement.play().then(() => setIsPlaying(true)).catch(err => console.error(err));
          } else {
            retryElement.pause();
            setIsPlaying(false);
          }
        } else {
          console.error('useAmbientMusic: Audio element still not found after retry');
        }
      }, 100);
      return;
    }
    
    console.log('useAmbientMusic: Current state - paused:', audioElement.paused, 'readyState:', audioElement.readyState);
    
    if (audioElement.paused) {
      console.log('useAmbientMusic: Attempting to play...');
      // Oznacz, że użytkownik ręcznie włączył muzykę (resetuj flagę)
      if (typeof window !== 'undefined') {
        (window as any).ambientMusicUserManuallyPaused = false;
      }
      
      // Upewnij się, że audio jest gotowe
      if (audioElement.readyState < 2) {
        // Jeśli audio nie jest gotowe, poczekaj na załadowanie
        audioElement.addEventListener('canplay', () => {
          audioElement.play().then(() => {
            console.log('useAmbientMusic: Play successful after canplay');
            setIsPlaying(true);
          }).catch(error => {
            console.error('useAmbientMusic: Failed to play ambient music after canplay:', error);
            setIsPlaying(false);
          });
        }, { once: true });
      } else {
        // Audio jest gotowe, odtwórz natychmiast
        audioElement.play().then(() => {
          console.log('useAmbientMusic: Play successful');
          setIsPlaying(true);
        }).catch(error => {
          console.error('useAmbientMusic: Failed to play ambient music:', error);
          setIsPlaying(false);
          // Na mobile może być problem z autoplay policy - spróbuj jeszcze raz po krótkim opóźnieniu
          if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
            console.log('useAmbientMusic: Autoplay blocked, will retry after user interaction');
          }
        });
      }
    } else {
      console.log('useAmbientMusic: Pausing...');
      // Oznacz, że użytkownik ręcznie wyłączył muzykę
      if (typeof window !== 'undefined') {
        (window as any).ambientMusicUserManuallyPaused = true;
      }
      audioElement.pause();
      setIsPlaying(false);
    }
  };

  const mute = () => {
    setVolume(0);
  };

  const unmute = () => {
    setVolume(0.4); // Przywróć domyślną głośność (zmniejszone z 0.8)
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