import { getSessionStoreSnapshot } from '@/hooks/useSession';

export type ImageRatings = {
  aesthetic_match: number;
  character: number;
  harmony: number;
};

export type SessionImageRatingsMap = Record<
  string,
  Partial<ImageRatings> & { timestamp?: number }
>;

export type RatedImageLike = {
  id: string;
  ratings?: Partial<ImageRatings>;
};

function coercePositiveScore(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function isUnsetAestheticScore(value: number | null | undefined): boolean {
  return coercePositiveScore(value) === undefined;
}

/** Prefer any saved score > 0; never treat 0 as overriding a positive rating. */
export function pickRatingScore(...candidates: (unknown)[]): number {
  const valid = candidates
    .map(coercePositiveScore)
    .filter((v): v is number => v !== undefined);
  if (valid.length === 0) return 0;
  return Math.max(...valid);
}

/** Normalize DB/session payloads (object map or legacy array of { id, ...scores }). */
export function normalizeSessionImageRatingsMap(raw: unknown): SessionImageRatingsMap {
  if (!raw || typeof raw !== 'object') return {};
  if (Array.isArray(raw)) {
    const map: SessionImageRatingsMap = {};
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as { id?: string } & Partial<ImageRatings> & { timestamp?: number };
      if (typeof row.id !== 'string' || !row.id) continue;
      const { id, ...scores } = row;
      map[id] = scores;
    }
    return map;
  }
  return raw as SessionImageRatingsMap;
}

export function getEffectiveRatings(
  image: RatedImageLike,
  imageRatingsMap?: SessionImageRatingsMap,
): ImageRatings {
  const session = imageRatingsMap?.[image.id];
  return {
    aesthetic_match: pickRatingScore(image.ratings?.aesthetic_match, session?.aesthetic_match),
    character: pickRatingScore(image.ratings?.character, session?.character),
    harmony: pickRatingScore(image.ratings?.harmony, session?.harmony),
  };
}

export function imageHasAestheticRating(
  image: RatedImageLike | null | undefined,
  imageRatingsMap?: SessionImageRatingsMap,
): boolean {
  if (!image) return false;
  if (image.id === 'original-uploaded-image') return true;
  return !isUnsetAestheticScore(getEffectiveRatings(image, imageRatingsMap).aesthetic_match);
}

export function imageNeedsAestheticRating(
  image: RatedImageLike | null | undefined,
  imageRatingsMap?: SessionImageRatingsMap,
): boolean {
  if (!image) return false;
  if (image.id === 'original-uploaded-image') return false;
  return isUnsetAestheticScore(getEffectiveRatings(image, imageRatingsMap).aesthetic_match);
}

/** Merge hook session ratings with the live zustand snapshot (rating writes land in snapshot first). */
export function resolveSessionImageRatingsMap(
  sessionFromHook?: SessionImageRatingsMap | unknown,
): SessionImageRatingsMap {
  const snap = normalizeSessionImageRatingsMap(
    (getSessionStoreSnapshot() as { imageRatings?: unknown }).imageRatings,
  );
  const hook = normalizeSessionImageRatingsMap(sessionFromHook);
  const ids = new Set([...Object.keys(hook), ...Object.keys(snap)]);
  const merged: SessionImageRatingsMap = {};
  for (const id of ids) {
    const h = hook[id];
    const s = snap[id];
    merged[id] = {
      ...h,
      ...s,
      aesthetic_match: pickRatingScore(h?.aesthetic_match, s?.aesthetic_match),
      character: pickRatingScore(h?.character, s?.character),
      harmony: pickRatingScore(h?.harmony, s?.harmony),
      timestamp: s?.timestamp ?? h?.timestamp,
    };
  }
  return merged;
}

export function applyRatingsToImage<T extends RatedImageLike>(image: T, map?: SessionImageRatingsMap): T {
  return {
    ...image,
    ratings: getEffectiveRatings(image, map),
  };
}

/** Clear taste-match score for a fresh blind pick (session + in-memory ratings). */
export function withUnsetAestheticRating<T extends RatedImageLike>(image: T): T {
  const base = image.ratings ?? {};
  return {
    ...image,
    ratings: {
      ...base,
      aesthetic_match: 0,
    },
  };
}

export function clearAestheticRatingInMap(
  map: SessionImageRatingsMap,
  imageId: string,
): SessionImageRatingsMap {
  const prev = map[imageId];
  if (!prev) {
    return { ...map, [imageId]: { aesthetic_match: 0, timestamp: Date.now() } };
  }
  return {
    ...map,
    [imageId]: {
      ...prev,
      aesthetic_match: 0,
      timestamp: Date.now(),
    },
  };
}

export function aestheticPickerValue(
  ratings: Partial<ImageRatings> | undefined,
  fallback = 3,
): number {
  const score = ratings?.aesthetic_match;
  return score != null && score > 0 ? score : fallback;
}

/** True when the taste-match scale should be shown for the current selection. */
export function shouldShowAestheticRatingPanel(
  image: RatedImageLike | null | undefined,
  imageRatingsMap?: SessionImageRatingsMap,
): boolean {
  return imageNeedsAestheticRating(image, imageRatingsMap);
}
