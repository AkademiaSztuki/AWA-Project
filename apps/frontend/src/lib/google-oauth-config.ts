/**
 * Shared OAuth redirect URI + flow metadata (client and server).
 */

import { isEmbeddedBrowserUserAgent } from '@/lib/embedded-browser';

export const GOOGLE_OAUTH_CALLBACK_PATH = '/auth/google/callback';

/** Canonical redirect path — matches main branch and historical GCP registration. */
export const GOOGLE_OAUTH_LEGACY_CALLBACK_PATH = '/auth/callback';

const PROJECT_IDA_HOSTS = new Set(['project-ida.com', 'www.project-ida.com']);

function normalizeOAuthRedirectUri(uri: string): string {
  return uri.trim().replace(/\/+$/, '');
}

export function sanitizeRedirectUriFromEnv(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\r\n|\r|\n/g, '')
    .trim();
}

export function getExplicitGoogleOAuthRedirectUri(): string | null {
  const explicit =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI : undefined;
  if (!explicit?.trim()) return null;
  return normalizeOAuthRedirectUri(sanitizeRedirectUriFromEnv(explicit));
}

/**
 * Build redirect URI for a given origin. Default is always `{origin}/auth/callback`
 * (byte-for-byte match with main branch and docs/gcp checklist).
 */
export function buildGoogleOAuthRedirectUri(origin: string): string {
  const explicit = getExplicitGoogleOAuthRedirectUri();
  if (explicit) return explicit;
  const base = origin.trim().replace(/\/+$/, '');
  return normalizeOAuthRedirectUri(`${base}${GOOGLE_OAUTH_LEGACY_CALLBACK_PATH}`);
}

export function isProductionProjectIdaHost(hostname: string): boolean {
  return PROJECT_IDA_HOSTS.has(hostname);
}

export function isProductionProjectIdaOriginFromHost(hostname: string): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  return isProductionProjectIdaHost(hostname);
}

/** All production redirect URIs to paste into GCP (www + apex, both paths). */
export function getProjectIdaRedirectUriChecklist(): readonly string[] {
  const hosts = ['https://www.project-ida.com', 'https://project-ida.com'] as const;
  const paths = [GOOGLE_OAUTH_CALLBACK_PATH, GOOGLE_OAUTH_LEGACY_CALLBACK_PATH] as const;
  return hosts.flatMap((origin) => paths.map((path) => `${origin}${path}`));
}

export function getGoogleOAuthJavaScriptOriginsChecklist(): readonly string[] {
  return ['https://www.project-ida.com', 'https://project-ida.com', 'http://localhost:3000'];
}

export type GoogleOAuthFlowKind =
  | 'pkce_redirect'
  | 'implicit_redirect_embedded'
  | 'gis_popup'
  | 'gis_popup_with_redirect_fallback';

export function resolveGoogleOAuthFlow(params: {
  hostname: string;
  userAgent: string;
  usePkceRedirect: boolean;
}): GoogleOAuthFlowKind {
  if (params.usePkceRedirect) return 'pkce_redirect';
  const embedded = isEmbeddedBrowserUserAgent(params.userAgent);
  const prodIda = isProductionProjectIdaOriginFromHost(params.hostname);
  if (embedded && prodIda) return 'implicit_redirect_embedded';
  if (embedded) return 'implicit_redirect_embedded';
  if (prodIda) return 'gis_popup';
  return 'gis_popup_with_redirect_fallback';
}

export function describeGoogleOAuthClientConfig(params: {
  origin: string;
  hostname: string;
  userAgent: string;
}): {
  redirectUri: string;
  callbackPath: string;
  isEmbedded: boolean;
  isProductionProjectIda: boolean;
  flow: GoogleOAuthFlowKind;
  clientIdSuffix: string | null;
  explicitRedirectEnv: boolean;
  usePkceRedirect: boolean;
  gcpRedirectChecklist: readonly string[];
  gcpOriginChecklist: readonly string[];
} {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
  const usePkceRedirect = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_USE_PKCE_REDIRECT === '1';
  const isEmbedded = isEmbeddedBrowserUserAgent(params.userAgent);
  const isProductionProjectIda = isProductionProjectIdaOriginFromHost(params.hostname);
  const redirectUri = buildGoogleOAuthRedirectUri(params.origin);
  const explicit = getExplicitGoogleOAuthRedirectUri();

  return {
    redirectUri,
    callbackPath: explicit
      ? '(from NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI)'
      : GOOGLE_OAUTH_LEGACY_CALLBACK_PATH,
    isEmbedded,
    isProductionProjectIda,
    flow: resolveGoogleOAuthFlow({
      hostname: params.hostname,
      userAgent: params.userAgent,
      usePkceRedirect,
    }),
    clientIdSuffix: clientId.length > 12 ? clientId.slice(-40) : clientId || null,
    explicitRedirectEnv: Boolean(explicit),
    usePkceRedirect,
    gcpRedirectChecklist: getProjectIdaRedirectUriChecklist(),
    gcpOriginChecklist: getGoogleOAuthJavaScriptOriginsChecklist(),
  };
}
