import { safeLocalStorage } from '@/lib/gcp-data';

const DEFAULT_DUCK_VOLUME = 0;
const DEFAULT_FADE_MS = 300;

let savedVolume: number | null = null;
let wasPlayingBeforeDuck = false;
let isDucked = false;
let fadeFrameId: number | null = null;

export function isAmbientMusicSuppressed(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as any).ambientMusicDucked === true;
}

function setDuckFlag(ducked: boolean): void {
  if (typeof window === 'undefined') return;
  (window as any).ambientMusicDucked = ducked;
}

function getAmbientAudio(): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector('audio[data-type="ambient"]') as HTMLAudioElement | null;
}

function readSavedAmbientVolume(): number {
  const stored = safeLocalStorage.getItem('ambient-music-volume');
  if (stored !== null) {
    const parsed = parseFloat(stored);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.min(1, parsed));
    }
  }
  return 0.3;
}

function syncAmbientComponentVolume(volume: number): void {
  if (typeof window !== 'undefined' && (window as any).setAmbientMusicVolume) {
    try {
      (window as any).setAmbientMusicVolume(volume);
    } catch {
      // ignore sync errors
    }
  }
}

function cancelFade(): void {
  if (fadeFrameId !== null) {
    cancelAnimationFrame(fadeFrameId);
    fadeFrameId = null;
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function fadeAmbientVolume(
  targetVolume: number,
  durationMs: number,
  onComplete?: () => void,
): void {
  const audio = getAmbientAudio();
  if (!audio) return;

  cancelFade();

  const startVolume = audio.volume;
  const startTime = performance.now();

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    const volume = startVolume + (targetVolume - startVolume) * easeInOut(progress);
    // Only touch the DOM audio element during fade — syncing React state on every
    // frame races with AmbientMusic's currentVolume useEffect and can restore volume.
    audio.volume = volume;

    if (progress < 1) {
      fadeFrameId = requestAnimationFrame(step);
    } else {
      fadeFrameId = null;
      onComplete?.();
    }
  };

  fadeFrameId = requestAnimationFrame(step);
}

function beginDuck(audio: HTMLAudioElement, options?: AmbientMusicDuckOptions): void {
  const currentVolume = audio.volume > 0 ? audio.volume : readSavedAmbientVolume();
  if (currentVolume <= 0.01 && audio.paused) return;

  savedVolume = currentVolume;
  wasPlayingBeforeDuck = !audio.paused;
  isDucked = true;
  setDuckFlag(true);

  const targetVolume = options?.targetVolume ?? DEFAULT_DUCK_VOLUME;
  const durationMs = options?.durationMs ?? DEFAULT_FADE_MS;

  fadeAmbientVolume(Math.min(targetVolume, savedVolume), durationMs, () => {
    const ambient = getAmbientAudio();
    if (!ambient) return;
    ambient.volume = targetVolume;
    if (wasPlayingBeforeDuck) {
      ambient.pause();
    }
    syncAmbientComponentVolume(targetVolume);
  });
}

export interface AmbientMusicDuckOptions {
  targetVolume?: number;
  durationMs?: number;
}

/** Smoothly mute and pause ambient music while foreground audio (e.g. sensory samples) plays. */
export function duckAmbientMusic(options?: AmbientMusicDuckOptions, retryCount = 0): void {
  if (isDucked) return;

  const audio = getAmbientAudio();
  if (!audio) {
    if (retryCount < 8) {
      setTimeout(() => duckAmbientMusic(options, retryCount + 1), 50);
    }
    return;
  }

  beginDuck(audio, options);
}

export interface AmbientMusicRestoreOptions {
  durationMs?: number;
}

/** Smoothly restore ambient music after foreground audio stops. */
export function restoreAmbientMusic(options?: AmbientMusicRestoreOptions): void {
  if (!isDucked) return;

  isDucked = false;
  setDuckFlag(false);

  const restoreTo = savedVolume ?? readSavedAmbientVolume();
  const shouldResume = wasPlayingBeforeDuck;
  savedVolume = null;
  wasPlayingBeforeDuck = false;

  const durationMs = options?.durationMs ?? DEFAULT_FADE_MS;
  const audio = getAmbientAudio();
  if (!audio) return;

  if (shouldResume && audio.paused) {
    audio.volume = 0;
    void audio.play().catch(() => {
      // autoplay policy — fade still runs if play fails
    });
  }

  fadeAmbientVolume(restoreTo, durationMs, () => {
    syncAmbientComponentVolume(restoreTo);
  });
}

/** Force-restore ambient volume (e.g. on unmount). */
export function forceRestoreAmbientMusic(): void {
  cancelFade();
  if (!isDucked) return;

  const restoreTo = savedVolume ?? readSavedAmbientVolume();
  const shouldResume = wasPlayingBeforeDuck;
  isDucked = false;
  setDuckFlag(false);
  savedVolume = null;
  wasPlayingBeforeDuck = false;

  const audio = getAmbientAudio();
  if (audio) {
    audio.volume = restoreTo;
    syncAmbientComponentVolume(restoreTo);
    if (shouldResume && audio.paused) {
      void audio.play().catch(() => {});
    }
  }
}
