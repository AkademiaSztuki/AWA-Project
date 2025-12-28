"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard } from 'lucide-react';

export function DashboardButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const { user } = useAuth();

  // Don't show if not logged in or on dashboard page
  if (!user || pathname === '/dashboard') {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard')}
      className="h-10 px-3 sm:px-4 rounded-full glass-panel transition-all text-xs sm:text-sm font-modern text-graphite flex items-center gap-1 sm:gap-2 hover:bg-white/10 active:bg-white/20 touch-target whitespace-nowrap relative z-[110] pointer-events-auto"
    >
      <LayoutDashboard size={14} className="sm:w-4 sm:h-4" />
      <span className="hidden md:inline">{language === 'pl' ? 'Dashboard' : 'Dashboard'}</span>
      <span className="hidden sm:inline md:hidden">Dash</span>
    </button>
  );
}
