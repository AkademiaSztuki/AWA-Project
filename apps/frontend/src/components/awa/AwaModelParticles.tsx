import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, useEnvironment } from '@react-three/drei';
import * as THREE from 'three';
import { FlowStep } from '@/types';

interface AwaModelParticlesProps {
  currentStep: FlowStep;
  onLoaded?: () => void;
  position?: [number, number, number];
  particleDensity?: number; // 0-1, ile vertices użyć (1 = wszystkie)
  particleSize?: number;
  glowIntensity?: number;
}

// Custom shader dla świecących cząsteczek
const particleVertexShader = `
  attribute float size;
  attribute vec3 color;
  attribute float opacity;
  
  varying vec3 vColor;
  varying float vOpacity;
  
  void main() {
    vColor = color;
    vOpacity = opacity;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Zwiększamy rozmiar cząsteczek dla lepszej widoczności
    gl_PointSize = size * (500.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;
  
  void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
    
    // Glow effect - jaśniejszy środek
    float glow = 1.0 - smoothstep(0.0, 0.8, distanceToCenter);
    
    vec3 finalColor = vColor * (1.0 + glow * 0.5);
    gl_FragColor = vec4(finalColor, alpha * vOpacity);
  }
`;

interface MeshVertexData {
  mesh: THREE.SkinnedMesh | THREE.Mesh;
  basePositions: Float32Array;
  vertexIndices: number[];
  colors: Float32Array;
  sizes: Float32Array;
  opacities: Float32Array;
  skinIndices?: Float32Array; // Dla SkinnedMesh
  skinWeights?: Float32Array; // Dla SkinnedMesh
  skeleton?: THREE.Skeleton; // Dla SkinnedMesh
}

export const AwaModelParticles: React.FC<AwaModelParticlesProps> = ({
  currentStep,
  onLoaded,
  position = [-0.6, -0.7, 0],
  particleDensity = 0.25, // Zwiększona gęstość dla lepszej widoczności
  particleSize = 5.0, // Zwiększony rozmiar cząsteczek
  glowIntensity = 1.2,
}) => {
  const pointsRef = useRef<THREE.Points | null>(null);
  const hiddenModelRef = useRef<THREE.Group>(null);
  const [headBone, setHeadBone] = useState<THREE.Bone | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const meshDataRef = useRef<MeshVertexData[]>([]);
  const [particlesGeometry, setParticlesGeometry] = useState<THREE.BufferGeometry | null>(null);
  const { scene: threeScene } = useThree();

  // Pobierz envMap
  const envMap = useEnvironment({ preset: 'studio' });

  // Load Quinn model
  const { scene } = useGLTF('/models/SKM_Quinn.gltf');
  // Load idle animation - potrzebne dla animacji
  const { animations: idleAnimations } = useGLTF('/models/Idle.gltf');

  // Sklonuj scenę, żeby nie wpływać na oryginalny model
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    return scene.clone();
  }, [scene]);

  // Przygotuj dane o mesh-ach i wybierz vertices do cząsteczek
  useEffect(() => {
    if (!clonedScene) return;

    // Znajdź head bone
    let foundHead: THREE.Object3D | null = null;
    const meshData: MeshVertexData[] = [];

    // Paleta kolorów: Gold, Platinum, Silver, Champagne
    const colorPalette = [
      new THREE.Color(0xFFD700), // Gold
      new THREE.Color(0xE5E4E2), // Platinum
      new THREE.Color(0xC0C0C0), // Silver
      new THREE.Color(0xF7E7CE), // Champagne
      new THREE.Color(0xFFE5B4), // Peach (odcień złoty)
    ];

    clonedScene.traverse((child: THREE.Object3D) => {
      // Find head bone
      if (child.type === 'Bone' && child.name.toLowerCase().includes('head')) {
        foundHead = child;
      }

      // Collect mesh data - ukrywamy model, zostawiamy tylko cząsteczki
      if (child.type === 'Mesh' || child.type === 'SkinnedMesh') {
        const mesh = child as THREE.Mesh | THREE.SkinnedMesh;
        
        // Ukryj meshe, ale zachowaj w scenie dla animacji
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              mat.transparent = true;
              mat.opacity = 0;
              mat.visible = false;
            });
          } else {
            mesh.material.transparent = true;
            mesh.material.opacity = 0;
            mesh.material.visible = false;
          }
        }
        mesh.visible = false;
        
        if (mesh.geometry) {
          const geometry = mesh.geometry;
          
          if (geometry.attributes.position) {
            const positions = geometry.attributes.position.array as Float32Array;
            const totalVertices = positions.length / 3;

            // Wybierz losowe vertices do użycia jako cząsteczki
            const vertexIndices: number[] = [];
            const colors: number[] = [];
            const sizes: number[] = [];
            const opacities: number[] = [];

            for (let i = 0; i < totalVertices; i++) {
              if (Math.random() <= particleDensity) {
                vertexIndices.push(i);
                
                // Losowy kolor z palety
                const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
                colors.push(randomColor.r, randomColor.g, randomColor.b);

                // Zmienna wielkość i przezroczystość
                sizes.push(particleSize * (0.8 + Math.random() * 0.4));
                opacities.push(0.7 + Math.random() * 0.3);
              }
            }

            if (vertexIndices.length > 0) {
              // Zapisz base positions (przed animacją)
              const basePositions = new Float32Array(vertexIndices.length * 3);
              vertexIndices.forEach((idx, i) => {
                const i3 = idx * 3;
                basePositions[i * 3] = positions[i3];
                basePositions[i * 3 + 1] = positions[i3 + 1];
                basePositions[i * 3 + 2] = positions[i3 + 2];
              });

              // Zapisz skinning data dla SkinnedMesh
              let skinIndices: Float32Array | undefined;
              let skinWeights: Float32Array | undefined;
              let skeleton: THREE.Skeleton | undefined;

              if (mesh.type === 'SkinnedMesh') {
                const skinnedMesh = mesh as THREE.SkinnedMesh;
                if (skinnedMesh.skeleton) {
                  skeleton = skinnedMesh.skeleton;
                  
                  // Zapisz skin indices i weights dla wybranych vertices
                  // Sprawdź różne możliwe nazwy atrybutów (Three.js może używać różnych nazw)
                  const skinIndexAttr = geometry.attributes.skinIndex || geometry.attributes.JOINTS_0;
                  const skinWeightAttr = geometry.attributes.skinWeight || geometry.attributes.WEIGHTS_0;
                  
                  if (skinIndexAttr && skinWeightAttr) {
                    const originalSkinIndices = skinIndexAttr.array;
                    const originalSkinWeights = skinWeightAttr.array;
                    
                    skinIndices = new Float32Array(vertexIndices.length * 4);
                    skinWeights = new Float32Array(vertexIndices.length * 4);
                    
                    vertexIndices.forEach((idx, i) => {
                      const idx4 = idx * 4;
                      const i4 = i * 4;
                      // Konwertuj na liczby - skinIndex może być Uint16Array
                      skinIndices![i4] = Number(originalSkinIndices[idx4]) || 0;
                      skinIndices![i4 + 1] = Number(originalSkinIndices[idx4 + 1]) || 0;
                      skinIndices![i4 + 2] = Number(originalSkinIndices[idx4 + 2]) || 0;
                      skinIndices![i4 + 3] = Number(originalSkinIndices[idx4 + 3]) || 0;
                      
                      skinWeights![i4] = Number(originalSkinWeights[idx4]) || 0;
                      skinWeights![i4 + 1] = Number(originalSkinWeights[idx4 + 1]) || 0;
                      skinWeights![i4 + 2] = Number(originalSkinWeights[idx4 + 2]) || 0;
                      skinWeights![i4 + 3] = Number(originalSkinWeights[idx4 + 3]) || 0;
                    });
                  }
                }
              }

              meshData.push({
                mesh: mesh as THREE.Mesh | THREE.SkinnedMesh,
                basePositions,
                vertexIndices,
                colors: new Float32Array(colors),
                sizes: new Float32Array(sizes),
                opacities: new Float32Array(opacities),
                skinIndices,
                skinWeights,
                skeleton,
              });
            }
          }
        }
      }
    });

    meshDataRef.current = meshData;

    // Utwórz geometry dla Points z początkowymi pozycjami
    if (meshData.length > 0) {
      const allPositions: number[] = [];
      const allColors: number[] = [];
      const allSizes: number[] = [];
      const allOpacities: number[] = [];

      meshData.forEach((data) => {
        // Użyj base positions na początku
        for (let i = 0; i < data.basePositions.length; i += 3) {
          allPositions.push(
            data.basePositions[i],
            data.basePositions[i + 1],
            data.basePositions[i + 2]
          );
        }

        // Dodaj kolory, rozmiary i przezroczystości
        for (let i = 0; i < data.colors.length; i++) {
          allColors.push(data.colors[i]);
        }
        for (let i = 0; i < data.sizes.length; i++) {
          allSizes.push(data.sizes[i]);
        }
        for (let i = 0; i < data.opacities.length; i++) {
          allOpacities.push(data.opacities[i]);
        }
      });

      if (allPositions.length > 0) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allPositions), 3));
        geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(allColors), 3));
        geom.setAttribute('size', new THREE.BufferAttribute(new Float32Array(allSizes), 1));
        geom.setAttribute('opacity', new THREE.BufferAttribute(new Float32Array(allOpacities), 1));
        
        console.log('✅ Created particles geometry with', allPositions.length / 3, 'particles');
        console.log('📍 First few positions:', allPositions.slice(0, 9));
        console.log('📊 Mesh data count:', meshData.length);
        console.log('🎨 Colors count:', allColors.length / 3);
        console.log('📏 Sizes count:', allSizes.length);
        
        // Sprawdź czy geometry jest poprawna
        geom.computeBoundingSphere();
        console.log('🌐 Bounding sphere center:', geom.boundingSphere?.center);
        console.log('📐 Bounding sphere radius:', geom.boundingSphere?.radius);
        
        setParticlesGeometry(geom);
      }
    }

    if (foundHead && (foundHead as THREE.Bone).rotation) {
      (foundHead as THREE.Bone).rotation.order = 'YXZ';
      (foundHead as THREE.Bone).rotation.y += Math.PI / 2;
    }
    setHeadBone(foundHead ? (foundHead as unknown as THREE.Bone) : null);

    // Ustaw envMap
    if (threeScene && envMap) {
      threeScene.environment = envMap;
    }

    if (onLoaded) onLoaded();
  }, [clonedScene, envMap, threeScene, onLoaded, particleDensity, particleSize]);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      setMousePosition({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animacje - użyj sklonowanej sceny
  const { actions, mixer } = useAnimations(idleAnimations, clonedScene || scene);

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

  // Geometry jest teraz tworzona w useEffect powyżej

  // Material z custom shaderem
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        uniforms: {
          glowIntensity: { value: glowIntensity },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending, // Efekt świecenia
        vertexColors: true,
      }),
    [glowIntensity]
  );

  // Animation loop - najpierw użyjmy statycznych pozycji, potem dodamy synchronizację
  useFrame((state, delta) => {
    // Aktualizuj mixer dla animacji idle
    if (mixer) {
      mixer.update(delta);
    }

    // Aktualizuj skeleton dla wszystkich SkinnedMesh
    meshDataRef.current.forEach((meshData) => {
      if (meshData.skeleton) {
        meshData.skeleton.update();
      }
    });

    if (!pointsRef.current || !particlesGeometry || meshDataRef.current.length === 0) {
      return;
    }

    const time = state.clock.elapsedTime;
    const points = pointsRef.current;
    const geometry = points.geometry;
    const positions = geometry.attributes.position;
    const opacities = geometry.attributes.opacity;

    let particleOffset = 0;

    // Użyjmy animowanych pozycji z szkieletu
    meshDataRef.current.forEach((meshData) => {
      const mesh = meshData.mesh;
      
      // Upewnij się, że mesh ma zaktualizowaną macierz świata
      mesh.updateMatrixWorld(true);
      
      // Dla każdego vertex oblicz animowaną pozycję
      meshData.vertexIndices.forEach((vertexIdx, i) => {
        const particleIdx = particleOffset + i;
        const particleI3 = particleIdx * 3;
        
        // Pobierz bazową pozycję vertex
        const baseI3 = i * 3;
        let localPos = new THREE.Vector3(
          meshData.basePositions[baseI3],
          meshData.basePositions[baseI3 + 1],
          meshData.basePositions[baseI3 + 2]
        );

        // Użyj boneMatrices z skeleton dla animowanych pozycji
        if (mesh.type === 'SkinnedMesh' && meshData.skeleton && meshData.skinIndices && meshData.skinWeights) {
          const skeleton = meshData.skeleton;
          const boneMatrices = skeleton.boneMatrices;
          
          const i4 = i * 4;
          const boneIndex1 = Math.floor(meshData.skinIndices[i4]);
          const boneIndex2 = Math.floor(meshData.skinIndices[i4 + 1]);
          const boneIndex3 = Math.floor(meshData.skinIndices[i4 + 2]);
          const boneIndex4 = Math.floor(meshData.skinIndices[i4 + 3]);
          
          const weight1 = meshData.skinWeights[i4];
          const weight2 = meshData.skinWeights[i4 + 1];
          const weight3 = meshData.skinWeights[i4 + 2];
          const weight4 = meshData.skinWeights[i4 + 3];
          
          // Oblicz animowaną pozycję używając boneMatrices
          const position = new THREE.Vector4(localPos.x, localPos.y, localPos.z, 1);
          const skinned = new THREE.Vector4(0, 0, 0, 0);
          
          if (weight1 > 0 && boneIndex1 >= 0 && boneIndex1 < skeleton.bones.length) {
            const boneMatrix = new THREE.Matrix4();
            boneMatrix.fromArray(boneMatrices, boneIndex1 * 16);
            skinned.addScaledVector(position.clone().applyMatrix4(boneMatrix), weight1);
          }
          if (weight2 > 0 && boneIndex2 >= 0 && boneIndex2 < skeleton.bones.length) {
            const boneMatrix = new THREE.Matrix4();
            boneMatrix.fromArray(boneMatrices, boneIndex2 * 16);
            skinned.addScaledVector(position.clone().applyMatrix4(boneMatrix), weight2);
          }
          if (weight3 > 0 && boneIndex3 >= 0 && boneIndex3 < skeleton.bones.length) {
            const boneMatrix = new THREE.Matrix4();
            boneMatrix.fromArray(boneMatrices, boneIndex3 * 16);
            skinned.addScaledVector(position.clone().applyMatrix4(boneMatrix), weight3);
          }
          if (weight4 > 0 && boneIndex4 >= 0 && boneIndex4 < skeleton.bones.length) {
            const boneMatrix = new THREE.Matrix4();
            boneMatrix.fromArray(boneMatrices, boneIndex4 * 16);
            skinned.addScaledVector(position.clone().applyMatrix4(boneMatrix), weight4);
          }
          
          const totalWeight = weight1 + weight2 + weight3 + weight4;
          if (totalWeight > 0) {
            localPos.set(skinned.x / totalWeight, skinned.y / totalWeight, skinned.z / totalWeight);
          }
        }
        
        // Transformuj do przestrzeni lokalnej grupy
        localPos.applyMatrix4(mesh.matrix);

        // Dodaj subtelne drganie dla organicznego efektu
        const offsetX = Math.sin(time * 0.5 + particleIdx * 0.01) * 0.01;
        const offsetY = Math.cos(time * 0.3 + particleIdx * 0.01) * 0.01;
        const offsetZ = Math.sin(time * 0.4 + particleIdx * 0.01) * 0.01;

        positions.array[particleI3] = localPos.x + offsetX;
        positions.array[particleI3 + 1] = localPos.y + offsetY;
        positions.array[particleI3 + 2] = localPos.z + offsetZ;

        // Pulsująca przezroczystość
        const baseOpacity = meshData.opacities[i];
        opacities.array[particleIdx] = baseOpacity * (0.8 + Math.sin(time * 2 + particleIdx * 0.1) * 0.2);
      });

      particleOffset += meshData.vertexIndices.length;
    });

    positions.needsUpdate = true;
    opacities.needsUpdate = true;

    // Head tracking
    if (headBone) {
      const lookTarget = new THREE.Vector3(
        mousePosition.x * 2,
        mousePosition.y * 2,
        5
      );
      headBone.lookAt(lookTarget);
      headBone.rotateX(-Math.PI / -0.1);
      headBone.rotateZ(1.5);
    }

    // Animacja oddychania (skalowanie grupy)
    if (hiddenModelRef.current) {
      (hiddenModelRef.current as THREE.Group).scale.y = 1 + Math.sin(time * 0.5) * 0.02;
    }
  });


  // Cząsteczki z modelu - utworzone w useMemo
  const modelPoints = useMemo(() => {
    if (!particlesGeometry) return null;
    const pointsMaterial = new THREE.PointsMaterial({
      size: particleSize,
      color: 0xFFD700,
      transparent: true,
      opacity: 1,
      sizeAttenuation: false, // Wyłączone - cząsteczki będą zawsze tego samego rozmiaru
    });
    return new THREE.Points(particlesGeometry, pointsMaterial);
  }, [particlesGeometry, particleSize]);

  // Aktualizuj ref
  useEffect(() => {
    if (modelPoints) {
      pointsRef.current = modelPoints;
    }
  }, [modelPoints]);

  if (!clonedScene) return null;

  return (
    <group position={position} ref={hiddenModelRef}>
      {/* Model z animacjami - ukryty, tylko dla animacji szkieletu - renderOrder: -1 żeby był za AwaModel */}
      <primitive object={clonedScene} renderOrder={-1} />

      {/* Cząsteczki z modelu */}
      {modelPoints && <primitive object={modelPoints} />}
    </group>
  );
};

// Preload model
useGLTF.preload('/models/SKM_Quinn.gltf');

