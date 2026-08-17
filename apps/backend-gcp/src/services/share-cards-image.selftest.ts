/**
 * Run: pnpm --filter @aura/backend-gcp build && node dist/services/share-cards-image.selftest.js
 */
import { detectImageContentType, shareImageContentHash } from './share-cards';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const samplePath = Buffer.from('/images/tinder/Living Room (1).jpg', 'utf8');

assert(detectImageContentType(jpeg) === 'image/jpeg', 'jpeg SOI must be detected');
assert(detectImageContentType(png) === 'image/png', 'png signature must be detected');
assert(detectImageContentType(samplePath) === null, 'a sample photo path must not count as image bytes');
assert(detectImageContentType(Buffer.from('not-an-image')) === null, 'plain text must not count as image bytes');

const jpegA = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x01]);
const jpegB = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x02]);
assert(
  shareImageContentHash(jpegA) === shareImageContentHash(Buffer.from(jpegA)),
  'identical before/after bytes must share a hash',
);
assert(shareImageContentHash(jpegA) !== shareImageContentHash(jpegB), 'distinct photos must not share a hash');

console.log('share-cards-image.selftest: all checks passed');
