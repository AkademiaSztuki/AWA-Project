import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, useEnvironment } from '@react-three/drei';
import * as THREE from 'three';
import { FlowStep } from '@/types';

// Shadery dla okrągłych cząsteczek z kolorami z tekstury
const particleVertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aOpacity;
  attribute vec2 aUv;
  attribute float aAnimOffset; // Offset dla animacji - różny dla każdej cząsteczki
  uniform float uTime; // Czas dla animacji
  varying vec3 vColor;
  varying float vOpacity;
  varying vec2 vUv;
  void main() {
    vColor = aColor;
    vOpacity = aOpacity;
    vUv = aUv;
    
    // Żywa animacja pozycji - naturalny ruch jak w partiklach
    vec3 animPos = position;
    float animSpeed = 0.3 + aAnimOffset * 0.7; // Różna prędkość dla każdej cząsteczki (0.3-1.0)
    float animPhase = aAnimOffset * 6.28318; // Różna faza startowa (0-2π)
    
    // Wszystkie cząsteczki mają delikatny ruch, ale różny w zależności od animOffset
    float movementIntensity = aAnimOffset * 0.8; // Intensywność ruchu (0-0.8)
    
    // Delikatne drżenie i naturalny ruch w różnych kierunkach
    float time1 = uTime * animSpeed + animPhase;
    float time2 = uTime * animSpeed * 0.7 + animPhase * 1.3;
    float time3 = uTime * animSpeed * 0.5 + animPhase * 2.1;
    
    // Naturalny, żywy ruch - delikatne kołysanie
    animPos += vec3(
      sin(time1) * movementIntensity * 0.015,
      cos(time2) * movementIntensity * 0.012,
      sin(time3) * movementIntensity * 0.008
    );
    
    // Dodatkowe delikatne drżenie dla bardziej żywego efektu
    float jitterAmount = movementIntensity * 0.003;
    animPos += vec3(
      sin(uTime * 5.0 + animPhase) * jitterAmount,
      cos(uTime * 4.3 + animPhase * 1.5) * jitterAmount,
      sin(uTime * 6.1 + animPhase * 2.3) * jitterAmount * 0.7
    );
    
    vec4 mvPosition = modelViewMatrix * vec4(animPos, 1.0);
    float att = clamp(150.0 / -mvPosition.z, 0.5, 8.0);
    gl_PointSize = aSize * att;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  uniform sampler2D mapTex;
  uniform int useMap;
  varying vec3 vColor;
  varying float vOpacity;
  varying vec2 vUv;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.45, 0.5, d);
    vec3 baseColor = vColor;
    if (useMap == 1) {
      vec3 texColor = texture2D(mapTex, vUv).rgb;
      // Ograniczenie kolorów tekstury - wyeliminuj białe i czarne
      texColor = clamp(texColor, vec3(0.4), vec3(0.85));
      // Głównie używaj kolorów z tekstury modelu (80% tekstura), z lekkim wpływem palety (20%)
      baseColor = mix(vColor, texColor, 0.8);
    }
    // Sprawdź jasność - jeśli zbyt jasna (biała), zamień na żółty/złoty
    float brightness = dot(baseColor, vec3(0.299, 0.587, 0.114));
    
    // Sprawdź czy kolor jest biały (wysoka jasność + niska saturacja)
    float maxChannel = max(max(baseColor.r, baseColor.g), baseColor.b);
    float minChannel = min(min(baseColor.r, baseColor.g), baseColor.b);
    float saturation = (maxChannel - minChannel) / max(maxChannel, 0.001);
    bool isWhite = brightness > 0.65 && saturation < 0.35;
    bool isLight = maxChannel > 0.75; // Wykryj jasne kolory (wysoki kanał)
    
    // Bardzo agresywne wykrywanie i zamiana jasnych/białych kolorów na żółte
    // Wykrywaj nawet lekko jasne kolory (niższy próg) - szczególnie na rękach i głowie
    if (brightness > 0.5 || isWhite || isLight || (brightness > 0.55 && saturation < 0.5)) {
      // Utwórz ciepły żółty/złoty kolor pasujący do otoczenia
      vec3 goldenYellow = vec3(1.0, 0.84, 0.0); // Złoty - pasuje do #FFD700
      vec3 warmYellow = vec3(1.0, 0.9, 0.6); // Ciepły żółty - pasuje do #FFE5B4
      vec3 deepGold = vec3(0.95, 0.75, 0.2); // Głębszy złoty
      
      // Im jaśniejsze, tym bardziej złote, ale zawsze żółte
      float whiteAmount = (brightness - 0.5) / 0.55; // 0.6-0.95 -> 0.0-1.0
      whiteAmount = clamp(whiteAmount, 0.0, 1.0);
      vec3 yellowTint = mix(deepGold, mix(warmYellow, goldenYellow, whiteAmount * 0.5), whiteAmount);
      
      // Bardziej agresywna zamiana - 90% żółty kolor
      baseColor = mix(baseColor, yellowTint, 0.9);
    }
    
    // Jeśli zbyt ciemna (prawie czarna), użyj koloru z palety
    if (brightness < 0.4) {
      baseColor = mix(baseColor, vColor, 0.7);
    }
    
    // Finalne clampowanie - wyeliminuj skrajne wartości, ale pozwól na ciepłe żółte
    baseColor = clamp(baseColor, vec3(0.35), vec3(1.0));
    gl_FragColor = vec4(baseColor, alpha * vOpacity);
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
  const pointsRef = useRef<THREE.Points | null>(null);
  const meshDataRef = useRef<MeshVertexData[]>([]);
  const [particlesGeometry, setParticlesGeometry] = useState<THREE.BufferGeometry | null>(null);
  const baseColorMapRef = useRef<THREE.Texture | null>(null);
  // Włączenie cząsteczek – diagnostycznie (duże, widoczne)
  const particleDensity = 0.10;
  const particleSize = 0.45 // Zmień tę wartość żeby zwiększyć/zmniejszyć rozmiar pojedynczych cząsteczek
  const particleScale = 1.00;// SKALA MODELU CZĄSTECZEK - zmień (np. 1.1 = 10% większy, 0.9 = 10% mniejszy) żeby powiększyć/pomniejszyć cały model cząsteczek
  const particleOpacityMin = 0.7; // Minimalna przezroczystość cząsteczek (0-1)
  const particleOpacityMax = 1.0; // Maksymalna przezroczystość cząsteczek (0-1)
  // Offset dla pozycji punktów - możesz zmienić te wartości żeby przesunąć punkty
  const particleOffset: [number, number, number] = [1.4, 0.90, 0];

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
        
        // Apply metallic materials to meshes (both Mesh and SkinnedMesh)
        if (child.type === 'Mesh' || child.type === 'SkinnedMesh') {
          const mesh = child as THREE.Mesh | THREE.SkinnedMesh;
          const modelOpacity = 0.3; // PRZEZROCZYSTOŚĆ MODELU 3D - zmień (0-1) aby regulować przezroczystość samego modelu z teksturami
          
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            
            const newMaterials = materials.map((material) => {
              // Create new metallic material with HDRI environment map
              const metallicMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0xE0E0E0), // Srebrzysty kolor
                metalness: 0.95, // Bardzo wysoka metaliczność (prawie 1.0)
                roughness: 0.05, // Bardzo niska chropowatość = bardzo wysoki połysk
                envMap: envMap, // Ustaw envMap z HDRI preset "sunset"
                envMapIntensity: 3.5, // Znacznie zwiększona intensywność dla wyraźnego efektu
                transparent: true, // Włącz przezroczystość
                opacity: modelOpacity, // Ustaw przezroczystość
                depthWrite: modelOpacity < 0.1, // Wyłącz zapisywanie głębi dla przezroczystych obiektów
              });
              
              // Zachowaj oryginalne tekstury jeśli istnieją
              if (material instanceof THREE.MeshStandardMaterial) {
                if (material.map) metallicMaterial.map = material.map;
                if (material.normalMap) metallicMaterial.normalMap = material.normalMap;
                if (material.roughnessMap) metallicMaterial.roughnessMap = material.roughnessMap;
                if (material.metalnessMap) metallicMaterial.metalnessMap = material.metalnessMap;
                if (material.aoMap) metallicMaterial.aoMap = material.aoMap;
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
      
      if (foundHead && (foundHead as THREE.Bone).rotation) {
        (foundHead as THREE.Bone).rotation.order = 'YXZ';
        (foundHead as THREE.Bone).rotation.y += Math.PI / 2;
      }
      setHeadBone(foundHead ? (foundHead as unknown as THREE.Bone) : null);
      // Inform parent that model is loaded
      if (onLoaded) onLoaded();

      // Przygotuj dane do cząsteczek jako overlay
      // Paleta kolorów pasująca do ciepłego, złotego otoczenia - tylko ciepłe odcienie, żadnych białych
      const colorPalette = [
        new THREE.Color(0xFFD700), // Złoty - pasuje do oświetlenia
        new THREE.Color(0xFFC850), // Ciemniejszy złoty - bardziej nasycony
        new THREE.Color(0xFFE5B4), // Ciepły beż - pasuje do point light (bez białego)
        new THREE.Color(0xF5DEB3), // Ciepły beżowo-złoty - subtelny
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
          const vertexIndices: number[] = [];
          for (let i = 0; i < totalVertices; i++) {
            if (Math.random() <= particleDensity) {
              vertexIndices.push(i);
            }
          }
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
              mapTex: { value: baseColorMapRef.current },
              useMap: { value: baseColorMapRef.current ? 1 : 0 },
              uTime: { value: 0 }, // Czas dla animacji żywego ruchu
            },
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending,
            vertexColors: false,
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
  }, [scene, envMap, threeScene, onLoaded, particleDensity, particleSize, particleScale]);

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

  const { actions, mixer } = useAnimations(idleAnimations, scene);

  useEffect(() => {
    if (!mixer) return;
    mixer.stopAllAction();
    if (actions && actions['idle']) {
      actions['idle'].reset().play();
    } else {
      const keys = actions ? Object.keys(actions) : [];
      if (keys.length > 0 && actions) {
        actions[keys[0]]?.reset().play();
      } else if (idleAnimations && idleAnimations.length > 0 && scene) {
        mixer.clipAction(idleAnimations[0], scene).reset().play();
      }
    }
  }, [actions, idleAnimations, mixer, scene]);

  // Animation loop
  useFrame((state) => {
    // 1. NAJPIERW aktualizuj mixer dla animacji - to aktualizuje skeleton
    if (mixer) {
      const delta = state.clock.getDelta();
      mixer.update(delta > 0.1 ? 0.016 : delta);
    }

    // 2. POTEM aktualizuj skeleton dla wszystkich meshy (tylko raz!)
    scene.traverse((child) => {
      if (child.type === 'SkinnedMesh') {
        const skinnedMesh = child as THREE.SkinnedMesh;
        if (skinnedMesh.skeleton) {
          skinnedMesh.skeleton.update();
        }
      }
    });

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
    if (pointsRef.current && pointsRef.current.material instanceof THREE.ShaderMaterial) {
      const material = pointsRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.uTime) {
        material.uniforms.uTime.value = state.clock.elapsedTime;
      }
    }

    // Aktualizacja cząsteczek - ręczny skinning z animacją, pozycje w przestrzeni lokalnej sceny
    if (pointsRef.current && pointsRef.current.geometry && meshDataRef.current.length > 0) {
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
      {pointsRef.current && (
        <primitive object={pointsRef.current} />
      )}
    </group>
  );
};

// Preload model
useGLTF.preload('/models/SKM_Quinn.gltf');
useGLTF.preload('/models/SKM_Quinn.gltf');