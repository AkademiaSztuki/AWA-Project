/**
 * OAuth redirect helpers (no popup).
 * Cursor's embedded browser can break Google GIS popups, so dev uses an implicit token redirect.
 * PKCE code redirect remains available when a server-side Google client secret is configured.
 */

const STORAGE = {
  verifier: 'ida_google_pkce_verifier',
  state: 'ida_google_pkce_state',
  userHash: 'ida_google_oauth_user_hash',
  consent: 'ida_google_oauth_consent',
  authNext: 'ida_google_oauth_auth_next',
} as const;

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** No trailing slash — Google matches redirect URIs byte-for-byte. */
function normalizeOAuthRedirectUri(uri: string): string {
  return uri.trim().replace(/\/+$/, '');
}

/** Primary redirect path for OAuth authorize (must match GCP if redirect flow is used). */
export const GOOGLE_OAUTH_CALLBACK_PATH = '/auth/google/callback';

/** Legacy path still registered in GCP for some deployments. */
export const GOOGLE_OAUTH_LEGACY_CALLBACK_PATH = '/auth/callback';

/** Production hosts where GIS popup is preferred (no redirect_uri to Google authorize). */
const PROJECT_IDA_HOSTS = new Set(['project-ida.com', 'www.project-ida.com']);

function sanitizeRedirectUriFromEnv(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\r\n|\r|\n/g, '')
    .trim();
}

/**
 * Must match **exactly** one entry under Google Cloud → OAuth 2.0 Client → Authorized redirect URIs.
 * If you open the app as http://127.0.0.1:3000 but only registered http://localhost:3000/..., you get redirect_uri_mismatch.
 *
 * Set `NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI` only when origin/path differs from the default builder.
 * Default: `{origin}/auth/google/callback` (legacy `/auth/callback` page still handles returns if registered separately).
 */
export function getGoogleOAuthRedirectUri(): string {
  const explicit =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI : undefined;
  if (explicit?.trim()) {
    return normalizeOAuthRedirectUri(sanitizeRedirectUriFromEnv(explicit));
  }
  if (typeof window === 'undefined') return '';
  return normalizeOAuthRedirectUri(`${window.location.origin}${GOOGLE_OAUTH_CALLBACK_PATH}`);
}

/** All redirect URIs to register in GCP when redirect fallback or PKCE is used (www + apex, both paths). */
export function getProjectIdaRedirectUriChecklist(): readonly string[] {
  const hosts = ['https://www.project-ida.com', 'https://project-ida.com'] as const;
  const paths = [GOOGLE_OAUTH_CALLBACK_PATH, GOOGLE_OAUTH_LEGACY_CALLBACK_PATH] as const;
  return hosts.flatMap((origin) => paths.map((path) => `${origin}${path}`));
}

export function isProductionProjectIdaOrigin(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  if (typeof window === 'undefined') return false;
  return PROJECT_IDA_HOSTS.has(window.location.hostname);
}

/** Redirect OAuth (implicit/PKCE) when not on production project-ida, or when explicitly forced. */
export function shouldAllowOAuthRedirectFallback(): boolean {
  if (process.env.NEXT_PUBLIC_GOOGLE_OAUTH_USE_PKCE_REDIRECT === '1') return true;
  if (isProductionProjectIdaOrigin()) return false;
  return true;
}

async function createPkcePair(): Promise<{ verifier: string; challenge: string; state: string }> {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const verifier = base64UrlEncode(verifierBytes.buffer);

  const enc = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  const challenge = base64UrlEncode(digest);

  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = base64UrlEncode(stateBytes.buffer);

  return { verifier, challenge, state };
}

function createState(): string {
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  return base64UrlEncode(stateBytes.buffer);
}

function persistOAuthContext(params: {
  state: string;
  verifier?: string;
  currentUserHash: string | null;
  consentTimestamp: string;
  authNextPath: string | null | undefined;
}): void {
  if (params.verifier) {
    sessionStorage.setItem(STORAGE.verifier, params.verifier);
  } else {
    sessionStorage.removeItem(STORAGE.verifier);
  }
  sessionStorage.setItem(STORAGE.state, params.state);
  sessionStorage.setItem(STORAGE.userHash, params.currentUserHash ?? '');
  sessionStorage.setItem(STORAGE.consent, params.consentTimestamp);
  sessionStorage.setItem(STORAGE.authNext, (params.authNextPath ?? '').trim());
}

export async function persistPkceSessionAndRedirect(params: {
  clientId: string;
  currentUserHash: string | null;
  consentTimestamp: string;
  authNextPath: string | null | undefined;
}): Promise<void> {
  const { verifier, challenge, state } = await createPkcePair();
  persistOAuthContext({
    state,
    verifier,
    currentUserHash: params.currentUserHash,
    consentTimestamp: params.consentTimestamp,
    authNextPath: params.authNextPath,
  });

  const redirectUri = getGoogleOAuthRedirectUri();
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', params.clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'openid email profile');
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('prompt', 'select_account');

  window.location.assign(u.toString());
}

export function persistImplicitTokenSessionAndRedirect(params: {
  clientId: string;
  currentUserHash: string | null;
  consentTimestamp: string;
  authNextPath: string | null | undefined;
}): void {
  const state = createState();
  persistOAuthContext({
    state,
    currentUserHash: params.currentUserHash,
    consentTimestamp: params.consentTimestamp,
    authNextPath: params.authNextPath,
  });

  const redirectUri = getGoogleOAuthRedirectUri();
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', params.clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'token');
  u.searchParams.set('scope', 'openid email profile');
  u.searchParams.set('state', state);
  u.searchParams.set('prompt', 'select_account');

  window.location.assign(u.toString());
}

export function readPkceOAuthContext(expectedState: string | null): {
  verifier: string | null;
  userHash: string | null;
  consent: string | null;
  authNext: string | null;
  stateOk: boolean;
} {
  if (typeof window === 'undefined') {
    return { verifier: null, userHash: null, consent: null, authNext: null, stateOk: false };
  }
  const storedState = sessionStorage.getItem(STORAGE.state);
  const stateOk =
    expectedState != null &&
    expectedState.length > 0 &&
    storedState != null &&
    storedState === expectedState;
  return {
    verifier: sessionStorage.getItem(STORAGE.verifier),
    userHash: sessionStorage.getItem(STORAGE.userHash),
    consent: sessionStorage.getItem(STORAGE.consent),
    authNext: sessionStorage.getItem(STORAGE.authNext),
    stateOk,
  };
}

export function readOAuthContext(expectedState: string | null): {
  userHash: string | null;
  consent: string | null;
  authNext: string | null;
  stateOk: boolean;
} {
  const ctx = readPkceOAuthContext(expectedState);
  return {
    userHash: ctx.userHash,
    consent: ctx.consent,
    authNext: ctx.authNext,
    stateOk: ctx.stateOk,
  };
}

export function clearPkceOAuthSessionStorage(): void {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE).forEach((k) => sessionStorage.removeItem(k));
}
