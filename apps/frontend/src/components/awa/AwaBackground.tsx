"use client";

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { AwaModel } from './AwaModel';
import { AwaModelParticlesDiscs } from './AwaModelParticlesDiscs';
import { AwaModelParticlesInstanced } from './AwaModelParticlesInstanced';

// Szybki przełącznik testu partiklowego na landing
const PARTICLE_MODE = 'disc' as 'off' | 'disc' | 'instanced';

const AwaBackground: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  return (
    <div className="fixed inset-0 z-0 pointer-events-none w-screen h-screen">
      <Canvas
        camera={{ position: [-1.2, 0.4, 2.2], fov: 70 }}
        className="w-screen h-screen bg-transparent"
      >
        <Environment preset="studio" />
        <ambientLight intensity={0.5} color="#F7E7CE" />
        <directionalLight
          position={[2, 2, 2]}
          intensity={0.8}
          color="#FFD700"
          castShadow
        />
        <AwaModel 
          currentStep="landing" 
          onLoaded={() => setIsLoading(false)} 
          position={[-1.4, -0.9, 0]}
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