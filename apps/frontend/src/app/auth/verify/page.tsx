"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeLocalStorage } from '@/lib/supabase';
import { gcpApi } from '@/lib/gcp-api-client';
import { GlassButton } from '@/components/ui/GlassButton';
import { useAuth } from '@/contexts/AuthContext';

const GOOGLE_AUTH_USER_KEY = 'aura_google_auth_user_id';

function AuthVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { hydrateFromMagicLink } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const next = searchParams.get('next');

    if (!token) {
      setStatus('error');
      setMessage('Brak tokenu. Użyj linku z e-maila.');
      return;
    }

    gcpApi.auth
      .verifyMagicLink({ token })
      .then((res) => {
        if (!res.ok || !res.data?.user_hash || !res.data?.auth_user_id) {
          setStatus('error');
          setMessage(res.error || 'Link wygasł lub został już użyty.');
          return;
        }
        const { user_hash, auth_user_id, email } = res.data;
        safeLocalStorage.setItem('aura_user_hash', user_hash);
        safeLocalStorage.setItem(GOOGLE_AUTH_USER_KEY, auth_user_id);
        hydrateFromMagicLink(auth_user_id, email);
        setStatus('ok');
        const redirect = next ? decodeURIComponent(next) : '/';
        router.replace(redirect);
      })
      .catch(() => {
        setStatus('error');
        setMessage('Błąd połączenia. Spróbuj ponownie.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl px-8 py-12 text-center max-w-sm w-full shadow-2xl border border-white/20">
        {status === 'loading' && (
          <>
            <div className="relative w-16 h-16 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-gold/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-gold animate-spin" />
            </div>
            <div className="text-xl font-nasalization text-graphite mb-3">
              Logowanie…
            </div>
            <div className="text-sm text-silver-dark font-modern">
              Trwa weryfikacja linku.
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xl font-nasalization text-graphite mb-3">
              Błąd logowania
            </div>
            <p className="text-sm text-graphite font-modern mb-8">{message}</p>
            <GlassButton onClick={() => router.push('/')} className="w-full">
              Wróć do strony głównej
            </GlassButton>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center">
          <div className="glass-panel rounded-xl px-6 py-4 text-sm font-modern text-graphite">
            Ładowanie…
          </div>
        </div>
      }
    >
      <AuthVerifyContent />
    </Suspense>
  );
}
