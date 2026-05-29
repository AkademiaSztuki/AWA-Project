/**
 * Allowlist relative in-app redirects (blocks open redirects via //evil.com or javascript:).
 */
export function sanitizeRelativeRedirectPath(
  raw: string | null | undefined,
  fallback = '/',
): string {
  if (!raw || typeof raw !== 'string') return fallback;

  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return fallback;
  }

  if (!path.startsWith('/') || path.startsWith('//')) return fallback;
  if (path.includes('://') || path.toLowerCase().startsWith('javascript:')) {
    return fallback;
  }

  return path;
}

/** Stripe checkout success/cancel URLs must stay on this app origin. */
export function sanitizeSameOriginUrl(
  raw: string | undefined,
  origin: string,
  fallbackPath: string,
): string {
  if (!raw) return `${origin}${fallbackPath}`;
  try {
    const url = new URL(raw, origin);
    const base = new URL(origin);
    if (url.origin !== base.origin) {
      return `${origin}${fallbackPath}`;
    }
    return url.toString();
  } catch {
    return `${origin}${fallbackPath}`;
  }
}
