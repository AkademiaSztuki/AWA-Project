import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { AwaModel } from './AwaModel';
import { AwaDialogue } from './AwaDialogue';
import { FlowStep } from '@/types';

interface AwaContainerProps {
  currentStep: FlowStep;
  message?: string;
  isVisible?: boolean;
}

export const AwaContainer: React.FC<AwaContainerProps> = ({
  currentStep,
  message,
  isVisible = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={containerRef}
      className={`fixed left-0 top-0 w-96 h-screen glass-panel transition-all duration-500 ${
        isVisible ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Three.js Scene */}
      <div className="h-2/3 relative">
        <Canvas
          camera={{ position: [0, 0, 2], fov: 50 }}
          className="rounded-t-lg"
        >
          <Environment preset="studio" />
          <ambientLight intensity={0.5} color="#F7E7CE" />
          <directionalLight
            position={[2, 2, 2]}
            intensity={0.8}
            color="#FFD700"
            castShadow
          />

          <AwaModel currentStep={currentStep} />

          <OrbitControls 
            enablePan={false}
            enableZoom={false}
            enableRotate={false}
          />
        </Canvas>

        {/* Loading overlay */}
        <div className="absolute inset-0 bg-pearl-100/20 backdrop-blur-sm flex items-center justify-center">
          <div className="text-gold-500 font-futuristic text-lg animate-pulse">
            Ładowanie AWA...
          </div>
        </div>
      </div>

      {/* Dialogue Section */}
      <div className="h-1/3 p-4">
        <AwaDialogue 
          currentStep={currentStep}
          message={message}
        />
      </div>
    </div>
  );
};

export default AwaContainer;