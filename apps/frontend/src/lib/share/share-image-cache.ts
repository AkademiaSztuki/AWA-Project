/** Immutable per slug — after/before bytes do not change once the card exists. */
export const SHARE_IMAGE_CACHE_CONTROL =
  'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, immutable';
export const SHARE_IMAGE_MISS_CACHE_CONTROL = 'no-store';

export function isImageContentType(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^image\/(jpeg|jpg|png|webp|gif)\b/i.test(value);
}
