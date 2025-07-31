"use client";

import React, { useState } from 'react';
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

  return (
    <div className="relative z-10 min-h-screen w-full">
      {/* Canvas z AWA */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-end justify-start">
        <div className="w-1/2 h-[80vh] min-w-[400px] flex items-end">
          <Canvas
            camera={{ position: [-0.5, 0.3, 1.1], fov: 90 }}
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
            <AwaModel currentStep={currentStep} onLoaded={() => setIsLoading(false)} />
            <OrbitControls 
              enablePan={false}
              enableZoom={false}
              enableRotate={false}
            />
          </Canvas>
        </div>
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-pearl-100/40 backdrop-blur-sm flex items-center justify-center rounded-xl z-20">
            <div className="text-gold-500 font-nasalization text-lg animate-pulse">
              Ładowanie AWA...
            </div>
          </div>
        )}
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