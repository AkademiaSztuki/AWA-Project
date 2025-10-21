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
      onClick={() => router.push('/dashboard')}
      className="px-3 py-2 rounded-full glass-panel transition-all text-sm font-modern text-graphite flex items-center gap-2"
    >
      <LayoutDashboard size={16} />
      {language === 'pl' ? 'Dashboard' : 'Dashboard'}
    </button>
  );
}
