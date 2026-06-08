"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { ReadingGuide } from '@/components/ui/ReadingGuide';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface AppContentFrameProps {
  children: React.ReactNode;
}

/** Full-bleed marketing hero — extra main padding would show body gradient as a top strip. */
const EDGE_TO_EDGE_TOP_ROUTES = new Set(['/']);

/** Marketing pages carry their own footer spacing; large main bottom padding reads as an empty strip. */
const MINIMAL_MAIN_BOTTOM_ROUTES = new Set(['/']);

export function AppContentFrame({ children }: AppContentFrameProps) {
  const pathname = usePathname();
  /** 1024px — home hero pointer-events only; header mobile nav uses Tailwind `md` (768px). */
  const isMobile = useIsMobile();
  const edgeToEdgeTop = EDGE_TO_EDGE_TOP_ROUTES.has(pathname);
  const minimalMainBottom = MINIMAL_MAIN_BOTTOM_ROUTES.has(pathname);
  /** Let the living-room marquee (portaled under main z-10) receive hover/clicks in its strip. */
  const homeDesktopPointerPassThrough = pathname === '/' && !isMobile;

  const paddingTop = edgeToEdgeTop
    ? 'env(safe-area-inset-top, 0px)'
    : 'calc(env(safe-area-inset-top, 0px) + clamp(1rem, 2vw, 2rem))';

  const paddingBottom = minimalMainBottom
    ? 'env(safe-area-inset-bottom, 0px)'
    : 'calc(env(safe-area-inset-bottom, 0) + clamp(2rem, 3vw, 3rem))';

  return (
    <main
      id="main-content"
      className={cn(
        'relative z-10 min-h-[100dvh] w-full px-1.5 sm:px-4 md:px-8',
        homeDesktopPointerPassThrough && 'pointer-events-none'
      )}
      role="main"
      aria-label="Główna treść aplikacji"
      style={{
        paddingTop,
        paddingBottom,
      }}
    >
      <div
        className={cn(
          'mx-auto w-full max-w-screen-2xl flex flex-col xl:grid xl:gap-10 xl:grid-cols-[minmax(320px,0.3fr)_minmax(400px,0.7fr)] items-start',
          homeDesktopPointerPassThrough && 'pointer-events-none'
        )}
      >
        <div className="hidden xl:block min-h-[720px]" aria-hidden="true" />
        <div
          className={cn(
            'w-full max-w-full lg:max-w-none lg:ml-auto',
            edgeToEdgeTop ? 'space-y-0' : 'space-y-2 sm:space-y-4',
            homeDesktopPointerPassThrough && 'pointer-events-none'
          )}
        >
          <div className={cn(homeDesktopPointerPassThrough && 'pointer-events-auto')}>
            <GlassHeader />
          </div>
          <div className={cn(homeDesktopPointerPassThrough && 'pointer-events-auto')}>
            <ReadingGuide />
          </div>
          <div className={cn('w-full', homeDesktopPointerPassThrough && 'pointer-events-none')}>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
