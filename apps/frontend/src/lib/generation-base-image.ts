/**
 * Canvas for img2img generation: furniture-removed empty room when present,
 * otherwise the original furnished photo.
 */

export function stripImagePayload(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('data:') && trimmed.includes(',')) {
    return trimmed.slice(trimmed.indexOf(',') + 1);
  }
  return trimmed;
}

function nonempty(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function makeImageSig(img?: string | null): string {
  if (!img) return 'none';
  const len = img.length;
  const head = img.slice(0, 64);
  const tail = len > 64 ? img.slice(-64) : '';
  return `${len}:${head}:${tail}`;
}

export type GenerationBaseImage = {
  payload: string;
  usedEmptyRoom: boolean;
};

/**
 * Prefer the Etap 2 empty-room (furniture removed) as the generation canvas.
 * Session `roomImageEmpty` wins; sessionStorage is only a fallback and is skipped
 * when its source signature belongs to a different original photo.
 */
export function pickGenerationBaseImage(opts: {
  roomImage?: string | null;
  roomImageEmpty?: string | null;
  emptyFromStorage?: string | null;
  emptySourceSig?: string | null;
}): GenerationBaseImage | null {
  const room = nonempty(opts.roomImage);
  const emptySession = nonempty(opts.roomImageEmpty);
  const emptyStorage = nonempty(opts.emptyFromStorage);
  const storageMatches =
    !!emptyStorage && (!opts.emptySourceSig || !room || opts.emptySourceSig === makeImageSig(room));
  const empty = emptySession || (storageMatches ? emptyStorage : null);
  if (empty) {
    return { payload: stripImagePayload(empty), usedEmptyRoom: true };
  }
  if (room) {
    return { payload: stripImagePayload(room), usedEmptyRoom: false };
  }
  return null;
}

export type ModificationCategory = 'micro' | 'macro';

export type ModificationBaseDecision =
  | { kind: 'original_canvas'; payload: string }
  | { kind: 'generated' }
  | { kind: 'need_generated' }
  | { kind: 'missing' };

/**
 * Macro restyles from the original room canvas when the upload thumbnail is selected.
 * Micro edits still require a generated vision (not the uploaded photo).
 */
export function decideModificationBase(opts: {
  category: ModificationCategory;
  viewingOriginalUpload: boolean;
  hasGeneratedBase: boolean;
  originalCanvasPayload: string | null;
}): ModificationBaseDecision {
  if (opts.viewingOriginalUpload) {
    switch (opts.category) {
      case 'macro':
        return opts.originalCanvasPayload
          ? { kind: 'original_canvas', payload: opts.originalCanvasPayload }
          : { kind: 'missing' };
      case 'micro':
        return { kind: 'need_generated' };
      default: {
        const _never: never = opts.category;
        return _never;
      }
    }
  }
  if (opts.hasGeneratedBase) {
    return { kind: 'generated' };
  }
  return { kind: 'missing' };
}
