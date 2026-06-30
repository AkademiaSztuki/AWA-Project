import { safeLocalStorage } from '@/lib/gcp-data';
import { isAmbientMusicSuppressed } from '@/lib/ambient-music-duck';

export const AMBIENT_MUSIC_VOLUME_KEY = 'ambient-music-volume';
export const AMBIENT_MUSIC_PAUSED_KEY = 'ambient-music-user-paused';

const DEFAULT_VOLUME = 0.3;

export type AmbientMusicPrefs = {
  volume: number;
  userPaused: boolean;
};

export function readAmbientMusicPrefs(): AmbientMusicPrefs {
  let volume = DEFAULT_VOLUME;

  if (typeof window !== 'undefined') {
    try {
      const stored = safeLocalStorage.getItem(AMBIENT_MUSIC_VOLUME_KEY);
      if (stored !== null) {
        const parsed = parseFloat(stored);
        if (!Number.isNaN(parsed)) {
          volume = Math.max(0, Math.min(1, parsed));
        }
      }
    } catch {
      // ignore storage read errors
    }
  }

  const userPaused = isAmbientMusicUserPaused() || volume <= 0;

  return { volume, userPaused };
}

export function isAmbientMusicUserPaused(): boolean {
  if (typeof window !== 'undefined' && (window as Window & { ambientMusicUserManuallyPaused?: boolean }).ambientMusicUserManuallyPaused === true) {
    return true;
  }

  if (typeof window === 'undefined') return false;

  try {
    return safeLocalStorage.getItem(AMBIENT_MUSIC_PAUSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAmbientMusicUserPaused(paused: boolean): void {
  if (typeof window !== 'undefined') {
    (window as Window & { ambientMusicUserManuallyPaused?: boolean }).ambientMusicUserManuallyPaused = paused;
  }

  if (typeof window === 'undefined') return;

  try {
    if (paused) {
      safeLocalStorage.setItem(AMBIENT_MUSIC_PAUSED_KEY, '1');
    } else {
      safeLocalStorage.removeItem(AMBIENT_MUSIC_PAUSED_KEY);
    }
  } catch {
    // ignore storage write errors
  }
}

export function writeAmbientMusicVolume(volume: number): number {
  const clampedVolume = Math.max(0, Math.min(1, volume));

  if (typeof window !== 'undefined') {
    try {
      safeLocalStorage.setItem(AMBIENT_MUSIC_VOLUME_KEY, clampedVolume.toString());
    } catch {
      // ignore storage write errors
    }
  }

  if (clampedVolume <= 0) {
    setAmbientMusicUserPaused(true);
  }

  return clampedVolume;
}

export function shouldAutoPlayAmbientMusic(volume = readAmbientMusicPrefs().volume): boolean {
  if (isAmbientMusicSuppressed()) return false;
  if (volume <= 0) return false;
  return !isAmbientMusicUserPaused();
}
