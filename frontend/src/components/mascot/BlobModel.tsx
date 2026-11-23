import * as THREE from 'three';
import { createBlobEyes, EyeController } from './BlobEyes';

export interface BlobModelOutput {
  rootGroup: THREE.Group;
  bodyMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  eyeController: EyeController;
  updateDeformation: (time: number, breathScale: number, jiggleAmount: number) => void;
}

export function createBlobCharacter(): BlobModelOutput {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'calmspace_blob_root';

  // 1. ORGANIC VOLUMETRIC SCULPTED GEOMETRY
  // 80x80 subdivision for silky curvature and smooth deformation
  const baseRadius = 1.52;
  const geom = new THREE.SphereGeometry(baseRadius, 80, 80);
  const posAttr = geom.attributes.position as THREE.BufferAttribute;
  const count = posAttr.count;

  // Sculpting pass: organic pear/gumdrop silhouette with seated flat base
  const sculptedPositions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    let z = posAttr.getZ(i);

    const length = Math.sqrt(x * x + y * y + z * z);
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;

    // A. Pear silhouette: widen bottom, gently taper top crown
    const yNorm = y / baseRadius; // -1 to 1
    const pearFactor = 1.0 - yNorm * 0.14;
    x *= pearFactor;
    z *= pearFactor;

    // B. Seated base flattening (organic bevel at bottom)
    if (y < -0.2) {
      const bottomDepth = Math.abs(y / baseRadius);
      y = y * 0.84;
      x *= (1.0 + bottomDepth * 0.1);
      z *= (1.0 + bottomDepth * 0.1);
    }

    // C. Organic micro-asymmetry (hand-pinched soft clay feel)
    const theta = Math.atan2(nz, nx);
    const phi = Math.acos(Math.max(-1, Math.min(1, ny)));
    const organicRipple = 0.032 * Math.sin(2 * theta) * Math.cos(2 * phi) +
                          0.018 * Math.sin(3 * phi);

    const currentRadius = baseRadius * (1.0 + organicRipple);
    x = nx * currentRadius * pearFactor;
    z = nz * currentRadius * pearFactor;

    posAttr.setXYZ(i, x, y, z);
    sculptedPositions[i * 3] = x;
    sculptedPositions[i * 3 + 1] = y;
    sculptedPositions[i * 3 + 2] = z;
  }

  geom.computeVertexNormals();

  // 2. TACTILE SOFT-CLAY PHYSICAL MATERIAL
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xB9B2F0, // Calmspace Mascot Lavender
    roughness: 0.35,
    metalness: 0.0,
    clearcoat: 0.32,
    clearcoatRoughness: 0.2,
    sheen: 0.85,
    sheenRoughness: 0.28,
    sheenColor: 0xE9E7FB,
    transmission: 0.06,
    ior: 1.44,
    reflectivity: 0.5,
  });

  const bodyMesh = new THREE.Mesh(geom, bodyMaterial);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = false;

  // 3. EYES AND EXPRESSIONS
  const eyeController = createBlobEyes();
  bodyMesh.add(eyeController.group);

  // 4. SOFT CONTACT SHADOW (Dynamic Ground Disc)
  const shadowGeom = new THREE.PlaneGeometry(2.6, 2.6);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(64, 64, 12, 64, 64, 64);
    grad.addColorStop(0, 'rgba(37, 35, 59, 0.26)');
    grad.addColorStop(0.45, 'rgba(85, 84, 184, 0.09)');
    grad.addColorStop(1, 'rgba(85, 84, 184, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
  }
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -1.62;

  rootGroup.add(bodyMesh, shadowMesh);

  // 5. LIVING SURFACE DEFORMATION & JIGGLE
  function updateDeformation(time: number, breathScale: number, jiggleAmount: number) {
    // Dynamic breathing scale with subtle harmonic breathing phase
    bodyMesh.scale.set(
      breathScale,
      breathScale * 0.98 + 0.02 * Math.sin(time * 1.6),
      breathScale
    );

    // Dynamic secondary jelly surface ripple when jiggle is active
    if (Math.abs(jiggleAmount) > 0.005) {
      const positions = posAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const ox = sculptedPositions[i * 3];
        const oy = sculptedPositions[i * 3 + 1];
        const oz = sculptedPositions[i * 3 + 2];

        // Vertical harmonic wave traveling from bottom to top
        const wave = Math.sin(oy * 3.2 - time * 8.0) * jiggleAmount * 0.04;
        positions[i * 3] = ox * (1 + wave);
        positions[i * 3 + 1] = oy * (1 - wave * 0.5);
        positions[i * 3 + 2] = oz * (1 + wave);
      }
      posAttr.needsUpdate = true;
      geom.computeVertexNormals();
    }

    // Dynamic contact shadow responding to height and squash
    const floatY = bodyMesh.position.y;
    const shadowScale = Math.max(0.5, (1.0 - floatY * 0.22) * bodyMesh.scale.x);
    shadowMesh.scale.setScalar(shadowScale);
    shadowMat.opacity = Math.max(0.25, 0.82 - floatY * 0.35);
  }

  return {
    rootGroup,
    bodyMesh,
    shadowMesh,
    eyeController,
    updateDeformation,
  };
}
