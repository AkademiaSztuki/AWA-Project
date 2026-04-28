"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { safeLocalStorage } from "@/lib/gcp-data";

interface DialogueVoiceControls {
  volume: number;
  setVolume: (volume: number) => void;
  isEnabled: boolean;
  toggleEnabled: () => void;
  mute: () => void;
  unmute: () => void;
}

const DialogueVoiceContext = createContext<DialogueVoiceControls | null>(null);

function readInitialVolume(): number {
  const raw = safeLocalStorage.getItem("dialogue-voice-volume");
  if (!raw) return 0.8;
  const parsed = parseFloat(raw);
  return Number.isNaN(parsed) ? 0.8 : parsed;
}

function readInitialEnabled(): boolean {
  const raw = safeLocalStorage.getItem("dialogue-voice-enabled");
  if (raw === null) return true;
  return raw === "true";
}

export function DialogueVoiceProvider({ children }: { children: React.ReactNode }) {
  // Fixed defaults so SSR + first client render match (localStorage is read after mount in useLayoutEffect).
  const [volume, setVolumeState] = useState(0.8);
  const [isEnabled, setIsEnabled] = useState(true);
  const skipEnableAudioSyncRef = useRef(true);

  useLayoutEffect(() => {
    const v = readInitialVolume();
    const e = readInitialEnabled();
    setVolumeState(v);
    setIsEnabled(e);
    const dialogueAudios = document.querySelectorAll(
      'audio[data-type="dialogue"]'
    ) as NodeListOf<HTMLAudioElement>;
    dialogueAudios.forEach((audio) => {
      audio.volume = v;
      if (!e) {
        audio.pause();
      } else {
        void audio.play().catch(() => {});
      }
    });
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    safeLocalStorage.setItem("dialogue-voice-volume", clampedVolume.toString());

    if (clampedVolume > 0) {
      setIsEnabled(true);
    }

    const dialogueAudios = document.querySelectorAll(
      "audio[data-type=\"dialogue\"]"
    ) as NodeListOf<HTMLAudioElement>;
    dialogueAudios.forEach((audio) => {
      audio.volume = clampedVolume;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  useEffect(() => {
    safeLocalStorage.setItem("dialogue-voice-enabled", String(isEnabled));
    if (skipEnableAudioSyncRef.current) {
      skipEnableAudioSyncRef.current = false;
      return;
    }
    const dialogueAudios = document.querySelectorAll(
      "audio[data-type=\"dialogue\"]"
    ) as NodeListOf<HTMLAudioElement>;
    dialogueAudios.forEach((audio) => {
      if (!isEnabled) {
        audio.pause();
      } else {
        void audio.play().catch(() => {});
      }
    });
  }, [isEnabled]);

  const mute = useCallback(() => setVolume(0), [setVolume]);
  const unmute = useCallback(() => setVolume(0.8), [setVolume]);

  useEffect(() => {
    const dialogueAudios = document.querySelectorAll(
      "audio[data-type=\"dialogue\"]"
    ) as NodeListOf<HTMLAudioElement>;
    dialogueAudios.forEach((audio) => {
      audio.volume = volume;
    });
  }, [volume]);

  const value = useMemo<DialogueVoiceControls>(
    () => ({
      volume,
      setVolume,
      isEnabled,
      toggleEnabled,
      mute,
      unmute,
    }),
    [volume, setVolume, isEnabled, toggleEnabled, mute, unmute]
  );

  return (
    <DialogueVoiceContext.Provider value={value}>{children}</DialogueVoiceContext.Provider>
  );
}

export function useDialogueVoice(): DialogueVoiceControls {
  const ctx = useContext(DialogueVoiceContext);
  if (!ctx) {
    throw new Error("useDialogueVoice must be used within DialogueVoiceProvider");
  }
  return ctx;
}
