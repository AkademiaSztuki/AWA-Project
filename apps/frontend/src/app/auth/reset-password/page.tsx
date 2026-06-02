"use client";

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GlassButton } from '@/components/ui/GlassButton';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPasswordWithToken } = useAuth();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Brak tokenu. Użyj linku z wiadomości e‑mail.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password !== passwordConfirm) {
      setError('Hasła nie są identyczne.');
      return;
    }
    if (password.length < 8) {
      setError('Hasło musi mieć co najmniej 8 znaków.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await resetPasswordWithToken(token, password);
      if (result.error) {
        setError(result.error.message);
      } else {
        setDone(true);
        window.setTimeout(() => router.replace('/dashboard'), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl px-8 py-10 text-center max-w-md w-full shadow-2xl border border-white/20">
        <h1 className="text-xl font-nasalization text-graphite mb-2">Nowe hasło</h1>

        {done ? (
          <>
            <p className="text-sm text-graphite font-modern mb-4">
              Hasło zostało zmienione. Za chwilę przekierujemy Cię do panelu…
            </p>
            <GlassButton className="w-full" onClick={() => router.replace('/dashboard')}>
              Przejdź do panelu
            </GlassButton>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="text-left">
            <label htmlFor="new-password" className="block text-sm font-semibold text-graphite mb-2 font-modern">
              Nowe hasło
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 text-graphite font-modern mb-4 focus:border-gold-500/50 outline-none"
              placeholder="min. 8 znaków"
              disabled={isLoading || !token}
            />
            <label
              htmlFor="confirm-password"
              className="block text-sm font-semibold text-graphite mb-2 font-modern"
            >
              Powtórz hasło
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 text-graphite font-modern mb-4 focus:border-gold-500/50 outline-none"
              disabled={isLoading || !token}
            />
            {error ? (
              <p className="text-xs text-red-600 font-modern mb-4" role="alert">
                {error}
              </p>
            ) : null}
            <GlassButton
              type="submit"
              className="w-full mb-4"
              disabled={isLoading || !token || password.length < 8}
            >
              {isLoading ? 'Zapisywanie…' : 'Ustaw hasło'}
            </GlassButton>
            <Link href="/auth/forgot-password" className="text-sm text-graphite/80 font-modern hover:text-gold-700">
              Wyślij link ponownie
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm font-modern text-graphite">
          Ładowanie…
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
