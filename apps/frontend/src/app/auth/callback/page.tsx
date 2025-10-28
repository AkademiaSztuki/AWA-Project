"use client";

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        // Handles both query and hash params for Supabase OAuth
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (!isMounted) return;

        if (error) {
          console.error('Supabase OAuth exchange error:', error);
          const err = encodeURIComponent(error.message || 'auth_error');
          router.replace(`/dashboard?auth=error&msg=${err}`);
          return;
        }

        // If we got here via magic link (type=recovery or type=signup), still go dashboard
        const next = params.get('next') || '/dashboard';
        router.replace(next);
      } catch (e) {
        if (!isMounted) return;
        console.error('Auth callback exception:', e);
        const err = e instanceof Error ? e.message : 'unknown';
        router.replace(`/dashboard?auth=error&msg=${encodeURIComponent(err)}`);
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


