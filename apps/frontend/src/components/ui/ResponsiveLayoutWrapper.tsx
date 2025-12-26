"use client";

import { useIsMobile } from '@/hooks/useIsMobile';
import { AwaBackground } from '@/components/awa';
import AuroraBackgroundClient from '@/components/ui/AuroraBackgroundClient';
import ParticlesBackground from '@/components/ui/ParticlesBackground';
import AuroraBubbles from '@/components/ui/AuroraBubbles';
import { MobileBackground } from '@/components/ui/MobileBackground';
import { useEffect, useState } from 'react';

export function ResponsiveLayoutWrapper({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

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
      
      {/* Mobile: Render static background image */}
      {isMobile && <MobileBackground />}
      
      {children}
    </>
  );
}

