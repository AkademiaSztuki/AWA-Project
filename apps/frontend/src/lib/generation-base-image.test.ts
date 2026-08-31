import { describe, expect, it } from 'vitest';
import {
  decideModificationBase,
  pickGenerationBaseImage,
  stripImagePayload,
} from './generation-base-image';

describe('pickGenerationBaseImage', () => {
  const original = 'original-room-bytes';
  const empty = 'empty-room-bytes';

  it('uses furniture-removed empty room from session as the canvas', () => {
    const picked = pickGenerationBaseImage({
      roomImage: original,
      roomImageEmpty: empty,
    });
    expect(picked).toEqual({ payload: empty, usedEmptyRoom: true });
  });

  it('falls back to original when empty-room was never produced', () => {
    const picked = pickGenerationBaseImage({ roomImage: original });
    expect(picked).toEqual({ payload: original, usedEmptyRoom: false });
  });

  it('uses sessionStorage empty-room when session field is missing and signature matches', () => {
    const sig = `${original.length}:${original}:`;
    const picked = pickGenerationBaseImage({
      roomImage: original,
      emptyFromStorage: empty,
      emptySourceSig: sig,
    });
    expect(picked).toEqual({ payload: empty, usedEmptyRoom: true });
  });

  it('ignores stale sessionStorage empty-room from a different original photo', () => {
    const picked = pickGenerationBaseImage({
      roomImage: original,
      emptyFromStorage: empty,
      emptySourceSig: '999:other:other',
    });
    expect(picked).toEqual({ payload: original, usedEmptyRoom: false });
  });

  it('strips a data-URL prefix from the empty-room canvas', () => {
    const picked = pickGenerationBaseImage({
      roomImage: original,
      roomImageEmpty: `data:image/jpeg;base64,${empty}`,
    });
    expect(picked?.payload).toBe(empty);
    expect(picked?.usedEmptyRoom).toBe(true);
  });
});

describe('stripImagePayload', () => {
  it('strips data URLs and leaves raw base64', () => {
    expect(stripImagePayload('data:image/png;base64,abc')).toBe('abc');
    expect(stripImagePayload('abc')).toBe('abc');
  });
});

describe('decideModificationBase', () => {
  const canvas = 'empty-or-original-bytes';

  it('uses the original room canvas for a new-style macro while viewing the upload', () => {
    expect(
      decideModificationBase({
        category: 'macro',
        viewingOriginalUpload: true,
        hasGeneratedBase: true,
        originalCanvasPayload: canvas,
      }),
    ).toEqual({ kind: 'original_canvas', payload: canvas });
  });

  it('still requires a generated thumbnail for micro edits on the upload', () => {
    expect(
      decideModificationBase({
        category: 'micro',
        viewingOriginalUpload: true,
        hasGeneratedBase: true,
        originalCanvasPayload: canvas,
      }),
    ).toEqual({ kind: 'need_generated' });
  });

  it('uses the selected generated vision when not viewing the upload', () => {
    expect(
      decideModificationBase({
        category: 'macro',
        viewingOriginalUpload: false,
        hasGeneratedBase: true,
        originalCanvasPayload: canvas,
      }),
    ).toEqual({ kind: 'generated' });
  });

  it('reports missing when a macro from the upload has no room canvas', () => {
    expect(
      decideModificationBase({
        category: 'macro',
        viewingOriginalUpload: true,
        hasGeneratedBase: false,
        originalCanvasPayload: null,
      }),
    ).toEqual({ kind: 'missing' });
  });
});
