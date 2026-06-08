"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft } from 'lucide-react';
type PathSelectionButtonProps = {
  variant?: 'default' | 'menuRow';
  onNavigate?: () => void;
};

export function PathSelectionButton({ variant = 'default', onNavigate }: PathSelectionButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();

  if (pathname === '/flow/path-selection' || pathname === '/') {
    return null;
  }

  const label = language === 'pl' ? 'Wybierz Ścieżkę' : 'Choose Path';

  const handleClick = () => {
    onNavigate?.();
    router.push('/flow/path-selection');
  };

  if (variant === 'menuRow') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-3 font-modern text-base font-semibold text-pearl-50 transition-colors hover:bg-white/10 hover:text-gold-400 active:bg-white/15 touch-target"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="h-10 px-3 sm:px-4 rounded-full glass-panel transition-all text-xs sm:text-sm font-modern text-graphite flex items-center gap-1 sm:gap-2 hover:bg-white/10 active:bg-white/20 touch-target whitespace-nowrap relative z-[110] pointer-events-auto"
    >
      <ArrowLeft size={14} className="sm:w-4 sm:h-4" aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
      <span className="hidden sm:inline lg:hidden">{language === 'pl' ? 'Ścieżka' : 'Path'}</span>
    </button>
  );
}
