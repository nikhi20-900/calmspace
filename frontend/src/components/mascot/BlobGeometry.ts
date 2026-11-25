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
 *
 * The projected base mesh is built once per quality tier and cached. All runtime
 * deformation (breathing, jelly, poke) happens on the GPU in the body material.
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
  /** Lowest point of the base mesh; the squash pivot and shadow height derive from it. */
  minY: number;
}

interface BlobBaseMesh {
  positions: Float32Array;
  normals: Float32Array;
  index: Uint16Array | Uint32Array;
  minY: number;
}

const baseMeshCache = new Map<string, BlobBaseMesh>();

/**
 * Projects a UV sphere onto the SDF zero surface (ray from origin + bisection) and
 * stores analytic SDF-gradient normals. Result is cached per segment count, so
 * remounts, StrictMode double-mounts and HMR never pay the CPU cost twice.
 */
function getBlobBaseMesh(widthSegments: number, heightSegments: number): BlobBaseMesh {
  const key = `${widthSegments}x${heightSegments}`;
  const cached = baseMeshCache.get(key);
  if (cached) return cached;

  const sphere = new THREE.SphereGeometry(1.0, widthSegments, heightSegments);
  const src = sphere.attributes.position as THREE.BufferAttribute;
  const count = src.count;

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const n = new THREE.Vector3();
  let minY = Infinity;

  for (let i = 0; i < count; i++) {
    const vx = src.getX(i);
    const vy = src.getY(i);
    const vz = src.getZ(i);
    const len = Math.hypot(vx, vy, vz) || 1;
    const dx = vx / len;
    const dy = vy / len;
    const dz = vz / len;

    const t = findSurfaceAlongRay(dx, dy, dz);
    const px = dx * t;
    const py = dy * t;
    const pz = dz * t;
    positions[i * 3] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;
    if (py < minY) minY = py;

    getSDFNormal(px, py, pz, n);
    normals[i * 3] = n.x;
    normals[i * 3 + 1] = n.y;
    normals[i * 3 + 2] = n.z;
  }

  const srcIndex = sphere.index!.array;
  const index = count > 65535 ? new Uint32Array(srcIndex) : new Uint16Array(srcIndex);
  sphere.dispose();

  const base: BlobBaseMesh = { positions, normals, index, minY };
  baseMeshCache.set(key, base);
  return base;
}

/**
 * Creates the body geometry. Attribute arrays are shared (read-only) between
 * instances, so disposing one geometry only frees its own GPU buffers.
 */
export function createBlobBodyGeometry(widthSegments = 96, heightSegments = 96): BlobGeometryData {
  const base = getBlobBaseMesh(widthSegments, heightSegments);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(base.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(base.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(base.index, 1));
  // Shader displacement can leave the static bounds; the mesh is also marked
  // frustumCulled = false, this keeps picking/bounds sane.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2.4);
  geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-2, -2, -2), new THREE.Vector3(2, 2, 2));
  return { geometry, minY: base.minY };
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
 * Generates contact shadow plane geometry.
 */
export function createShadowGeometry(): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(1, 1);
}
