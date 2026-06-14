"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PathSelectionButton } from './PathSelectionButton';
import { DashboardButton } from './DashboardButton';
import { UserAuthButton } from '@/components/auth/UserAuthButton';
import { LanguageToggle } from '@/contexts/LanguageContext';
import { MusicTestButton } from './MusicTestButton';
import { ColorAdjustmentPanel } from './ColorAdjustmentPanel';
import { MarketingNavLinks } from './MarketingNavLinks';
import { GlassHeaderMobileDrawer } from './GlassHeaderMobileDrawer';
import { Home, Menu, X } from 'lucide-react';
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

const HeaderDivider = () => (
  <div className="w-px h-5 sm:h-6 bg-white/20 mx-0.5 sm:mx-0.5 md:mx-1 lg:mx-1 flex-shrink-0" />
);

export function GlassHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isHeaderVisible } = useLayout();
  const { isComplete, isResolved } = useDashboardAccess();
  const { tp } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const showPathSelection = pathname !== '/flow/path-selection' && pathname !== '/';
  const showDashboard = isResolved && isComplete && pathname !== '/dashboard';
  const showMarketingNavLinks =
    pathname === '/' || (pathname != null && MARKETING_NAV_PATHS.has(pathname));
  const showFlowControls = showPathSelection || showDashboard;

  const marketingHome = pathname === '/';

  const shouldShow = !marketingHome || isHeaderVisible;

  /** Fixed overlay on `/`; `useIsMobile(1024)` in AppContentFrame is separate (home hero pointer-events). */
  const edgeToEdgeHome = marketingHome;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const glassBar = (
    <div className="relative min-w-0">
      <div
        className="w-full max-w-full glass-panel rounded-[16px] sm:rounded-[24px] md:rounded-[32px] border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl px-1.5 sm:px-2 md:px-2 lg:px-3 py-1.5 sm:py-2 flex items-center gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2 min-w-0 relative z-[110] pointer-events-auto md:overflow-x-auto md:scrollbar-hide"
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

        <div className="max-md:hidden md:contents">
          <HeaderDivider />

          <div className="flex-shrink-0 relative z-[200]">
            <MusicTestButton />
          </div>

          {showFlowControls && <HeaderDivider />}

          <div className="flex-shrink-0">
            <PathSelectionButton />
          </div>
          <div className="flex-shrink-0">
            <DashboardButton />
          </div>

          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2">
            <HeaderDivider />

            {showMarketingNavLinks && (
              <>
                <MarketingNavLinks />
                <HeaderDivider />
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

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 md:hidden">
          <div className="relative z-[200] shrink-0">
            <MusicTestButton />
          </div>
          <div className="shrink-0">
            <DashboardButton variant="icon" />
          </div>
          <div className="shrink-0">
            <UserAuthButton variant="bar" />
          </div>
          <LanguageToggle />
          <button
            ref={menuButtonRef}
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full glass-panel text-graphite transition-all hover:bg-white/10 active:bg-white/20 touch-target focus:outline-none focus:ring-2 focus:ring-gold-400"
            aria-expanded={mobileMenuOpen}
            aria-controls="glass-header-mobile-menu"
            aria-haspopup="dialog"
            aria-label={mobileMenuOpen ? tp('Zamknij menu', 'Close menu') : tp('Otwórz menu', 'Open menu')}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <GlassHeaderMobileDrawer
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        showPathSelection={showPathSelection}
        showDashboard={showDashboard}
        returnFocusRef={menuButtonRef}
      />
    </div>
  );

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.nav
          initial={marketingHome ? false : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: marketingHome ? 0.15 : 0.8, ease: 'easeOut' }}
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
