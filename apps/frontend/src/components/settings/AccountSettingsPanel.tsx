"use client";

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function AccountSettingsPanel() {
  const { user, resendVerificationEmail, setPassword } = useAuth();
  const { language } = useLanguage();
  const [password, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const email =
    user?.email ||
    (user?.id?.startsWith('email:') ? user.id.slice('email:'.length) : undefined);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (!password || password.length < 8) {
      setPasswordError(
        language === 'pl'
          ? 'Hasło musi mieć co najmniej 8 znaków.'
          : 'Password must be at least 8 characters long.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError(
        language === 'pl'
          ? 'Hasła nie są takie same.'
          : 'Passwords do not match.'
      );
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await setPassword(password);
      if (result.error) {
        setPasswordError(result.error.message || 'Nie udało się ustawić hasła.');
      } else {
        setPasswordMessage(
          language === 'pl'
            ? 'Hasło zostało zaktualizowane.'
            : 'Your password has been updated.'
        );
        setPasswordInput('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Nie udało się ustawić hasła.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setVerificationMessage(null);
    setVerificationError(null);
    setIsSendingVerification(true);
    try {
      const result = await resendVerificationEmail(email);
      if (result.error) {
        setVerificationError(result.error.message || 'Nie udało się wysłać maila.');
      } else {
        setVerificationMessage(
          language === 'pl'
            ? `Jeśli konto wymaga potwierdzenia, wysłaliśmy mail na ${email}.`
            : `If your account requires verification, we sent an email to ${email}.`
        );
      }
    } catch (err: any) {
      setVerificationError(err?.message || 'Nie udało się wysłać maila.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-lg font-nasalization text-graphite mb-1">
          {language === 'pl' ? 'Konto' : 'Account'}
        </h2>
        <p className="text-sm text-silver-dark font-modern mb-4">
          {language === 'pl'
            ? 'Ustawienia logowania do Twojego konta AWA.'
            : 'Login settings for your AWA account.'}
        </p>

        <div className="mb-6">
          <div className="text-xs uppercase tracking-wide text-silver-dark font-modern mb-1">
            {language === 'pl' ? 'Adres e‑mail' : 'Email address'}
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-graphite font-modern">
            {email || '—'}
          </div>
        </div>

        {email && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-graphite font-modern">
                  {language === 'pl'
                    ? 'Weryfikacja adresu e‑mail'
                    : 'Email verification'}
                </div>
                <p className="text-xs text-silver-dark font-modern">
                  {language === 'pl'
                    ? 'Jeśli nie otrzymałeś maila weryfikacyjnego, możesz wysłać go ponownie.'
                    : 'If you did not receive the verification email, you can resend it.'}
                </p>
              </div>
              <GlassButton
                type="button"
                size="sm"
                disabled={isSendingVerification}
                onClick={handleResendVerification}
              >
                {isSendingVerification
                  ? language === 'pl'
                    ? 'Wysyłanie...'
                    : 'Sending...'
                  : language === 'pl'
                    ? 'Wyślij ponownie'
                    : 'Resend'}
              </GlassButton>
            </div>
            {verificationMessage && (
              <p className="mt-2 text-xs text-emerald-700 font-modern">
                {verificationMessage}
              </p>
            )}
            {verificationError && (
              <p className="mt-2 text-xs text-red-600 font-modern">
                {verificationError}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-graphite font-modern mb-2">
              {language === 'pl' ? 'Hasło' : 'Password'}
            </div>
            <p className="text-xs text-silver-dark font-modern mb-3">
              {language === 'pl'
                ? 'Ustaw nowe hasło, aby móc logować się e‑mailem i hasłem (niezależnie od logowania Google).'
                : 'Set a password so you can log in with email and password (independent from Google sign‑in).'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={language === 'pl' ? 'Nowe hasło (min. 8 znaków)' : 'New password (min. 8 characters)'}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-graphite font-modern focus:border-gold/50 focus:ring-2 focus:ring-gold/20 outline-none transition-all"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={language === 'pl' ? 'Powtórz hasło' : 'Confirm password'}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-graphite font-modern focus:border-gold/50 focus:ring-2 focus:ring-gold/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <GlassButton
              type="submit"
              size="sm"
              disabled={isSavingPassword || !password || !confirmPassword}
            >
              {isSavingPassword
                ? language === 'pl'
                  ? 'Zapisywanie...'
                  : 'Saving...'
                : language === 'pl'
                  ? 'Zapisz hasło'
                  : 'Save password'}
            </GlassButton>
          </div>

          {passwordMessage && (
            <p className="mt-1 text-xs text-emerald-700 font-modern">
              {passwordMessage}
            </p>
          )}
          {passwordError && (
            <p className="mt-1 text-xs text-red-600 font-modern">
              {passwordError}
            </p>
          )}
        </form>
      </GlassCard>
    </div>
  );
}

