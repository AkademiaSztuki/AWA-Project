/**
 * Run: pnpm --filter @aura/backend-gcp build && node dist/lib/share-card-id.selftest.js
 */
import { shareCardSlug } from './share-card-id';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const userA = 'user_abc';
const userB = 'user_xyz';
const image = Buffer.from('fake-image-bytes-for-share-card-slug');
const sameImage = Buffer.from('fake-image-bytes-for-share-card-slug');
const otherImage = Buffer.from('different-image-bytes');

const slugA1 = shareCardSlug(userA, image);
const slugA2 = shareCardSlug(userA, sameImage);
const slugAOther = shareCardSlug(userA, otherImage);
const slugB = shareCardSlug(userB, image);

assert(slugA1 === slugA2, 'same user + same bytes must reuse slug');
assert(slugA1 !== slugAOther, 'same user + different bytes must get a new slug');
assert(slugA1 !== slugB, 'different users must not share a slug');
assert(slugA1.length === 16, 'slug should be 16 chars');
assert(/^[A-Za-z0-9_-]+$/.test(slugA1), 'slug must be URL-safe');

console.log('share-card-id.selftest: all checks passed');
