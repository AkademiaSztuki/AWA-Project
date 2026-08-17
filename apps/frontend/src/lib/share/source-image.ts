/** SessionStorage keys — keep in sync with `hooks/useSession.ts`. */
export const ROOM_IMAGE_SESSION_KEY = 'aura_session_room_image';
export const ROOM_IMAGE_EMPTY_SESSION_KEY = 'aura_session_room_image_empty';
/** Signature of the original roomImage that `roomImageEmpty` was derived from. */
export const ROOM_IMAGE_EMPTY_SOURCE_SIG_KEY = 'aura_session_room_image_empty_source_sig';
/** Lightweight pointer to a sample/base photo so share can re-fetch bytes if base64 was dropped. */
export const ROOM_IMAGE_SOURCE_URL_KEY = 'aura_session_room_image_src';

/** Static “podstawowe zdjęcia” from the photo step — always fetch as bytes, never POST the path. */
export const SAMPLE_ROOM_IMAGE_PATHS = [
  '/images/tinder/Living Room (1).jpg',
  '/images/tinder/Living Room (2).jpg',
  '/images/tinder/Living Room (3).jpg',
] as const;

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

function writeSessionStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch {
    // Quota / private mode — share fetch still has the in-memory URL.
  }
}

function isUsableImageSource(value: string): boolean {
  return (
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    isRemoteOrAssetUrl(value)
  );
}

/**
 * Path, blob, or http(s) — not a data URL and not raw image bytes.
 * JPEG base64 always starts with `/9j/`; that must never be treated as a site path.
 */
export function isRemoteOrAssetUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:')) return false;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return true;
  }
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.startsWith('/9j/')) return false;
  if (trimmed.length > 400) return false;
  return (
    trimmed.startsWith('/images/') ||
    trimmed.startsWith('/Tinder/') ||
    trimmed.startsWith('/hero/') ||
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(trimmed)
  );
}

export function isSampleRoomImagePath(url?: string | null): boolean {
  if (!url) return false;
  let normalized = url.trim();
  try {
    normalized = decodeURI(normalized);
  } catch {
    // Keep the raw string if it is not a valid URI encoding.
  }
  return SAMPLE_ROOM_IMAGE_PATHS.some((path) => path === normalized || normalized.endsWith(path));
}

export function rememberRoomImageSourceUrl(url?: string | null): void {
  if (!url || !isRemoteOrAssetUrl(url)) {
    writeSessionStorage(ROOM_IMAGE_SOURCE_URL_KEY, null);
    return;
  }
  writeSessionStorage(ROOM_IMAGE_SOURCE_URL_KEY, url.trim());
}

export function readRoomImageSourceUrl(): string | null {
  const stored = readSessionStorage(ROOM_IMAGE_SOURCE_URL_KEY);
  return stored && isRemoteOrAssetUrl(stored) ? stored.trim() : null;
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

/** Encode relative paths (sample rooms often have spaces) and prefix origin when given. */
export function toFetchableImageUrl(url: string, origin?: string | null): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('/9j/')) return trimmed;
  let path = trimmed;
  try {
    path = decodeURI(trimmed);
  } catch {
    // Keep the raw string if it is not a valid URI encoding.
  }
  const encoded = encodeURI(path);
  if (!origin) return encoded;
  return `${origin.replace(/\/$/, '')}${encoded}`;
}

const SHARE_MAX_EDGE = 1024;
const SHARE_JPEG_QUALITY = 0.76;

export type ShareImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

/** Guess a data-URL mime from base64 magic bytes. Returns null when the payload is not an image. */
export function detectMimeFromBase64(payload: string): ShareImageMime | null {
  try {
    const sample = payload.slice(0, 32);
    const binary = atob(sample);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'image/png';
    }
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp';
    }
    if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return 'image/gif';
    }
  } catch {
    // Invalid base64 — fall through.
  }
  return null;
}

/** Guess a data-URL mime from base64 magic bytes (do not assume JPEG). */
export function guessMimeFromBase64(payload: string): string {
  return detectMimeFromBase64(payload) || 'image/jpeg';
}

/** True when the string is actual image bytes, not a `/images/...` path posted as “base64”. */
export function looksLikeImageBase64(payload?: string | null): boolean {
  if (!payload || typeof payload !== 'string') return false;
  const trimmed = payload.trim();
  if (trimmed.length < 32) return false;
  if (isRemoteOrAssetUrl(trimmed)) return false;
  const raw = trimmed.startsWith('data:')
    ? trimmed.slice(trimmed.indexOf(',') + 1)
    : trimmed.includes(',')
      ? trimmed.split(',')[1]
      : trimmed;
  return detectMimeFromBase64(raw) != null;
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('load_failed'));
    el.src = src;
  });
}

/** Shrink large room photos so share-card POST stays under serverless body limits. */
export async function compressBase64ForShare(base64: string): Promise<string> {
  const payload = toBase64Payload(null, base64) || base64;
  if (typeof document === 'undefined' || typeof Image === 'undefined') return payload;
  if (!looksLikeImageBase64(payload)) return payload;
  if (payload.length < 80_000) return payload;
  try {
    const mime = guessMimeFromBase64(payload);
    const dataUrl = `data:${mime};base64,${payload}`;
    const img = await loadHtmlImage(dataUrl);
    const srcW = Math.max(1, img.naturalWidth || img.width);
    const srcH = Math.max(1, img.naturalHeight || img.height);
    const scale = Math.min(1, SHARE_MAX_EDGE / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return payload;
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL('image/jpeg', SHARE_JPEG_QUALITY);
    return toBase64Payload(out, null) || payload;
  } catch {
    return payload;
  }
}

/** True when two share sources are the same photo (URL, data URL, or raw base64). */
export function isSameShareImageSource(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  if (left === right) return true;
  const leftPayload = toBase64Payload(left, null);
  const rightPayload = toBase64Payload(right, null);
  if (leftPayload && rightPayload && leftPayload === rightPayload) return true;
  if (leftPayload && right.includes(leftPayload.slice(0, 48))) return true;
  if (rightPayload && left.includes(rightPayload.slice(0, 48))) return true;
  return false;
}

/** Base64 body for share-card create. Returns null for http(s)/relative/blob URLs. */
export function toBase64Payload(url?: string | null, explicit?: string | null): string | null {
  if (explicit && explicit.trim()) {
    const value = explicit.trim();
    if (isRemoteOrAssetUrl(value)) return null;
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
 * Original room photo for share “before”: upload, sample library, or stored roomImage.
 * Never the furniture-removed empty room — that is a processed variant, not before.
 */
export function resolveRoomBeforeImage(session?: RoomBeforeSession | null): RoomBeforeImage | null {
  const sourceUrl = readRoomImageSourceUrl();
  const candidates = [
    session?.roomImage,
    session?.uploadedImage,
    readSessionStorage(ROOM_IMAGE_SESSION_KEY),
    sourceUrl,
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

function blobLooksLikeHtml(blob: Blob): boolean {
  const type = (blob.type || '').toLowerCase();
  return type.includes('text/html') || type.includes('application/json');
}

export async function imageSourceToBase64(url?: string | null): Promise<string | null> {
  const direct = toBase64Payload(url, null);
  if (direct && looksLikeImageBase64(direct)) return direct;
  if (!url || typeof fetch === 'undefined') return null;
  if (!isRemoteOrAssetUrl(url) && !url.trim().startsWith('data:')) return null;
  const origin = typeof window !== 'undefined' ? window.location.origin : null;
  const fetchable = toFetchableImageUrl(url, origin);
  try {
    const res = await fetch(fetchable);
    if (res.ok) {
      const blob = await res.blob();
      if (!blobLooksLikeHtml(blob) && blob.size >= 32 && typeof FileReader !== 'undefined') {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('read_failed'));
          reader.readAsDataURL(blob);
        });
        const payload = toBase64Payload(dataUrl, null);
        if (payload && looksLikeImageBase64(payload)) return payload;
      }
    }
  } catch {
    // CORS or network — try drawing a same-origin / data URL into canvas below.
  }

  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  try {
    const img = await loadHtmlImage(fetchable);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, img.naturalWidth || img.width);
    canvas.height = Math.max(1, img.naturalHeight || img.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const payload = toBase64Payload(canvas.toDataURL('image/jpeg', SHARE_JPEG_QUALITY), null);
    return payload && looksLikeImageBase64(payload) ? payload : null;
  } catch {
    return null;
  }
}

export type ShareAfterForbid = {
  url?: string | null;
  base64?: string | null;
};

function matchesForbiddenAfter(candidate: string, after?: ShareAfterForbid | null): boolean {
  if (!after) return false;
  return (
    isSameShareImageSource(candidate, after.url) || isSameShareImageSource(candidate, after.base64)
  );
}

function matchesForbiddenEmptyRoom(
  candidate: string,
  session?: RoomBeforeSession | null,
): boolean {
  if (!session?.roomImageEmpty) return false;
  return isSameShareImageSource(candidate, session.roomImageEmpty);
}

/**
 * Original room photo for share Przed — Generation History upload node first,
 * then session roomImage. Never the generated after, never empty-room.
 */
export function pickShareBeforeSource(opts: {
  historyUrl?: string | null;
  roomBefore?: RoomBeforeImage | null;
  originalRoomPhotoUrl?: string | null;
  afterUrl?: string | null;
  afterBase64?: string | null;
}): RoomBeforeImage | null {
  const after: ShareAfterForbid = { url: opts.afterUrl, base64: opts.afterBase64 };
  const candidates: RoomBeforeImage[] = [];

  if (opts.historyUrl && opts.historyUrl.trim()) {
    const url = opts.historyUrl.trim();
    candidates.push({ url, base64: toBase64Payload(url, null) });
  }
  if (opts.roomBefore?.url) {
    candidates.push({
      url: opts.roomBefore.url,
      base64: opts.roomBefore.base64 ?? toBase64Payload(opts.roomBefore.url, null),
    });
  }
  if (opts.originalRoomPhotoUrl && opts.originalRoomPhotoUrl.trim()) {
    const url = opts.originalRoomPhotoUrl.trim();
    candidates.push({ url, base64: toBase64Payload(url, null) });
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    if (matchesForbiddenAfter(candidate.url, after)) continue;
    if (candidate.base64 && matchesForbiddenAfter(candidate.base64, after)) continue;
    return candidate;
  }
  return null;
}

/** Resolve room photo bytes for share-card create. Props first, then session / storage. Never the after image. */
export async function collectShareBeforeBase64(
  beforeImageUrl?: string | null,
  beforeImageBase64?: string | null,
  session?: RoomBeforeSession | null,
  after?: ShareAfterForbid | null,
): Promise<string | null> {
  const propsLookLikeAfter =
    isSameShareImageSource(beforeImageUrl, after?.url) ||
    isSameShareImageSource(beforeImageUrl, after?.base64) ||
    isSameShareImageSource(beforeImageBase64, after?.url) ||
    isSameShareImageSource(beforeImageBase64, after?.base64);
  const propsLookLikeEmpty =
    matchesForbiddenEmptyRoom(beforeImageUrl || '', session) ||
    matchesForbiddenEmptyRoom(beforeImageBase64 || '', session);

  const tryPayload = async (url?: string | null, explicit?: string | null): Promise<string | null> => {
    const forbidden = (value?: string | null) =>
      Boolean(
        value &&
          (matchesForbiddenAfter(value, after) || matchesForbiddenEmptyRoom(value, session)),
      );
    const direct = toBase64Payload(url, explicit);
    if (direct && looksLikeImageBase64(direct)) {
      return forbidden(direct) ? null : direct;
    }
    if (url && isRemoteOrAssetUrl(url)) {
      if (forbidden(url)) return null;
      const fetched = await imageSourceToBase64(url);
      if (fetched && forbidden(fetched)) return null;
      return fetched;
    }
    if (explicit && isRemoteOrAssetUrl(explicit)) {
      if (forbidden(explicit)) return null;
      const fetched = await imageSourceToBase64(explicit);
      if (fetched && forbidden(fetched)) return null;
      return fetched;
    }
    return null;
  };

  if (!propsLookLikeAfter && !propsLookLikeEmpty) {
    const fromProps = await tryPayload(beforeImageUrl, beforeImageBase64);
    if (fromProps) return fromProps;
  }

  const resolved = resolveRoomBeforeImage(session) || resolveRoomBeforeImage();
  if (
    resolved &&
    !matchesForbiddenAfter(resolved.url, after) &&
    !matchesForbiddenEmptyRoom(resolved.url, session)
  ) {
    const fromSession = await tryPayload(resolved.url, resolved.base64);
    if (fromSession) return fromSession;
  }

  const sourceUrl = readRoomImageSourceUrl();
  if (
    sourceUrl &&
    !matchesForbiddenAfter(sourceUrl, after) &&
    !matchesForbiddenEmptyRoom(sourceUrl, session)
  ) {
    const fromStored = await imageSourceToBase64(sourceUrl);
    if (
      fromStored &&
      !matchesForbiddenAfter(fromStored, after) &&
      !matchesForbiddenEmptyRoom(fromStored, session)
    ) {
      return fromStored;
    }
  }

  return null;
}
