/**
 * Detect IDE / Electron embedded webviews where Google GIS popups often fail.
 * Used for OAuth redirect strategy (legacy /auth/callback) — not for security boundaries.
 */

export function isEmbeddedBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/Electron\//i.test(ua)) return true;
  if (/\bCursor\b/i.test(ua)) return true;
  if (/vscode-webview/i.test(ua)) return true;
  if (/Code\/\d/i.test(ua) && /Electron/i.test(ua)) return true;
  return false;
}

/** User-facing hint when GIS popup cannot open in an embedded webview. */
export const EMBEDDED_BROWSER_GOOGLE_AUTH_HINT =
  'embedded_browser_google_auth';

export function isEmbeddedBrowserGoogleAuthError(error: string | undefined): boolean {
  if (!error) return false;
  return error.includes(EMBEDDED_BROWSER_GOOGLE_AUTH_HINT);
}
