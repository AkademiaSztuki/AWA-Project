"use client";

import React, { useEffect, useRef, useState } from 'react';
import { safeLocalStorage } from '@/lib/supabase';

interface AmbientMusicProps {
  volume?: number; // 0-1, domyślnie 0.3 (30%)
  audioFile?: string; // ścieżka do pliku audio
}

export const AmbientMusic: React.FC<AmbientMusicProps> = ({ 
  volume = 0.1, // Ustawione na 10% maksymalnego (0.1 z 1.0)
  audioFile = "/audio/ambient.mp3" 
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitializedRef = useRef(false);
  const userManuallyPausedRef = useRef(false); // Flaga - czy użytkownik ręcznie wyłączył muzykę
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(volume);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    console.log('AmbientMusic: Initializing with file:', audioFile, 'volume:', volume);

    let cleanup: (() => void) | undefined;
    let isCancelled = false;

    let initialVolume = volume;
    if (typeof window !== 'undefined') {
      try {
        const savedVolume = safeLocalStorage.getItem('ambient-music-volume');
        if (savedVolume !== null) {
          const parsed = parseFloat(savedVolume);
          if (!Number.isNaN(parsed)) {
            initialVolume = Math.max(0, Math.min(1, parsed));
          }
        }
      } catch (error) {
        console.warn('AmbientMusic: Nie udało się odczytać zapisanej głośności.', error);
      }
    }

    setCurrentVolume(initialVolume);

    // Inicjalizuj element audio od razu (nie czekaj na sprawdzenie pliku)
    // Element audio jest już w DOM przez return statement
    // Użyj setTimeout, aby upewnić się, że element jest już w DOM
    let initTimeout: NodeJS.Timeout;
    
    const initializeAudio = () => {
      if (audioRef.current && !isInitializedRef.current) {
        console.log('AmbientMusic: Audio element found in DOM, initializing...');
        isInitializedRef.current = true;
        cleanup = createAudioElement(initialVolume);
      } else if (!audioRef.current) {
        console.warn('AmbientMusic: Audio element not found in DOM, retrying...');
        // Spróbuj jeszcze raz po krótkim opóźnieniu
        initTimeout = setTimeout(initializeAudio, 100);
      } else {
        console.log('AmbientMusic: Audio element already initialized');
      }
    };
    
    initTimeout = setTimeout(initializeAudio, 100);
    
    // Sprawdź czy plik istnieje (opcjonalnie, nie blokuje inicjalizacji)
    fetch(audioFile, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          console.warn('AmbientMusic: Audio file not found:', audioFile, '(but element will still work)');
        } else {
          console.log('AmbientMusic: Audio file found:', audioFile);
        }
      })
      .catch(error => {
        console.warn('AmbientMusic: Error checking audio file:', error, '(but element will still work)');
      });

    return () => {
      isCancelled = true;
      isInitializedRef.current = false;
      clearTimeout(initTimeout);
      if (cleanup) {
        cleanup();
      }
      if (audioRef.current) {
        // Fallback – upewnij się, że audio jest zatrzymane
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioFile, volume]);

  const createAudioElement = (startVolume: number) => {
    // Użyj elementu audio z DOM (audioRef.current powinien być już ustawiony)
    if (!audioRef.current) {
      console.error('AmbientMusic: audioRef.current is null!');
      return;
    }
    
    const audio = audioRef.current;
    
    // Ustaw właściwości
    audio.src = audioFile;
    audio.loop = true; // Zapętlenie muzyki
    const effectiveVolume = Math.max(0, Math.min(1, startVolume));
    audio.volume = effectiveVolume;
    audio.dataset.type = 'ambient'; // Dodaj identyfikator (już jest w DOM, ale upewnijmy się)
    
    console.log('AmbientMusic: Audio element initialized:', {
      src: audio.src,
      volume: audio.volume,
      loop: audio.loop,
      datasetType: audio.dataset.type
    });

    // Sprawdź czy audio się ładuje
    console.log('AmbientMusic: Audio element created, starting to load...');
    
    // Zdefiniuj event handlery jako named functions, żeby móc je usunąć
    const handleLoadStart = () => {
      console.log('AmbientMusic: Audio load started');
    };

    const handleProgress = () => {
      console.log('AmbientMusic: Audio loading progress');
    };

    const handleLoadedData = () => {
      console.log('AmbientMusic: Audio loaded successfully');
      setIsLoaded(true);
    };

    const handleCanPlay = () => {
      console.log('AmbientMusic: Audio can play');
      setIsLoaded(true);
    };

    const handleCanPlayThrough = () => {
      console.log('AmbientMusic: Audio can play through');
      setIsLoaded(true);
    };

    const handlePlay = () => {
      console.log('AmbientMusic: Audio started playing');
      setIsPlaying(true);
      
      // Sprawdź czy rzeczywiście gra
      setTimeout(() => {
        if (audioRef.current) {
          console.log('AmbientMusic: Audio status check:', {
            currentTime: audioRef.current.currentTime,
            paused: audioRef.current.paused,
            volume: audioRef.current.volume,
            muted: audioRef.current.muted
          });
        }
      }, 1000);
    };

    const handlePause = () => {
      console.log('AmbientMusic: Audio paused');
      setIsPlaying(false);
      // NIE ustawiaj userManuallyPausedRef tutaj - może być pauza z innych powodów
    };

    const handleError = (e: Event) => {
      console.error('AmbientMusic: Audio error:', e);
    };

    const handleTimeUpdate = () => {
      // Wyłączone logi dla lepszej wydajności
      // if (audioRef.current && audioRef.current.currentTime > 0) {
      //   console.log('AmbientMusic: Audio is playing, current time:', audioRef.current.currentTime);
      // }
    };
    
    // Dodaj event listenery
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    // Sprawdź czy muzyka nie została zatrzymana przez inne audio
    // ALE tylko jeśli użytkownik nie wyłączył jej ręcznie
    const restartInterval = setInterval(() => {
      const userManuallyPaused = typeof window !== 'undefined' && (window as any).ambientMusicUserManuallyPaused === true;
      if (audioRef.current && isPlaying && audioRef.current.paused && !userManuallyPaused) {
        // console.log('AmbientMusic: Audio was paused unexpectedly, restarting...');
        audioRef.current.play().catch(error => {
          console.error('AmbientMusic: Failed to restart audio:', error);
        });
      }
    }, 2000);

    // Funkcja do rozpoczęcia odtwarzania po interakcji użytkownika
    // ALE tylko jeśli użytkownik nie wyłączył muzyki ręcznie
    const startMusic = () => {
      const userManuallyPaused = typeof window !== 'undefined' && (window as any).ambientMusicUserManuallyPaused === true;
      if (userManuallyPaused) {
        // Użytkownik ręcznie wyłączył muzykę - nie włączaj automatycznie
        return;
      }
      if (audioRef.current && !isPlaying) {
        // console.log('AmbientMusic: Attempting to start music');
        // console.log('AmbientMusic: Current volume:', audioRef.current.volume);
        // console.log('AmbientMusic: Audio element:', audioRef.current);
        // console.log('AmbientMusic: Audio readyState:', audioRef.current.readyState);
        // console.log('AmbientMusic: Audio networkState:', audioRef.current.networkState);
        
        // Sprawdź czy audio jest gotowe do odtwarzania
        if (audioRef.current.readyState >= 2) { // HAVE_CURRENT_DATA
          // console.log('AmbientMusic: Audio is ready to play');
          audioRef.current.play().then(() => {
            // console.log('AmbientMusic: Music started successfully');
            // console.log('AmbientMusic: Current time:', audioRef.current?.currentTime);
            // console.log('AmbientMusic: Duration:', audioRef.current?.duration);
          }).catch(error => {
            console.error('AmbientMusic: Failed to start music:', error);
          });
        } else {
          // console.log('AmbientMusic: Audio not ready yet, waiting...');
          // Spróbuj ponownie za chwilę
          setTimeout(() => {
            if (audioRef.current && !isPlaying) {
              startMusic();
            }
          }, 100);
        }
      } else {
        // console.log('AmbientMusic: Cannot start music - conditions not met:', {
        //   hasAudioRef: !!audioRef.current,
        //   isPlaying,
        //   isLoaded,
        //   readyState: audioRef.current?.readyState
        // });
      }
    };

    // Dodaj event listenery dla interakcji użytkownika
    const handleUserInteraction = () => {
      // console.log('AmbientMusic: User interaction detected, starting music');
      startMusic();
      // Usuń event listenery po pierwszej interakcji
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    // Cleanup dla pojedynczego audio elementu i listenerów
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        // NIE ustawiaj audioRef.current = null - element musi pozostać w DOM
        
        // Usuń wszystkie event listenery
        audioRef.current.removeEventListener('loadstart', handleLoadStart);
        audioRef.current.removeEventListener('progress', handleProgress);
        audioRef.current.removeEventListener('loadeddata', handleLoadedData);
        audioRef.current.removeEventListener('canplay', handleCanPlay);
        audioRef.current.removeEventListener('canplaythrough', handleCanPlayThrough);
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('error', handleError);
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
      clearInterval(restartInterval);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  };

  // Aktualizuj głośność gdy się zmienia
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = currentVolume;
      // console.log('AmbientMusic: Volume set to:', currentVolume);
    }
  }, [currentVolume]);

  // Funkcja do zmiany głośności (można wywołać z zewnątrz)
  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume)); // Ogranicz do 0-1
    setCurrentVolume(clampedVolume);
    
    // Eksponuj funkcję przez window object żeby hook mógł jej używać
    if (typeof window !== 'undefined') {
      (window as any).setAmbientMusicVolume = setVolume;
    }
  };

  // Eksponuj funkcję przy montowaniu komponentu
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).setAmbientMusicVolume = setVolume;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).setAmbientMusicVolume;
      }
    };
  }, []);

  // Renderuj element audio w DOM, żeby querySelector mógł go znaleźć
  return (
    <audio 
      ref={audioRef} 
      style={{ display: 'none' }} 
      data-type="ambient"
      loop
    />
  );
};

export default AmbientMusic; 