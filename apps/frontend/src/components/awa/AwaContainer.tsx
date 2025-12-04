"use client";

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { AwaModelParticles } from './AwaModelParticles';
// import { AwaModel } from './AwaModel'; // Oryginalny model - można użyć zamiast particles
import { AwaDialogue } from './AwaDialogue';
import { FlowStep } from '@/types';

interface AwaContainerProps {
  currentStep: FlowStep;
  message?: string;
  isVisible?: boolean;
  onDialogueEnd?: () => void;
  showDialogue?: boolean;
  fullWidth?: boolean; // Nowy prop dla pełnej szerokości
  autoHide?: boolean; // Nowy prop dla automatycznego ukrywania
}

// Helper function to get responsive model position based on screen width
const getModelPosition = (width: number): [number, number, number] => {
  // Oryginalna pozycja modelu - zawsze [-0.6, -0.7, 0]
  return [-0.6, -0.7, 0];
};

// Helper function to get responsive camera FOV
const getCameraFOV = (width: number): number => {
  if (width < 1024) return 75;   // Tighter view for mobile landscape
  if (width < 1440) return 90;   // Standard for laptops
  return 100;                     // Wider view for large screens
};

// Helper function to get responsive canvas dimensions
const getCanvasDimensions = (width: number): string => {
  if (width < 1024) return 'w-[300px] h-[60vh]';     // Smaller for mobile landscape
  if (width < 1440) return 'w-[420px] h-[80vh]';    // Ograniczona szerokość dla laptopów
  if (width < 1920) return 'w-[500px] h-[85vh]';    // Ograniczona szerokość dla 1440p
  return 'w-[600px] h-[90vh]';                       // Ograniczona szerokość dla 4K
};

export const AwaContainer: React.FC<AwaContainerProps> = ({
  currentStep,
  message,
  isVisible = true,
  onDialogueEnd,
  showDialogue = true,
  fullWidth = false,
  autoHide = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

  // Track window width for responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Oryginalna pozycja modelu z AwaModel - [-0.6, -0.7, 0]
  const modelPosition: [number, number, number] = [-0.6, -0.7, 0];
  const cameraFOV = getCameraFOV(windowWidth);
  const canvasDimensions = getCanvasDimensions(windowWidth);

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none">
      {/* Canvas z IDA - pełny ekran jak AwaBackground */}
      <Canvas
        camera={{ position: [-1.2, 0.4, 2.2], fov: 70 }}
        className="w-screen h-screen bg-transparent"
      >
        <Environment preset="studio" />
        <ambientLight intensity={0.6} color="#FFE5B4" />
        <directionalLight
          position={[2, 2, 2]}
          intensity={0.5}
          color="#FFD700"
          castShadow
        />
        {/* Add extra lighting for 4K displays */}
        {windowWidth >= 1920 && (
          <pointLight 
            position={[-2, 1, 2]} 
            intensity={0.3} 
            color="#FFE5B4" 
          />
        )}
        <AwaModelParticles 
          currentStep={currentStep} 
          onLoaded={() => setIsLoading(false)} 
          position={modelPosition}
          particleDensity={0.3}
          particleSize={0.5}
          glowIntensity={1.5}
        />
        {/* Oryginalny model - alternatywa:
        <AwaModel 
          currentStep={currentStep} 
          onLoaded={() => setIsLoading(false)} 
          position={modelPosition}
        />
        */}
        <OrbitControls 
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />
      </Canvas>
      {/* Loading overlay - wyłączone */}
      {/* {isLoading && (
        <div className="absolute inset-0 bg-pearl-100/40 backdrop-blur-sm flex items-center justify-center rounded-xl z-20">
          <div className="text-gold-500 font-nasalization text-lg animate-pulse">
            Ładowanie IDA...
          </div>
        </div>
      )} */}
      {/* UI na wierzchu */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen w-full">
        <div className="max-w-3xl w-full mt-16 mb-8">
          {showDialogue && (
            <AwaDialogue 
              currentStep={currentStep}
              message={message}
              onDialogueEnd={onDialogueEnd}
              fullWidth={fullWidth}
              autoHide={autoHide}
            />
          )}
        </div>
        {/* Tu możesz dodać inne elementy UI, np. przyciski, menu itp. */}
      </div>
    </div>
  );
};

export default AwaContainer;