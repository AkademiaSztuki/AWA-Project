import { describe, it, expect } from 'vitest';
import {
  collectShareBeforeBase64,
  guessMimeFromBase64,
  resolveRoomBeforeImage,
  toBase64Payload,
  toFetchableImageUrl,
  toImageDataUrl,
} from './source-image';

describe('toImageDataUrl', () => {
  it('wraps raw base64 as a jpeg data URL', () => {
    expect(toImageDataUrl('abc123')).toBe('data:image/jpeg;base64,abc123');
  });

  it('keeps data URLs and sample-library paths', () => {
    expect(toImageDataUrl('data:image/png;base64,xx')).toBe('data:image/png;base64,xx');
    expect(toImageDataUrl('/images/tinder/Living Room (1).jpg')).toBe(
      '/images/tinder/Living Room (1).jpg',
    );
  });

  it('returns null for empty input', () => {
    expect(toImageDataUrl(null)).toBeNull();
    expect(toImageDataUrl('   ')).toBeNull();
  });
});

describe('toBase64Payload', () => {
  it('prefers explicit base64 over the URL', () => {
    expect(toBase64Payload('https://cdn.example/a.jpg', 'explicit')).toBe('explicit');
  });

  it('strips a data-URL prefix', () => {
    expect(toBase64Payload('data:image/jpeg;base64,abc', null)).toBe('abc');
  });

  it('does not invent payload for http or relative URLs', () => {
    expect(toBase64Payload('/images/tinder/Living Room (1).jpg', null)).toBeNull();
    expect(toBase64Payload('https://cdn.example/a.jpg', null)).toBeNull();
  });
});

describe('toFetchableImageUrl', () => {
  it('encodes spaces in sample-room paths and prefixes origin', () => {
    expect(toFetchableImageUrl('/images/tinder/Living Room (1).jpg')).toBe(
      '/images/tinder/Living%20Room%20(1).jpg',
    );
    expect(toFetchableImageUrl('/images/tinder/Living Room (1).jpg', 'https://project-ida.com')).toBe(
      'https://project-ida.com/images/tinder/Living%20Room%20(1).jpg',
    );
  });

  it('leaves http(s) URLs unchanged', () => {
    expect(toFetchableImageUrl('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
  });
});

describe('guessMimeFromBase64', () => {
  it('detects jpeg SOI bytes', () => {
    const jpeg = btoa('\xff\xd8\xff\xe0xxxx');
    expect(guessMimeFromBase64(jpeg)).toBe('image/jpeg');
  });

  it('detects png signature', () => {
    const png = btoa('\x89PNG\r\n\x1a\nxxxx');
    expect(guessMimeFromBase64(png)).toBe('image/png');
  });
});

describe('resolveRoomBeforeImage', () => {
  it('uses the original room photo, not the empty processed room', () => {
    const resolved = resolveRoomBeforeImage({
      roomImage: 'room-original',
      roomImageEmpty: 'room-empty',
    });
    expect(resolved?.url).toBe('data:image/jpeg;base64,room-original');
    expect(resolved?.base64).toBe('room-original');
  });

  it('falls back to uploadedImage, then empty room', () => {
    expect(resolveRoomBeforeImage({ uploadedImage: 'from-upload' })?.base64).toBe('from-upload');
    expect(resolveRoomBeforeImage({ roomImageEmpty: 'empty-only' })?.base64).toBe('empty-only');
    expect(resolveRoomBeforeImage({})).toBeNull();
  });
});

describe('collectShareBeforeBase64', () => {
  it('uses explicit base64 from props', async () => {
    await expect(collectShareBeforeBase64(null, 'room-bytes', null)).resolves.toBe('room-bytes');
  });

  it('uses session roomImage when props are empty', async () => {
    await expect(
      collectShareBeforeBase64(null, null, { roomImage: 'from-session' }),
    ).resolves.toBe('from-session');
  });
});
