import { describe, it, expect } from 'vitest';
import {
  collectShareBeforeBase64,
  guessMimeFromBase64,
  isRemoteOrAssetUrl,
  isSameShareImageSource,
  looksLikeImageBase64,
  pickShareBeforeSource,
  resolveRoomBeforeImage,
  toBase64Payload,
  toFetchableImageUrl,
  toImageDataUrl,
} from './source-image';

const JPEG_B64 = btoa('\xff\xd8\xff\xe0' + 'x'.repeat(48));

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

  it('does not treat a sample path as base64 even when passed as explicit', () => {
    expect(toBase64Payload(null, '/images/tinder/Living Room (1).jpg')).toBeNull();
    expect(
      toBase64Payload(
        '/images/tinder/Living Room (1).jpg',
        '/images/tinder/Living Room (1).jpg',
      ),
    ).toBeNull();
  });
});

describe('isRemoteOrAssetUrl / looksLikeImageBase64', () => {
  it('recognizes sample room paths as URLs, not image bytes', () => {
    expect(isRemoteOrAssetUrl('/images/tinder/Living Room (1).jpg')).toBe(true);
    expect(looksLikeImageBase64('/images/tinder/Living Room (1).jpg')).toBe(false);
    expect(looksLikeImageBase64('not-an-image')).toBe(false);
    expect(isRemoteOrAssetUrl(JPEG_B64)).toBe(false);
    expect(looksLikeImageBase64(JPEG_B64)).toBe(true);
  });

  it('does not treat JPEG base64 (/9j/...) as a site path', () => {
    expect(JPEG_B64.startsWith('/9j/')).toBe(true);
    expect(JPEG_B64.startsWith('/')).toBe(true);
    expect(isRemoteOrAssetUrl(JPEG_B64)).toBe(false);
    expect(looksLikeImageBase64(JPEG_B64)).toBe(true);
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

  it('does not double-encode already-escaped sample paths', () => {
    expect(toFetchableImageUrl('/images/tinder/Living%20Room%20(1).jpg')).toBe(
      '/images/tinder/Living%20Room%20(1).jpg',
    );
  });

  it('does not treat JPEG base64 as a fetch path', () => {
    expect(toFetchableImageUrl(JPEG_B64)).toBe(JPEG_B64);
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
      roomImage: JPEG_B64,
      roomImageEmpty: 'room-empty',
    });
    expect(resolved?.url).toBe(`data:image/jpeg;base64,${JPEG_B64}`);
    expect(resolved?.base64).toBe(JPEG_B64);
  });

  it('falls back to uploadedImage and ignores furniture-removed empty room', () => {
    expect(resolveRoomBeforeImage({ uploadedImage: JPEG_B64 })?.base64).toBe(JPEG_B64);
    expect(resolveRoomBeforeImage({ roomImageEmpty: JPEG_B64 })).toBeNull();
    expect(resolveRoomBeforeImage({})).toBeNull();
  });

  it('keeps sample-library paths fetchable instead of wrapping them as jpeg data URLs', () => {
    const resolved = resolveRoomBeforeImage({
      roomImage: '/images/tinder/Living Room (2).jpg',
    });
    expect(resolved?.url).toBe('/images/tinder/Living Room (2).jpg');
    expect(resolved?.base64).toBeNull();
  });
});

describe('collectShareBeforeBase64', () => {
  it('uses explicit image bytes from props', async () => {
    await expect(collectShareBeforeBase64(null, JPEG_B64, null)).resolves.toBe(JPEG_B64);
  });

  it('uses session roomImage when props are empty', async () => {
    await expect(
      collectShareBeforeBase64(null, null, { roomImage: JPEG_B64 }),
    ).resolves.toBe(JPEG_B64);
  });

  it('does not POST a sample path as fake image bytes', async () => {
    await expect(
      collectShareBeforeBase64('/images/tinder/Living Room (1).jpg', '/images/tinder/Living Room (1).jpg', null),
    ).resolves.toBeNull();
  });

  it('accepts raw JPEG /9j/ as before bytes (history / session roomImage)', async () => {
    await expect(collectShareBeforeBase64(null, JPEG_B64, null)).resolves.toBe(JPEG_B64);
    await expect(
      collectShareBeforeBase64(`data:image/jpeg;base64,${JPEG_B64}`, null, null),
    ).resolves.toBe(JPEG_B64);
  });

  it('refuses the generated after image as before', async () => {
    await expect(
      collectShareBeforeBase64(JPEG_B64, JPEG_B64, null, { url: `data:image/jpeg;base64,${JPEG_B64}`, base64: JPEG_B64 }),
    ).resolves.toBeNull();
    await expect(
      collectShareBeforeBase64(JPEG_B64, null, { roomImage: JPEG_B64 }, { base64: JPEG_B64 }),
    ).resolves.toBeNull();
  });

  it('refuses furniture-removed empty-room as before', async () => {
    const empty = btoa('\xff\xd8\xff\xe0' + 'e'.repeat(48));
    await expect(
      collectShareBeforeBase64(empty, empty, { roomImageEmpty: empty }),
    ).resolves.toBeNull();
  });

  it('keeps a different original JPEG as before even when both share a JPEG SOI', async () => {
    const original = btoa('\xff\xd8\xff\xe0' + 'O'.repeat(80));
    const generated = btoa('\xff\xd8\xff\xe0' + 'G'.repeat(80));
    await expect(
      collectShareBeforeBase64(null, original, null, { base64: generated }),
    ).resolves.toBe(original);
    await expect(
      collectShareBeforeBase64(null, original, { roomImage: original }, { base64: generated }),
    ).resolves.toBe(original);
  });
});

describe('pickShareBeforeSource', () => {
  const original = '/images/tinder/Living Room (1).jpg';
  const generated = `data:image/jpeg;base64,${JPEG_B64}`;

  it('prefers the Generation History upload node over session fallbacks', () => {
    const picked = pickShareBeforeSource({
      historyUrl: original,
      roomBefore: { url: '/images/tinder/Living Room (2).jpg', base64: null },
      originalRoomPhotoUrl: generated,
      afterUrl: generated,
      afterBase64: JPEG_B64,
    });
    expect(picked?.url).toBe(original);
  });

  it('never returns the generated after image, even if history[0] was a vision', () => {
    expect(
      pickShareBeforeSource({
        historyUrl: generated,
        roomBefore: { url: generated, base64: JPEG_B64 },
        originalRoomPhotoUrl: generated,
        afterUrl: generated,
        afterBase64: JPEG_B64,
      }),
    ).toBeNull();
  });

  it('falls back to session original when history is missing', () => {
    const picked = pickShareBeforeSource({
      historyUrl: null,
      roomBefore: { url: original, base64: null },
      afterUrl: generated,
      afterBase64: JPEG_B64,
    });
    expect(picked?.url).toBe(original);
  });

  it('does not use history[0] when that slot is a generated vision', () => {
    const picked = pickShareBeforeSource({
      historyUrl: generated,
      roomBefore: { url: original, base64: null },
      afterUrl: generated,
      afterBase64: JPEG_B64,
    });
    expect(picked?.url).toBe(original);
  });
});

describe('isSameShareImageSource', () => {
  it('matches data URL to raw jpeg payload', () => {
    expect(isSameShareImageSource(`data:image/jpeg;base64,${JPEG_B64}`, JPEG_B64)).toBe(true);
    expect(isSameShareImageSource(JPEG_B64, 'other-bytes-here')).toBe(false);
  });

  it('does not treat two different JPEGs as the same just because they share a SOI header', () => {
    // Typical JFIF APP0 (~20 bytes) is identical across canvas JPEGs; old guard used slice(0, 48).
    const jfifHeader =
      '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00' +
      '\xff\xdb\x00C\x00' +
      '\x10'.repeat(16);
    const jpegA = btoa(jfifHeader + 'A'.repeat(80));
    const jpegB = btoa(jfifHeader + 'B'.repeat(80));
    expect(jpegA.slice(0, 48)).toBe(jpegB.slice(0, 48));
    expect(isSameShareImageSource(jpegA, jpegB)).toBe(false);
    expect(isSameShareImageSource(`data:image/jpeg;base64,${jpegA}`, jpegB)).toBe(false);
  });

  it('matches equivalent room URLs after decoding, not a URL against image bytes', () => {
    expect(
      isSameShareImageSource(
        '/images/tinder/Living Room (1).jpg',
        '/images/tinder/Living%20Room%20(1).jpg',
      ),
    ).toBe(true);
    expect(isSameShareImageSource('/images/tinder/Living Room (1).jpg', JPEG_B64)).toBe(false);
    expect(isSameShareImageSource('https://cdn.example/a.jpg', 'https://cdn.example/b.jpg')).toBe(
      false,
    );
  });
});
