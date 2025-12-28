"use client";

import React, { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, safeSessionStorage } from '@/lib/supabase';
import { GlassButton } from '@/components/ui/GlassButton';

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Guard: prevent multiple executions (React StrictMode in dev)
    const callbackKey = `auth_callback_${window.location.search}${window.location.hash}`;
    const storedState = safeSessionStorage.getItem(callbackKey);
    
    if (storedState === 'completed' || storedState === 'processing') {
      console.log('[AuthCallback] Already processed or processing this URL');
      if (storedState === 'completed') {
        const next = params.get('next') || '/';
        window.location.replace(next);
      }
      return;
    }
    
    safeSessionStorage.setItem(callbackKey, 'processing');

    const handleCallback = async () => {
      try {
        const href = window.location.href;
        const url = new URL(href);
        const code = url.searchParams.get('code');
        const nextFromUrl = url.searchParams.get('next');
        const nextFromStorage = safeSessionStorage.getItem('aura_auth_next');
        const pathTypeFromStorage = safeSessionStorage.getItem('aura_auth_path_type');
        const next = nextFromUrl || nextFromStorage || '/';
        const hash = window.location.hash || '';
        
        console.log('[AuthCallback] Processing...', { hasCode: !!code, hasHash: !!hash, next, pathType: pathTypeFromStorage });

        // Apply pathType if found in storage
        if (pathTypeFromStorage) {
          try {
            const { supabase: supabaseClient } = await import('@/lib/supabase');
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.user) {
              const { saveFullSessionToSupabase } = await import('@/lib/supabase');
              await saveFullSessionToSupabase({ 
                userHash: session.user.id, // Temporary fallback if no hash
                pathType: pathTypeFromStorage as 'fast' | 'full',
                currentStep: 'onboarding'
              });
              console.log('[AuthCallback] pathType applied:', pathTypeFromStorage);
            }
          } catch (err) {
            console.warn('[AuthCallback] Failed to apply pathType:', err);
          }
          safeSessionStorage.removeItem('aura_auth_path_type');
        }

        // Clear the storage once we've read it
        if (nextFromStorage) {
          safeSessionStorage.removeItem('aura_auth_next');
        }

        // 1. Check if we already have a session (handled by auto-detection)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log('[AuthCallback] Session exists, finishing up');
          safeSessionStorage.setItem(callbackKey, 'completed');
          window.location.replace(next);
          return;
        }

        // 2. If we have a code, exchange it (PKCE)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[AuthCallback] Exchange error:', error);
            // Check again - sometimes exchange fails because it was already exchanged
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw error;
          }
        } 
        // 3. Handle hash-based implicit flow (sometimes happens on mobile)
        else if (hash.includes('access_token=')) {
          const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (error) throw error;
          }
        }
        else {
          console.warn('[AuthCallback] No code or hash tokens found');
          // Wait a bit, maybe Supabase internal is still working
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Nie udało się odnaleźć sesji logowania.');
          }
        }

        if (!isMounted) return;

        console.log('[AuthCallback] Success, redirecting...');
        safeSessionStorage.setItem(callbackKey, 'completed');
        window.location.replace(next);

      } catch (e) {
        if (!isMounted) return;
        console.error('[AuthCallback] Fatal error:', e);
        safeSessionStorage.removeItem(callbackKey);
        const msg = e instanceof Error ? e.message : 'Wystąpił nieoczekiwany błąd autoryzacji.';
        setErrorMsg(msg);
        
        // Remote log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'auth/callback:error',
            message: msg,
            data: { href: window.location.href },
            timestamp: Date.now()
          })
        }).catch(() => {});
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
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
