import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FlowStep } from '@/types';

interface AwaModelProps {
  currentStep: FlowStep;
}

export const AwaModel: React.FC<AwaModelProps> = ({ currentStep }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [headBone, setHeadBone] = useState<THREE.Bone | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Load Quinn model
  const { scene, animations } = useGLTF('/models/SKM_Quinn.gltf');

  useEffect(() => {
    if (scene) {
      // Find head bone for mouse tracking
      scene.traverse((child) => {
        if (child instanceof THREE.Bone && child.name.toLowerCase().includes('head')) {
          setHeadBone(child);
        }
      });
    }
  }, [scene]);

  useEffect(() => {
    // Mouse tracking setup
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;

      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animation loop
  useFrame((state, delta) => {
    if (headBone && meshRef.current) {
      // Smooth head tracking
      const targetRotationY = mousePosition.x * 0.3;
      const targetRotationX = mousePosition.y * 0.2;

      headBone.rotation.y = THREE.MathUtils.lerp(
        headBone.rotation.y, 
        targetRotationY, 
        delta * 2
      );

      headBone.rotation.x = THREE.MathUtils.lerp(
        headBone.rotation.x, 
        targetRotationX, 
        delta * 2
      );
    }

    // Idle breathing animation
    if (meshRef.current) {
      meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  if (!scene) {
    return null;
  }

  return (
    <group ref={meshRef} position={[0, -1, 0]} scale={[1.2, 1.2, 1.2]}>
      <primitive object={scene.clone()} />
    </group>
  );
};

// Preload model
useGLTF.preload('/models/SKM_Quinn.gltf');