"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft } from 'lucide-react';

export function PathSelectionButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();

  // Don't show on path selection page itself
  if (pathname === '/flow/path-selection') {
    return null;
  }

  return (
    <button
      onClick={() => router.push('/flow/path-selection')}
      className="px-3 py-2 rounded-full glass-panel transition-all text-sm font-modern text-graphite flex items-center gap-2 hover:bg-white/10"
    >
      <ArrowLeft size={16} />
      {language === 'pl' ? 'Wybierz Ścieżkę' : 'Choose Path'}
    </button>
  );
}
