---
name: threejs-patterns
description: Three.js and React Three Fiber patterns for AWA project. Use when working with 3D models, animations, shaders, or the IDA character system. Covers AwaModel.tsx, AwaDialogue.tsx, particle systems, and Three.js integration.
---

# Three.js Patterns for AWA Project

## Architecture

Uses **React Three Fiber** (R3F) for declarative Three.js:
- `@react-three/fiber` - Core R3F
- `@react-three/drei` - Helpers (GLTFLoader, useAnimations)
- `three` - Three.js core

## Key Components

### `AwaModel.tsx`
Main 3D character component (IDA).

**Structure:**
```typescript
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function AwaModel({ position, rotation, ... }) {
  const { scene, animations } = useGLTF('/models/ida.glb');
  const { actions } = useAnimations(animations, scene);
  
  // Animation logic
  useFrame((state, delta) => {
    // Update animations, head tracking, etc.
  });
  
  return <primitive object={scene} />;
}
```

**Key features:**
- Head tracking (mouse/pointer interaction)
- Animation system (idle, talking, etc.)
- Particle effects (shader-based)
- Performance optimization (LOD, culling)

### `AwaDialogue.tsx`
Dialogue system with audio sync.

**Pattern:**
```typescript
import { useAudioManager } from '@/hooks/useAudioManager';
import { useAnimation } from '@/contexts/AnimationContext';

function AwaDialogue({ dialogue, onComplete }) {
  const { playAudio, isPlaying } = useAudioManager();
  const { triggerAnimation } = useAnimation();
  
  // Sync audio with animations
  useEffect(() => {
    if (isPlaying) {
      triggerAnimation('talking');
    } else {
      triggerAnimation('idle');
    }
  }, [isPlaying]);
}
```

## Common Patterns

### 1. Loading 3D Models

```typescript
import { useGLTF } from '@react-three/drei';

function Model() {
  const { scene } = useGLTF('/path/to/model.glb');
  
  // Preload for performance
  useGLTF.preload('/path/to/model.glb');
  
  return <primitive object={scene} />;
}
```

### 2. Animations

```typescript
import { useAnimations } from '@react-three/drei';

function AnimatedModel() {
  const { scene, animations } = useGLTF('/model.glb');
  const { actions, mixer } = useAnimations(animations, scene);
  
  useEffect(() => {
    actions['AnimationName']?.play();
    return () => actions['AnimationName']?.stop();
  }, [actions]);
  
  useFrame((state, delta) => {
    mixer.update(delta);
  });
}
```

### 3. Shader Materials

Custom shaders for particles/effects:

```typescript
const shaderMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    uniform float uTime;
    varying vec3 vColor;
    void main() {
      // Vertex shader code
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `,
  uniforms: {
    uTime: { value: 0 }
  }
});
```

### 4. Mouse/Pointer Interaction

```typescript
import { useThree } from '@react-three/fiber';

function InteractiveModel() {
  const { camera, raycaster, pointer } = useThree();
  const [mouseWorld, setMouseWorld] = useState(new THREE.Vector3());
  
  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    // Calculate world position, update model
  });
}
```

### 5. Performance Optimization

```typescript
// LOD (Level of Detail)
import { LOD } from '@react-three/drei';

<LOD>
  <mesh geometry={highDetail} distance={0} />
  <mesh geometry={mediumDetail} distance={50} />
  <mesh geometry={lowDetail} distance={100} />
</LOD>

// Instancing for many objects
import { Instances, Instance } from '@react-three/drei';

<Instances limit={1000}>
  <boxGeometry />
  <meshStandardMaterial />
  {items.map((item, i) => (
    <Instance key={i} position={item.position} />
  ))}
</Instances>
```

## Animation Context

Use `AnimationContext` for coordinated animations:

```typescript
import { useAnimation } from '@/contexts/AnimationContext';

const { triggerAnimation, currentAnimation } = useAnimation();

// Trigger animation
triggerAnimation('talking', { duration: 2000 });

// Check current state
if (currentAnimation === 'idle') {
  // ...
}
```

## Audio Synchronization

Sync 3D animations with audio:

```typescript
import { useAudioManager } from '@/hooks/useAudioManager';

const { playAudio, isPlaying, currentTime } = useAudioManager();

// Play audio
await playAudio('/audio/dialogue.mp3');

// Sync animation to audio time
useFrame(() => {
  if (isPlaying) {
    const mouthOpen = Math.sin(currentTime * 10) > 0.5;
    // Update mouth animation
  }
});
```

## Best Practices

1. **Preload models** - Use `useGLTF.preload()` for critical models
2. **Optimize geometry** - Use low-poly versions for distant objects
3. **Reuse materials** - Share materials across instances
4. **Cleanup resources** - Dispose geometries/materials on unmount
5. **Use R3F helpers** - Prefer `drei` components over raw Three.js
6. **Monitor performance** - Use React DevTools Profiler for R3F

## Common Issues

- **Memory leaks**: Always dispose geometries/materials
- **Animation jitter**: Use `useFrame` delta for smooth updates
- **Loading delays**: Preload critical assets
- **Performance**: Use instancing for repeated objects
