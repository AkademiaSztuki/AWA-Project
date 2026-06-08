"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoginModal } from './LoginModal';
import { User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

type UserAuthButtonProps = {
  variant?: 'default' | 'menuRow' | 'icon' | 'bar';
};

export function UserAuthButton({ variant = 'default' }: UserAuthButtonProps) {
  const { user, signOut, isLoading } = useAuth();
  const { language } = useLanguage();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const menuRowClass =
    'flex min-h-[48px] w-full items-center gap-2 rounded-xl px-3 py-2.5 font-modern text-sm text-graphite transition-colors hover:bg-white/10 active:bg-white/15 touch-target';

  const iconButtonClass =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full glass-panel text-graphite transition-all hover:bg-white/10 active:bg-white/20 touch-target relative z-[110] pointer-events-auto focus:outline-none focus:ring-2 focus:ring-gold-400';

  const barButtonClass =
    'flex h-10 shrink-0 items-center justify-center rounded-full glass-panel px-3 font-modern text-xs font-semibold text-graphite transition-all hover:bg-white/10 active:bg-white/20 touch-target whitespace-nowrap relative z-[110] pointer-events-auto focus:outline-none focus:ring-2 focus:ring-gold-400';

  const signInLabel = language === 'pl' ? 'Zaloguj' : 'Sign in';
  const signOutLabel = language === 'pl' ? 'Wyloguj' : 'Sign out';
  const loadingLabel = language === 'pl' ? 'Ładowanie…' : 'Loading…';

  if (isLoading) {
    if (variant === 'menuRow') {
      return (
        <button type="button" disabled className={cn(menuRowClass, 'opacity-70')}>
          <User size={16} aria-hidden="true" />
          {language === 'pl' ? 'Ładowanie…' : 'Loading…'}
        </button>
      );
    }

    if (variant === 'icon') {
      return (
        <button
          type="button"
          disabled
          className={cn(iconButtonClass, 'opacity-70')}
          aria-label={language === 'pl' ? 'Ładowanie konta…' : 'Loading account…'}
        >
          <User size={18} aria-hidden="true" />
        </button>
      );
    }

    if (variant === 'bar') {
      return (
        <button type="button" disabled className={cn(barButtonClass, 'opacity-70')}>
          {loadingLabel}
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled
        className="h-10 px-3 sm:px-4 rounded-full glass-panel transition-all text-xs sm:text-sm font-modern text-graphite/60 flex items-center gap-1 sm:gap-2 opacity-70 touch-target whitespace-nowrap"
      >
        <User size={14} className="sm:w-4 sm:h-4" aria-hidden="true" />
        <span className="hidden sm:inline">{language === 'pl' ? 'Ładowanie…' : 'Loading…'}</span>
        <span className="sm:hidden">...</span>
      </button>
    );
  }

  if (variant === 'bar' && user) {
    return null;
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowLoginModal(true)}
          className={
            variant === 'menuRow'
              ? menuRowClass
              : variant === 'icon'
                ? iconButtonClass
                : variant === 'bar'
                  ? barButtonClass
                  : 'h-10 px-3 sm:px-4 rounded-full glass-panel transition-all text-xs sm:text-sm font-modern text-graphite flex items-center gap-1 sm:gap-2 hover:bg-white/10 active:bg-white/20 touch-target whitespace-nowrap relative z-[110] pointer-events-auto'
          }
          aria-label={variant === 'icon' ? signInLabel : undefined}
        >
          {variant === 'bar' ? (
            signInLabel
          ) : (
            <>
              <User
                size={variant === 'menuRow' ? 16 : variant === 'icon' ? 18 : 14}
                className={variant === 'default' ? 'sm:w-4 sm:h-4' : undefined}
                aria-hidden="true"
              />
              {variant === 'menuRow' ? (
                signInLabel
              ) : variant === 'icon' ? null : (
                <>
                  <span className="hidden lg:inline">{signInLabel}</span>
                  <span className="hidden sm:inline lg:hidden">{language === 'pl' ? 'Login' : 'Login'}</span>
                </>
              )}
            </>
          )}
        </button>

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          initialMode="login"
        />
      </>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  if (variant === 'menuRow') {
    return (
      <button type="button" onClick={handleSignOut} className={menuRowClass}>
        <LogOut size={16} aria-hidden="true" />
        {language === 'pl' ? 'Wyloguj' : 'Sign Out'}
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        className={iconButtonClass}
        aria-label={signOutLabel}
      >
        <LogOut size={18} aria-hidden="true" />
      </button>
    );
  }

  if (variant === 'bar') {
    return (
      <button type="button" onClick={handleSignOut} className={barButtonClass}>
        {signOutLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="h-10 px-3 sm:px-4 rounded-full glass-panel transition-all text-xs sm:text-sm font-modern text-graphite flex items-center gap-1 sm:gap-2 hover:bg-white/10 active:bg-white/20 touch-target whitespace-nowrap relative z-[110] pointer-events-auto"
    >
      <LogOut size={14} className="sm:w-4 sm:h-4" aria-hidden="true" />
      <span className="hidden lg:inline">{language === 'pl' ? 'Wyloguj' : 'Sign Out'}</span>
      <span className="hidden sm:inline lg:hidden">{language === 'pl' ? 'Out' : 'Out'}</span>
    </button>
  );
}
