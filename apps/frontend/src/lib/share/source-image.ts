/** SessionStorage keys — keep in sync with `hooks/useSession.ts`. */
export const ROOM_IMAGE_SESSION_KEY = 'aura_session_room_image';
export const ROOM_IMAGE_EMPTY_SESSION_KEY = 'aura_session_room_image_empty';

export type RoomBeforeSession = {
  roomImage?: string | null;
  roomImageEmpty?: string | null;
  uploadedImage?: string | null;
};

export type RoomBeforeImage = {
  url: string;
  base64: string | null;
};

function readSessionStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function isUsableImageSource(value: string): boolean {
  return (
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/')
  );
}

/** Display URL for a stored room photo (data URL, http(s), or raw base64). */
export function toImageDataUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isUsableImageSource(trimmed)) return trimmed;
  const base64 = trimmed.includes(',') ? trimmed.split(',')[1] : trimmed;
  if (!base64?.trim()) return null;
  return `data:image/jpeg;base64,${base64}`;
}

/** Base64 body for share-card create. Returns null for http(s)/relative/blob URLs. */
export function toBase64Payload(url?: string | null, explicit?: string | null): string | null {
  if (explicit && explicit.trim()) {
    const value = explicit.trim();
    if (value.startsWith('data:')) {
      const comma = value.indexOf(',');
      return comma >= 0 ? value.slice(comma + 1) : null;
    }
    return value.includes(',') ? value.split(',')[1] : value;
  }
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) {
    const comma = trimmed.indexOf(',');
    return comma >= 0 ? trimmed.slice(comma + 1) : null;
  }
  if (isUsableImageSource(trimmed)) return null;
  return trimmed.includes(',') ? trimmed.split(',')[1] : trimmed;
}

/**
 * Uploaded room, current room photo, or sample/base room stored as `roomImage`.
 * Furniture-removed empty room is last resort only — never a blank frame.
 */
export function resolveRoomBeforeImage(session?: RoomBeforeSession | null): RoomBeforeImage | null {
  const candidates = [
    session?.roomImage,
    session?.uploadedImage,
    readSessionStorage(ROOM_IMAGE_SESSION_KEY),
    session?.roomImageEmpty,
    readSessionStorage(ROOM_IMAGE_EMPTY_SESSION_KEY),
  ];

  for (const candidate of candidates) {
    const url = toImageDataUrl(candidate);
    if (!url) continue;
    return {
      url,
      base64: toBase64Payload(url, candidate && !isUsableImageSource(candidate.trim()) ? candidate : null),
    };
  }
  return null;
}

export async function imageSourceToBase64(url?: string | null): Promise<string | null> {
  const direct = toBase64Payload(url, null);
  if (direct) return direct;
  if (!url || typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (typeof FileReader === 'undefined') return null;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read_failed'));
      reader.readAsDataURL(blob);
    });
    return toBase64Payload(dataUrl, null);
  } catch {
    return null;
  }
}
