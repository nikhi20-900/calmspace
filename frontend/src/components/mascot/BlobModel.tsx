import * as THREE from 'three';
import { createBlobEyes, EyeController } from './BlobEyes';

export interface BlobModelOutput {
  rootGroup: THREE.Group;
  bodyMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  eyeController: EyeController;
  updateDeformation: (time: number, breathScale: number) => void;
}

export function createBlobCharacter(): BlobModelOutput {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'calmspace_blob';

  // 1. ORGANIC VOLUMETRIC BODY GEOMETRY
  // 64x64 Sphere with procedural soft-clay sculpting
  const baseRadius = 1.5;
  const geom = new THREE.SphereGeometry(baseRadius, 64, 64);
  const posAttr = geom.attributes.position as THREE.BufferAttribute;
  const originalPositions = posAttr.array.slice(); // clone original positions

  // Sculpting pass: organic teardrop / pear shape with flattened base
  for (let i = 0; i < posAttr.count; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    let z = posAttr.getZ(i);

    // Normalize distance from origin
    const length = Math.sqrt(x * x + y * y + z * z);
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;

    // 1. Slightly widen bottom, narrow upper crown (gentle pear silhouette)
    const yFactor = (y / baseRadius); // -1 to 1
    const widthMultiplier = 1.0 - yFactor * 0.12;
    x *= widthMultiplier;
    z *= widthMultiplier;

    // 2. Flatten base for cute seated posture
    if (y < -0.3) {
      const flattenFactor = Math.abs(y / baseRadius);
      y = y * 0.82;
      x *= (1.0 + flattenFactor * 0.08);
      z *= (1.0 + flattenFactor * 0.08);
    }

    // 3. Subtle organic asymmetry (soft clay feel)
    const theta = Math.atan2(nz, nx);
    const phi = Math.acos(ny);
    const harmonicWobble = 0.035 * Math.sin(2 * theta) * Math.cos(2 * phi) +
                           0.02 * Math.sin(3 * phi);

    const radius = baseRadius * (1.0 + harmonicWobble);
    x = nx * radius * widthMultiplier;
    z = nz * radius * widthMultiplier;

    posAttr.setXYZ(i, x, y, z);
  }

  geom.computeVertexNormals();

  // 2. PREMIUM SOFT-LAVENDER MATERIAL
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xB9B2F0, // Official Mascot Lavender token
    roughness: 0.34,
    metalness: 0.0,
    clearcoat: 0.28,
    clearcoatRoughness: 0.18,
    sheen: 0.55,
    sheenColor: 0xE9E7FB,
    transmission: 0.06,
    ior: 1.42,
  });

  const bodyMesh = new THREE.Mesh(geom, bodyMaterial);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = false;

  // 3. EYES CONTROLLER
  const eyeController = createBlobEyes();
  bodyMesh.add(eyeController.group);

  // 4. SOFT CONTACT SHADOW (Floating below blob)
  const shadowGeom = new THREE.PlaneGeometry(2.4, 2.4);
  // Create circular soft alpha canvas texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, 'rgba(37, 35, 59, 0.22)');
    grad.addColorStop(0.5, 'rgba(85, 84, 184, 0.08)');
    grad.addColorStop(1, 'rgba(85, 84, 184, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
  }
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -1.62;

  rootGroup.add(bodyMesh, shadowMesh);

  // Dynamic vertex micro-undulation (living organic surface)
  function updateDeformation(time: number, breathScale: number) {
    // breathScale applies a subtle harmonic breathe wave
    bodyMesh.scale.set(
      breathScale,
      breathScale * 0.98 + 0.02 * Math.sin(time * 1.5),
      breathScale
    );

    // Adjust contact shadow based on height
    const floatHeight = bodyMesh.position.y;
    shadowMesh.scale.setScalar(Math.max(0.6, 1.0 - floatHeight * 0.2));
    shadowMat.opacity = Math.max(0.3, 0.8 - floatHeight * 0.3);
  }

  return {
    rootGroup,
    bodyMesh,
    shadowMesh,
    eyeController,
    updateDeformation,
  };
}
