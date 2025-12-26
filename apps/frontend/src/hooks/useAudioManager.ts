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
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'useAudioManager.ts:stopAllDialogueAudio',message:'stopAllDialogueAudio invoked',data:{registeredCount:dialogueAudios.current.size,playingCount:Array.from(dialogueAudios.current).filter(a=>a && !a.paused).length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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