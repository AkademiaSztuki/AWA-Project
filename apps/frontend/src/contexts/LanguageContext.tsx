"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, LocalizedText, getLocalizedText } from '@/lib/questions/validated-scales';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: LocalizedText) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pl');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang && (savedLang === 'pl' || savedLang === 'en')) {
      setLanguageState(savedLang);
    } else {
      // Detect browser language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('pl')) {
        setLanguageState('pl');
      } else {
        setLanguageState('en');
      }
    }
  }, []);

  // Save language to localStorage when it changes
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  // Translation helper function
  const t = (text: LocalizedText): string => {
    return getLocalizedText(text, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Language toggle component
export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 glass-panel px-1.5 h-10 rounded-full">
      <button
        onClick={() => setLanguage('pl')}
        className={`px-3 py-1.5 text-xs rounded-full transition-all font-modern ${
          language === 'pl'
            ? 'bg-gold-500 text-white font-semibold shadow-md'
            : 'text-gray-600 hover:text-gray-800 hover:bg-white/10'
        }`}
      >
        PL
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 text-xs rounded-full transition-all font-modern ${
          language === 'en'
            ? 'bg-gold-500 text-white font-semibold shadow-md'
            : 'text-gray-600 hover:text-gray-800 hover:bg-white/10'
        }`}
      >
        EN
      </button>
    </div>
  );
}

