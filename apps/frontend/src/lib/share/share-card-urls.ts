/** Same-origin proxy paths for share-card photos (GCS via backend-gcp). */

export function shareCardProxyPath(
  slug: string,
  kind: 'image' | 'before',
  retryAttempt = 0,
): string {
  const path = `/api/share/${encodeURIComponent(slug)}/${kind}`;
  if (retryAttempt <= 0) return path;
  return `${path}?v=${retryAttempt}`;
}
