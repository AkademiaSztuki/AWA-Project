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
        disabled
        className="h-10 px-4 rounded-full glass-panel transition-all text-sm font-modern text-graphite/60 flex items-center gap-2 opacity-70"
      >
        <User size={16} />
        {language === 'pl' ? 'Ładowanie…' : 'Loading…'}
      </button>
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowLoginModal(true)}
          className="h-10 px-4 rounded-full glass-panel transition-all text-sm font-modern text-graphite flex items-center gap-2"
        >
          <User size={16} />
          {language === 'pl' ? 'Zaloguj' : 'Sign In'}
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
      onClick={async () => {
        await signOut();
        // Optional: refresh UI immediately after logout
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }}
      className="h-10 px-4 rounded-full glass-panel transition-all text-sm font-modern text-graphite flex items-center gap-2 hover:bg-white/10"
    >
      <LogOut size={16} />
      {language === 'pl' ? 'Wyloguj' : 'Sign Out'}
    </button>
  );
}

