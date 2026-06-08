"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardAccess } from '@/hooks/useDashboardAccess';
import { LayoutDashboard } from 'lucide-react';

type DashboardButtonProps = {
  variant?: 'default' | 'menuRow' | 'icon';
  onNavigate?: () => void;
};

export function DashboardButton({ variant = 'default', onNavigate }: DashboardButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const { isComplete, isResolved } = useDashboardAccess();

  if (!isResolved || !isComplete || pathname === '/dashboard') {
    return null;
  }

  const label = language === 'pl' ? 'Dashboard' : 'Dashboard';

  const handleClick = () => {
    onNavigate?.();
    router.push('/dashboard');
  };

  if (variant === 'menuRow') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-3 font-modern text-base font-semibold text-pearl-50 transition-colors hover:bg-white/10 hover:text-gold-400 active:bg-white/15 touch-target"
      >
        <LayoutDashboard size={16} aria-hidden="true" />
        {label}
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full glass-panel text-graphite transition-all hover:bg-white/10 active:bg-white/20 touch-target relative z-[110] pointer-events-auto focus:outline-none focus:ring-2 focus:ring-gold-400"
        aria-label={label}
      >
        <LayoutDashboard size={18} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="h-10 px-3 sm:px-4 rounded-full glass-panel transition-all text-xs sm:text-sm font-modern text-graphite flex items-center gap-1 sm:gap-2 hover:bg-white/10 active:bg-white/20 touch-target whitespace-nowrap relative z-[110] pointer-events-auto"
    >
      <LayoutDashboard size={14} className="sm:w-4 sm:h-4" aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
      <span className="hidden sm:inline lg:hidden">Dash</span>
    </button>
  );
}
