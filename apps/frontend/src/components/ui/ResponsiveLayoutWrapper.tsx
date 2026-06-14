"use client";



import dynamic from 'next/dynamic';

import { useIsMobile } from '@/hooks/useIsMobile';

import { useLiveSlowConnection } from '@/hooks/useSlowNetwork';

import AwaBackground from '@/components/awa/AwaBackground';

import ParticlesBackground from '@/components/ui/ParticlesBackground';

import { DesktopBackground } from '@/components/ui/DesktopBackground';

import { MobileBackground } from '@/components/ui/MobileBackground';

import { useEffect, useLayoutEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { useColorAdjustment } from '@/contexts/ColorAdjustmentContext';



const AuroraBubbles = dynamic(() => import('@/components/ui/AuroraBubbles'), { ssr: false });



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

  const isCompactLayout = useIsMobile(1280);

  const liveSlowConnection = useLiveSlowConnection();

  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();

  const isMarketingPage = pathname === '/';

  const { hideModel3D } = useColorAdjustment();



  const [decorationsReady, setDecorationsReady] = useState(!isMarketingPage);

  const [showMobileAwa, setShowMobileAwa] = useState(false);



  const allowHeavyDecorations = !liveSlowConnection && !hideModel3D;

  /** Home only on compact/mobile — other routes skip 3D + particles below xl (1280px). */
  const sceneDecorationsOnViewport =
    allowHeavyDecorations && (isMarketingPage || !isCompactLayout);



  useLayoutEffect(() => {
    setMounted(true);
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



    // Desktop marketing: load 3D immediately. Compact/mobile marketing: defer for hero LCP.

    const deferDecorations = isMobile || isCompactLayout;

    if (!deferDecorations) {

      setDecorationsReady(true);

      return;

    }



    return scheduleIdleWork(() => setDecorationsReady(true), 5000);

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



  const showAwaDesktop =

    sceneDecorationsOnViewport &&

    decorationsReady &&

    (!isCompactLayout || showMobileAwa);

  const showAwaMobile = sceneDecorationsOnViewport && showMobileAwa && isMarketingPage;



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


