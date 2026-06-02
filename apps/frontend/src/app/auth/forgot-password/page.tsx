"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { GlassButton } from '@/components/ui/GlassButton';

function ForgotPasswordContent() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const result = await requestPasswordReset(email.trim());
      if (result.error) {
        setError(result.error.message);
      } else {
        setSent(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl px-8 py-10 text-center max-w-md w-full shadow-2xl border border-white/20">
        <h1 className="text-xl font-nasalization text-graphite mb-2">Reset hasła</h1>
        <p className="text-sm text-silver-dark font-modern mb-6">
          Podaj adres e‑mail powiązany z kontem. Wyślemy link do ustawienia nowego hasła (ważny 60 min).
        </p>

        {sent ? (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-graphite font-modern mb-6 text-left">
              Jeśli konto istnieje i e‑mail jest potwierdzony, wysłaliśmy wiadomość na{' '}
              <strong>{email}</strong>. Sprawdź też folder Spam.
            </p>
            <Link href="/" className="text-sm text-gold-700 font-modern underline">
              Wróć na stronę główną
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="text-left">
            <label htmlFor="forgot-email" className="block text-sm font-semibold text-graphite mb-2 font-modern">
              E‑mail
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 text-graphite font-modern mb-4 focus:border-gold-500/50 focus:ring-2 focus:ring-gold-400/30 outline-none"
              placeholder="twoj@email.com"
              disabled={isLoading}
            />
            {error ? (
              <p className="text-xs text-red-600 font-modern mb-4" role="alert">
                {error}
              </p>
            ) : null}
            <GlassButton type="submit" className="w-full mb-4" disabled={isLoading || !email.trim()}>
              {isLoading ? 'Wysyłanie…' : 'Wyślij link resetujący'}
            </GlassButton>
            <Link href="/" className="text-sm text-graphite/80 font-modern hover:text-gold-700">
              ← Wróć do logowania
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm font-modern text-graphite">
          Ładowanie…
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
