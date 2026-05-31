/**
 * Google Identity Services (GIS) – logowanie bezpośrednio przez Google, bez Supabase.
 * Wymaga: NEXT_PUBLIC_GOOGLE_CLIENT_ID (OAuth 2.0 Client ID z GCP Console).
 *
 * Domyślnie używa GIS token popup (bez redirect_uri w authorize).
 * Na produkcji project-ida.com NIE ma fallbacku redirect przy popup_failed_to_open
 * (unika redirect_uri_mismatch gdy GCP nie ma wpisu). Redirect tylko gdy:
 *   NEXT_PUBLIC_GOOGLE_OAUTH_USE_PKCE_REDIRECT=1, lub dev Cursor/Electron na localhost.
 * W Google Cloud dodaj redirect URIs tylko jeśli używasz redirect — patrz docs/gcp/update-oauth-web-client-origins.md
 */

import { gcpApi } from '@/lib/gcp-api-client';
import { safeLocalStorage } from '@/lib/gcp-data';
import { GOOGLE_AUTH_EMAIL_STORAGE_KEY, GOOGLE_AUTH_USER_ID_STORAGE_KEY } from '@/lib/auth-storage-keys';
import {
  persistImplicitTokenSessionAndRedirect,
  persistPkceSessionAndRedirect,
  shouldAllowOAuthRedirectFallback,
} from '@/lib/google-oauth-pkce';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
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

/** Załaduj skrypt GIS wcześniej (np. przy otwarciu modala), żeby requestAccessToken szedł w tym samym „user gesture” co klik. */
export function preloadGoogleIdentityScript(): void {
  if (typeof window === 'undefined') return;
  void loadScript().catch(() => {});
}

const GIS_TOKEN_FLOW_MS = 120_000;

function shouldUsePkceForEmbeddedBrowser(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  return /Electron\//i.test(navigator.userAgent) || /\bCursor\b/i.test(navigator.userAgent);
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

export async function completeGoogleNativeLoginFromAccessToken(
  accessToken: string,
  options: {
    currentUserHash: string | null;
    consentTimestamp?: string;
    onGrantFreeCredits?: (userHash: string, authUserId: string) => Promise<void>;
  },
): Promise<SignInWithGoogleNativeResult> {
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userInfoRes.ok) {
      return { ok: false, error: 'Nie udało się pobrać danych konta Google.' };
    }
    const userInfo = (await userInfoRes.json()) as { id: string; email?: string; name?: string };
    const authUserId = userInfo.id;
    const email = userInfo.email;
    const name = userInfo.name;

    const userHash = options.currentUserHash || `anon-${authUserId.slice(0, 8)}-${Date.now().toString(36)}`;
    const linkRes = await gcpApi.participants.linkAuth({
      userHash,
      authUserId,
      consentTimestamp: options.consentTimestamp,
      email: email || undefined,
    });

    if (!linkRes.ok) {
      return { ok: false, error: linkRes.error || 'link-auth failed' };
    }

    const effectiveHash = linkRes.data?.existingUserHash ?? userHash;
    if (options.onGrantFreeCredits) {
      try {
        await options.onGrantFreeCredits(effectiveHash, authUserId);
      } catch {
        // ignore
      }
    }

    return {
      ok: true,
      user: {
        authUserId,
        email,
        name,
        userHash: effectiveHash,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

export function persistNativeGoogleUserToLocalStorage(user: GoogleNativeUser): void {
  safeLocalStorage.setItem('aura_user_hash', user.userHash);
  safeLocalStorage.setItem(GOOGLE_AUTH_USER_ID_STORAGE_KEY, user.authUserId);
  if (user.email && user.email.trim().length > 0) {
    safeLocalStorage.setItem(GOOGLE_AUTH_EMAIL_STORAGE_KEY, user.email.trim());
  }
}

export async function syncGoogleNativeEmailLinkAuth(user: GoogleNativeUser): Promise<void> {
  if (!user.email?.trim()) return;
  try {
    const sync = await gcpApi.participants.linkAuth({
      userHash: user.userHash,
      authUserId: user.authUserId,
      email: user.email.trim().toLowerCase(),
    });
    if (!sync.ok) {
      console.warn('[google-auth] linkAuth after Google sign-in failed:', sync.error);
    }
  } catch (e) {
    console.warn('[google-auth] linkAuth after Google sign-in error:', e);
  }
}

export type SignInWithGoogleNativeOptions = {
  currentUserHash: string | null;
  consentTimestamp?: string;
  onGrantFreeCredits?: (userHash: string, authUserId: string) => Promise<void>;
  /** Used after PKCE redirect (and stored for /auth/google/callback). */
  authNextPath?: string | null;
};

/**
 * Uruchamia logowanie przez Google (token model + link-auth).
 * Na localhost w Cursor/Electron przy popup_failed_to_open: implicit redirect (wymaga GCP redirect URI).
 * Na www.project-ida.com produkcji: tylko GIS popup — bez automatycznego redirect.
 */
export async function signInWithGoogleNative(
  options: SignInWithGoogleNativeOptions,
): Promise<SignInWithGoogleNativeResult> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { ok: false, error: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set' };
  }

  if (!gcpApi.isConfigured()) {
    return { ok: false, error: 'GCP API base URL is not set' };
  }

  const usePkceOnly = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_USE_PKCE_REDIRECT === '1';
  if (usePkceOnly) {
    await persistPkceSessionAndRedirect({
      clientId,
      currentUserHash: options.currentUserHash,
      consentTimestamp: options.consentTimestamp ?? new Date().toISOString(),
      authNextPath: options.authNextPath,
    });
    return new Promise(() => {});
  }

  if (shouldUsePkceForEmbeddedBrowser()) {
    persistImplicitTokenSessionAndRedirect({
      clientId,
      currentUserHash: options.currentUserHash,
      consentTimestamp: options.consentTimestamp ?? new Date().toISOString(),
      authNextPath: options.authNextPath,
    });
    return new Promise(() => {});
  }

  await loadScript();

  const google = window.google;
  if (!google?.accounts?.oauth2?.initTokenClient) {
    return { ok: false, error: 'Google Identity Services not available' };
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId: number | undefined;

    const finish = (result: SignInWithGoogleNativeResult) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      resolve(result);
    };

    timeoutId = window.setTimeout(() => {
      finish({
        ok: false,
        error:
          'Logowanie przez Google przekroczyło limit czasu. Zamknij ewentualne okna Google i spróbuj ponownie.',
      });
    }, GIS_TOKEN_FLOW_MS);

    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      error_callback: (err) => {
        if (settled) return;
        const type = err?.type ?? '';
        const message = typeof err?.message === 'string' ? err.message : '';
        const combined = `${type} ${message}`.toLowerCase();

        if (type === 'popup_failed_to_open' || combined.includes('failed to open')) {
          if (!shouldAllowOAuthRedirectFallback()) {
            finish({
              ok: false,
              error:
                'Nie udało się otworzyć okna logowania Google. Zezwól na wyskakujące okna dla tej strony i spróbuj ponownie.',
            });
            return;
          }
          if (timeoutId !== undefined) window.clearTimeout(timeoutId);
          persistImplicitTokenSessionAndRedirect({
            clientId,
            currentUserHash: options.currentUserHash,
            consentTimestamp: options.consentTimestamp ?? new Date().toISOString(),
            authNextPath: options.authNextPath,
          });
          settled = true;
          return;
        }
        if (type === 'popup_closed' || message.includes('closed')) {
          finish({ ok: false, error: 'Logowanie anulowane (okno Google zostało zamknięte).' });
          return;
        }
        finish({
          ok: false,
          error: message || type || 'Logowanie przez Google nie powiodło się.',
        });
      },
      callback: async (response) => {
        const accessToken = response.access_token;
        if (!accessToken) {
          finish({ ok: false, error: 'Brak tokenu z Google. Spróbuj ponownie.' });
          return;
        }
        const result = await completeGoogleNativeLoginFromAccessToken(accessToken, {
          currentUserHash: options.currentUserHash,
          consentTimestamp: options.consentTimestamp,
          onGrantFreeCredits: options.onGrantFreeCredits,
        });
        finish(result);
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}
