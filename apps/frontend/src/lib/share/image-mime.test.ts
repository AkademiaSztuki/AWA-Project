import { describe, expect, it } from 'vitest';
import { detectImageMime, sniffImageMime } from './image-mime';

describe('sniffImageMime', () => {
  it('detects JPEG from SOI bytes', () => {
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });

  it('detects PNG signature', () => {
    expect(sniffImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      'image/png',
    );
  });

  it('detects WEBP RIFF header', () => {
    const bytes = new Uint8Array(12);
    bytes.set([0x52, 0x49, 0x46, 0x46], 0);
    bytes.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffImageMime(bytes)).toBe('image/webp');
  });

  it('falls back to jpeg for unknown payloads', () => {
    expect(sniffImageMime(new Uint8Array([0x00, 0x01]))).toBe('image/jpeg');
  });
});

describe('detectImageMime', () => {
  it('returns null for non-image bytes', () => {
    expect(detectImageMime(new Uint8Array([0x00, 0x01]))).toBeNull();
    expect(detectImageMime(new TextEncoder().encode('/images/tinder/Living Room (1).jpg'))).toBeNull();
  });
});
