import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useAnimations, useEnvironment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FlowStep } from '@/types';

interface AwaModelParticlesDiscsProps {
  currentStep: FlowStep;
  onLoaded?: () => void;
  position?: [number, number, number];
  particleDensity?: number;
  particleSize?: number;
  useTextureColor?: boolean;
}

interface MeshVertexData {
  mesh: THREE.SkinnedMesh | THREE.Mesh;
  basePositions: Float32Array;
  baseUVs: Float32Array;
  vertexIndices: number[];
  colors: Float32Array;
  sizes: Float32Array;
  opacities: Float32Array;
  skinIndices?: Float32Array;
  skinWeights?: Float32Array;
  skeleton?: THREE.Skeleton;
}

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aOpacity;
  attribute vec2 aUv;
  varying vec3 vColor;
  varying float vOpacity;
  varying vec2 vUv;
  void main() {
    vColor = aColor;
    vOpacity = aOpacity;
    vUv = aUv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float att = clamp(20.0 / -mvPosition.z, 0.5, 8.0);
    gl_PointSize = aSize * att;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
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
      // Minimalne doświetlenie, żeby nie było czarnych punktów
      texColor = max(texColor, vec3(0.25));
      // Domieszka palety, by utrzymać złoto/srebro
      baseColor = mix(texColor, vColor, 0.35);
    }
    gl_FragColor = vec4(baseColor, alpha * vOpacity);
  }
`;

export const AwaModelParticlesDiscs: React.FC<AwaModelParticlesDiscsProps> = ({
  currentStep,
  onLoaded,
  position = [-1.4, -0.9, 0],
  particleDensity = 0.65,
  particleSize = 0.55,
  useTextureColor = true,
}) => {
  const pointsRef = useRef<THREE.Points | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const meshDataRef = useRef<MeshVertexData[]>([]);
  const [particlesGeometry, setParticlesGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [headBone, setHeadBone] = useState<THREE.Bone | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { scene: threeScene } = useThree();
  const envMap = useEnvironment({ preset: 'studio' });

  const { scene: originalScene } = useGLTF('/models/SKM_Quinn.gltf');
  const { animations: idleAnimations } = useGLTF('/models/Idle.gltf');

  const clonedScene = useMemo(() => {
    if (!originalScene) return null;
    return originalScene.clone(true);
  }, [originalScene]);

  // Base color map from first mesh material (if present)
  const baseColorMap = useMemo(() => {
    if (!clonedScene) return null;
    let tex: THREE.Texture | null = null;
    clonedScene.traverse((child) => {
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
  }, [clonedScene]);

  // Build mesh data and initial geometry
  useEffect(() => {
    if (!clonedScene) return;

    const meshData: MeshVertexData[] = [];
    const colorPalette = [
      new THREE.Color(0xFFD700), // Gold
      new THREE.Color(0xE5E4E2), // Platinum
      new THREE.Color(0xC0C0C0), // Silver
      new THREE.Color(0xF7E7CE), // Champagne
    ];

    let foundHead: THREE.Object3D | null = null;

    clonedScene.traverse((child: THREE.Object3D) => {
      if (child.type === 'Bone' && child.name.toLowerCase().includes('head')) {
        foundHead = child;
      }
      if (child.type === 'Mesh' || child.type === 'SkinnedMesh') {
        const mesh = child as THREE.Mesh | THREE.SkinnedMesh;

        // Hide materials, ale zostaw mesh widoczny, żeby szkielet i binding działały
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            mat.transparent = true;
            mat.opacity = 0;
            mat.visible = true;
          });
        }
        mesh.visible = true;
        mesh.frustumCulled = false;

        if (!mesh.geometry || !mesh.geometry.attributes.position) return;

        const geometry = mesh.geometry;
        const positions = geometry.attributes.position.array as Float32Array;
        const totalVertices = positions.length / 3;
        const uvsAttr = geometry.attributes.uv as THREE.BufferAttribute | undefined;

        const vertexIndices: number[] = [];
        const colors: number[] = [];
        const sizes: number[] = [];
        const opacities: number[] = [];
        const uvs: number[] = [];

        for (let i = 0; i < totalVertices; i++) {
          if (Math.random() <= particleDensity) {
            vertexIndices.push(i);
            const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            colors.push(c.r, c.g, c.b);
            sizes.push(particleSize * (0.85 + Math.random() * 0.3));
            opacities.push(0.7 + Math.random() * 0.3);
            if (uvsAttr) {
              const i2 = i * 2;
              uvs.push(uvsAttr.array[i2] ?? 0.5, uvsAttr.array[i2 + 1] ?? 0.5);
            } else {
              uvs.push(0.5, 0.5);
            }
          }
        }

        if (vertexIndices.length > 0) {
          const basePositions = new Float32Array(vertexIndices.length * 3);
          const baseUVs = new Float32Array(vertexIndices.length * 2);
          vertexIndices.forEach((idx, vi) => {
            const i3 = idx * 3;
            const i2 = vi * 2;
            basePositions[vi * 3] = positions[i3];
            basePositions[vi * 3 + 1] = positions[i3 + 1];
            basePositions[vi * 3 + 2] = positions[i3 + 2];
            baseUVs[i2] = uvs[vi * 2];
            baseUVs[i2 + 1] = uvs[vi * 2 + 1];
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
            colors: new Float32Array(colors),
            sizes: new Float32Array(sizes),
            opacities: new Float32Array(opacities),
            skinIndices,
            skinWeights,
            skeleton,
          });
        }
      }
    });

    meshDataRef.current = meshData;

    if (meshData.length > 0) {
      const allPositions: number[] = [];
      const allColors: number[] = [];
      const allSizes: number[] = [];
      const allOpacities: number[] = [];
      const allUVs: number[] = [];

      meshData.forEach((data) => {
        allPositions.push(...Array.from(data.basePositions));
        allColors.push(...Array.from(data.colors));
        allSizes.push(...Array.from(data.sizes));
        allOpacities.push(...Array.from(data.opacities));
        allUVs.push(...Array.from(data.baseUVs));
      });

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allPositions), 3));
      geom.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(allColors), 3));
      geom.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(allSizes), 1));
      geom.setAttribute('aOpacity', new THREE.BufferAttribute(new Float32Array(allOpacities), 1));
      geom.setAttribute('aUv', new THREE.BufferAttribute(new Float32Array(allUVs), 2));
      geom.computeBoundingSphere();
      setParticlesGeometry(geom);
    }

    if (foundHead && (foundHead as THREE.Bone).rotation) {
      (foundHead as THREE.Bone).rotation.order = 'YXZ';
      (foundHead as THREE.Bone).rotation.y += Math.PI / 2;
    }
    setHeadBone(foundHead ? (foundHead as unknown as THREE.Bone) : null);

    if (threeScene && envMap) {
      threeScene.environment = envMap;
    }

    if (onLoaded) onLoaded();
  }, [clonedScene, envMap, onLoaded, particleDensity, particleSize, threeScene]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      setMousePosition({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const { actions, mixer } = useAnimations(idleAnimations, clonedScene || originalScene);

  useEffect(() => {
    if (!mixer) return;
    mixer.stopAllAction();
    const all = actions ? Object.values(actions) : [];
    if (all.length > 0) {
      all.forEach((a) => a?.reset().play());
    } else if (idleAnimations && idleAnimations.length > 0 && clonedScene) {
      mixer.clipAction(idleAnimations[0], clonedScene).reset().play();
    }
  }, [actions, idleAnimations, mixer, clonedScene]);

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        mapTex: { value: baseColorMap },
        useMap: { value: useTextureColor && baseColorMap ? 1 : 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
    });
    return mat;
  }, [baseColorMap, useTextureColor]);

  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);
    meshDataRef.current.forEach((m) => {
      if (m.skeleton) m.skeleton.update();
    });

    // Fallback: jeśli headBone zniknął (np. GC), spróbuj znaleźć ponownie
    if (!headBone && clonedScene) {
      let foundHead: THREE.Object3D | null = null;
      clonedScene.traverse((child) => {
        if (child.type === 'Bone' && child.name.toLowerCase().includes('head')) {
          foundHead = child;
        }
      });
      if (foundHead) {
        const bone = foundHead as THREE.Bone;
        bone.rotation.order = 'YXZ';
        bone.rotation.y += Math.PI / 2;
        setHeadBone(bone);
      }
    }

    if (!pointsRef.current || !particlesGeometry || meshDataRef.current.length === 0) return;

    const time = state.clock.elapsedTime;
    const positions = particlesGeometry.attributes.position;
    const opacities = particlesGeometry.attributes.aOpacity as THREE.BufferAttribute | undefined;
    if (!opacities) return;

    let offset = 0;

    meshDataRef.current.forEach((data) => {
      const mesh = data.mesh;
      mesh.updateMatrixWorld(true);
      data.vertexIndices.forEach((_, i) => {
        const particleIdx = offset + i;
        const p3 = particleIdx * 3;
        const base3 = i * 3;

        const base = new THREE.Vector3(
          data.basePositions[base3],
          data.basePositions[base3 + 1],
          data.basePositions[base3 + 2]
        );

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

          const pos4 = new THREE.Vector4(base.x, base.y, base.z, 1);
          const skinned = new THREE.Vector4(0, 0, 0, 0);
          const applyBone = (boneIndex: number, weight: number) => {
            if (weight <= 0 || boneIndex < 0 || boneIndex >= skeleton.bones.length) return;
            const boneMatrix = new THREE.Matrix4();
            boneMatrix.fromArray(bones, boneIndex * 16);
            skinned.addScaledVector(pos4.clone().applyMatrix4(boneMatrix), weight);
          };
          applyBone(bi1, w1);
          applyBone(bi2, w2);
          applyBone(bi3, w3);
          applyBone(bi4, w4);
          const tw = w1 + w2 + w3 + w4;
          if (tw > 0) {
            base.set(skinned.x / tw, skinned.y / tw, skinned.z / tw);
          }
        }

        base.applyMatrix4(mesh.matrix);

        const jitter = 0.01;
        base.x += Math.sin(time * 0.6 + particleIdx * 0.02) * jitter;
        base.y += Math.cos(time * 0.4 + particleIdx * 0.02) * jitter;
        base.z += Math.sin(time * 0.5 + particleIdx * 0.02) * jitter;

        positions.array[p3] = base.x;
        positions.array[p3 + 1] = base.y;
        positions.array[p3 + 2] = base.z;

        const baseOpacity = data.opacities[i];
        opacities.array[particleIdx] = baseOpacity * (0.8 + Math.sin(time * 2 + particleIdx * 0.1) * 0.2);
      });
      offset += data.vertexIndices.length;
    });

    positions.needsUpdate = true;
    opacities.needsUpdate = true;

    if (headBone) {
      const lookTarget = new THREE.Vector3(mousePosition.x * 2, mousePosition.y * 2, 5);
      headBone.lookAt(lookTarget);
      headBone.rotateX(-Math.PI / -0.1);
      headBone.rotateZ(1.5);
    }

    if (groupRef.current) {
      groupRef.current.scale.y = 1 + Math.sin(time * 0.5) * 0.02;
    }
  });

  if (!clonedScene || !particlesGeometry) return null;

  return (
    <group position={position} ref={groupRef} renderOrder={-2}>
      <primitive object={clonedScene} renderOrder={-2} />
      <points
        ref={pointsRef}
        geometry={particlesGeometry}
        material={material}
        renderOrder={-3}
        frustumCulled={false}
      />
    </group>
  );
};

useGLTF.preload('/models/SKM_Quinn.gltf');

