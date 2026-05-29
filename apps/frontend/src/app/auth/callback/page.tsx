"use client";

import React, { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeSessionStorage } from '@/lib/gcp-data';
import { GlassButton } from '@/components/ui/GlassButton';
import {
  completeGoogleNativeLoginFromAccessToken,
  persistNativeGoogleUserToLocalStorage,
  syncGoogleNativeEmailLinkAuth,
} from '@/lib/google-auth';
import {
  clearPkceOAuthSessionStorage,
  getGoogleOAuthRedirectUri,
  readOAuthContext,
  readPkceOAuthContext,
} from '@/lib/google-oauth-pkce';
import { sanitizeRelativeRedirectPath } from '@/lib/safe-relative-redirect';

async function grantFreeCredits(userHash: string, authUserId: string): Promise<void> {
  const r = await fetch('/api/credits/grant-free', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userHash, authUserId }),
  });
  const d = await r.json().catch(() => ({}));
  if (d.success) console.log('[AuthCallback] Granted free credits:', userHash);
}

/**
 * Auth callback page.
 *
 * With Google-native auth the OAuth flow redirects directly via
 * `window.location.href` in AuthContext, so this page is mainly a
 * fallback landing / error display.  If a user lands here with a
 * `next` parameter we simply redirect.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashError = hashParams.get('error');
      const hashDesc = hashParams.get('error_description');
      if (hashError) {
        setErrorMsg(hashDesc || hashError || 'Logowanie przez Google zostało przerwane.');
        clearPkceOAuthSessionStorage();
        return;
      }

      const hashAccessToken = hashParams.get('access_token');
      const hashState = hashParams.get('state');
      if (hashAccessToken && hashState) {
        const ctx = readOAuthContext(hashState);
        if (!ctx.stateOk) {
          setErrorMsg('Sesja logowania wygasła lub jest nieprawidłowa. Wróć do aplikacji i spróbuj ponownie.');
          clearPkceOAuthSessionStorage();
          return;
        }

        const currentUserHash = ctx.userHash && ctx.userHash.length > 0 ? ctx.userHash : null;
        const result = await completeGoogleNativeLoginFromAccessToken(hashAccessToken, {
          currentUserHash,
          consentTimestamp: ctx.consent ?? undefined,
          onGrantFreeCredits: grantFreeCredits,
        });

        if (cancelled) return;

        if (!result.ok) {
          clearPkceOAuthSessionStorage();
          setErrorMsg(result.error);
          return;
        }

        clearPkceOAuthSessionStorage();
        persistNativeGoogleUserToLocalStorage(result.user);
        await syncGoogleNativeEmailLinkAuth(result.user);

        const next = sanitizeRelativeRedirectPath(
          ctx.authNext && ctx.authNext.length > 0 ? ctx.authNext : '/',
          '/',
        );
        safeSessionStorage.removeItem('aura_auth_next');
        window.location.replace(next);
        return;
      }

      const oauthError = params.get('error');
      const oauthDesc = params.get('error_description');
      if (oauthError) {
        setErrorMsg(oauthDesc || oauthError || 'Logowanie przez Google zostało przerwane.');
        clearPkceOAuthSessionStorage();
        return;
      }

      const code = params.get('code');
      const state = params.get('state');

      if (!code || !state) {
        const next = sanitizeRelativeRedirectPath(
          params.get('next') || safeSessionStorage.getItem('aura_auth_next'),
          '/',
        );
        safeSessionStorage.removeItem('aura_auth_next');
        // Do NOT remove aura_auth_path_type here — PathSelectionScreen sets it before OAuth;
        // OnboardingScreen / CoreProfileWizard read it and apply.
        window.location.replace(next);
        return;
      }

      const ctx = readPkceOAuthContext(state);
      if (!ctx.stateOk || !ctx.verifier) {
        setErrorMsg('Sesja logowania wygasła lub jest nieprawidłowa. Wróć do aplikacji i spróbuj ponownie.');
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
        setErrorMsg(
          [
            tokenJson.error === 'redirect_uri_mismatch' || desc.toLowerCase().includes('redirect_uri')
              ? 'Błąd redirect_uri: w Google Cloud musi być dokładnie ten adres callback.'
              : null,
            desc || tokenJson.error || 'Wymiana kodu na token nie powiodła się.',
            `Użyty redirect_uri: ${redirectUri}`,
          ]
            .filter(Boolean)
            .join('\n\n'),
        );
        return;
      }

      const currentUserHash = ctx.userHash && ctx.userHash.length > 0 ? ctx.userHash : null;
      const result = await completeGoogleNativeLoginFromAccessToken(tokenJson.access_token, {
        currentUserHash,
        consentTimestamp: ctx.consent ?? undefined,
        onGrantFreeCredits: grantFreeCredits,
      });

      if (cancelled) return;

      if (!result.ok) {
        clearPkceOAuthSessionStorage();
        setErrorMsg(result.error);
        return;
      }

      clearPkceOAuthSessionStorage();
      persistNativeGoogleUserToLocalStorage(result.user);
      await syncGoogleNativeEmailLinkAuth(result.user);

      const next = sanitizeRelativeRedirectPath(
        ctx.authNext && ctx.authNext.length > 0 ? ctx.authNext : '/',
        '/',
      );
      safeSessionStorage.removeItem('aura_auth_next');
      window.location.href = next;
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router, params]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl px-8 py-12 text-center max-w-sm w-full shadow-2xl border border-white/20">
        {!errorMsg ? (
          <>
            <div className="relative w-16 h-16 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-gold/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-gold animate-spin"></div>
            </div>
            <div className="text-xl font-nasalization text-graphite mb-3">Łączenie z kontem…</div>
            <div className="text-sm text-silver-dark font-modern leading-relaxed">
              Trwa bezpieczne uwierzytelnianie.<br/>To potrwa tylko chwilę.
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xl font-nasalization text-graphite mb-3">Błąd logowania</div>
            <div className="text-sm text-red-600/80 font-modern mb-8 px-4 leading-relaxed">
              {errorMsg}
            </div>
            <GlassButton onClick={() => window.location.href = '/'} className="w-full">
              Wróć do strony głównej
            </GlassButton>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="glass-panel rounded-xl px-6 py-4 text-sm font-modern text-graphite">
          Ładowanie…
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
