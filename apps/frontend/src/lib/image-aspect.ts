/**
 * Helpers for mapping photo dimensions to Vertex AI-supported aspect ratios
 * and normalizing size hints without distorting proportions.
 */

export type GoogleAspectRatio =
  | '21:9'
  | '16:9'
  | '4:3'
  | '3:2'
  | '1:1'
  | '9:16'
  | '3:4'
  | '2:3'
  | '5:4'
  | '4:5';

/** Ordered by numeric ratio descending for stable closest-match selection. */
const ASPECT_RATIO_VALUES: ReadonlyArray<[GoogleAspectRatio, number]> = [
  ['21:9', 21 / 9],
  ['16:9', 16 / 9],
  ['4:3', 4 / 3],
  ['3:2', 3 / 2],
  ['5:4', 5 / 4],
  ['1:1', 1],
  ['4:5', 4 / 5],
  ['3:4', 3 / 4],
  ['2:3', 2 / 3],
  ['9:16', 9 / 16],
];

/**
 * Maps width/height ratio to the closest supported Google image_config aspect_ratio label.
 */
export function mapNumericRatioToGoogleAspectRatio(ratio: number): GoogleAspectRatio {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return '1:1';
  }

  let best: GoogleAspectRatio = '1:1';
  let bestDiff = Infinity;
  for (const [label, value] of ASPECT_RATIO_VALUES) {
    const diff = Math.abs(ratio - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = label;
    }
  }
  return best;
}

const ASPECT_LABEL_SET = new Set<string>(ASPECT_RATIO_VALUES.map(([label]) => label));

/** Validates client-provided aspect_ratio before sending to Vertex. */
export function parseGoogleAspectRatioLabel(value: string | undefined): GoogleAspectRatio | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return ASPECT_LABEL_SET.has(trimmed) ? (trimmed as GoogleAspectRatio) : undefined;
}

export function mapDimensionsToGoogleAspectRatio(width: number, height: number): GoogleAspectRatio {
  if (width <= 0 || height <= 0) {
    return '1:1';
  }
  return mapNumericRatioToGoogleAspectRatio(width / height);
}

/**
 * Scales so the longer side equals maxLongEdge; keeps aspect ratio.
 */
export function normalizeDimensionsToMaxLongEdge(
  width: number,
  height: number,
  maxLongEdge: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || maxLongEdge <= 0) {
    return { width: maxLongEdge, height: maxLongEdge };
  }
  const long = Math.max(width, height);
  const scale = maxLongEdge / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Raw base64 or full data URL → safe data URL for browser decode.
 * Upload pipeline uses JPEG; default MIME matches fileToNormalizedBase64.
 */
export function base64ToDataUrl(base64: string, mimeType = 'image/jpeg'): string {
  const trimmed = base64.trim();
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `data:${mimeType};base64,${trimmed}`;
}

export async function getImageDimensionsFromBase64(
  base64: string
): Promise<{ width: number; height: number }> {
  if (typeof window === 'undefined') {
    throw new Error('getImageDimensionsFromBase64 requires a browser environment');
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to decode image for dimensions'));
    img.src = base64ToDataUrl(base64, 'image/jpeg');
  });
}

export type PreparedGenerationDimensions = {
  sourceWidth: number;
  sourceHeight: number;
  normalizedWidth: number;
  normalizedHeight: number;
  aspectRatio: GoogleAspectRatio;
};

/**
 * Reads pixel size from base64, computes normalized long-edge size hints and closest Vertex aspect ratio.
 * Uses source pixel ratio for aspect mapping (avoids rounding drift).
 */
export async function prepareGenerationDimensionsFromRoomBase64(
  base64: string,
  options?: { maxLongEdge?: number }
): Promise<PreparedGenerationDimensions> {
  const maxLongEdge = options?.maxLongEdge ?? 1024;
  const { width: sw, height: sh } = await getImageDimensionsFromBase64(base64);
  const ratio = sw / sh;
  const aspectRatio = mapNumericRatioToGoogleAspectRatio(ratio);
  const { width: nw, height: nh } = normalizeDimensionsToMaxLongEdge(sw, sh, maxLongEdge);

  return {
    sourceWidth: sw,
    sourceHeight: sh,
    normalizedWidth: nw,
    normalizedHeight: nh,
    aspectRatio,
  };
}
