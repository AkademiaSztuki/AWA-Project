import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { FlowStep } from '@/types';

interface AwaModelProps {
  currentStep: FlowStep;
  onLoaded?: () => void;
  position?: [number, number, number];
}

export const AwaModel: React.FC<AwaModelProps> = ({ currentStep, onLoaded, position = [-0.6, -0.9, 0] }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [headBone, setHeadBone] = useState<THREE.Bone | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Load Quinn model
  const { scene } = useGLTF('/models/SKM_Quinn.gltf');
  // Load idle animation
  const { animations: idleAnimations } = useGLTF('/models/Idle.gltf');

  useEffect(() => {
    if (scene) {
      // Find head bone for mouse tracking
      let foundHead: THREE.Object3D | null = null;
      scene.traverse((child: THREE.Object3D) => {
        if (
          child.type === 'Bone' &&
          child.name.toLowerCase().includes('head')
        ) {
          foundHead = child;
        }
      });
      if (foundHead && (foundHead as THREE.Bone).rotation) {
        (foundHead as THREE.Bone).rotation.order = 'YXZ';
        (foundHead as THREE.Bone).rotation.y += Math.PI / 2;
      }
      setHeadBone(foundHead ? (foundHead as unknown as THREE.Bone) : null);
      // Inform parent that model is loaded
      if (onLoaded) onLoaded();
    }
  }, [scene, onLoaded]);

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

  const { actions } = useAnimations(idleAnimations, scene);

  useEffect(() => {
    if (actions && actions['idle']) {
      actions['idle'].play();
    } else {
      // Jeśli animacja ma inną nazwę, odpal pierwszą z listy
      const keys = actions ? Object.keys(actions) : [];
      if (keys.length > 0) {
        actions[keys[0]].play();
      }
    }
  }, [actions]);

  // Animation loop
  useFrame((state) => {
    if (headBone) {
      // 1. Ustawiamy cel na podstawie kursora
      const lookTarget = new THREE.Vector3(
        mousePosition.x * 2,
        mousePosition.y * 2,
        5 // zmniejszyłem odległość, żeby było bardziej czułe
      );
      
      // 2. Patrzymy na cel
      headBone.lookAt(lookTarget);

      // 3. KORYGUJEMY OBRÓT - to jest kluczowe
      // Obracamy o -90 stopni wokół osi X, aby naprawić orientację
      headBone.rotateX(-Math.PI / -0.1);
      // Korekcja 2: Naprawia przechylenie w lewo
      headBone.rotateZ(1.5);
    }

    // Animacja oddychania
    meshRef.current?.scale && ((meshRef.current as THREE.Group).scale.y = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02);
  });

  if (!scene) {
    return null;
  }

  return (
    <group ref={meshRef} position={position}>
      <primitive object={scene} />
    </group>
  );
};

// Preload model
useGLTF.preload('/models/SKM_Quinn.gltf');