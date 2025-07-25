import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AwaModelState, MouseTrackingConfig } from '@/types';

// Konfiguracja domyślna dla śledzenia myszy
export const defaultTrackingConfig: MouseTrackingConfig = {
  sensitivity: {
    horizontal: 0.3, // ±30 stopni
    vertical: 0.2,   // ±20 stopni
  },
  smoothing: true,
  limits: {
    minX: -0.5,
    maxX: 0.5,
    minY: -0.3,
    maxY: 0.3,
  },
};

// Klasa do zarządzania sceną Three.js dla AWA
export class AwaSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private loader: GLTFLoader;
  private model?: THREE.Group;
  private headBone?: THREE.Bone;
  private mousePosition = { x: 0, y: 0 };
  private targetRotation = { x: 0, y: 0 };
  private currentRotation = { x: 0, y: 0 };
  private animationId?: number;

  constructor(container: HTMLElement) {
    // Inicjalizacja sceny
    this.scene = new THREE.Scene();

    // Kamera
    this.camera = new THREE.PerspectiveCamera(
      50, 
      container.clientWidth / container.clientHeight,
      0.1, 
      1000
    );
    this.camera.position.set(0, 0.5, 2);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Oświetlenie
    this.setupLighting();

    // Loader GLTF
    this.loader = new GLTFLoader();

    // Uruchomienie pętli renderowania
    this.animate();
  }

  private setupLighting() {
    // Światło otaczające w złotych tonach
    const ambientLight = new THREE.AmbientLight(0xffd700, 0.6);
    this.scene.add(ambientLight);

    // Światło kierunkowe (główne)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 2, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);

    // Światło wypełniające w srebrnych tonach
    const fillLight = new THREE.DirectionalLight(0xc0c0c0, 0.3);
    fillLight.position.set(-1, 1, 1);
    this.scene.add(fillLight);

    // Punkt światła dla refleksów
    const pointLight = new THREE.PointLight(0xffd700, 0.4, 10);
    pointLight.position.set(0, 2, 2);
    this.scene.add(pointLight);
  }

  async loadModel(modelPath: string): Promise<AwaModelState> {
    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        this.loader.load(
          modelPath,
          resolve,
          undefined,
          reject
        );
      });

      this.model = gltf.scene;

      // Skalowanie i pozycjonowanie
      this.model.scale.setScalar(1);
      this.model.position.set(0, -0.5, 0);

      // Znajdź kość głowy
      this.model.traverse((child) => {
        if (child instanceof THREE.Bone) {
          const boneName = child.name.toLowerCase();
          if (boneName.includes('head') || boneName.includes('głowa')) {
            this.headBone = child;
            console.log('Znaleziono kość głowy:', child.name);
          }
        }
      });

      this.scene.add(this.model);

      return {
        model: this.model,
        headBone: this.headBone,
        isLoaded: true,
        isTracking: false,
      };
    } catch (error) {
      console.error('Błąd ładowania modelu AWA:', error);
      throw error;
    }
  }

  updateMousePosition(clientX: number, clientY: number) {
    // Konwersja pozycji myszy na normalized coordinates
    this.mousePosition.x = (clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(clientY / window.innerHeight) * 2 + 1;

    // Oblicz docelowy obrót głowy
    this.targetRotation.y = this.mousePosition.x * defaultTrackingConfig.sensitivity.horizontal;
    this.targetRotation.x = this.mousePosition.y * defaultTrackingConfig.sensitivity.vertical;

    // Zastosuj ograniczenia
    this.targetRotation.y = Math.max(
      defaultTrackingConfig.limits.minX, 
      Math.min(defaultTrackingConfig.limits.maxX, this.targetRotation.y)
    );
    this.targetRotation.x = Math.max(
      defaultTrackingConfig.limits.minY, 
      Math.min(defaultTrackingConfig.limits.maxY, this.targetRotation.x)
    );
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    // Smooth interpolation dla naturalnych ruchów głowy
    if (this.headBone && defaultTrackingConfig.smoothing) {
      this.currentRotation.x = THREE.MathUtils.lerp(
        this.currentRotation.x, 
        this.targetRotation.x, 
        0.1
      );
      this.currentRotation.y = THREE.MathUtils.lerp(
        this.currentRotation.y, 
        this.targetRotation.y, 
        0.1
      );

      // Zastosuj rotację do kości głowy
      this.headBone.rotation.x = this.currentRotation.x;
      this.headBone.rotation.y = this.currentRotation.y;
    }

    this.renderer.render(this.scene, this.camera);
  };

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }

    // Cleanup Three.js resources
    this.scene.clear();
  }

  // Dodatkowe metody dla animacji i interakcji
  playIdleAnimation() {
    // Implementacja animacji bezczynności
    // Można rozszerzyć o AnimationMixer dla złożonych animacji
  }

  speakAnimation() {
    // Implementacja animacji mówienia
    // Synchronizacja z audio z ElevenLabs
  }
}

// Helper functions
export const createMouseTracker = (
  sceneManager: AwaSceneManager,
  container: HTMLElement
) => {
  const handleMouseMove = (event: MouseEvent) => {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    sceneManager.updateMousePosition(x, y);
  };

  container.addEventListener('mousemove', handleMouseMove);

  return () => {
    container.removeEventListener('mousemove', handleMouseMove);
  };
};
