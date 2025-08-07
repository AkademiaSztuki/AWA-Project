"use client";

import React, { useEffect, useRef, useState } from 'react';

interface AmbientMusicProps {
  volume?: number; // 0-1, domyślnie 0.3 (30%)
  audioFile?: string; // ścieżka do pliku audio
}

export const AmbientMusic: React.FC<AmbientMusicProps> = ({ 
  volume = 0.4, // Zmienione z 0.3 na 0.4
  audioFile = "/audio/ambient.mp3" 
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(volume);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    console.log('AmbientMusic: Initializing with file:', audioFile, 'volume:', volume);
    
    // Sprawdź czy plik istnieje
    fetch(audioFile, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('AmbientMusic: Audio file found, creating audio element');
          createAudioElement();
        } else {
          console.error('AmbientMusic: Audio file not found:', audioFile);
        }
      })
      .catch(error => {
        console.error('AmbientMusic: Error checking audio file:', error);
      });
  }, [audioFile]);

  const createAudioElement = () => {
    // Twórz element audio
    const audio = new Audio(audioFile);
    audio.loop = true; // Zapętlenie muzyki
    audio.volume = currentVolume;
    audio.dataset.type = 'ambient'; // Dodaj identyfikator
    audioRef.current = audio;

    // Sprawdź czy audio się ładuje
    console.log('AmbientMusic: Audio element created, starting to load...');
    
    // Dodaj event listenery
    audio.addEventListener('loadstart', () => {
      console.log('AmbientMusic: Audio load started');
    });

    audio.addEventListener('progress', () => {
      console.log('AmbientMusic: Audio loading progress');
    });

    audio.addEventListener('loadeddata', () => {
      console.log('AmbientMusic: Audio loaded successfully');
      setIsLoaded(true);
    });

    audio.addEventListener('canplay', () => {
      console.log('AmbientMusic: Audio can play');
      setIsLoaded(true);
    });

    audio.addEventListener('canplaythrough', () => {
      console.log('AmbientMusic: Audio can play through');
      setIsLoaded(true);
    });

    audio.addEventListener('play', () => {
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
    });

    audio.addEventListener('pause', () => {
      console.log('AmbientMusic: Audio paused');
      setIsPlaying(false);
    });

    audio.addEventListener('error', (e) => {
      console.error('AmbientMusic: Audio error:', e);
    });

    // Dodaj event listener na zmiany stanu
    audio.addEventListener('timeupdate', () => {
      // Wyłączone logi dla lepszej wydajności
      // if (audioRef.current && audioRef.current.currentTime > 0) {
      //   console.log('AmbientMusic: Audio is playing, current time:', audioRef.current.currentTime);
      // }
    });

    // Sprawdź czy muzyka nie została zatrzymana przez inne audio
    setInterval(() => {
      if (audioRef.current && isPlaying && audioRef.current.paused) {
        // console.log('AmbientMusic: Audio was paused unexpectedly, restarting...');
        audioRef.current.play().catch(error => {
          console.error('AmbientMusic: Failed to restart audio:', error);
        });
      }
    }, 2000);

    // Funkcja do rozpoczęcia odtwarzania po interakcji użytkownika
    const startMusic = () => {
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

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
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

  return null; // Komponent nie renderuje nic widocznego
};

export default AmbientMusic; 