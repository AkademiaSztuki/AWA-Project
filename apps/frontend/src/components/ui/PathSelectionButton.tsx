"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft } from 'lucide-react';

export function PathSelectionButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();

  // Don't show on path selection page itself or on landing page (where path selection is part of the flow)
  if (pathname === '/flow/path-selection' || pathname === '/') {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push('/flow/path-selection')}
      className="h-10 px-3 sm:px-4 rounded-full glass-panel transition-all text-xs sm:text-sm font-modern text-graphite flex items-center gap-1 sm:gap-2 hover:bg-white/10 active:bg-white/20 touch-target whitespace-nowrap relative z-[110] pointer-events-auto"
    >
      <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
      <span className="hidden sm:inline">{language === 'pl' ? 'Wybierz Ścieżkę' : 'Choose Path'}</span>
      <span className="sm:hidden">{language === 'pl' ? 'Ścieżka' : 'Path'}</span>
    </button>
  );
}
