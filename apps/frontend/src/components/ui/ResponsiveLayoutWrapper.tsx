"use client";

import dynamic from 'next/dynamic';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useLiveSlowConnection } from '@/hooks/useSlowNetwork';
import ParticlesBackground from '@/components/ui/ParticlesBackground';
import { DesktopBackground } from '@/components/ui/DesktopBackground';
import { MobileBackground } from '@/components/ui/MobileBackground';
import { useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useColorAdjustment } from '@/contexts/ColorAdjustmentContext';
import { getLayoutViewportWidth } from '@/lib/layout-viewport';
import {
  sceneDecorationsOnViewport as sceneDecorationsOnViewportForScene,
  showAwaDesktop as showAwaDesktopForScene,
  showAwaMobile as showAwaMobileForScene,
} from '@/lib/awa-scene-visibility';

const AuroraBubbles = dynamic(() => import('@/components/ui/AuroraBubbles'), { ssr: false });

/** Lazy so layout JS does not import AwaModel / trigger useGLTF.preload on first paint. */
const AwaBackground = dynamic(() => import('@/components/awa/AwaBackground'), { ssr: false });

function scheduleIdleWork(work: () => void, timeoutMs: number) {
  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(work, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = window.setTimeout(work, Math.min(timeoutMs, 1200));
  return () => window.clearTimeout(timeoutId);
}

export function ResponsiveLayoutWrapper({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const liveSlowConnection = useLiveSlowConnection();
  const [mounted, setMounted] = useState(false);
  /** Assume compact until layout width is known so desktop 3D is not painted then unmounted. */
  const [isCompactLayout, setIsCompactLayout] = useState(true);
  const pathname = usePathname();
  const isMarketingPage = pathname === '/';
  const { hideModel3D } = useColorAdjustment();

  const [decorationsReady, setDecorationsReady] = useState(!isMarketingPage);
  const [showMobileAwa, setShowMobileAwa] = useState(false);

  const visibility = {
    hideModel3D,
    isCompactLayout,
    isMarketingPage,
    liveSlowConnection,
    decorationsReady,
    showMobileAwa,
  };

  /** Home only on compact/mobile — other routes skip 3D + particles below xl (1280px). */
  const sceneDecorationsOnViewport = sceneDecorationsOnViewportForScene(visibility);

  useLayoutEffect(() => {
    setMounted(true);
    const updateCompact = () => setIsCompactLayout(getLayoutViewportWidth() < 1280);
    updateCompact();
    window.addEventListener('resize', updateCompact);
    return () => window.removeEventListener('resize', updateCompact);
  }, []);

  useEffect(() => {
    if (!sceneDecorationsOnViewport) {
      setDecorationsReady(false);
      setShowMobileAwa(false);
      return;
    }

    if (!isMarketingPage) {
      setDecorationsReady(true);
      return;
    }

    if (!mounted) return;

    // Defer GLTF until idle so first paint / hero LCP is not blocked.
    // Compact/mobile waits longer; desktop uses a short idle timeout (still not gated by network).
    const deferTimeoutMs = isMobile || isCompactLayout ? 5000 : 2000;
    return scheduleIdleWork(() => setDecorationsReady(true), deferTimeoutMs);
  }, [isMarketingPage, mounted, sceneDecorationsOnViewport, isCompactLayout, isMobile]);

  useEffect(() => {
    if (!sceneDecorationsOnViewport) {
      setShowMobileAwa(false);
      return;
    }
    if ((isMobile || isCompactLayout) && isMarketingPage && decorationsReady) {
      setShowMobileAwa(true);
      return;
    }
    if (isMarketingPage && !decorationsReady) {
      setShowMobileAwa(false);
    }
  }, [isMobile, isCompactLayout, isMarketingPage, decorationsReady, sceneDecorationsOnViewport]);

  useEffect(() => {
    if (!(isMobile || isCompactLayout)) return;

    const handleExitComplete = () => {
      setShowMobileAwa(false);
    };

    window.addEventListener('awa-wyjsciewlewo-complete', handleExitComplete);
    return () => window.removeEventListener('awa-wyjsciewlewo-complete', handleExitComplete);
  }, [isMobile, isCompactLayout]);

  const showAwaDesktop = showAwaDesktopForScene(visibility);
  const showAwaMobile = showAwaMobileForScene(visibility);

  const portalHosts =
    pathname === '/' ? (
      <>
        <div
          id="living-room-marquee-layer"
          className="pointer-events-none fixed inset-0 z-[2] isolate"
        />
        <div id="hero-style-rail-layer" className="pointer-events-none fixed inset-0 z-[6] isolate" />
      </>
    ) : null;

  return (
    <>
      {portalHosts}
      {!isMobile ? (
        <>
          <DesktopBackground />
          {sceneDecorationsOnViewport && decorationsReady ? <AuroraBubbles variant="reduced" /> : null}
          {showAwaDesktop ? <AwaBackground /> : null}
          {sceneDecorationsOnViewport && decorationsReady ? <ParticlesBackground /> : null}
        </>
      ) : (
        <>
          <MobileBackground priority={!isMarketingPage} />
          {showAwaMobile ? <AwaBackground /> : null}
        </>
      )}

      {children}
    </>
  );
}
