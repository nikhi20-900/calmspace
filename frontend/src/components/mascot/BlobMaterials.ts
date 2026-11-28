import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Calmspace Blob materials, lighting and GPU deformation.
 *
 * - Body: MeshPhysicalMaterial patched via onBeforeCompile. The vertex stage applies
 *   breathing, idle "living clay" noise, jelly lag, wobble modes and a finger poke,
 *   and rebuilds the normal from the displacement gradient, so the CPU never touches
 *   vertex buffers. The fragment stage adds clay tinting, contact AO, a faux
 *   subsurface rim and the cheek blush as a surface decal (no floating discs).
 * - Lighting: one soft studio rig + dimmed RoomEnvironment reflections.
 */

export interface BlobUniforms {
  uTime: THREE.IUniform<number>;
  /** Upper-mass trailing offset (object space), weighted by height² in the shader. */
  uLag: THREE.IUniform<THREE.Vector3>;
  /** Ringing amplitudes of the three surface modes. */
  uWobble: THREE.IUniform<THREE.Vector3>;
  /** xyz = poke centre (object space), w = depth (+dent / -bulge). */
  uPoke: THREE.IUniform<THREE.Vector4>;
  /** Breath 0..1 → shader remaps to -1..1. */
  uBreath: THREE.IUniform<number>;
  /** Amplitude of the organic idle noise (0 under reduced motion). */
  uIdle: THREE.IUniform<number>;
  uBlush: THREE.IUniform<number>;
  uBlushL: THREE.IUniform<THREE.Vector3>;
  uBlushR: THREE.IUniform<THREE.Vector3>;
  /** Smoothed audio reactivity (0..1) for voice/listening ripples. */
  uAudio: THREE.IUniform<number>;
  /** Thinking swirl intensity (0..1). */
  uSwirl: THREE.IUniform<number>;
  /** Subtle RGB state tint offset. */
  uStateTint: THREE.IUniform<THREE.Vector3>;
}

export function createBlobUniforms(): BlobUniforms {
  return {
    uTime: { value: 0 },
    uLag: { value: new THREE.Vector3() },
    uWobble: { value: new THREE.Vector3() },
    uPoke: { value: new THREE.Vector4(0, 0, 1.4, 0) },
    uBreath: { value: 0 },
    uIdle: { value: 1 },
    uBlush: { value: 0.52 },
    uBlushL: { value: new THREE.Vector3(-0.74, 0.06, 1.2) },
    uBlushR: { value: new THREE.Vector3(0.74, 0.06, 1.2) },
    uAudio: { value: 0 },
    uSwirl: { value: 0 },
    uStateTint: { value: new THREE.Vector3(0, 0, 0) },
  };
}

/* -------------------------------------------------------------------------- */
/* Studio environment + lights                                                 */
/* -------------------------------------------------------------------------- */

export interface StudioEnvironmentHandle {
  dispose: () => void;
}

/** Soft PMREM reflections (RoomEnvironment), dimmed so direct lights keep their shape. */
export function setupStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): StudioEnvironmentHandle {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const target = pmrem.fromScene(room, 0.04);
  scene.environment = target.texture;
  scene.environmentIntensity = 0.42;

  // The generator and source scene are only needed to bake the map.
  room.dispose();
  pmrem.dispose();

  return {
    dispose: () => {
      if (scene.environment === target.texture) scene.environment = null;
      target.dispose();
    },
  };
}

/** Warm key, cool fill, lavender rim and a faint floor bounce. No RectAreaLight (needs LTC init, costly on mobile). */
export function createLightRig(): THREE.Group {
  const rig = new THREE.Group();
  rig.name = 'blob_light_rig';

  rig.add(new THREE.HemisphereLight(0xf1eeff, 0x5f5684, 0.2));

  const key = new THREE.DirectionalLight(0xfff0e2, 2.7);
  key.position.set(4.8, 5.2, 2.6);
  rig.add(key);

  const softTopLeft = new THREE.DirectionalLight(0xe9e2ff, 0.4);
  softTopLeft.position.set(-4.4, 2.8, 3.2);
  rig.add(softTopLeft);

  const fill = new THREE.DirectionalLight(0xc8d3fb, 0.2);
  fill.position.set(-4.0, 0.2, 2.5);
  rig.add(fill);

  const rim = new THREE.DirectionalLight(0xd6cdfc, 1.5);
  rim.position.set(0.5, 3.8, -4.5);
  rig.add(rim);

  const bounce = new THREE.DirectionalLight(0xf2c9b8, 0.2);
  bounce.position.set(0, -3.5, 1.5);
  rig.add(bounce);

  return rig;
}

/* -------------------------------------------------------------------------- */
/* Body material                                                               */
/* -------------------------------------------------------------------------- */

const VERTEX_HEADER = /* glsl */ `
uniform float uTime;
uniform vec3 uLag;
uniform vec3 uWobble;
uniform vec4 uPoke;
uniform float uBreath;
uniform float uIdle;
uniform float uAudio;
uniform float uSwirl;
varying vec3 vBlobPos;

// Scalar displacement along the surface normal at base position p.
float blobField(vec3 p, vec3 n) {
  float h = clamp((p.y + 1.4) / 2.9, 0.0, 1.0);

  // Keep the face calm so eyes/mouth never sink into the clay.
  float face = exp(-(p.x * p.x / 0.8 + (p.y - 0.2) * (p.y - 0.2) / 0.45)) * smoothstep(0.2, 0.7, n.z);
  float calm = 1.0 - 0.7 * face;

  // Slow, incommensurate sines: hand-pinched clay that never repeats exactly.
  float t = uTime;
  float living =
      sin(p.x * 1.7 + t * 0.35) * sin(p.y * 1.3 - t * 0.27 + 1.7) * sin(p.z * 1.9 + t * 0.31 + 0.6)
    + 0.5 * sin(p.x * 3.1 - p.z * 2.3 + t * 0.5) * sin(p.y * 2.7 + 2.1);
  float d = uIdle * 0.02 * living;

  // Voice & microphone harmonic ripple (gentle, organic)
  float voiceWave = sin(p.y * 4.2 - t * 6.5) * cos(p.x * 3.1 + t * 4.0) * 0.045;
  d += uAudio * (0.022 + voiceWave);

  // Thinking swirl wave
  float swirlWave = sin(atan(p.z, p.x) * 2.0 + p.y * 2.4 - t * 2.8) * 0.024;
  d += uSwirl * swirlWave;

  // Breathing fills the belly/front more than the crown.
  float b = uBreath * 2.0 - 1.0;
  d += b * (0.012 + 0.02 * smoothstep(-0.2, 1.0, n.z) * (1.0 - h));

  // Underdamped ringing after taps and releases.
  d += uWobble.x * 0.05 * sin(p.y * 2.6 + 0.6);
  d += uWobble.y * 0.045 * sin(p.x * 2.2 + p.z * 1.4);
  d += uWobble.z * 0.05 * (0.6 + 0.4 * (1.0 - h));
  d *= calm;

  // Finger poke: gaussian dent with a faint raised rim (clay displaced sideways).
  vec3 q = p - uPoke.xyz;
  float r = length(q);
  float dent = exp(-(r * r) / 0.3);
  float rim = exp(-pow((r - 0.8) / 0.28, 2.0));
  d -= uPoke.w * (dent - 0.28 * rim) * (1.0 - 0.6 * face);

  return d;
}
`;

const VERTEX_NORMAL = /* glsl */ `
#include <beginnormal_vertex>
vec3 blobPos = position;
{
  vec3 bn = normalize(normal);
  vec3 bt = normalize(abs(bn.y) < 0.95 ? cross(bn, vec3(0.0, 1.0, 0.0)) : cross(bn, vec3(1.0, 0.0, 0.0)));
  vec3 bb = cross(bn, bt);
  float e = 0.03;
  float d0 = blobField(position, bn);
  float d1 = blobField(position + bt * e, bn);
  float d2 = blobField(position + bb * e, bn);
  // Normal of the displaced surface = base normal tilted against the field gradient.
  objectNormal = normalize(bn - bt * ((d1 - d0) / e) - bb * ((d2 - d0) / e));
  float hh = clamp((position.y + 1.4) / 2.9, 0.0, 1.0);
  blobPos = position + bn * d0 + uLag * hh * hh;
  vBlobPos = position;
}
`;

const FRAGMENT_HEADER = /* glsl */ `
uniform float uBlush;
uniform vec3 uBlushL;
uniform vec3 uBlushR;
uniform vec3 uStateTint;
varying vec3 vBlobPos;
`;

const FRAGMENT_COLOR = /* glsl */ `
#include <color_fragment>
{
  vec3 bp = vBlobPos;
  vec3 col = diffuseColor.rgb + uStateTint;

  // Crown a touch lighter, base a touch deeper: reads as volume, not a flat fill.
  col *= mix(0.85, 1.05, smoothstep(-1.45, 1.35, bp.y));

  // Shimmer-free low-frequency mottling, like unevenly pigmented clay.
  float mott = sin(bp.x * 5.3 + bp.y * 2.1) * sin(bp.y * 6.7 - bp.z * 3.3 + 1.3) * sin(bp.z * 4.9 + bp.x * 2.7);
  col *= 1.0 + 0.03 * mott;

  // Contact occlusion where the body meets the floor.
  col *= mix(0.72, 1.0, smoothstep(-1.45, -0.55, bp.y));

  // Cheek blush baked into the albedo so it follows the surface and gets lit with it.
  vec3 dl = bp - uBlushL;
  vec3 dr = bp - uBlushR;
  dl.y *= 1.25;
  dr.y *= 1.25;
  float bl = exp(-dot(dl, dl) / 0.026) + exp(-dot(dr, dr) / 0.026);
  col = mix(col, vec3(0.88, 0.37, 0.44), clamp(bl, 0.0, 1.0) * uBlush * 0.62);

  diffuseColor.rgb = col;
}
`;

const FRAGMENT_OUTPUT = /* glsl */ `
{
  // Faux subsurface scattering: warm lavender glow bleeding through thin silhouette
  // areas, strongest on the lit (upper) side, plus a whisper of peach floor bounce.
  float ndv = saturate(dot(normal, geometryViewDir));
  float rimTerm = pow(1.0 - ndv, 2.4);
  float upward = saturate(normal.y * 0.5 + 0.5);
  outgoingLight += vec3(0.30, 0.20, 0.52) * rimTerm * (0.3 + 0.7 * upward) * 0.55;
  outgoingLight += vec3(0.30, 0.17, 0.13) * saturate(-normal.y) * 0.1;
}
#include <opaque_fragment>
`;

export function createBlobBodyMaterial(uniforms: BlobUniforms, color = 0xa79de3): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color, // lavender is the default identity; companion profiles may choose another tint
    roughness: 0.52,
    metalness: 0.0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.45,
    sheen: 0.55,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(0xdcd5fb),
    ior: 1.4,
    reflectivity: 0.3,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEADER}`)
      .replace('#include <beginnormal_vertex>', VERTEX_NORMAL)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = blobPos;');

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_HEADER}`)
      .replace('#include <color_fragment>', FRAGMENT_COLOR)
      .replace('#include <opaque_fragment>', FRAGMENT_OUTPUT);
  };
  material.customProgramCacheKey = () => 'calmspace-blob-body-v3';

  return material;
}

/* -------------------------------------------------------------------------- */
/* Face + shadow                                                               */
/* -------------------------------------------------------------------------- */

/** Eye materials: deep obsidian glossy corneas with dual catchlights. */
export function createEyeMaterials() {
  const eyeSocketMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x766aab,
    roughness: 0.72,
    metalness: 0,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });

  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1a182a,
    roughness: 0.08,
    metalness: 0.08,
    clearcoat: 0.98,
    clearcoatRoughness: 0.06,
    reflectivity: 0.85,
  });

  const primaryCatchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const secondaryCatchlightMat = new THREE.MeshBasicMaterial({ color: 0xf2f0fd, toneMapped: false });

  return { eyeSocketMaterial, eyeMaterial, primaryCatchlightMat, secondaryCatchlightMat };
}

/** 3D clay mouth material. */
export function createMouthMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x48436e, roughness: 0.38, metalness: 0.05 });
}

/**
 * Contact shadow: a tight, dark core (ambient occlusion where clay meets floor)
 * layered over a wide, soft penumbra. The controller scales/fades it with lift.
 */
export function createShadowMaterial(): { material: THREE.MeshBasicMaterial; texture: THREE.CanvasTexture } {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = size / 2;
    const penumbra = ctx.createRadialGradient(c, c, 8, c, c, c);
    penumbra.addColorStop(0, 'rgba(70, 58, 130, 0.30)');
    penumbra.addColorStop(0.45, 'rgba(90, 76, 160, 0.14)');
    penumbra.addColorStop(0.8, 'rgba(120, 106, 190, 0.04)');
    penumbra.addColorStop(1, 'rgba(120, 106, 190, 0)');
    ctx.fillStyle = penumbra;
    ctx.fillRect(0, 0, size, size);

    const core = ctx.createRadialGradient(c, c, 4, c, c, c * 0.62);
    core.addColorStop(0, 'rgba(36, 28, 76, 0.55)');
    core.addColorStop(0.55, 'rgba(36, 28, 76, 0.26)');
    core.addColorStop(1, 'rgba(36, 28, 76, 0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
  });

  return { material, texture };
}
