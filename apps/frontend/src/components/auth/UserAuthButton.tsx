"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoginModal } from './LoginModal';
import { User, LogOut } from 'lucide-react';

export function UserAuthButton() {
  const { user, signOut } = useAuth();
  const { language } = useLanguage();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowLoginModal(true)}
          className="px-4 py-2 rounded-lg glass-panel border border-white/30 hover:border-gold/50 transition-all text-sm font-modern text-graphite flex items-center gap-2"
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
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center text-white font-bold text-sm"
      >
        {user.email?.charAt(0).toUpperCase() || 'U'}
      </button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 glass-panel border border-white/30 rounded-lg shadow-xl z-50">
            <div className="p-3 border-b border-white/20">
              <p className="text-xs text-silver-dark font-modern truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={() => {
                signOut();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm font-modern text-graphite hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <LogOut size={14} />
              {language === 'pl' ? 'Wyloguj' : 'Sign Out'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

