import { getSessionStoreSnapshot } from '@/hooks/useSession';
import { hasResearchConsent } from '@/lib/research-consent';

/**
 * HttpOnly anonymous session cookie (anti-abuse). No-op until research consent exists.
 */
export async function initAnonSessionAfterConsent(): Promise<void> {
  if (!hasResearchConsent(getSessionStoreSnapshot())) {
    return;
  }
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
