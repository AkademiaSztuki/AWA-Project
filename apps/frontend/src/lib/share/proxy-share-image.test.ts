import { describe, expect, it } from 'vitest';
import {
  SHARE_IMAGE_CACHE_CONTROL,
  SHARE_IMAGE_MISS_CACHE_CONTROL,
  isImageContentType,
} from './share-image-cache';

describe('share image proxy cache', () => {
  it('caches successful hits at the CDN for a day', () => {
    expect(SHARE_IMAGE_CACHE_CONTROL).toContain('s-maxage=86400');
    expect(SHARE_IMAGE_CACHE_CONTROL).toContain('immutable');
    expect(SHARE_IMAGE_MISS_CACHE_CONTROL).toBe('no-store');
  });

  it('accepts real image content types from upstream', () => {
    expect(isImageContentType('image/jpeg')).toBe(true);
    expect(isImageContentType('image/webp; charset=binary')).toBe(true);
    expect(isImageContentType('application/octet-stream')).toBe(false);
    expect(isImageContentType(null)).toBe(false);
  });
});
