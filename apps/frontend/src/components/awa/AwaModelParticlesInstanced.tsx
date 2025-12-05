import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useAnimations, useEnvironment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FlowStep } from '@/types';

interface AwaModelParticlesInstancedProps {
  currentStep: FlowStep;
  onLoaded?: () => void;
  position?: [number, number, number];
  particleDensity?: number;
  instanceScale?: number;
}

interface MeshVertexData {
  mesh: THREE.SkinnedMesh | THREE.Mesh;
  basePositions: Float32Array;
  vertexIndices: number[];
  colors: Float32Array;
  skinIndices?: Float32Array;
  skinWeights?: Float32Array;
  skeleton?: THREE.Skeleton;
}

export const AwaModelParticlesInstanced: React.FC<AwaModelParticlesInstancedProps> = ({
  currentStep,
  onLoaded,
  position = [-1.4, -0.9, 0],
  particleDensity = 0.08,
  instanceScale = 0.015,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshDataRef = useRef<MeshVertexData[]>([]);
  const [instanceCount, setInstanceCount] = useState(0);
  const instancedRef = useRef<THREE.InstancedMesh | null>(null);
  const colorArrayRef = useRef<Float32Array | null>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const [headBone, setHeadBone] = useState<THREE.Bone | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { scene: threeScene } = useThree();
  const envMap = useEnvironment({ preset: 'studio' });

  const { scene } = useGLTF('/models/SKM_Quinn.gltf');
  const { animations: idleAnimations } = useGLTF('/models/Idle.gltf');

  const clonedScene = useMemo(() => {
    if (!scene) return null;
    return scene.clone();
  }, [scene]);

  useEffect(() => {
    if (!clonedScene) return;

    const meshData: MeshVertexData[] = [];
    const palette = [
      new THREE.Color(0xFFD700),
      new THREE.Color(0xE5E4E2),
      new THREE.Color(0xC0C0C0),
      new THREE.Color(0xF7E7CE),
    ];
    let totalInstances = 0;
    let foundHead: THREE.Object3D | null = null;

    clonedScene.traverse((child: THREE.Object3D) => {
      if (child.type === 'Bone' && child.name.toLowerCase().includes('head')) {
        foundHead = child;
      }
      if (child.type === 'Mesh' || child.type === 'SkinnedMesh') {
        const mesh = child as THREE.Mesh | THREE.SkinnedMesh;

        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            m.transparent = true;
            m.opacity = 0;
            m.visible = false;
          });
        }
        mesh.visible = false;

        if (!mesh.geometry || !mesh.geometry.attributes.position) return;

        const geometry = mesh.geometry;
        const positions = geometry.attributes.position.array as Float32Array;
        const totalVertices = positions.length / 3;

        const vertexIndices: number[] = [];
        const colors: number[] = [];

        for (let i = 0; i < totalVertices; i++) {
          if (Math.random() <= particleDensity) {
            vertexIndices.push(i);
            const c = palette[Math.floor(Math.random() * palette.length)];
            colors.push(c.r, c.g, c.b);
          }
        }

        if (vertexIndices.length > 0) {
          const basePositions = new Float32Array(vertexIndices.length * 3);
          vertexIndices.forEach((idx, vi) => {
            const i3 = idx * 3;
            basePositions[vi * 3] = positions[i3];
            basePositions[vi * 3 + 1] = positions[i3 + 1];
            basePositions[vi * 3 + 2] = positions[i3 + 2];
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
            vertexIndices,
            colors: new Float32Array(colors),
            skinIndices,
            skinWeights,
            skeleton,
          });
          totalInstances += vertexIndices.length;
        }
      }
    });

    meshDataRef.current = meshData;
    setInstanceCount(totalInstances);

    if (foundHead && (foundHead as THREE.Bone).rotation) {
      (foundHead as THREE.Bone).rotation.order = 'YXZ';
      (foundHead as THREE.Bone).rotation.y += Math.PI / 2;
    }
    setHeadBone(foundHead ? (foundHead as unknown as THREE.Bone) : null);

    if (threeScene && envMap) {
      threeScene.environment = envMap;
    }

    if (onLoaded) onLoaded();
  }, [clonedScene, envMap, onLoaded, particleDensity, threeScene]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      setMousePosition({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const { actions, mixer } = useAnimations(idleAnimations, clonedScene || scene);

  useEffect(() => {
    if (actions && actions['idle']) {
      actions['idle'].play();
    } else {
      const keys = actions ? Object.keys(actions) : [];
      if (keys.length > 0 && actions) {
        actions[keys[0]]?.play();
      }
    }
  }, [actions]);

  // Build colors buffer for instanced mesh once
  useEffect(() => {
    if (!instancedRef.current || meshDataRef.current.length === 0) return;
    const total = instanceCount;
    if (total === 0) return;
    const colors = new Float32Array(total * 3);
    let offset = 0;
    meshDataRef.current.forEach((m) => {
      for (let i = 0; i < m.vertexIndices.length; i++) {
        const c3 = offset * 3;
        colors[c3] = m.colors[i * 3];
        colors[c3 + 1] = m.colors[i * 3 + 1];
        colors[c3 + 2] = m.colors[i * 3 + 2];
        offset++;
      }
    });
    colorArrayRef.current = colors;
    instancedRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
  }, [instanceCount]);

  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);
    meshDataRef.current.forEach((m) => {
      if (m.skeleton) m.skeleton.update();
    });

    if (!instancedRef.current || instanceCount === 0 || meshDataRef.current.length === 0) return;

    const time = state.clock.elapsedTime;
    let offset = 0;

    meshDataRef.current.forEach((data) => {
      const mesh = data.mesh;
      mesh.updateMatrixWorld(true);
      data.vertexIndices.forEach((_, i) => {
        const base3 = i * 3;
        const particleIndex = offset + i;

        const pos = new THREE.Vector3(
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

        pos.applyMatrix4(mesh.matrix);

        const jitter = 0.01;
        pos.x += Math.sin(time * 0.6 + particleIndex * 0.02) * jitter;
        pos.y += Math.cos(time * 0.4 + particleIndex * 0.02) * jitter;
        pos.z += Math.sin(time * 0.5 + particleIndex * 0.02) * jitter;

        tempMatrix.makeScale(instanceScale, instanceScale, instanceScale);
        tempMatrix.setPosition(pos);
        instancedRef.current!.setMatrixAt(particleIndex, tempMatrix);
      });
      offset += data.vertexIndices.length;
    });

    instancedRef.current.instanceMatrix.needsUpdate = true;

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

  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 8, 8), []);
  const sphereMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        metalness: 0.8,
        roughness: 0.2,
        color: 0xffffff,
        vertexColors: true,
      }),
    []
  );

  if (!clonedScene || instanceCount === 0) return null;

  return (
    <group position={position} ref={groupRef}>
      <primitive object={clonedScene} renderOrder={-1} />
      <instancedMesh
        ref={instancedRef}
        args={[sphereGeometry, sphereMaterial, instanceCount]}
        frustumCulled={false}
      />
    </group>
  );
};

useGLTF.preload('/models/SKM_Quinn.gltf');

