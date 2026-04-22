/**
 * Client: establish HttpOnly anonymous session (anti-abuse) after research consent.
 */
export async function initAnonSessionAfterConsent(): Promise<void> {
  try {
    const res = await fetch('/api/session/init', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      console.warn('[anon-session] /api/session/init failed', res.status);
    }
  } catch (e) {
    console.warn('[anon-session] /api/session/init error', e);
  }
}
