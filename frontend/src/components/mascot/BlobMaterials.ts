import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Calmspace Blob Physical Material & Studio Environment Pipeline
 * 
 * Provides physically based soft-clay materials with silky sheen, subtle clearcoat,
 * obsidian glossy eyes with dual corneal catchlights, soft contact shadow,
 * and Three.js RoomEnvironment PMREM studio reflection map.
 */

export interface StudioEnvironmentHandle {
  pmremGenerator: THREE.PMREMGenerator;
  envMap: THREE.Texture;
  dispose: () => void;
}

/**
 * Configures PMREM RoomEnvironment for realistic soft studio lighting reflections.
 */
export function setupStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): StudioEnvironmentHandle {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const roomEnvironment = new RoomEnvironment();
  const envMap = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
  scene.environment = envMap;

  const dispose = () => {
    scene.environment = null;
    envMap.dispose();
    roomEnvironment.dispose();
    pmremGenerator.dispose();
  };

  return {
    pmremGenerator,
    envMap,
    dispose,
  };
}

/**
 * Creates the signature Calmspace soft-clay tactile MeshPhysicalMaterial.
 */
export function createBlobBodyMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xAAA1E2, // Richer lavender keeps the sculpted form legible in soft light
    roughness: 0.48, // Broad, soft highlights read as clay rather than plastic
    metalness: 0.0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.42,
    sheen: 0.42,
    sheenRoughness: 0.62,
    sheenColor: new THREE.Color(0xDCD5FB),
    transmission: 0,
    ior: 1.4,
    reflectivity: 0.32,
  });
}

/**
 * Eye materials: Deep obsidian glossy corneas with dual catchlights.
 */
export function createEyeMaterials() {
  const eyeSocketMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x766AAB,
    roughness: 0.72,
    metalness: 0,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });

  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1A182A, // Deep obsidian / dark plum
    roughness: 0.08,
    metalness: 0.08,
    clearcoat: 0.98,
    clearcoatRoughness: 0.06,
    reflectivity: 0.85,
  });

  const primaryCatchlightMat = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
  });

  const secondaryCatchlightMat = new THREE.MeshBasicMaterial({
    color: 0xF2F0FD,
  });

  return {
    eyeSocketMaterial,
    eyeMaterial,
    primaryCatchlightMat,
    secondaryCatchlightMat,
  };
}

/**
 * 3D clay mouth material.
 */
export function createMouthMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x48436E,
    roughness: 0.38,
    metalness: 0.05,
  });
}

/**
 * Warm peach blush cheek material.
 */
export function createBlushMaterial(): THREE.MeshBasicMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(241, 164, 177, 0.38)');
    gradient.addColorStop(0.48, 'rgba(241, 164, 177, 0.19)');
    gradient.addColorStop(1, 'rgba(241, 164, 177, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    map: texture,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Soft contact shadow ground disc material with high-res radial gradient texture.
 */
export function createShadowMaterial(): { material: THREE.MeshBasicMaterial; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 16, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(35, 33, 56, 0.28)');
    gradient.addColorStop(0.42, 'rgba(85, 84, 184, 0.09)');
    gradient.addColorStop(0.78, 'rgba(185, 178, 240, 0.02)');
    gradient.addColorStop(1, 'rgba(185, 178, 240, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });

  return { material, texture };
}
