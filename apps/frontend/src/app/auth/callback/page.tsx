"use client";

import React, { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeSessionStorage } from '@/lib/gcp-data';
import { GlassButton } from '@/components/ui/GlassButton';

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
    const next = params.get('next') || safeSessionStorage.getItem('aura_auth_next') || '/';
    safeSessionStorage.removeItem('aura_auth_next');
    // Do NOT remove aura_auth_path_type here — PathSelectionScreen sets it before OAuth;
    // OnboardingScreen / CoreProfileWizard read it and clear after apply.
    window.location.replace(next);
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
