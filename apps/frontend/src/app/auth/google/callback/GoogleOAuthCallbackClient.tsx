"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  completeGoogleNativeLoginFromAccessToken,
  persistNativeGoogleUserToLocalStorage,
  syncGoogleNativeEmailLinkAuth,
} from '@/lib/google-auth';
import {
  clearPkceOAuthSessionStorage,
  getGoogleOAuthRedirectUri,
  readPkceOAuthContext,
} from '@/lib/google-oauth-pkce';
import { safeSessionStorage } from '@/lib/gcp-data';

async function grantFreeCredits(userHash: string): Promise<void> {
  const r = await fetch('/api/credits/grant-free', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userHash }),
  });
  const d = await r.json().catch(() => ({}));
  if (d.success) console.log('[GoogleOAuthCallback] Granted free credits:', userHash);
}

function GoogleOAuthCallbackInner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const oauthError = searchParams.get('error');
      const oauthDesc = searchParams.get('error_description');
      if (oauthError) {
        setMessage(oauthDesc || oauthError || 'Logowanie przez Google zostało przerwane.');
        clearPkceOAuthSessionStorage();
        return;
      }

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      if (!code || !state) {
        setMessage('Brak kodu autoryzacji. Otwórz logowanie ponownie z aplikacji.');
        clearPkceOAuthSessionStorage();
        return;
      }

      const ctx = readPkceOAuthContext(state);
      if (!ctx.stateOk || !ctx.verifier) {
        setMessage('Sesja logowania wygasła lub jest nieprawidłowa. Zamknij tę kartę i spróbuj ponownie w aplikacji.');
        clearPkceOAuthSessionStorage();
        return;
      }

      const redirectUri = getGoogleOAuthRedirectUri();
      const tokenRes = await fetch('/api/auth/google/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          code_verifier: ctx.verifier,
          redirect_uri: redirectUri,
        }),
      });
      const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };
      if (!tokenRes.ok || !tokenJson.access_token) {
        clearPkceOAuthSessionStorage();
        const desc = tokenJson.error_description ?? '';
        const isRedirect =
          tokenJson.error === 'redirect_uri_mismatch' || desc.toLowerCase().includes('redirect_uri');
        setMessage(
          [
            isRedirect
              ? 'Błąd redirect_uri: adres powrotu musi być 1:1 z wpisem „Authorized redirect URIs” w Google Cloud.'
              : null,
            desc || tokenJson.error || 'Wymiana kodu na token nie powiodła się.',
            `Użyty redirect_uri: ${redirectUri}`,
            process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI
              ? `NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI: ${process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI}`
              : 'Dodaj w Google Cloud ten sam adres (localhost vs 127.0.0.1 i port muszą się zgadzać). Opcja: ustaw NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI w .env.local na dokładnie ten sam string.',
          ]
            .filter(Boolean)
            .join('\n\n'),
        );
        return;
      }

      const userHashRaw = ctx.userHash;
      const currentUserHash =
        userHashRaw != null && userHashRaw.length > 0 ? userHashRaw : null;

      const result = await completeGoogleNativeLoginFromAccessToken(tokenJson.access_token, {
        currentUserHash,
        consentTimestamp: ctx.consent ?? undefined,
        onGrantFreeCredits: grantFreeCredits,
      });

      if (cancelled) return;

      if (!result.ok) {
        clearPkceOAuthSessionStorage();
        setMessage(result.error);
        return;
      }

      clearPkceOAuthSessionStorage();
      persistNativeGoogleUserToLocalStorage(result.user);
      await syncGoogleNativeEmailLinkAuth(result.user);

      const next = ctx.authNext && ctx.authNext.length > 0 ? ctx.authNext : '/';
      safeSessionStorage.removeItem('aura_auth_next');
      window.location.href = next;
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [searchParams.toString()]);

  if (message) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-red-700">{message}</p>
        <a
          href="/"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          Wróć do strony głównej
        </a>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[40vh] items-center justify-center p-8 text-graphite"
      aria-busy="true"
      aria-label="Trwa logowanie przez Google"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );
}

export function GoogleOAuthCallbackClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8" aria-busy="true">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      }
    >
      <GoogleOAuthCallbackInner />
    </Suspense>
  );
}
