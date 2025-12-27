import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { FlowStep } from '@/types';
import { useAnimation, AnimationType } from '@/contexts/AnimationContext';

// Shadery dla okrągłych cząsteczek z żółtymi kolorami + miękką maską i interakcją z myszą
const particleVertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aOpacity;
  attribute float aAnimOffset; // Offset dla animacji - różny dla każdej cząsteczki
  uniform float uTime; // Czas dla animacji
  uniform vec3 uMouseWorld;
  uniform float uMouseRadius;
  uniform float uMouseStrength;
  uniform float uSize;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vColor = aColor;
    vOpacity = aOpacity;
    
    // Żywa animacja pozycji - naturalny ruch jak w partiklach
    vec3 animPos = position;
    float animSpeed = 0.3 + aAnimOffset * 0.7; // Różna prędkość dla każdej cząsteczki (0.3-1.0)
    float animPhase = aAnimOffset * 6.28318; // Różna faza startowa (0-2π)
    
    float movementIntensity = aAnimOffset * 0.8; // Intensywność ruchu (0-0.8)
    float time1 = uTime * animSpeed + animPhase;
    float time2 = uTime * animSpeed * 0.7 + animPhase * 1.3;
    float time3 = uTime * animSpeed * 0.5 + animPhase * 2.1;
    
    // Delikatne kołysanie
    animPos += vec3(
      sin(time1) * movementIntensity * 0.015,
      cos(time2) * movementIntensity * 0.012,
      sin(time3) * movementIntensity * 0.008
    );
    
    // Drżenie
    float jitterAmount = movementIntensity * 0.003;
    animPos += vec3(
      sin(uTime * 5.0 + animPhase) * jitterAmount,
      cos(uTime * 4.3 + animPhase * 1.5) * jitterAmount,
      sin(uTime * 6.1 + animPhase * 2.3) * jitterAmount * 0.7
    );

    // Interakcja z myszą - rozpychanie punktów
    vec3 toMouse = animPos - uMouseWorld;
    float dist = length(toMouse);
    float influence = 1.0 - smoothstep(uMouseRadius * 0.4, uMouseRadius, dist);
    if (dist > 0.0001) {
      animPos += normalize(toMouse) * influence * uMouseStrength;
    }

    vec4 mvPosition = modelViewMatrix * vec4(animPos, 1.0);
    float att = clamp(150.0 / -mvPosition.z, 0.5, 8.0);
    float sizeBoost = mix(1.0, 1.25, influence);
    gl_PointSize = aSize * uSize * sizeBoost * att;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vec2 pc = gl_PointCoord - vec2(0.5);
    float d = length(pc);
    // Bardziej rozmyta, miękka maska (quasi-gaussian), przyjaźniejsza dla bloom
    float core = exp(-16.0 * d * d);      // mocny środek
    float fringe = exp(-6.0 * d * d);     // szeroka poświata
    float alpha = (core * 0.7 + fringe * 0.6) * vOpacity;
    if (alpha < 0.01) discard;

    // Użyj koloru z palety - miękkie, ciepłe odcienie
    vec3 baseColor = vColor;
    // Delikatne podbicie jasności na szerokiej poświacie (bardziej subtelne)
    baseColor *= mix(0.9, 1.1, fringe);
    gl_FragColor = vec4(baseColor, alpha);
  }
`;

interface MeshVertexData {
  mesh: THREE.SkinnedMesh | THREE.Mesh;
  basePositions: Float32Array;
  baseUVs?: Float32Array;
  vertexIndices: number[];
  skinIndices?: Float32Array;
  skinWeights?: Float32Array;
  skeleton?: THREE.Skeleton;
}

// Pobierz teksturę z pierwszego mesha
const getBaseColorMap = (scene: THREE.Group): THREE.Texture | null => {
  let tex: THREE.Texture | null = null;
  scene.traverse((child) => {
    if (tex) return;
    if (child.type === 'Mesh' || child.type === 'SkinnedMesh') {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
      const pick = Array.isArray(mat) ? mat[0] : mat;
      if (pick && pick.map) {
        tex = pick.map;
      }
    }
  });
  return tex;
};
interface AwaModelProps {
  currentStep: FlowStep;
  onLoaded?: () => void;
  position?: [number, number, number];
}

export const AwaModel: React.FC<AwaModelProps> = ({ currentStep, onLoaded, position = [-1.4, -0.9, 0] }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [headBone, setHeadBone] = useState<THREE.Bone | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particlesDisabled, setParticlesDisabled] = useState(false);
  const mouseWorldRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const mouseLocalRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const pointerNdcRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const mousePlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const tempVecRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const pointsRef = useRef<THREE.Points | null>(null);
  const meshDataRef = useRef<MeshVertexData[]>([]);
  const [particlesGeometry, setParticlesGeometry] = useState<THREE.BufferGeometry | null>(null);
  const baseColorMapRef = useRef<THREE.Texture | null>(null);
  // Cache skinned meshes for performance (avoid traverse every frame)
  const skinnedMeshesRef = useRef<THREE.SkinnedMesh[]>([]);
  // Włączenie cząsteczek – diagnostycznie (duże, widoczne)
  const particleDensity = 0.20;
  const particleSize = 0.45; // Zmień tę wartość żeby zwiększyć/zmniejszyć rozmiar pojedynczych cząsteczek
  const particleScale = 1.001; // SKALA MODELU CZĄSTECZEK - zmień (np. 1.1 = 10% większy, 0.9 = 10% mniejszy) żeby powiększyć/pomniejszyć cały model cząsteczek
  const particleOpacityMin = 0.7; // Minimalna przezroczystość cząsteczek (0-1)
  const particleOpacityMax = 1.0; // Maksymalna przezroczystość cząsteczek (0-1)
  // Offset dla pozycji punktów - dostosowany do pozycji modelu
  // Na mobile (pozycja [0, -0.9, 0]) - cząsteczki wyżej (dodatni offset Y), na desktop (pozycja [-1.4, -0.9, 0]) - z offsetem
  const particleOffset: [number, number, number] = useMemo(() => {
    // Jeśli pozycja jest wyśrodkowana (x === 0) - mobile, przesuwamy cząsteczki wyżej
    if (position[0] === 0) {
      return [0, 0.9, 0]; // Cząsteczki wyżej na mobile
    }
    // Dla desktop (pozycja po lewej), używamy offsetu do wyrównania
    return [1.4, 0.90, 0];
  }, [position]);
  // Dodatkowe parametry interakcji i rozmiaru
  const particleSizeMultiplier = 2.35;
  const particleMouseRadius = 0.35;
  const particleMouseStrength = 0.05;

  const { scene: threeScene, camera } = useThree();
  const { currentAnimation, onAnimationEnd } = useAnimation();

  // Load idle1 model ONCE - use both scene and animations from same load (optimization)
  const { scene, animations: idle1Animations } = useGLTF('/model/idle1.gltf');
  
  // Load other animations (only animations, not full models - drei handles this efficiently)
  const { animations: loadingAnimations } = useGLTF('/model/loading_anim.gltf');
  const { animations: wyjsciewlewoAnimations } = useGLTF('/model/wyjsciewlewo.gltf');
  const { animations: talk1Animations } = useGLTF('/model/talk1.gltf');
  const { animations: talk2Animations } = useGLTF('/model/talk2.gltf');
  const { animations: talk3Animations } = useGLTF('/model/talk3.gltf');
  
  // Combine all animations
  const allAnimations = useMemo(() => {
    return [
      ...idle1Animations,
      ...loadingAnimations,
      ...wyjsciewlewoAnimations,
      ...talk1Animations,
      ...talk2Animations,
      ...talk3Animations,
    ];
  }, [idle1Animations, loadingAnimations, wyjsciewlewoAnimations, talk1Animations, talk2Animations, talk3Animations]);

  // Load texture tylko dla alphaMap (kontrola przezroczystości)
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);
  const [texturesLoaded, setTexturesLoaded] = useState(false);
  
  // Tylko emissive texture dla alphaMap (kontrola przezroczystości)
  const alphaTexture = useMemo(() => {
    const tex = textureLoader.load('/model/FLORA-Gold_Texture_Design-5b19ac78_Mat_Emissive.png');
    tex.flipY = false;
    return tex;
  }, [textureLoader]);

  useEffect(() => {
    if (scene) {

      // Find head bone for mouse tracking and apply materials with textures
      let foundHead: THREE.Object3D | null = null;
      scene.traverse((child: THREE.Object3D) => {
        // Find head bone
        if (
          child.type === 'Bone' &&
          child.name.toLowerCase().includes('head')
        ) {
          foundHead = child;
        }
        
        // Apply materials with textures to meshes (both Mesh and SkinnedMesh)
        if (child.type === 'Mesh' || child.type === 'SkinnedMesh') {
          const mesh = child as THREE.Mesh | THREE.SkinnedMesh;
          const modelOpacity = 1; // PRZEZROCZYSTOŚĆ MODELU 3D - zmień (0-1) aby regulować przezroczystość samego modelu z teksturami
          
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            
            const newMaterials = materials.map((material) => {
              // Create simplified material - miękkie, ciepłe złote światełka
              const metallicMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0xFFD700), // Ciepły złoty kolor
                emissive: new THREE.Color(0xFFD700), // Ciepły złoty kolor emisji
                emissiveIntensity: 2.5, // Zmniejszona intensywność - miękkie światełka
                transparent: true,
                opacity: modelOpacity,
                depthWrite: modelOpacity < 0.1,
              });
              
              // Użyj tekstury tylko dla alphaMap (kontrola przezroczystości)
              if (alphaTexture) {
                metallicMaterial.alphaMap = alphaTexture;
              }
              
              // Zachowaj tylko podstawowe tekstury jeśli istnieją (jako fallback)
              if (material instanceof THREE.MeshStandardMaterial) {
                if (!metallicMaterial.map && material.map) metallicMaterial.map = material.map;
              }
              
              return metallicMaterial;
            });
            
            // Zastąp materiał(y)
            mesh.material = newMaterials.length === 1 ? newMaterials[0] : newMaterials;
            mesh.visible = true;
            // Ustaw renderOrder dla poprawnego renderowania przezroczystości
            if (modelOpacity < 1.0) {
              mesh.renderOrder = 1; // Renderuj przezroczyste obiekty po nieprzezroczystych
            }
          }
        }
      });
      
      setTexturesLoaded(true);
      
      // Cache skinned meshes for performance optimization (avoid traverse every frame)
      skinnedMeshesRef.current = [];
      scene.traverse((child) => {
        if (child.type === 'SkinnedMesh') {
          skinnedMeshesRef.current.push(child as THREE.SkinnedMesh);
        }
      });
      
      if (foundHead && (foundHead as THREE.Bone).rotation) {
        (foundHead as THREE.Bone).rotation.order = 'YXZ';
        (foundHead as THREE.Bone).rotation.y += Math.PI / 2;
      }
      setHeadBone(foundHead ? (foundHead as unknown as THREE.Bone) : null);
      // Inform parent that model is loaded
      if (onLoaded) onLoaded();

      // Przygotuj dane do cząsteczek jako overlay
      // Paleta kolorów - żółte odcienie (bez ciemnych pomarańczowych)
      const colorPalette = [
        new THREE.Color(0xFFD700), // Ciepły złoty - główny kolor
        new THREE.Color(0xFFE87C), // Jasny złoty - delikatny
        new THREE.Color(0xFFE5B4), // Ciepły beżowo-złoty - miękkie światełko
        new THREE.Color(0xF5DEB3), // Ciepły beż - subtelny
        new THREE.Color(0xFFFFAA), // Jasny żółty - najjaśniejszy
      ];
      const meshData: MeshVertexData[] = [];
      scene.traverse((child: THREE.Object3D) => {
        if (child.type === 'Mesh' || child.type === 'SkinnedMesh') {
          const mesh = child as THREE.Mesh | THREE.SkinnedMesh;
          if (!mesh.geometry || !mesh.geometry.attributes.position) return;
          const geometry = mesh.geometry;
          const positions = geometry.attributes.position.array as Float32Array;
          const uvsAttr = geometry.attributes.uv as THREE.BufferAttribute | undefined;
          const totalVertices = positions.length / 3;
          const meshNameLower = (mesh.name || '').toLowerCase();
          // Bounds po Y dla biasu górnych partii
          let minY = Infinity;
          let maxY = -Infinity;
          for (let i = 0; i < totalVertices; i++) {
            const y = positions[i * 3 + 1];
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
          const spanY = Math.max(maxY - minY, 1e-3);
          // Selekcja bardziej równomierna: deterministyczny hash + bias, sortowanie po score
          const targetCount = Math.max(1, Math.floor(totalVertices * particleDensity));
          const scored: Array<{ idx: number; score: number }> = [];
          const hash = (n: number) => {
            // prosty deterministyczny hash float 0-1
            return Math.abs(Math.sin(n * 12.9898 + 78.233) * 43758.5453) % 1;
          };
          for (let i = 0; i < totalVertices; i++) {
            const i3 = i * 3;
            const y = positions[i3 + 1];
            const yNorm = (y - minY) / spanY;
            let bias = 1.0;
            if (yNorm > 0.6) bias += 0.6;
            if (yNorm > 0.8) bias += 0.6;
            if (meshNameLower.includes('head') || meshNameLower.includes('neck') || meshNameLower.includes('face')) {
              bias += 1.0;
            }
            if (meshNameLower.includes('spine') || meshNameLower.includes('chest') || meshNameLower.includes('upper')) {
              bias += 0.3;
            }
            const h = hash(i);
            // Niższe score = większa szansa (dzielone przez bias)
            const score = h / bias;
            scored.push({ idx: i, score });
          }
          scored.sort((a, b) => a.score - b.score);
          const vertexIndices = scored.slice(0, Math.min(targetCount, scored.length)).map((s) => s.idx);
          if (vertexIndices.length === 0) return;

          const basePositions = new Float32Array(vertexIndices.length * 3);
          const baseUVs = new Float32Array(vertexIndices.length * 2);
          vertexIndices.forEach((idx, i) => {
            const i3 = idx * 3;
            basePositions[i * 3] = positions[i3];
            basePositions[i * 3 + 1] = positions[i3 + 1];
            basePositions[i * 3 + 2] = positions[i3 + 2];
            if (uvsAttr) {
              const i2 = idx * 2;
              baseUVs[i * 2] = uvsAttr.array[i2] ?? 0.5;
              baseUVs[i * 2 + 1] = uvsAttr.array[i2 + 1] ?? 0.5;
            } else {
              baseUVs[i * 2] = 0.5;
              baseUVs[i * 2 + 1] = 0.5;
            }
          });

          let skinIndices: Float32Array | undefined;
          let skinWeights: Float32Array | undefined;
          let skeleton: THREE.Skeleton | undefined;

          if (mesh.type === 'SkinnedMesh') {
            const skinned = mesh as THREE.SkinnedMesh;
            skeleton = skinned.skeleton;
            const skinIndexAttr = geometry.attributes.skinIndex || geometry.attributes.JOINTS_0;
            const skinWeightAttr = geometry.attributes.skinWeight || geometry.attributes.WEIGHTS_0;
            if (skinIndexAttr && skinWeightAttr) {
              const originalSkinIndices = skinIndexAttr.array;
              const originalSkinWeights = skinWeightAttr.array;
              skinIndices = new Float32Array(vertexIndices.length * 4);
              skinWeights = new Float32Array(vertexIndices.length * 4);
              vertexIndices.forEach((idx, vi) => {
                const idx4 = idx * 4;
                const i4 = vi * 4;
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

          meshData.push({
            mesh: mesh as THREE.Mesh | THREE.SkinnedMesh,
            basePositions,
            baseUVs,
            vertexIndices,
            skinIndices,
            skinWeights,
            skeleton,
          });
        }
      });

      meshDataRef.current = meshData;
      baseColorMapRef.current = getBaseColorMap(scene);
      
      if (meshData.length > 0) {
        const allPositions: number[] = [];
        const allColors: number[] = [];
        const allSizes: number[] = [];
        const allOpacities: number[] = [];
        const allUVs: number[] = [];
        const allAnimOffsets: number[] = []; // Offset animacji dla żywego ruchu

        meshData.forEach((d) => {
          allPositions.push(...Array.from(d.basePositions));
          if (d.baseUVs) {
            allUVs.push(...Array.from(d.baseUVs));
          } else {
            // Dodaj domyślne UV jeśli nie ma
            d.vertexIndices.forEach(() => {
              allUVs.push(0.5, 0.5);
            });
          }
          d.vertexIndices.forEach(() => {
            const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            allColors.push(c.r, c.g, c.b);
            allSizes.push(particleSize * (0.85 + Math.random() * 0.3));
            const opacityRange = particleOpacityMax - particleOpacityMin;
            allOpacities.push(particleOpacityMin + Math.random() * opacityRange); // PRZEZROCZYSTOŚĆ CZĄSTECZEK - zmień particleOpacityMin/Max powyżej
            // Losowy offset animacji - około 40% cząsteczek będzie się ruszać (animOffset > 0.5)
            allAnimOffsets.push(Math.random()); // 0.0-1.0, niektóre będą > 0.5 (ruszające się)
          });
        });
        
        if (allPositions.length > 0) {
          const geom = new THREE.BufferGeometry();
          geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allPositions), 3));
          geom.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(allColors), 3));
          geom.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(allSizes), 1));
          geom.setAttribute('aOpacity', new THREE.BufferAttribute(new Float32Array(allOpacities), 1));
          geom.setAttribute('aAnimOffset', new THREE.BufferAttribute(new Float32Array(allAnimOffsets), 1));
          // Zawsze dodaj UV - powinno być tyle samo co pozycji
          if (allUVs.length === allPositions.length / 3 * 2) {
            geom.setAttribute('aUv', new THREE.BufferAttribute(new Float32Array(allUVs), 2));
          } else {
            // Jeśli nie ma UV, dodaj domyślne
            const defaultUVs = new Float32Array(allPositions.length / 3 * 2);
            defaultUVs.fill(0.5);
            geom.setAttribute('aUv', new THREE.BufferAttribute(defaultUVs, 2));
          }
          geom.computeBoundingSphere();
          console.log('Particles diagnostic: model points count', allPositions.length / 3);
          setParticlesGeometry(geom);
          
          // Utwórz shader material z okrągłymi cząsteczkami
          const shaderMaterial = new THREE.ShaderMaterial({
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            uniforms: {
              uTime: { value: 0 }, // Czas dla animacji żywego ruchu
              uMouseWorld: { value: mouseLocalRef.current },
              uMouseRadius: { value: particleMouseRadius },
              uMouseStrength: { value: particleMouseStrength },
              uSize: { value: particleSizeMultiplier },
            },
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending,
            vertexColors: true, // Używamy kolorów z vertexów (paleta żółtych)
          });
          
          const pointsObj = new THREE.Points(geom, shaderMaterial);
          pointsObj.renderOrder = 100;
          pointsObj.frustumCulled = false;
          pointsObj.scale.set(particleScale, particleScale, particleScale); // Ustaw skalę modelu cząsteczek
          pointsRef.current = pointsObj;
        }
      }
    }
    
    // Cleanup: usuń punkty przy odmontowaniu
    return () => {
      if (pointsRef.current) {
        if (pointsRef.current.parent) {
          pointsRef.current.parent.remove(pointsRef.current);
        }
        pointsRef.current.geometry?.dispose();
        if (pointsRef.current.material instanceof THREE.Material) {
          pointsRef.current.material.dispose();
        }
        pointsRef.current = null;
      }
    };
  }, [scene, threeScene, onLoaded, particleDensity, particleSize, particleScale]);

  useEffect(() => {
    // Mouse tracking setup
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      setMousePosition({ x, y });
      if (!camera) return;
      const pointer = pointerNdcRef.current;
      pointer.set(x, y);
      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(pointer, camera);

      const plane = mousePlaneRef.current;
      const temp = tempVecRef.current;
      const targetZ = meshRef.current
        ? meshRef.current.getWorldPosition(temp).z
        : 0;
      plane.set(new THREE.Vector3(0, 0, 1), -targetZ);
      raycaster.ray.intersectPlane(plane, mouseWorldRef.current);
      if (meshRef.current && mouseWorldRef.current) {
        mouseLocalRef.current.copy(mouseWorldRef.current);
        meshRef.current.worldToLocal(mouseLocalRef.current);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [camera]);

  const { actions, mixer } = useAnimations(allAnimations, scene);
  
  // Track current animation action
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const previousAnimationRef = useRef<AnimationType>('idle1');

  // Find animation clip by name pattern
  const findAnimationClip = useCallback((animationName: AnimationType): THREE.AnimationClip | null => {
    // Try exact match first
    let clip = allAnimations.find(clip => 
      clip.name.toLowerCase() === animationName.toLowerCase() ||
      clip.name.toLowerCase().includes(animationName.toLowerCase())
    );
    
    // If not found, try pattern matching
    if (!clip) {
      if (animationName === 'idle1') {
        clip = allAnimations.find(c => c.name.toLowerCase().includes('idle'));
      } else if (animationName === 'loading_anim') {
        clip = allAnimations.find(c => c.name.toLowerCase().includes('loading'));
      } else if (animationName === 'wyjsciewlewo') {
        clip = allAnimations.find(c => c.name.toLowerCase().includes('wyjsciewlewo') || c.name.toLowerCase().includes('exit') || c.name.toLowerCase().includes('left'));
      } else if (animationName.startsWith('talk')) {
        clip = allAnimations.find(c => c.name.toLowerCase().includes(animationName));
      }
    }
    
    // Fallback: use first animation if nothing found
    if (!clip && allAnimations.length > 0) {
      clip = allAnimations[0];
    }
    
    return clip || null;
  }, [allAnimations]);

  // Track if we need to return to idle after animation ends
  const shouldReturnToIdleRef = useRef(false);
  const animationEndCallbackRef = useRef<(() => void) | null>(null);

  // Handle animation switching with smooth crossfade
  useEffect(() => {
    if (!mixer || !scene || allAnimations.length === 0) return;
    
    // Only switch if animation actually changed
    if (currentAnimation === previousAnimationRef.current && currentActionRef.current?.isRunning()) {
      return;
    }
    
    console.log('[AwaModel] Switching animation:', currentAnimation);
    
    // Find and play the requested animation
    const clip = findAnimationClip(currentAnimation);
    if (clip) {
      const newAction = mixer.clipAction(clip, scene);
      newAction.reset();
      
      // Set up loop behavior
      if (currentAnimation === 'idle1') {
        newAction.setLoop(THREE.LoopRepeat, Infinity);
        shouldReturnToIdleRef.current = false;
      } else {
        // loading_anim and talk animations play once then return to idle
        // On mobile, loading_anim will transition to wyjsciewlewo instead
        newAction.setLoop(THREE.LoopOnce, 1);
        newAction.clampWhenFinished = true;
        shouldReturnToIdleRef.current = true;
        // Don't set callback for loading_anim on mobile - it will transition to wyjsciewlewo
        const isMobile = position[0] === 0;
        if (!(isMobile && currentAnimation === 'loading_anim')) {
          animationEndCallbackRef.current = onAnimationEnd;
        }
      }
      
      // Smooth crossfade between animations (0.3 seconds)
      const fadeDuration = 0.3;
      if (currentActionRef.current && currentActionRef.current.isRunning()) {
        // Fade out old animation and fade in new one
        currentActionRef.current.fadeOut(fadeDuration);
        newAction.fadeIn(fadeDuration);
      } else {
        // If no current action, just play the new one
        newAction.weight = 1;
      }
      
      newAction.play();
      currentActionRef.current = newAction;
    } else {
      console.warn('[AwaModel] Animation clip not found for:', currentAnimation);
    }
    
    previousAnimationRef.current = currentAnimation;
  }, [currentAnimation, mixer, scene, allAnimations, findAnimationClip, onAnimationEnd]);

  // Animation loop
  useFrame((state) => {
    // 1. NAJPIERW aktualizuj mixer dla animacji - to aktualizuje skeleton
    if (mixer) {
      const delta = state.clock.getDelta();
      mixer.update(delta > 0.1 ? 0.016 : delta);
      
      // Check if non-looping animation has finished
      if (shouldReturnToIdleRef.current && currentActionRef.current) {
        const action = currentActionRef.current;
        const clip = action.getClip();
        if (action.time >= clip.duration) {
          console.log('[AwaModel] Animation finished in useFrame:', currentAnimation);
          shouldReturnToIdleRef.current = false;
          
          // Check if we're on mobile (position[0] === 0 means centered/mobile)
          const isMobile = position[0] === 0;
          
          // Special handling for mobile: loading_anim -> wyjsciewlewo sequence
          if (isMobile && currentAnimation === 'loading_anim') {
            // After loading_anim, play wyjsciewlewo
            const wyjsciewlewoClip = findAnimationClip('wyjsciewlewo');
            if (wyjsciewlewoClip && mixer && scene) {
              const wyjsciewlewoAction = mixer.clipAction(wyjsciewlewoClip, scene);
              wyjsciewlewoAction.reset().setLoop(THREE.LoopOnce, 1);
              wyjsciewlewoAction.clampWhenFinished = true;
              
              // Fade from loading_anim to wyjsciewlewo
              if (currentActionRef.current && currentActionRef.current.isRunning()) {
                currentActionRef.current.fadeOut(0.3);
                wyjsciewlewoAction.fadeIn(0.3);
              }
              wyjsciewlewoAction.weight = 1;
              wyjsciewlewoAction.play();
              currentActionRef.current = wyjsciewlewoAction;
              previousAnimationRef.current = 'wyjsciewlewo';
              shouldReturnToIdleRef.current = true;
              // Set callback to hide model after wyjsciewlewo
              animationEndCallbackRef.current = () => {
                window.dispatchEvent(new CustomEvent('awa-wyjsciewlewo-complete'));
              };
              return; // Don't call onAnimationEnd or switch to idle yet
            }
          }
          
          // After wyjsciewlewo on mobile, hide model and disable particles (don't return to idle)
          if (isMobile && currentAnimation === 'wyjsciewlewo') {
            // Disable particles on mobile after wyjsciewlewo
            setParticlesDisabled(true);
            // Call callback which will dispatch event to hide model
            if (animationEndCallbackRef.current) {
              animationEndCallbackRef.current();
              animationEndCallbackRef.current = null;
            }
            // Don't return to idle - model will be hidden
            return;
          }
          
          // Call callback for other animations
          if (animationEndCallbackRef.current) {
            animationEndCallbackRef.current();
            animationEndCallbackRef.current = null;
          }
          
          // Switch back to idle1 with smooth crossfade (only for non-mobile or non-wyjsciewlewo)
          const idleClip = findAnimationClip('idle1');
          if (idleClip && mixer && scene) {
            const idleAction = mixer.clipAction(idleClip, scene);
            idleAction.reset().setLoop(THREE.LoopRepeat, Infinity);
            
            // Fade from current action to idle
            if (currentActionRef.current && currentActionRef.current.isRunning()) {
              currentActionRef.current.fadeOut(0.3);
              idleAction.fadeIn(0.3);
            }
            idleAction.weight = 1;
            idleAction.play();
            currentActionRef.current = idleAction;
            previousAnimationRef.current = 'idle1';
          }
        }
      }
    }

    // 2. POTEM aktualizuj skeleton dla wszystkich meshy (używamy cache zamiast traverse - szybsze!)
    const skinnedMeshes = skinnedMeshesRef.current;
    for (let i = 0; i < skinnedMeshes.length; i++) {
      const skinnedMesh = skinnedMeshes[i];
      if (skinnedMesh.skeleton) {
        skinnedMesh.skeleton.update();
      }
    }

    // 3. TERAZ manipuluj głową (po aktualizacji animacji)
    if (headBone) {
      // 1. Ustawiamy cel na podstawie kursora
      const lookTarget = new THREE.Vector3(
        mousePosition.x * 2,
        mousePosition.y * 2,
        5
      );
      
      // 2. Patrzymy na cel
      headBone.lookAt(lookTarget);

      // 3. KORYGUJEMY OBRÓT
      headBone.rotateX(-Math.PI / -0.1);
      headBone.rotateZ(1.5);
      
      // 4. Aktualizuj skeleton po zmianach głowy
      if (headBone.parent && (headBone.parent as any).skeleton) {
        (headBone.parent as any).skeleton.update();
      }
    }

   

    // Aktualizacja czasu dla animacji cząsteczek (żywotność)
    // Wyłącz aktualizację cząsteczek na mobile po zakończeniu wyjsciewlewo
    if (!particlesDisabled && pointsRef.current && pointsRef.current.material instanceof THREE.ShaderMaterial) {
      const material = pointsRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        if (material.uniforms.uTime) {
          material.uniforms.uTime.value = state.clock.elapsedTime;
        }
        if (material.uniforms.uMouseWorld) {
          material.uniforms.uMouseWorld.value.copy(mouseLocalRef.current);
        }
        if (material.uniforms.uMouseRadius) {
          material.uniforms.uMouseRadius.value = particleMouseRadius;
        }
        if (material.uniforms.uMouseStrength) {
          material.uniforms.uMouseStrength.value = particleMouseStrength;
        }
        if (material.uniforms.uSize) {
          material.uniforms.uSize.value = particleSizeMultiplier;
        }
      }
    }

    // Aktualizacja cząsteczek - ręczny skinning z animacją, pozycje w przestrzeni lokalnej sceny
    // Wyłącz aktualizację cząsteczek na mobile po zakończeniu wyjsciewlewo
    if (!particlesDisabled && pointsRef.current && pointsRef.current.geometry && meshDataRef.current.length > 0) {
      // Aktualizuj skalę jeśli potrzeba
      pointsRef.current.scale.set(particleScale, particleScale, particleScale);
      const particlePositions = pointsRef.current.geometry.attributes.position;
      let offset = 0;
      
      meshDataRef.current.forEach((data) => {
        const mesh = data.mesh;
        
        // Aktualizuj macierze mesha (skeleton już zaktualizowany wyżej)
        mesh.updateMatrix();
        
        data.vertexIndices.forEach((_, i: number) => {
          const particleIdx = offset + i;
          const p3 = particleIdx * 3;
          const base3 = i * 3;
          let pos = new THREE.Vector3(
            data.basePositions[base3],
            data.basePositions[base3 + 1],
            data.basePositions[base3 + 2]
          );

          // Skinning - pozycja po animacji w przestrzeni lokalnej mesha
          if (mesh.type === 'SkinnedMesh' && data.skeleton && data.skinIndices && data.skinWeights) {
            const skeleton = data.skeleton;
            const bones = skeleton.boneMatrices;
            const i4 = i * 4;
            const bi1 = Math.floor(data.skinIndices[i4]);
            const bi2 = Math.floor(data.skinIndices[i4 + 1]);
            const bi3 = Math.floor(data.skinIndices[i4 + 2]);
            const bi4 = Math.floor(data.skinIndices[i4 + 3]);
            const w1 = data.skinWeights[i4];
            const w2 = data.skinWeights[i4 + 1];
            const w3 = data.skinWeights[i4 + 2];
            const w4 = data.skinWeights[i4 + 3];

            const pos4 = new THREE.Vector4(pos.x, pos.y, pos.z, 1);
            const skinned = new THREE.Vector4(0, 0, 0, 0);
            const apply = (bi: number, w: number) => {
              if (w <= 0 || bi < 0 || bi >= skeleton.bones.length) return;
              const boneMatrix = new THREE.Matrix4();
              boneMatrix.fromArray(bones, bi * 16);
              skinned.addScaledVector(pos4.clone().applyMatrix4(boneMatrix), w);
            };
            apply(bi1, w1);
            apply(bi2, w2);
            apply(bi3, w3);
            apply(bi4, w4);
            const tw = w1 + w2 + w3 + w4;
            if (tw > 0) {
              pos.set(skinned.x / tw, skinned.y / tw, skinned.z / tw);
            }
          }

          // Transform do przestrzeni lokalnej grupy
          // mesh.matrixWorld = group.matrixWorld * mesh.matrix (gdzie group to meshRef)
          // Więc: pos_group_local = group.matrixWorld^-1 * mesh.matrixWorld * pos_mesh_local
          // Albo prostsze: przekształć przez mesh.matrixWorld, potem przez odwrotność matrixWorld grupy
          pos.applyMatrix4(mesh.matrixWorld);
          
          // Przekształć do przestrzeni lokalnej grupy (jeśli grupa istnieje)
          if (meshRef.current) {
            meshRef.current.updateMatrixWorld(true);
            meshRef.current.worldToLocal(pos);
          }

          // Dodaj offset do pozycji punktów
          particlePositions.array[p3] = pos.x + particleOffset[0];
          particlePositions.array[p3 + 1] = pos.y + particleOffset[1];
          particlePositions.array[p3 + 2] = pos.z + particleOffset[2];
        });
        offset += data.vertexIndices.length;
      });

      particlePositions.needsUpdate = true;
    }
  });

  if (!scene) {
    return null;
  }

  return (
    <group ref={meshRef} position={position}>
      <primitive object={scene} />
      {/* Wyłącz renderowanie cząsteczek na mobile po zakończeniu wyjsciewlewo */}
      {pointsRef.current && !particlesDisabled && (
        <primitive object={pointsRef.current} />
      )}
    </group>
  );
};

// Preload models and animations
useGLTF.preload('/model/idle1.gltf');
useGLTF.preload('/model/loading_anim.gltf');
useGLTF.preload('/model/wyjsciewlewo.gltf');
useGLTF.preload('/model/talk1.gltf');
useGLTF.preload('/model/talk2.gltf');
useGLTF.preload('/model/talk3.gltf');