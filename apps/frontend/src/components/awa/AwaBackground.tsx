"use client";

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { AwaModel } from './AwaModel';
import { AwaModelParticlesDiscs } from './AwaModelParticlesDiscs';
import { AwaModelParticlesInstanced } from './AwaModelParticlesInstanced';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePathname } from 'next/navigation';

// Szybki przełącznik testu partiklowego na landing
const PARTICLE_MODE = 'disc' as 'off' | 'disc' | 'instanced';

const AwaBackground: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  
  // Check if we're on landing page (root path)
  const isLandingPage = pathname === '/';
  
  // Center position for mobile on landing page, left side for desktop or other pages
  const modelPosition: [number, number, number] = isMobile && isLandingPage 
    ? [0, -0.9, 0]  // Centered on mobile for landing page (cząsteczki będą wyżej przez offset)
    : [-1.4, -0.9, 0];  // Left side for desktop or other pages

  // Hide model after wyjsciewlewo animation completes on mobile landing page
  useEffect(() => {
    if (!isMobile || !isLandingPage) return;

    const handleWyjsciewlewoComplete = () => {
      // Small delay to allow animation to complete
      setTimeout(() => {
        console.log('[AwaBackground] Wyłączanie renderowania modelu po animacji wyjsciewlewo');
        setShouldRender(false);
      }, 500);
    };

    window.addEventListener('awa-wyjsciewlewo-complete', handleWyjsciewlewoComplete);
    
    return () => {
      window.removeEventListener('awa-wyjsciewlewo-complete', handleWyjsciewlewoComplete);
    };
  }, [isMobile, isLandingPage]);

  // Reset shouldRender when navigating away from landing page
  useEffect(() => {
    if (!isLandingPage) {
      setShouldRender(true);
    }
  }, [isLandingPage]);

  if (!shouldRender) {
    // Model nie jest renderowany - całkowite wyłączenie renderowania
    return null;
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none w-screen h-screen">
        <Canvas
          camera={{ position: [-1.2, 0.4, 2.2], fov: 70 }}
          className="w-screen h-screen bg-transparent"
        >
          <ambientLight intensity={0.3} color="#2A2A2A" />
          <directionalLight
            position={[2, 2, 2]}
            intensity={0.4}
            color="#FFD700"
            castShadow
          />
          <AwaModel 
            currentStep="landing" 
            onLoaded={() => setIsLoading(false)} 
            position={modelPosition}
          />
          {/* Particles wyłączone – wracamy do samego teksturowanego modelu */}
          <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
        </Canvas>
        {/* Loading overlay - wyłączone */}
        {/* {isLoading && (
          <div className="absolute inset-0 bg-pearl-100/40 backdrop-blur-sm flex items-center justify-center rounded-xl z-20">
                    <div className="text-gold-500 font-nasalization text-lg animate-pulse">
            Ładowanie IDA...
          </div>
          </div>
        )} */}
      </div>
  );
};

export default AwaBackground; 