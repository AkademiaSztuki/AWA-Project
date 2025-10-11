"use client";

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { AwaModel } from './AwaModel';
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
  if (width < 1024) return [-0.4, -0.7, 0];      // Landscape mobile/tablet - closer
  if (width < 1440) return [-0.6, -0.7, 0];      // Laptops - current standard
  if (width < 1920) return [-0.7, -0.8, 0];      // 1440p - more space
  return [-0.8, -0.9, 0];                         // 4K - maximum space
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
  if (width < 1440) return 'w-1/2 h-[80vh]';         // Standard
  if (width < 1920) return 'w-[600px] h-[85vh]';     // Larger for 1440p
  return 'w-[700px] h-[90vh]';                       // Maximum for 4K
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

  const modelPosition = getModelPosition(windowWidth);
  const cameraFOV = getCameraFOV(windowWidth);
  const canvasDimensions = getCanvasDimensions(windowWidth);

  return (
    <div className="relative z-10 min-h-screen w-full">
      {/* Canvas z IDA */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-end justify-start">
        <div className={`${canvasDimensions} flex items-end transition-all duration-300`}>
          <Canvas
            camera={{ position: [-0.5, 0.3, 1.1], fov: cameraFOV }}
            className="w-full h-full bg-transparent"
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
            <AwaModel 
              currentStep={currentStep} 
              onLoaded={() => setIsLoading(false)} 
              position={modelPosition}
            />
            <OrbitControls 
              enablePan={false}
              enableZoom={false}
              enableRotate={false}
            />
          </Canvas>
        </div>
        {/* Loading overlay - wyłączone */}
        {/* {isLoading && (
          <div className="absolute inset-0 bg-pearl-100/40 backdrop-blur-sm flex items-center justify-center rounded-xl z-20">
            <div className="text-gold-500 font-nasalization text-lg animate-pulse">
              Ładowanie IDA...
            </div>
          </div>
        )} */}
      </div>
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