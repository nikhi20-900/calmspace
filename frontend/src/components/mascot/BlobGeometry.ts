import * as THREE from 'three';

/**
 * Calmspace Blob Procedural SDF Geometry Generator
 * 
 * Generates an organic, volumetric soft-clay character using a continuous Signed Distance Function (SDF).
 * - Pear/gumdrop organic core with tapered crown and widened lower body
 * - Soft organic lobes blended with polynomial smooth minimum (smin)
 * - Flattened seated base via smooth maximum (smax)
 * - Analytical surface normals computed from central differences gradient of the SDF
 * - Subdivision mesh projection with exact topology preservation
 * - Dynamic volume-preserving squash/stretch and harmonic surface jiggle
 */

// Smooth polynomial minimum for organic lobe blending
export function smin(a: number, b: number, k = 0.42): number {
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

// Smooth polynomial maximum for soft base flattening
export function smax(a: number, b: number, k = 0.26): number {
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

/**
 * Continuous Signed Distance Function (SDF) of the Calmspace Blob.
 * Returns negative value inside the character body, positive outside.
 */
export function blobSDF(x: number, y: number, z: number): number {
  // 1. Organic Pear-shaped Main Core
  // As y goes from -1.5 to +1.5, taper x and z gently toward crown
  const yNorm = y / 1.5;
  const taper = 1.0 - yNorm * 0.12;

  const ex = x / (1.42 * taper);
  const ey = y / 1.48;
  const ez = z / (1.36 * taper);
  let d = (Math.sqrt(ex * ex + ey * ey + ez * ez) - 1.0) * 1.36;

  // 2. Plump Gentle Belly Lobe (front-facing soft volume)
  const bx = x / 1.35;
  const by = (y + 0.35) / 1.15;
  const bz = (z - 0.22) / 1.38;
  const dBelly = (Math.sqrt(bx * bx + by * by + bz * bz) - 1.0) * 1.15;
  d = smin(d, dBelly, 0.38);

  // 3. Left Seated Hip Lobe
  const lx = (x + 0.65) / 0.88;
  const ly = (y + 0.45) / 0.82;
  const lz = z / 0.85;
  const dLeft = (Math.sqrt(lx * lx + ly * ly + lz * lz) - 1.0) * 0.82;

  // 4. Right Seated Hip Lobe (slight natural asymmetry for hand-sculpted clay feel)
  const rx = (x - 0.62) / 0.86;
  const ry = (y + 0.44) / 0.80;
  const rz = (z + 0.02) / 0.84;
  const dRight = (Math.sqrt(rx * rx + ry * ry + rz * rz) - 1.0) * 0.80;

  d = smin(d, dLeft, 0.34);
  d = smin(d, dRight, 0.34);

  // 5. Gentle shoulder rolls keep the silhouette from reading as a uniform egg.
  // They sit slightly behind the face, suggesting a hand-sculpted seated posture.
  const slx = (x + 1.03) / 0.54;
  const sly = (y + 0.16) / 0.66;
  const slz = (z - 0.10) / 0.68;
  const dShoulderLeft = (Math.sqrt(slx * slx + sly * sly + slz * slz) - 1.0) * 0.54;

  const srx = (x - 1.01) / 0.50;
  const sry = (y + 0.13) / 0.62;
  const srz = (z - 0.06) / 0.64;
  const dShoulderRight = (Math.sqrt(srx * srx + sry * sry + srz * srz) - 1.0) * 0.50;

  d = smin(d, dShoulderLeft, 0.24);
  d = smin(d, dShoulderRight, 0.22);

  // 6. Soft Rounded Crown (Head Lobe)
  const hx = x / 1.12;
  const hy = (y - 0.58) / 0.95;
  const hz = z / 1.08;
  const dHead = (Math.sqrt(hx * hx + hy * hy + hz * hz) - 1.0) * 0.95;
  d = smin(d, dHead, 0.30);

  // 7. Hand-Pinched Micro-Asymmetry (Harmonic Surface Ripple)
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len > 0.01) {
    const theta = Math.atan2(z, x);
    const phi = Math.acos(Math.max(-1, Math.min(1, y / len)));
    const organicDisplacement =
      0.012 * Math.sin(2 * theta + 0.4) * Math.cos(2 * phi) +
      0.008 * Math.sin(3 * phi - 0.2) +
      0.006 * Math.sin(3 * theta + 0.7) * Math.sin(phi * 1.4);
    d -= organicDisplacement;
  }

  // 8. Seated Base Flattening (Smooth planar fillet at bottom floor)
  const floorDist = -(y + 1.38);
  d = smax(d, floorDist, 0.28);

  return d;
}

/**
 * Computes exact analytical surface normal from the central difference gradient of the SDF.
 */
export function getSDFNormal(x: number, y: number, z: number, target = new THREE.Vector3()): THREE.Vector3 {
  const eps = 0.002;
  const nx = (blobSDF(x + eps, y, z) - blobSDF(x - eps, y, z)) / (2 * eps);
  const ny = (blobSDF(x, y + eps, z) - blobSDF(x, y - eps, z)) / (2 * eps);
  const nz = (blobSDF(x, y, z + eps) - blobSDF(x, y, z - eps)) / (2 * eps);

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len > 1e-6) {
    target.set(nx / len, ny / len, nz / len);
  } else {
    target.set(0, 1, 0);
  }
  return target;
}

/** Finds the front-facing surface depth at a facial x/y anchor. */
export function getFrontSurfaceZ(x: number, y: number): number {
  let low = 0;
  let high = 2.5;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) * 0.5;
    if (blobSDF(x, y, mid) < 0) low = mid;
    else high = mid;
  }
  return (low + high) * 0.5;
}

/**
 * Root finding along ray direction to locate exact zero-isosurface of the SDF.
 */
export function findSurfaceAlongRay(
  dirX: number,
  dirY: number,
  dirZ: number,
  iterations = 14
): number {
  let tMin = 0.2;
  let tMax = 3.2;

  for (let iter = 0; iter < iterations; iter++) {
    const tMid = (tMin + tMax) * 0.5;
    const d = blobSDF(dirX * tMid, dirY * tMid, dirZ * tMid);
    if (d < 0) {
      tMin = tMid;
    } else {
      tMax = tMid;
    }
  }

  return (tMin + tMax) * 0.5;
}

export interface BlobGeometryData {
  geometry: THREE.BufferGeometry;
  basePositions: Float32Array;
  baseNormals: Float32Array;
}

/**
 * Creates high-fidelity volumetric 3D body geometry by projecting sphere vertices
 * onto the procedural SDF surface and populating exact analytical normals.
 */
export function createBlobBodyGeometry(
  widthSegments = 88,
  heightSegments = 88
): BlobGeometryData {
  const sphereGeom = new THREE.SphereGeometry(1.0, widthSegments, heightSegments);
  const posAttr = sphereGeom.attributes.position as THREE.BufferAttribute;
  const normAttr = sphereGeom.attributes.normal as THREE.BufferAttribute;
  const count = posAttr.count;

  const basePositions = new Float32Array(count * 3);
  const baseNormals = new Float32Array(count * 3);

  const tempNormal = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);

    // Normalize direction from origin
    const len = Math.hypot(vx, vy, vz);
    const dx = len > 0 ? vx / len : 0;
    const dy = len > 0 ? vy / len : 1;
    const dz = len > 0 ? vz / len : 0;

    // Raycast onto SDF zero surface
    const surfaceT = findSurfaceAlongRay(dx, dy, dz);

    const px = dx * surfaceT;
    const py = dy * surfaceT;
    const pz = dz * surfaceT;

    posAttr.setXYZ(i, px, py, pz);
    basePositions[i * 3] = px;
    basePositions[i * 3 + 1] = py;
    basePositions[i * 3 + 2] = pz;

    // Analytical SDF gradient normal
    getSDFNormal(px, py, pz, tempNormal);
    normAttr.setXYZ(i, tempNormal.x, tempNormal.y, tempNormal.z);
    baseNormals[i * 3] = tempNormal.x;
    baseNormals[i * 3 + 1] = tempNormal.y;
    baseNormals[i * 3 + 2] = tempNormal.z;
  }

  posAttr.needsUpdate = true;
  normAttr.needsUpdate = true;

  return {
    geometry: sphereGeom,
    basePositions,
    baseNormals,
  };
}

/**
 * Deforms geometry vertices in real-time for breathing, squash/stretch,
 * and secondary jelly wave jiggle, recalculating smooth normals when needed.
 */
export function deformBlobGeometry(
  geometry: THREE.BufferGeometry,
  basePositions: Float32Array,
  baseNormals: Float32Array,
  time: number,
  breathScale: number,
  jiggleAmount: number
): void {
  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const count = posAttr.count;
  const positions = posAttr.array as Float32Array;

  const normalAttr = geometry.attributes.normal as THREE.BufferAttribute;
  const hasJiggle = Math.abs(jiggleAmount) > 0.001;

  if (!hasJiggle) {
    for (let i = 0; i < count; i++) {
      positions[i * 3] = basePositions[i * 3];
      positions[i * 3 + 1] = basePositions[i * 3 + 1];
      positions[i * 3 + 2] = basePositions[i * 3 + 2];
      normalAttr.setXYZ(i, baseNormals[i * 3], baseNormals[i * 3 + 1], baseNormals[i * 3 + 2]);
    }
    posAttr.needsUpdate = true;
    normalAttr.needsUpdate = true;
    return;
  }

  for (let i = 0; i < count; i++) {
    const ox = basePositions[i * 3];
    const oy = basePositions[i * 3 + 1];
    const oz = basePositions[i * 3 + 2];

    // A tiny traveling pulse follows the sculpted surface normal, like soft clay settling.
    const nx = baseNormals[i * 3];
    const ny = baseNormals[i * 3 + 1];
    const nz = baseNormals[i * 3 + 2];
    const wave = Math.sin(oy * 2.2 - time * 4.2 + ox * 0.55) * jiggleAmount * 0.025;
    positions[i * 3] = ox + nx * wave;
    positions[i * 3 + 1] = oy + ny * wave;
    positions[i * 3 + 2] = oz + nz * wave;
  }

  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Generates eye, cornea, and catchlight geometries.
 */
export function createEyeGeometries() {
  // Oblong Pixar-style glossy eye
  const eyeGeom = new THREE.SphereGeometry(0.125, 32, 28);
  eyeGeom.scale(1, 1.18, 0.75);

  // A shallow clay socket grounds the glossy eyes in the face rather than letting them float.
  const eyeSocketGeom = new THREE.SphereGeometry(0.162, 28, 24);
  eyeSocketGeom.scale(1, 1.13, 0.34);

  // Dual catchlight spheres
  const primaryCatchlightGeom = new THREE.SphereGeometry(0.042, 16, 16);
  const secondaryCatchlightGeom = new THREE.SphereGeometry(0.022, 16, 16);

  return {
    eyeGeom,
    eyeSocketGeom,
    primaryCatchlightGeom,
    secondaryCatchlightGeom,
  };
}

/**
 * Generates 3D curved volumetric mouth geometry using CatmullRom tube.
 */
export function createMouthGeometry(isSmiling = true): THREE.BufferGeometry {
  const points = isSmiling
    ? [
        new THREE.Vector3(-0.15, 0.015, 0),
        new THREE.Vector3(-0.08, -0.045, 0.02),
        new THREE.Vector3(0, -0.072, 0.03),
        new THREE.Vector3(0.08, -0.045, 0.02),
        new THREE.Vector3(0.15, 0.015, 0),
      ]
    : [
        new THREE.Vector3(-0.13, -0.01, 0),
        new THREE.Vector3(-0.06, -0.02, 0.01),
        new THREE.Vector3(0, -0.025, 0.015),
        new THREE.Vector3(0.06, -0.02, 0.01),
        new THREE.Vector3(0.13, -0.01, 0),
      ];

  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, 28, 0.022, 12, false);
}

/**
 * Generates soft blush cheek disc geometry.
 */
export function createBlushGeometry(): THREE.BufferGeometry {
  return new THREE.CircleGeometry(0.15, 32);
}

/**
 * Generates contact shadow plane geometry.
 */
export function createShadowGeometry(): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(2.8, 2.8);
}
