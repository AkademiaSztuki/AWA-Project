"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Language, LocalizedText, getLocalizedText } from '@/lib/questions/validated-scales';
import { safeLocalStorage } from '@/lib/supabase';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: LocalizedText) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_COOKIE = 'app_language';
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const isLanguage = (value: unknown): value is Language =>
  value === 'pl' || value === 'en';

const getCookieLanguage = (): Language | null => {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${LANGUAGE_COOKIE}=`));

  if (!cookie) return null;
  const value = cookie.split('=')[1];
  return isLanguage(value) ? value : null;
};

const persistLanguage = (lang: Language) => {
  if (typeof window === 'undefined') return;
  safeLocalStorage.setItem(LANGUAGE_COOKIE, lang);
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR_IN_SECONDS}`;
};

const getStoredLanguage = (): Language | null => {
  if (typeof window === 'undefined') return null;
  const stored = safeLocalStorage.getItem(LANGUAGE_COOKIE);
  if (isLanguage(stored)) return stored;

  const cookieLang = getCookieLanguage();
  if (cookieLang) return cookieLang;

  return null;
};

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage?: Language;
}

export function LanguageProvider({ children, initialLanguage = 'pl' }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const initialLanguageRef = useRef<Language>(initialLanguage);

  useEffect(() => {
    const storedLang = getStoredLanguage();
    // Prefer server-detected language (initialLanguageRef) over stored when they differ
    const effectiveLang =
      storedLang && storedLang === initialLanguageRef.current
        ? storedLang
        : initialLanguageRef.current;

    setLanguageState(effectiveLang);
    persistLanguage(effectiveLang);
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    persistLanguage(lang);
  };

  const t = (text: LocalizedText): string => {
    return getLocalizedText(text, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 glass-panel px-1 sm:px-1.5 h-10 rounded-full">
      <button
        type="button"
        onClick={() => setLanguage('pl')}
        className={`px-2 sm:px-3 py-1.5 text-xs rounded-full transition-all font-modern touch-target relative z-[110] pointer-events-auto ${
          language === 'pl'
            ? 'text-white font-semibold'
            : 'text-white/60 hover:text-white/80 active:text-white/90'
        }`}
      >
        PL
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 sm:px-3 py-1.5 text-xs rounded-full transition-all font-modern touch-target relative z-[110] pointer-events-auto ${
          language === 'en'
            ? 'text-white font-semibold'
            : 'text-white/60 hover:text-white/80 active:text-white/90'
        }`}
      >
        EN
      </button>
    </div>
  );
}

