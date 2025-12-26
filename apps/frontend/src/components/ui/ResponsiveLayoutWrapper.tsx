"use client";

import { useIsMobile } from '@/hooks/useIsMobile';
import { AwaBackground } from '@/components/awa';
import AuroraBackgroundClient from '@/components/ui/AuroraBackgroundClient';
import ParticlesBackground from '@/components/ui/ParticlesBackground';
import AuroraBubbles from '@/components/ui/AuroraBubbles';
import { MobileBackground } from '@/components/ui/MobileBackground';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function ResponsiveLayoutWrapper({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render backgrounds until mounted to avoid SSR mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Desktop: Render all animated backgrounds */}
      {!isMobile && (
        <>
          <AwaBackground />
          <AuroraBackgroundClient />
          <AuroraBubbles />
          <ParticlesBackground />
        </>
      )}
      
      {/* Mobile: Render static background image and 3D model for landing page */}
      {isMobile && (
        <>
          <MobileBackground />
          {/* Render 3D model on mobile only for landing page */}
          {isLandingPage && <AwaBackground />}
        </>
      )}
      
      {children}
    </>
  );
}

