"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/GlassCard';
import { AwaScrollArea } from '@/components/ui/AwaScrollArea';
import { GlassButton } from '@/components/ui/GlassButton';
import { preloadGoogleIdentityScript } from '@/lib/google-auth';
import {
  isEmbeddedBrowser,
  isEmbeddedBrowserGoogleAuthError,
} from '@/lib/embedded-browser';
import { X, Mail, Sparkles } from 'lucide-react';

export type LoginNudgeEvent = 'nudge_shown' | 'nudge_dismissed' | 'nudge_cta' | 'nudge_soft_later';

export type LoginGateMode = 'default' | 'soft' | 'hard';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** When omitted, default headline is “Save your profile” (bilingual). */
  title?: { pl: string; en: string };
  message?: string;
  redirectPath?: string;
  /** Dismiss (soft) for logged-out funnel – “maybe later” */
  onMaybeLater?: () => void;
  /** Parent-driven funnel telemetry (optional) */
  onNudgeEvent?: (event: LoginNudgeEvent) => void;
  gateMode?: LoginGateMode;
  nudgeLocation?: string;
  nudgeReason?: 'login_required' | 'quota_exceeded';
  softMaybeLaterLabel?: { pl: string; en: string };
}

export function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  message,
  redirectPath,
  onMaybeLater,
  onNudgeEvent,
  gateMode = 'default',
  nudgeLocation,
  nudgeReason,
  softMaybeLaterLabel,
}: LoginModalProps) {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, loginWithEmail, resendVerificationEmail } = useAuth();
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'magic'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const showSoftSkip = gateMode === 'soft' && !!onMaybeLater;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    preloadGoogleIdentityScript();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && (gateMode === 'soft' || gateMode === 'hard')) {
      onNudgeEvent?.('nudge_shown');
    }
  }, [isOpen, gateMode, nudgeLocation, nudgeReason, onNudgeEvent]);

  // Focus the dialog itself so no CTA appears selected on open.
  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => {
      modalRef.current?.focus();
    }, 100);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (gateMode === 'hard') {
          onNudgeEvent?.('nudge_dismissed');
        }
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, gateMode, onNudgeEvent]);

  // Trap focus within modal when open
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  const getEffectiveRedirectPath = () => {
    return redirectPath || searchParams.get('redirect') || undefined;
  };

  const handleClose = () => {
    onNudgeEvent?.('nudge_dismissed');
    onClose();
  };

  const handleBackdropClick = () => {
    if (gateMode === 'hard') {
      return;
    }
    onNudgeEvent?.('nudge_dismissed');
    onClose();
  };

  const handleMaybeLater = () => {
    onNudgeEvent?.('nudge_soft_later');
    onMaybeLater?.();
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    preloadGoogleIdentityScript();
    try {
      onNudgeEvent?.('nudge_cta');
      await signInWithGoogle(getEffectiveRedirectPath());
      // No onSuccess call here for OAuth because the whole page will redirect anyway.
      // Calling router.push in onSuccess creates a race condition that blocks Safari.
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setEmailNotVerified(false);
    try {
      if (mode === 'magic') {
        const result = await signInWithEmail(email, getEffectiveRedirectPath());
        if (result.error) {
          setError(result.error.message);
        } else {
          setEmailSent(true);
        }
      } else if (mode === 'register') {
        const result = await registerWithEmail(email, password);
        if (result.error) {
          setError(result.error.message);
        } else {
          setEmailSent(true);
        }
      } else {
        const result = await loginWithEmail(email, password);
        if (result.error) {
          const msg: string = result.error.message || '';
          const isNotVerified =
            msg.includes('email_not_verified') ||
            msg.toLowerCase().includes('potwierdź maila') ||
            msg.toLowerCase().includes('not verified');
          if (isNotVerified) {
            setEmailNotVerified(true);
          }
          setError(msg);
        } else {
          onNudgeEvent?.('nudge_cta');
          onClose();
          onSuccess?.();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const headline =
    title != null
      ? language === 'pl'
        ? title.pl
        : title.en
      : language === 'pl'
        ? 'Zapisz Swój Profil'
        : 'Save Your Profile';

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          aria-describedby="login-modal-description"
          tabIndex={-1}
        >
          <GlassCard
            variant="flat"
            className={cn(
              'relative z-0 overflow-hidden p-6 md:p-8 rounded-2xl antialiased',
              'border border-white/45 shadow-glass backdrop-blur-glass',
              'bg-gradient-to-br from-pearl-50/72 via-pearl-100/38 to-pearl-200/18',
              'ring-1 ring-inset ring-white/25',
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/35 via-transparent to-pearl-100/10"
              aria-hidden="true"
            />
            <div className="relative">
            {/* Close Button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center transition-colors focus:ring-2 focus:ring-gold-400 focus:outline-none shadow-glass-inset"
              aria-label={language === 'pl' ? 'Zamknij modal logowania' : 'Close login modal'}
            >
              <X size={18} className="text-graphite" aria-hidden="true" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center shadow-glass border border-white/30" aria-hidden="true">
                <Sparkles size={28} className="text-white drop-shadow-sm" />
              </div>
              <h2
                id="login-modal-title"
                className="text-xl md:text-2xl font-nasalization mb-3 tracking-tight text-graphite [text-shadow:0_1px_0_rgba(255,255,255,0.55)]"
              >
                {headline}
              </h2>
              <p
                id="login-modal-description"
                className="text-sm md:text-[0.95rem] leading-relaxed text-graphite font-modern px-1 [text-shadow:0_1px_0_rgba(255,255,255,0.55)]"
              >
                {message || (language === 'pl' 
                  ? 'Zaloguj się aby zachować swój postęp i wracać kiedy chcesz'
                  : 'Sign in to save your progress and return anytime')}
              </p>

            </div>

            {emailSent ? (
              /* Email Sent Confirmation */
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <Mail size={28} className="text-green-600" />
                </div>
                <h3 className="text-lg font-nasalization text-graphite mb-2 [text-shadow:0_1px_0_rgba(255,255,255,0.5)]">
                  {language === 'pl' ? 'Sprawdź Swoją Skrzynkę!' : 'Check Your Inbox!'}
                </h3>
                <p className="text-sm text-graphite/90 font-modern mb-4">
                  {language === 'pl'
                    ? `Jeśli konto istnieje lub zostało utworzone, wysłaliśmy e‑mail na ${email}. Sprawdź też folder Spam/Oferty.`
                    : `If the account exists or was created, we sent an email to ${email}. Please also check your Spam/Promotions folder.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {showSoftSkip && (
                  <button
                    type="button"
                    onClick={handleMaybeLater}
                    className={cn(
                      'w-full min-h-[52px] rounded-[28px] px-4 py-3 text-center text-base font-semibold font-modern',
                      'bg-pearl-50/40 backdrop-blur-md border-2 border-white/50 text-graphite shadow-glass',
                      'transition-all duration-300 ease-out hover:scale-[1.02] hover:border-gold-400/50 hover:bg-gold-400/18 hover:shadow-[0_0_28px_-8px_rgba(255,229,92,0.4),inset_0_0_0_1px_rgba(255,248,200,0.5)]',
                      'focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-transparent',
                    )}
                  >
                    {softMaybeLaterLabel
                      ? language === 'pl'
                        ? softMaybeLaterLabel.pl
                        : softMaybeLaterLabel.en
                      : language === 'pl'
                        ? 'Może później'
                        : 'Maybe later'}
                  </button>
                )}
                {/* Google Sign In */}
                <GlassButton
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full focus:ring-2 focus:ring-gold-400 focus:outline-none"
                  size="lg"
                  aria-label={language === 'pl' ? 'Zaloguj się przez Google' : 'Sign in with Google'}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {language === 'pl' ? 'Kontynuuj z Google' : 'Continue with Google'}
                </GlassButton>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/30" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 py-1 rounded-full bg-pearl-50/55 backdrop-blur-md text-graphite font-modern font-medium border border-white/40 shadow-glass-inset">
                      {language === 'pl' ? 'lub' : 'or'}
                    </span>
                  </div>
                </div>

                {/* Mode switcher — same glass/gold fill as Google CTA for contrast */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={`glass-button min-h-[44px] px-2 py-2 rounded-full text-xs font-medium font-modern text-graphite transition-all focus:ring-2 focus:ring-gold-400 focus:outline-none ${
                      mode === 'login'
                        ? 'ring-2 ring-gold-400/70 border-gold-400/60'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {language === 'pl' ? 'Zaloguj' : 'Log in'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className={`glass-button min-h-[44px] px-2 py-2 rounded-full text-xs font-medium font-modern text-graphite transition-all focus:ring-2 focus:ring-gold-400 focus:outline-none ${
                      mode === 'register'
                        ? 'ring-2 ring-gold-400/70 border-gold-400/60'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {language === 'pl' ? 'Utwórz konto' : 'Sign up'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('magic')}
                    className={`glass-button min-h-[44px] px-2 py-2 rounded-full text-xs font-medium font-modern text-graphite transition-all focus:ring-2 focus:ring-gold-400 focus:outline-none ${
                      mode === 'magic'
                        ? 'ring-2 ring-gold-400/70 border-gold-400/60'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    Magic link
                  </button>
                </div>

                {/* Email/password & magic link form */}
                <form onSubmit={handleEmailSignIn}>
                  <div className="mb-4">
                    <label 
                      htmlFor="email-input"
                      className="block text-sm font-semibold text-graphite mb-2 font-modern"
                    >
                      {language === 'pl' ? 'Email' : 'Email'}
                    </label>
                    <input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === 'pl' ? 'twoj@email.com' : 'your@email.com'}
                      required
                      aria-required="true"
                      aria-invalid={!!error}
                      aria-describedby={error ? 'email-error' : undefined}
                      className="w-full px-4 py-3 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 text-graphite placeholder:text-silver-dark/60 font-modern focus:border-gold-500/50 focus:ring-2 focus:ring-gold-400/30 outline-none transition-all shadow-glass-inset"
                      disabled={isLoading}
                    />
                  </div>

                  {mode !== 'magic' && (
                    <div className="mb-4">
                      <label
                        htmlFor="password-input"
                        className="block text-sm font-semibold text-graphite mb-2 font-modern"
                      >
                        {language === 'pl' ? 'Hasło' : 'Password'}
                      </label>
                      <input
                        id="password-input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={language === 'pl' ? 'min. 8 znaków' : 'min. 8 characters'}
                        required
                        minLength={8}
                        className="w-full px-4 py-3 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 text-graphite placeholder:text-silver-dark/60 font-modern focus:border-gold-500/50 focus:ring-2 focus:ring-gold-400/30 outline-none transition-all shadow-glass-inset"
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  <GlassButton
                    type="submit"
                    disabled={isLoading || !email || (mode !== 'magic' && password.length < 8)}
                    className="w-full focus:ring-2 focus:ring-gold-400 focus:outline-none"
                    size="lg"
                    aria-label={
                      mode === 'magic'
                        ? language === 'pl'
                          ? 'Wyślij link logowania na email'
                          : 'Send login link to email'
                        : mode === 'register'
                          ? language === 'pl'
                            ? 'Utwórz konto'
                            : 'Create account'
                          : language === 'pl'
                            ? 'Zaloguj się e‑mailem i hasłem'
                            : 'Log in with email and password'
                    }
                  >
                    <Mail size={18} className="mr-2" />
                    {isLoading
                      ? language === 'pl'
                        ? 'Wysyłanie...'
                        : 'Sending...'
                      : mode === 'magic'
                        ? language === 'pl'
                          ? 'Wyślij Magic Link'
                          : 'Send Magic Link'
                        : mode === 'register'
                          ? language === 'pl'
                            ? 'Utwórz konto'
                            : 'Create account'
                          : language === 'pl'
                            ? 'Zaloguj się'
                            : 'Log in'}
                  </GlassButton>
                </form>

                {error && (
                  <AwaScrollArea
                    variant="auto"
                    className="mt-4 max-h-40 rounded-lg border border-red-300/30 bg-red-100/20 p-3"
                    autoHide={false}
                  >
                  <div 
                    id="email-error"
                    role="alert"
                    aria-live="polite"
                  >
                    <p className="text-xs text-red-600 font-modern whitespace-pre-wrap">
                      {isEmbeddedBrowserGoogleAuthError(error)
                        ? error.replace(/embedded_browser_google_auth:\s*/i, '')
                        : error}
                    </p>
                    {(isEmbeddedBrowser() || isEmbeddedBrowserGoogleAuthError(error)) && (
                      <a
                        href="https://www.project-ida.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-gold-400/50 bg-gold-400/15 px-4 py-2.5 text-sm font-semibold text-graphite font-modern hover:bg-gold-400/25 transition-colors"
                      >
                        {language === 'pl' ? 'Otwórz w Chrome' : 'Open in Chrome'}
                      </a>
                    )}
                    {emailNotVerified && (
                      <div className="mt-3 text-left">
                        <GlassButton
                          type="button"
                          size="sm"
                          className="w-full"
                          disabled={isLoading}
                          onClick={async () => {
                            setIsLoading(true);
                            try {
                              const result = await resendVerificationEmail(email);
                              if (result.error) {
                                setError(result.error.message);
                              } else {
                                setEmailSent(true);
                                setEmailNotVerified(false);
                              }
                            } catch (e: any) {
                              setError(e?.message || 'Nie udało się wysłać maila weryfikacyjnego.');
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                        >
                          {language === 'pl'
                            ? 'Wyślij ponownie mail weryfikacyjny'
                            : 'Resend verification email'}
                        </GlassButton>
                      </div>
                    )}
                  </div>
                  </AwaScrollArea>
                )}

                {/* Privacy Note */}
                <p className="text-xs text-graphite/85 text-center mt-4 font-modern [text-shadow:0_1px_0_rgba(255,255,255,0.45)]">
                  {language === 'pl'
                    ? 'Twoje dane są bezpieczne i anonimowe. Logowanie pozwala tylko zachować postęp.'
                    : 'Your data is safe and anonymous. Login only allows saving progress.'}
                </p>
              </div>
            )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

