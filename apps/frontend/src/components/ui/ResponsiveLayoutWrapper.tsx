"use client";

import { useIsMobile } from '@/hooks/useIsMobile';
import { AwaBackground } from '@/components/awa';
import ParticlesBackground from '@/components/ui/ParticlesBackground';
import AuroraBubbles from '@/components/ui/AuroraBubbles';
import { DesktopBackground } from '@/components/ui/DesktopBackground';
import { MobileBackground } from '@/components/ui/MobileBackground';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useColorAdjustment } from '@/contexts/ColorAdjustmentContext';

export function ResponsiveLayoutWrapper({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const isCompactLayout = useIsMobile(1280);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isMarketingPage = pathname === '/';
  const { hideModel3D } = useColorAdjustment();

  const [showMobileAwa, setShowMobileAwa] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if ((isMobile || isCompactLayout) && isMarketingPage) {
      setShowMobileAwa(true);
    }
  }, [isMobile, isCompactLayout, isMarketingPage]);

  useEffect(() => {
    if (!(isMobile || isCompactLayout)) return;

    const handleExitComplete = () => {
      console.log('[ResponsiveLayoutWrapper] Exit animation complete, removing AwaBackground');
      setShowMobileAwa(false);
    };

    window.addEventListener('awa-wyjsciewlewo-complete', handleExitComplete);
    return () => window.removeEventListener('awa-wyjsciewlewo-complete', handleExitComplete);
  }, [isMobile, isCompactLayout]);

  const showAwaDesktop =
    !hideModel3D && (!isCompactLayout || (isMarketingPage && showMobileAwa));
  const showAwaMobile = !hideModel3D && showMobileAwa && isMarketingPage;

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {!isMobile ? (
        <>
          <DesktopBackground />
          <AuroraBubbles variant="reduced" />
          {pathname === '/' && (
            <>
              <div id="living-room-marquee-layer" className="pointer-events-none fixed inset-0 z-[2] isolate" />
              <div id="hero-style-rail-layer" className="pointer-events-none fixed inset-0 z-[6] isolate" />
            </>
          )}
          {showAwaDesktop && <AwaBackground />}
          <ParticlesBackground />
        </>
      ) : (
        <>
          <MobileBackground />
          {pathname === '/' && (
            <div id="hero-style-rail-layer" className="pointer-events-none fixed inset-0 z-[6] isolate" />
          )}
          {showAwaMobile && <AwaBackground />}
        </>
      )}

      {children}
    </>
  );
}
