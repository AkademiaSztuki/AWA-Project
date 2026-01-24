"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { X, Mail, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  message?: string;
  redirectPath?: string;
}

export function LoginModal({ isOpen, onClose, onSuccess, message, redirectPath }: LoginModalProps) {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle(getEffectiveRedirectPath());
      // No onSuccess call here for OAuth because the whole page will redirect anyway.
      // Calling router.push in onSuccess creates a race condition that blocks Safari.
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { error } = await signInWithEmail(email, getEffectiveRedirectPath());
      if (error) {
        setError(error.message);
      } else {
        setEmailSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
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
        >
          <GlassCard className="p-6 md:p-8">
            {/* Close Button */}
            <button
              ref={firstFocusableRef}
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors focus:ring-2 focus:ring-gold-400 focus:outline-none"
              aria-label={language === 'pl' ? 'Zamknij modal logowania' : 'Close login modal'}
            >
              <X size={18} className="text-graphite" aria-hidden="true" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center" aria-hidden="true">
                <Sparkles size={28} className="text-white" />
              </div>
              <h2 id="login-modal-title" className="text-xl md:text-2xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
                {language === 'pl' ? 'Zapisz Swój Profil' : 'Save Your Profile'}
              </h2>
              <p id="login-modal-description" className="text-sm text-graphite font-modern">
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
                <h3 className="text-lg font-nasalization text-graphite mb-2">
                  {language === 'pl' ? 'Sprawdź Swoją Skrzynkę!' : 'Check Your Inbox!'}
                </h3>
                <p className="text-sm text-graphite font-modern">
                  {language === 'pl'
                    ? `Wysłaliśmy link magiczny na ${email}. Kliknij w link aby się zalogować.`
                    : `We sent a magic link to ${email}. Click the link to sign in.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-pearl-50 px-2 text-silver-dark font-modern">
                      {language === 'pl' ? 'lub' : 'or'}
                    </span>
                  </div>
                </div>

                {/* Email Magic Link */}
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
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-graphite font-modern focus:border-gold/50 focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                      disabled={isLoading}
                    />
                  </div>

                  <GlassButton
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full focus:ring-2 focus:ring-gold-400 focus:outline-none"
                    size="lg"
                    aria-label={language === 'pl' ? 'Wyślij link logowania na email' : 'Send login link to email'}
                  >
                    <Mail size={18} className="mr-2" />
                    {isLoading 
                      ? (language === 'pl' ? 'Wysyłanie...' : 'Sending...')
                      : (language === 'pl' ? 'Wyślij Magic Link' : 'Send Magic Link')}
                  </GlassButton>
                </form>

                {error && (
                  <div 
                    id="email-error"
                    className="mt-4 p-3 bg-red-100/20 border border-red-300/30 rounded-lg"
                    role="alert"
                    aria-live="polite"
                  >
                    <p className="text-xs text-red-600 font-modern">{error}</p>
                  </div>
                )}

                {/* Privacy Note */}
                <p className="text-xs text-silver-dark text-center mt-4 font-modern">
                  {language === 'pl'
                    ? 'Twoje dane są bezpieczne i anonimowe. Logowanie pozwala tylko zachować postęp.'
                    : 'Your data is safe and anonymous. Login only allows saving progress.'}
                </p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

