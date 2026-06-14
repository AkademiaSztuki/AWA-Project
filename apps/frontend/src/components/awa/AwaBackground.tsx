"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { AwaModel } from './AwaModel';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const AwaBackground: React.FC = () => {
  const [shouldRender, setShouldRender] = useState(true);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const hostRef = useRef<HTMLDivElement>(null);

  const isMarketingPage = pathname === '/';
  const isLandingPage = pathname === '/';

  const modelPosition: [number, number, number] =
    isMobile && isLandingPage ? [0, -0.9, 0] : [-1.4, -0.9, 0];

  useEffect(() => {
    if (!isMobile || !isLandingPage) return;

    const handleWyjsciewlewoComplete = () => {
      setTimeout(() => setShouldRender(false), 500);
    };

    window.addEventListener('awa-wyjsciewlewo-complete', handleWyjsciewlewoComplete);
    return () => window.removeEventListener('awa-wyjsciewlewo-complete', handleWyjsciewlewoComplete);
  }, [isMobile, isLandingPage]);

  useEffect(() => {
    if (!isMarketingPage) {
      setShouldRender(true);
    }
  }, [isMarketingPage]);

  useLayoutEffect(() => {
    const root = hostRef.current;
    if (!root) return;

    const patchCanvases = () => {
      root.querySelectorAll('canvas').forEach((el) => {
        el.style.setProperty('pointer-events', 'none', 'important');
      });
    };

    let raf = 0;
    const schedulePatch = () => {
      if (raf !== 0) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        patchCanvases();
      });
    };

    patchCanvases();
    const mo = new MutationObserver(schedulePatch);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      if (raf !== 0) window.cancelAnimationFrame(raf);
    };
  }, []);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={hostRef}
      className={cn('fixed z-[6] pointer-events-none [&_canvas]:pointer-events-none')}
      style={{
        top: 'calc(-1 * env(safe-area-inset-top, 0))',
        left: 'calc(-1 * env(safe-area-inset-left, 0))',
        right: 'calc(-1 * env(safe-area-inset-right, 0))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0))',
        width: '100vw',
        height: '100dvh',
      }}
    >
      <Canvas
        camera={{ position: [-1.2, 0.4, 2.2], fov: 70 }}
        className="pointer-events-none h-screen w-screen bg-transparent"
        style={{ pointerEvents: 'none' }}
      >
        <ambientLight intensity={0.6} color="#FFE5B4" />
        <directionalLight
          position={[2, 2, 2]}
          intensity={0.5}
          color="#FFD700"
          castShadow
        />
        <AwaModel currentStep="landing" onLoaded={() => undefined} position={modelPosition} />
      </Canvas>
    </div>
  );
};

export default AwaBackground;
