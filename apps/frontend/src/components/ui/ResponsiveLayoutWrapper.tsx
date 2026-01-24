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
  const isLandingPage = pathname === '/';
  const { hideModel3D } = useColorAdjustment();
  const shouldHideModel = hideModel3D || isCompactLayout;
  
  // Keep background alive on mobile until exit animation finishes
  const [showMobileAwa, setShowMobileAwa] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update showMobileAwa based on landing page status
  useEffect(() => {
    if ((isMobile || isCompactLayout) && isLandingPage) {
      setShowMobileAwa(true);
    }
  }, [isMobile, isCompactLayout, isLandingPage]);

  // Listen for exit complete to finally remove it
  useEffect(() => {
    if (!(isMobile || isCompactLayout)) return;
    
    const handleExitComplete = () => {
      console.log('[ResponsiveLayoutWrapper] Exit animation complete, removing AwaBackground');
      setShowMobileAwa(false);
    };

    window.addEventListener('awa-wyjsciewlewo-complete', handleExitComplete);
    return () => window.removeEventListener('awa-wyjsciewlewo-complete', handleExitComplete);
  }, [isMobile, isCompactLayout]);

  // Don't render backgrounds until mounted to avoid SSR mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Backgrounds - Conditional rendering for proper layering */}
      {!isMobile ? (
        <>
          <DesktopBackground />
          <AuroraBubbles variant="reduced" />
          {!hideModel3D && (!isCompactLayout || (isLandingPage && showMobileAwa)) && (
            <AwaBackground />
          )}
          <ParticlesBackground />
        </>
      ) : (
        <>
          <MobileBackground />
          {/* Render 3D model on mobile until it explicitly finishes its exit */}
          {!hideModel3D && showMobileAwa && <AwaBackground />}
        </>
      )}
      
      {children}
    </>
  );
}

