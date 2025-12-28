"use client";

import { useState, useEffect } from 'react';
import { safeLocalStorage } from '@/lib/supabase';

interface DialogueVoiceControls {
  volume: number;
  setVolume: (volume: number) => void;
  isEnabled: boolean;
  toggleEnabled: () => void;
  mute: () => void;
  unmute: () => void;
}

export const useDialogueVoice = (): DialogueVoiceControls => {
  const [volume, setVolumeState] = useState(0.8);
  const [isEnabled, setIsEnabled] = useState(true);

  // Zapisz głośność w localStorage
  useEffect(() => {
    const savedVolume = safeLocalStorage.getItem('dialogue-voice-volume');
    const savedEnabled = safeLocalStorage.getItem('dialogue-voice-enabled');
    
    // console.log('useDialogueVoice: Loading from localStorage:', { savedVolume, savedEnabled });
    
    if (savedVolume) {
      const parsedVolume = parseFloat(savedVolume);
      // console.log('useDialogueVoice: Setting volume from localStorage:', parsedVolume);
      setVolumeState(parsedVolume);
    }
    
    if (savedEnabled !== null) {
      const enabled = savedEnabled === 'true';
      // console.log('useDialogueVoice: Setting enabled from localStorage:', enabled);
      setIsEnabled(enabled);
    }
  }, []);

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    // console.log('useDialogueVoice: setVolume called with:', newVolume, 'clamped to:', clampedVolume);
    setVolumeState(clampedVolume);
    safeLocalStorage.setItem('dialogue-voice-volume', clampedVolume.toString());
    
    // NATYCHMIASTOWA synchronizacja z audio elementami (działa w czasie rzeczywistym)
    const dialogueAudios = document.querySelectorAll('audio[data-type="dialogue"]') as NodeListOf<HTMLAudioElement>;
    dialogueAudios.forEach(audio => {
      audio.volume = clampedVolume;
    });
  };

  const toggleEnabled = () => {
    const newEnabled = !isEnabled;
    // console.log('useDialogueVoice: toggleEnabled called, new state:', newEnabled);
    setIsEnabled(newEnabled);
    safeLocalStorage.setItem('dialogue-voice-enabled', newEnabled.toString());
    // Zatrzymaj wszystkie aktualnie odtwarzane dialogi
    const dialogueAudios = document.querySelectorAll('audio[data-type="dialogue"]') as NodeListOf<HTMLAudioElement>;
    // console.log('useDialogueVoice: Found dialogue audios:', dialogueAudios.length);
    dialogueAudios.forEach(audio => {
      if (!newEnabled) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  };

  const mute = () => {
    // console.log('useDialogueVoice: mute called');
    setVolume(0);
  };

  const unmute = () => {
    // console.log('useDialogueVoice: unmute called');
    setVolume(0.8); // Przywróć domyślną głośność
  };

  // Synchronizuj głośność na żywo na wszystkich audio[data-type="dialogue"]
  useEffect(() => {
    const dialogueAudios = document.querySelectorAll('audio[data-type="dialogue"]') as NodeListOf<HTMLAudioElement>;
    // console.log('useDialogueVoice: Syncing volume to', dialogueAudios.length, 'dialogue audios, volume:', volume);
    dialogueAudios.forEach(audio => {
      audio.volume = volume;
    });
  }, [volume]);

    // console.log('useDialogueVoice: Current state:', { volume, isEnabled });

  return {
    volume,
    setVolume,
    isEnabled,
    toggleEnabled,
    mute,
    unmute,
  };
}; 