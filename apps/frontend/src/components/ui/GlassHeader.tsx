"use client";

import React from 'react';
import Link from 'next/link';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardAccess } from '@/hooks/useDashboardAccess';
import { cn } from '@/lib/utils';
import {
  APP_CONTENT_FRAME_PADDING_X,
  APP_CONTENT_MAX_WIDTH,
  APP_CONTENT_RIGHT_COLUMN,
  APP_CONTENT_XL_GRID,
} from '@/lib/app-content-grid';

/** Legal / marketing pages — show Cennik + Kontakt without cluttering in-app flows. */
const MARKETING_NAV_PATHS = new Set([
  '/contact',
  '/o-projecie',
  '/privacy',
  '/terms',
  '/subscription/plans',
  '/subscription/success',
  '/subscription/cancel',
]);

const marketingNavLinkClass =
  'shrink-0 whitespace-nowrap px-1.5 py-1 font-modern text-[11px] text-graphite/80 underline-offset-4 transition-colors hover:text-graphite hover:underline sm:px-2 sm:text-xs';

export function GlassHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isHeaderVisible } = useLayout();
  const { isComplete, isResolved } = useDashboardAccess();
  const { tp } = useLanguage();

  const showPathSelection = pathname !== '/flow/path-selection' && pathname !== '/';
  const showDashboard = isResolved && isComplete && pathname !== '/dashboard';
  const showMarketingNavLinks =
    pathname === '/' || (pathname != null && MARKETING_NAV_PATHS.has(pathname));

  // Header is visible if:
  // 1. We are NOT on the public entry pages
  // 2. OR isHeaderVisible is true (controlled by marketing home scroll)
  const shouldShow = pathname !== '/' || isHeaderVisible;

  /** Fixed overlay: no layout height; horizontal band matches `AppContentFrame` (incl. xl right column). */
  const edgeToEdgeHome = pathname === '/';

  const glassBar = (
    <div
      className="w-full max-w-full glass-panel rounded-[16px] sm:rounded-[24px] md:rounded-[32px] border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl px-1.5 sm:px-2 md:px-2 lg:px-3 py-1.5 sm:py-2 flex items-center gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2 overflow-x-auto scrollbar-hide min-w-0 relative z-[110] pointer-events-auto"
      style={{ overflowY: 'visible' }}
    >
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

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2">
        <div className="w-px h-5 sm:h-6 bg-white/20 mx-0.5 sm:mx-0.5 md:mx-1 lg:mx-1 flex-shrink-0" />

        {showMarketingNavLinks && (
          <>
            <nav
              className="flex shrink-0 items-center gap-0.5 sm:gap-1"
              aria-label={tp('Linki informacyjne', 'Site links')}
            >
              <Link href="/subscription/plans" className={marketingNavLinkClass}>
                {tp('Cennik', 'Pricing')}
              </Link>
              <Link href="/o-projecie" className={marketingNavLinkClass}>
                {tp('O projekcie', 'About')}
              </Link>
              <Link href="/contact" className={marketingNavLinkClass}>
                {tp('Kontakt', 'Contact')}
              </Link>
            </nav>
            <div className="w-px h-5 sm:h-6 bg-white/20 mx-0.5 sm:mx-0.5 md:mx-1 lg:mx-1 flex-shrink-0" />
          </>
        )}

        <div className="flex-shrink-0">
          <UserAuthButton />
        </div>
        <div className="flex-shrink-0">
          <ColorAdjustmentPanel />
        </div>
        <div className="flex-shrink-0">
          <LanguageToggle />
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn(
            'w-full z-[100]',
            edgeToEdgeHome
              ? 'fixed left-0 right-0 top-[max(0.5rem,env(safe-area-inset-top,0px))] sm:top-4'
              : 'sticky top-2 sm:top-4 mb-2 px-1'
          )}
          role="navigation"
          aria-label={pathname === '/' ? 'Główne menu nawigacyjne' : 'Main navigation'}
        >
          {edgeToEdgeHome ? (
            <div className={cn('w-full', APP_CONTENT_FRAME_PADDING_X)}>
              <div className={cn(APP_CONTENT_MAX_WIDTH, 'flex flex-col', APP_CONTENT_XL_GRID)}>
                <div className="hidden min-w-0 xl:block" aria-hidden="true" />
                <div className={APP_CONTENT_RIGHT_COLUMN}>{glassBar}</div>
              </div>
            </div>
          ) : (
            glassBar
          )}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
