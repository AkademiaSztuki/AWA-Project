import { useRef, useCallback } from 'react';

interface AudioManager {
  stopAllDialogueAudio: () => void;
  registerDialogueAudio: (audio: HTMLAudioElement) => void;
  unregisterDialogueAudio: (audio: HTMLAudioElement) => void;
}

// Globalna instancja do zarządzania dźwiękiem
let globalAudioManager: AudioManager | null = null;

export const useAudioManager = (): AudioManager => {
  const dialogueAudios = useRef<Set<HTMLAudioElement>>(new Set());

  const stopAllDialogueAudio = useCallback(() => {
    console.log('Stopping all dialogue audio...');
    dialogueAudios.current.forEach(audio => {
      if (audio && !audio.paused) {
        console.log('Stopping audio:', audio.src);
        audio.pause();
        audio.currentTime = 0;
      }
    });
    dialogueAudios.current.clear();
  }, []);

  const registerDialogueAudio = useCallback((audio: HTMLAudioElement) => {
    dialogueAudios.current.add(audio);
    console.log('Registered dialogue audio:', audio.src);
  }, []);

  const unregisterDialogueAudio = useCallback((audio: HTMLAudioElement) => {
    dialogueAudios.current.delete(audio);
    console.log('Unregistered dialogue audio:', audio.src);
  }, []);

  // Inicjalizuj globalną instancję
  if (!globalAudioManager) {
    globalAudioManager = {
      stopAllDialogueAudio,
      registerDialogueAudio,
      unregisterDialogueAudio
    };
  }

  return globalAudioManager;
};

// Funkcja do zatrzymywania wszystkich dźwięków z zewnątrz
export const stopAllDialogueAudio = () => {
  if (globalAudioManager) {
    globalAudioManager.stopAllDialogueAudio();
  }
}; 