/**
 * Google Identity Services (GIS) – logowanie bezpośrednio przez Google, bez Supabase.
 * Wymaga: NEXT_PUBLIC_GOOGLE_CLIENT_ID (OAuth 2.0 Client ID z GCP Console).
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string }) => void;
          }) => { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };
        };
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (credential: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          prompt: (momentListener?: (notification: { isDisplayed: () => boolean }) => void) => void;
        };
      };
    };
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window undefined'));
  if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/** Dekoduje payload JWT (bez weryfikacji – do użycia sub/email w UI; w produkcji można weryfikować na backendzie). */
function decodeJwtPayload(token: string): { sub?: string; email?: string; name?: string } {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return {};
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return {
      sub: payload.sub,
      email: payload.email ?? undefined,
      name: payload.name ?? payload.email ?? undefined,
    };
  } catch {
    return {};
  }
}

export interface GoogleNativeUser {
  authUserId: string;
  email?: string;
  name?: string;
  userHash: string;
}

export type SignInWithGoogleNativeResult =
  | { ok: true; user: GoogleNativeUser }
  | { ok: false; error: string };

/**
 * Uruchamia logowanie przez Google (token model), łączy konto z user_hash w backendzie GCP.
 * Wymaga: NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_GCP_API_BASE_URL, tryb primary.
 */
export async function signInWithGoogleNative(options: {
  currentUserHash: string | null;
  consentTimestamp?: string;
  onGrantFreeCredits?: (userHash: string) => Promise<void>;
}): Promise<SignInWithGoogleNativeResult> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { ok: false, error: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set' };
  }

  const { gcpApi } = await import('@/lib/gcp-api-client');
  if (!gcpApi.isConfigured()) {
    return { ok: false, error: 'GCP API base URL is not set' };
  }

  await loadScript();

  const google = window.google;
  if (!google?.accounts?.oauth2?.initTokenClient) {
    return { ok: false, error: 'Google Identity Services not available' };
  }

  return new Promise((resolve) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: async (response) => {
        const accessToken = response.access_token;
        if (!accessToken) {
          resolve({ ok: false, error: 'No token from Google' });
          return;
        }
        // Token model zwraca access_token; do identyfikacji używamy UserInfo API lub przekazujemy token do backendu.
        // W najprostszej wersji wywołujemy UserInfo endpoint Google po access_token, żeby dostać sub/email.
        try {
          const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!userInfoRes.ok) {
            resolve({ ok: false, error: 'Failed to fetch user info' });
            return;
          }
          const userInfo = (await userInfoRes.json()) as { id: string; email?: string; name?: string };
          const authUserId = userInfo.id;
          const email = userInfo.email;
          const name = userInfo.name;

          const { gcpApi } = await import('@/lib/gcp-api-client');
          const userHash = options.currentUserHash || `anon-${authUserId.slice(0, 8)}-${Date.now().toString(36)}`;
          const linkRes = await gcpApi.participants.linkAuth({
            userHash,
            authUserId,
            consentTimestamp: options.consentTimestamp,
          });

          if (!linkRes.ok) {
            resolve({ ok: false, error: linkRes.error || 'link-auth failed' });
            return;
          }

          const effectiveHash = linkRes.data?.existingUserHash ?? userHash;
          if (options.onGrantFreeCredits) {
            try {
              await options.onGrantFreeCredits(effectiveHash);
            } catch {
              // ignore
            }
          }

          resolve({
            ok: true,
            user: {
              authUserId,
              email,
              name,
              userHash: effectiveHash,
            },
          });
        } catch (e) {
          resolve({
            ok: false,
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}
