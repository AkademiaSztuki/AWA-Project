"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PathSelectionButton } from './PathSelectionButton';
import { DashboardButton } from './DashboardButton';
import { UserAuthButton } from '@/components/auth/UserAuthButton';
import { LanguageToggle } from '@/contexts/LanguageContext';
import { MusicTestButton } from './MusicTestButton';
import { ColorAdjustmentPanel } from './ColorAdjustmentPanel';
import { Home } from 'lucide-react';
import { useLayout } from '@/contexts/LayoutContext';
import { useDashboardAccess } from '@/hooks/useDashboardAccess';

export function GlassHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isHeaderVisible } = useLayout();
  const { isComplete, isResolved } = useDashboardAccess();

  const showPathSelection = pathname !== '/flow/path-selection' && pathname !== '/';
  const showDashboard = isResolved && isComplete && pathname !== '/dashboard';

  // Header is visible if:
  // 1. We are NOT on the home page ('/')
  // 2. OR isHeaderVisible is true (controlled by LandingScreen)
  const shouldShow = pathname !== '/' || isHeaderVisible;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full sticky top-2 sm:top-4 z-[100] mb-2 px-1"
          role="navigation"
          aria-label={pathname === '/' ? 'Główne menu nawigacyjne' : 'Main navigation'}
        >
          <div className="w-full max-w-full glass-panel rounded-[16px] sm:rounded-[24px] md:rounded-[32px] border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl px-1.5 sm:px-2 md:px-2 lg:px-3 py-1.5 sm:py-2 flex items-center gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2 overflow-x-auto scrollbar-hide min-w-0 relative z-[110] pointer-events-auto" style={{ overflowY: 'visible' }}>
            
            {/* Home Button */}
            <button 
              onClick={() => router.push('/')}
              className="w-10 h-10 sm:w-10 sm:h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-all text-graphite flex-shrink-0 touch-target relative z-[110] pointer-events-auto focus:ring-2 focus:ring-gold-400 focus:outline-none"
              aria-label={pathname === '/' ? 'Strona główna' : 'Home'}
              type="button"
            >
              <Home size={18} aria-hidden="true" />
            </button>

            <div className="w-px h-5 sm:h-6 bg-white/20 mx-0.5 sm:mx-0.5 md:mx-1 lg:mx-1 flex-shrink-0" />

            <div className="flex-shrink-0 relative z-[200]">
              <MusicTestButton />
            </div>

            {(showPathSelection || showDashboard) && (
              <div className="w-px h-5 sm:h-6 bg-white/20 mx-0.5 sm:mx-0.5 md:mx-1 lg:mx-1 flex-shrink-0" />
            )}

            <div className="flex-shrink-0">
              <PathSelectionButton />
            </div>
            <div className="flex-shrink-0">
              <DashboardButton />
            </div>
            
            <div className="w-px h-5 sm:h-6 bg-white/20 mx-0.5 sm:mx-0.5 md:mx-1 lg:mx-1 flex-shrink-0" />
            
            <div className="flex-shrink-0 ml-auto">
              <UserAuthButton />
            </div>
            <div className="flex-shrink-0">
              <ColorAdjustmentPanel />
            </div>
            <div className="flex-shrink-0">
              <LanguageToggle />
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}


