"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardAccess } from '@/hooks/useDashboardAccess';
import { LayoutDashboard } from 'lucide-react';

export function DashboardButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const { isComplete, isResolved } = useDashboardAccess();

  // Don't show if core profile not complete, or already on dashboard
  if (!isResolved || !isComplete || pathname === '/dashboard') {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard')}
      className="h-10 px-3 sm:px-4 rounded-full glass-panel transition-all text-xs sm:text-sm font-modern text-graphite flex items-center gap-1 sm:gap-2 hover:bg-white/10 active:bg-white/20 touch-target whitespace-nowrap relative z-[110] pointer-events-auto"
    >
      <LayoutDashboard size={14} className="sm:w-4 sm:h-4" aria-hidden="true" />
      <span className="hidden lg:inline">{language === 'pl' ? 'Dashboard' : 'Dashboard'}</span>
      <span className="hidden sm:inline lg:hidden">Dash</span>
    </button>
  );
}
