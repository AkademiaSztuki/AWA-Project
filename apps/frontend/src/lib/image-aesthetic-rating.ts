import { getSessionStoreSnapshot } from '@/hooks/useSession';

export type ImageRatings = {
  aesthetic_match: number;
  character: number;
  harmony: number;
};

export type SessionImageRatingEntry = Partial<ImageRatings> & {
  ratedAt?: number;
  /** @deprecated prefer ratedAt */
  timestamp?: number;
};

export type SessionImageRatingsMap = Record<string, SessionImageRatingEntry>;

export type RatedImageLike = {
  id: string;
  ratings?: Partial<ImageRatings>;
};

function ratingTimestamp(entry?: SessionImageRatingEntry): number {
  return entry?.ratedAt ?? entry?.timestamp ?? 0;
}

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
      const row = entry as { id?: string } & SessionImageRatingEntry;
      if (typeof row.id !== 'string' || !row.id) continue;
      const { id, ...scores } = row;
      map[id] = scores;
    }
    return map;
  }
  return raw as SessionImageRatingsMap;
}

/** Session-only gate for the taste rating panel (per imageId, never global). */
export function shouldShowTasteRating(
  imageId: string | null | undefined,
  ratings: SessionImageRatingsMap,
): boolean {
  if (!imageId || imageId === 'original-uploaded-image') return false;
  return coercePositiveScore(ratings[imageId]?.aesthetic_match) === undefined;
}

export function hasTasteRating(
  imageId: string | null | undefined,
  ratings: SessionImageRatingsMap,
): boolean {
  if (!imageId || imageId === 'original-uploaded-image') return true;
  return !shouldShowTasteRating(imageId, ratings);
}

export function getEffectiveRatings(
  image: RatedImageLike,
  imageRatingsMap?: SessionImageRatingsMap,
): ImageRatings {
  const session = imageRatingsMap?.[image.id];
  return {
    aesthetic_match: pickRatingScore(session?.aesthetic_match, image.ratings?.aesthetic_match),
    character: pickRatingScore(session?.character, image.ratings?.character),
    harmony: pickRatingScore(session?.harmony, image.ratings?.harmony),
  };
}

/** @deprecated use hasTasteRating(image?.id, map) */
export function imageHasAestheticRating(
  image: RatedImageLike | null | undefined,
  imageRatingsMap?: SessionImageRatingsMap,
): boolean {
  return hasTasteRating(image?.id, imageRatingsMap ?? {});
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
    merged[id] = mergeRatingEntries(hook[id], snap[id]);
  }
  return merged;
}

export function applyRatingsToImage<T extends RatedImageLike>(image: T, map?: SessionImageRatingsMap): T {
  return {
    ...image,
    ratings: getEffectiveRatings(image, map),
  };
}

function mergeRatingEntries(
  local?: SessionImageRatingEntry,
  remote?: SessionImageRatingEntry,
): SessionImageRatingEntry {
  const lScore = coercePositiveScore(local?.aesthetic_match);
  const rScore = coercePositiveScore(remote?.aesthetic_match);
  const lTs = ratingTimestamp(local);
  const rTs = ratingTimestamp(remote);

  if (lScore !== undefined && rScore === undefined) {
    return {
      ...remote,
      ...local,
      aesthetic_match: lScore,
      ratedAt: lTs || rTs || undefined,
      timestamp: local?.timestamp ?? remote?.timestamp,
    };
  }
  if (rScore !== undefined && lScore === undefined) {
    return {
      ...local,
      ...remote,
      aesthetic_match: rScore,
      ratedAt: rTs || lTs || undefined,
      timestamp: local?.timestamp ?? remote?.timestamp,
    };
  }

  if (lTs > rTs) {
    return {
      ...remote,
      ...local,
      aesthetic_match: pickRatingScore(local?.aesthetic_match, remote?.aesthetic_match),
      character: pickRatingScore(local?.character, remote?.character),
      harmony: pickRatingScore(local?.harmony, remote?.harmony),
      ratedAt: lTs || undefined,
      timestamp: local?.timestamp ?? remote?.timestamp,
    };
  }
  if (rTs > lTs) {
    return {
      ...local,
      ...remote,
      aesthetic_match: pickRatingScore(local?.aesthetic_match, remote?.aesthetic_match),
      character: pickRatingScore(local?.character, remote?.character),
      harmony: pickRatingScore(local?.harmony, remote?.harmony),
      ratedAt: rTs || undefined,
      timestamp: local?.timestamp ?? remote?.timestamp,
    };
  }

  return {
    ...local,
    ...remote,
    aesthetic_match: pickRatingScore(local?.aesthetic_match, remote?.aesthetic_match),
    character: pickRatingScore(local?.character, remote?.character),
    harmony: pickRatingScore(local?.harmony, remote?.harmony),
    ratedAt: lTs || rTs || undefined,
    timestamp: local?.timestamp ?? remote?.timestamp,
  };
}

/** Merge local + remote imageRatings; newer ratedAt wins; zeros never overwrite positives. */
export function mergePersistedImageRatingsMaps(
  local?: SessionImageRatingsMap | unknown,
  remote?: SessionImageRatingsMap | unknown,
): SessionImageRatingsMap {
  const l = normalizeSessionImageRatingsMap(local);
  const r = normalizeSessionImageRatingsMap(remote);
  const ids = new Set([...Object.keys(l), ...Object.keys(r)]);
  const merged: SessionImageRatingsMap = {};
  for (const id of ids) {
    merged[id] = mergeRatingEntries(l[id], r[id]);
  }
  return merged;
}

export function writeAestheticRatingToMap(
  map: SessionImageRatingsMap,
  imageId: string,
  value: number,
): SessionImageRatingsMap {
  const now = Date.now();
  return {
    ...map,
    [imageId]: {
      ...(map[imageId] || {}),
      aesthetic_match: value,
      ratedAt: now,
      timestamp: now,
    },
  };
}

export function aestheticPickerValue(
  ratings: Partial<ImageRatings> | SessionImageRatingEntry | undefined,
  fallback = 3,
): number {
  const score = ratings?.aesthetic_match;
  return score != null && score > 0 ? score : fallback;
}
