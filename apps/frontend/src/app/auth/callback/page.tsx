"use client";

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, safeSessionStorage } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    let isMounted = true;
    
    // Guard: prevent multiple executions (React StrictMode in dev)
    // Use search and hash to make the key unique to this specific login attempt
    const callbackKey = `auth_callback_${window.location.search}${window.location.hash}`;
    if (safeSessionStorage.getItem(callbackKey)) {
      console.log('[AuthCallback] Already processing/completed for this URL');
      return; // Already processed
    }
    safeSessionStorage.setItem(callbackKey, 'processing');

    console.log('[AuthCallback] URL Debug:', {
      href: window.location.href,
      search: window.location.search,
      hash: window.location.hash
    });

    (async () => {
      try {
        const href = window.location.href;
        const search = window.location.search || '';
        const hash = window.location.hash || '';
        const hasCode = new URL(href).searchParams.has('code');
        const hasAccessToken = hash.includes('access_token=');

        const parseHashTokens = () => {
          const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
          const access_token = params.get('access_token') || undefined;
          const refresh_token = params.get('refresh_token') || undefined;
          const expires_in = params.get('expires_in');
          const provider_token = params.get('provider_token') || undefined;
          const token_type = params.get('token_type') || undefined;
          return {
            access_token,
            refresh_token,
            expires_in: expires_in ? Number(expires_in) : undefined,
            provider_token,
            token_type,
            hasAccessToken: !!access_token,
            hasRefresh: !!refresh_token,
          };
        };

        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'fix4',
            hypothesisId: 'H1',
            location: 'auth/callback/page.tsx:pre-exchange',
            message: 'Inspect callback URL before exchange',
            data: {
              hasCode,
              hasAccessToken,
              searchLength: search.length,
              hashLength: hash.length
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion

        if (!hasCode && hasAccessToken) {
          const tokenPayload = parseHashTokens();

          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'fix4',
              hypothesisId: 'H1',
              location: 'auth/callback/page.tsx:hash-fragment',
              message: 'Parsed hash fragment tokens',
              data: {
                hasAccessToken: tokenPayload.hasAccessToken,
                hasRefresh: tokenPayload.hasRefresh,
                expiresIn: tokenPayload.expires_in,
                tokenType: tokenPayload.token_type,
                hasProviderToken: !!tokenPayload.provider_token
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion

          if (!tokenPayload.access_token || !tokenPayload.refresh_token) {
            const err = encodeURIComponent('Missing tokens in fragment');
            router.replace(`/?auth=error&msg=${err}`);
            return;
          }

          const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: tokenPayload.access_token,
            refresh_token: tokenPayload.refresh_token,
          });

          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'fix4',
              hypothesisId: 'H1',
              location: 'auth/callback/page.tsx:setSession',
              message: 'Attempted setSession from fragment',
              data: {
                hasSession: !!setSessionData?.session,
                hasUser: !!setSessionData?.session?.user,
                errorMessage: setSessionError?.message || null
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion

        if (setSessionError) {
          console.error('[AuthCallback] setSession Error:', setSessionError);
          safeSessionStorage.removeItem(callbackKey); // Allow retry on error
          const err = encodeURIComponent(setSessionError.message || 'auth_error');
          router.replace(`/?auth=error&msg=${err}`);
          return;
        }

        console.log('[AuthCallback] Session set successfully');
        safeSessionStorage.setItem(callbackKey, 'completed');
        const next = params.get('next') || '/';
        router.replace(next);
        return;
      }

      if (!hasCode) {
        const errMsg = 'Missing auth code in callback';
        console.warn('[AuthCallback]', errMsg);

          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'fix4',
              hypothesisId: 'H1',
              location: 'auth/callback/page.tsx:no-code',
              message: errMsg,
              data: { hasAccessToken, searchLength: search.length, hashLength: hash.length },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion

          const err = encodeURIComponent(errMsg);
          router.replace(`/?auth=error&msg=${err}`);
          return;
        }

      console.log('[AuthCallback] Exchanging code for session...');
      const exchangeResult = await supabase.auth.exchangeCodeForSession(href);

      if (!isMounted) return;

      if (exchangeResult.error) {
        console.error('[AuthCallback] Exchange Error:', exchangeResult.error);
        safeSessionStorage.removeItem(callbackKey); // Allow retry on error
        const err = encodeURIComponent(exchangeResult.error.message || 'auth_error');
        router.replace(`/?auth=error&msg=${err}`);
        return;
      }

      console.log('[AuthCallback] Code exchange successful, verifying session...');
      
      // Double check session is actually established before redirecting
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('[AuthCallback] Session not found after exchange, waiting briefly...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('[AuthCallback] Proceeding to destination');
      // If we got here via magic link (type=recovery or type=signup), still go home
      safeSessionStorage.setItem(callbackKey, 'completed');
      const next = params.get('next') || '/';
      router.replace(next);
      } catch (e) {
        if (!isMounted) return;
        safeSessionStorage.removeItem(callbackKey); // Allow retry on error
        console.error('Auth callback exception:', e);
        const err = e instanceof Error ? e.message : 'unknown';
        router.replace(`/?auth=error&msg=${encodeURIComponent(err)}`);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [router, params]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="glass-panel rounded-xl px-6 py-4 text-sm font-modern text-graphite">
        Łączenie z kontem…
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


