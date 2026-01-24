"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoginModal } from './LoginModal';
import { User, LogOut } from 'lucide-react';

export function UserAuthButton() {
  const { user, signOut, isLoading } = useAuth();
  const { language } = useLanguage();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Avoid flicker: don't render until auth state is known
  if (isLoading) {
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

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowLoginModal(true)}
          className="h-10 px-3 sm:px-4 rounded-full glass-panel transition-all text-xs sm:text-sm font-modern text-graphite flex items-center gap-1 sm:gap-2 hover:bg-white/10 active:bg-white/20 touch-target whitespace-nowrap relative z-[110] pointer-events-auto"
        >
          <User size={14} className="sm:w-4 sm:h-4" aria-hidden="true" />
          <span className="hidden lg:inline">{language === 'pl' ? 'Zaloguj' : 'Sign In'}</span>
          <span className="hidden sm:inline lg:hidden">{language === 'pl' ? 'Login' : 'Login'}</span>
        </button>

        <LoginModal 
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        // Optional: refresh UI immediately after logout
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }}
      className="h-10 px-3 sm:px-4 rounded-full glass-panel transition-all text-xs sm:text-sm font-modern text-graphite flex items-center gap-1 sm:gap-2 hover:bg-white/10 active:bg-white/20 touch-target whitespace-nowrap relative z-[110] pointer-events-auto"
    >
      <LogOut size={14} className="sm:w-4 sm:h-4" aria-hidden="true" />
      <span className="hidden lg:inline">{language === 'pl' ? 'Wyloguj' : 'Sign Out'}</span>
      <span className="hidden sm:inline lg:hidden">{language === 'pl' ? 'Out' : 'Out'}</span>
    </button>
  );
}

