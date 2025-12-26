"use client";

import { useIsMobile } from '@/hooks/useIsMobile';
import { AwaBackground } from '@/components/awa';
import AuroraBackgroundClient from '@/components/ui/AuroraBackgroundClient';
import ParticlesBackground from '@/components/ui/ParticlesBackground';
import AuroraBubbles from '@/components/ui/AuroraBubbles';
import { MobileBackground } from '@/components/ui/MobileBackground';

export function ResponsiveLayoutWrapper({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

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

