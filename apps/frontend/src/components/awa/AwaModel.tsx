import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, useEnvironment } from '@react-three/drei';
import * as THREE from 'three';
import { FlowStep } from '@/types';

interface AwaModelProps {
  currentStep: FlowStep;
  onLoaded?: () => void;
  position?: [number, number, number];
}

export const AwaModel: React.FC<AwaModelProps> = ({ currentStep, onLoaded, position = [-0.6, -0.7, 0] }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [headBone, setHeadBone] = useState<THREE.Bone | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Pobierz envMap z preset "sunset" - lepszy dla metalu (więcej kontrastu i refleksów)
  const envMap = useEnvironment({ preset: 'studio' });
  const { scene: threeScene } = useThree();

  // Load Quinn model
  const { scene } = useGLTF('/models/SKM_Quinn.gltf');
  // Load idle animation
  const { animations: idleAnimations } = useGLTF('/models/Idle.gltf');

  useEffect(() => {
    if (scene && envMap) {
      // Ustaw envMap globalnie na scenie (dla lepszej kompatybilności)
      if (threeScene) {
        threeScene.environment = envMap;
      }

      // Find head bone for mouse tracking and apply metallic materials
      let foundHead: THREE.Object3D | null = null;
      scene.traverse((child: THREE.Object3D) => {
        // Find head bone
        if (
          child.type === 'Bone' &&
          child.name.toLowerCase().includes('head')
        ) {
          foundHead = child;
        }
        
        // Apply metallic materials to meshes
        if (child.type === 'Mesh') {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const material = mesh.material as THREE.Material;
            
            // Create new metallic material with HDRI environment map
            const metallicMaterial = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0xE0E0E0), // Srebrzysty kolor
              metalness: 0.95, // Bardzo wysoka metaliczność (prawie 1.0)
              roughness: 0.05, // Bardzo niska chropowatość = bardzo wysoki połysk
              envMap: envMap, // Ustaw envMap z HDRI preset "sunset"
              envMapIntensity: 3.5, // Znacznie zwiększona intensywność dla wyraźnego efektu
            });
            
            // Zachowaj oryginalne tekstury jeśli istnieją
            if (material instanceof THREE.MeshStandardMaterial) {
              if (material.map) metallicMaterial.map = material.map;
              if (material.normalMap) metallicMaterial.normalMap = material.normalMap;
              if (material.roughnessMap) metallicMaterial.roughnessMap = material.roughnessMap;
              if (material.metalnessMap) metallicMaterial.metalnessMap = material.metalnessMap;
              if (material.aoMap) metallicMaterial.aoMap = material.aoMap;
            }
            
            // Zastąp materiał
            mesh.material = metallicMaterial;
          }
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
  }, [scene, envMap, threeScene, onLoaded]);

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
      if (keys.length > 0 && actions) {
        actions[keys[0]]?.play();
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
    if (meshRef.current) {
      (meshRef.current as THREE.Group).scale.y = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
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