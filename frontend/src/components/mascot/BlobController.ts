import * as THREE from 'three';
import {
  createBlobBodyGeometry,
  createEyeGeometries,
  createMouthGeometry,
  createShadowGeometry,
  getFrontSurfaceZ,
} from './BlobGeometry';
import {
  BlobUniforms,
  createBlobBodyMaterial,
  createBlobUniforms,
  createEyeMaterials,
  createMouthMaterial,
  createShadowMaterial,
} from './BlobMaterials';
import { BlobAnimationController, BlobAnimationState } from './BlobAnimations';
import { BlobPhysicsController } from './BlobPhysics';

export interface BlobQuality {
  /** Sphere segments for the body mesh (width = height). */
  segments: number;
}

export const BLOB_QUALITY_HIGH: BlobQuality = { segments: 96 };
export const BLOB_QUALITY_MOBILE: BlobQuality = { segments: 72 };

// Face anchors in body object space
const LEFT_EYE = new THREE.Vector2(-0.48, 0.24);
const RIGHT_EYE = new THREE.Vector2(0.48, 0.24);
const MOUTH = new THREE.Vector2(0, -0.02);
const BLUSH_L = new THREE.Vector2(-0.74, 0.06);
const BLUSH_R = new THREE.Vector2(0.74, 0.06);

/** Same weighting as the body shader's jelly lag: the crown trails, the base stays put. */
const lagWeight = (y: number) => {
  const h = THREE.MathUtils.clamp((y + 1.4) / 2.9, 0, 1);
  return h * h;
};

/** Approximate radius of the flattened base footprint. */
const BASE_RADIUS = 1.1;

const _lag = new THREE.Vector3();
const _hit = new THREE.Vector3();

export class BlobController {
  // Three.js hierarchy
  readonly rootGroup: THREE.Group;
  readonly bodyMesh: THREE.Mesh;
  readonly shadowMesh: THREE.Mesh;

  // Face
  readonly faceGroup: THREE.Group;
  readonly leftEyeGroup: THREE.Group;
  readonly rightEyeGroup: THREE.Group;
  readonly leftPupil: THREE.Group;
  readonly rightPupil: THREE.Group;
  readonly mouthMesh: THREE.Mesh;

  readonly physics = new BlobPhysicsController();
  readonly animController = new BlobAnimationController();
  readonly uniforms: BlobUniforms = createBlobUniforms();

  private readonly minY: number;
  private readonly floorY: number;
  private readonly leftEyeBase = new THREE.Vector3();
  private readonly rightEyeBase = new THREE.Vector3();
  private readonly mouthBase = new THREE.Vector3();
  private readonly shadowTexture: THREE.CanvasTexture;
  private disposed = false;
  private voiceLevel = 0;
  private targetVoiceLevel = 0;

  constructor(quality: BlobQuality = BLOB_QUALITY_HIGH, bodyColor = 0xa79de3) {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'calmspace_mascot_root';

    // 1. Body (procedural SDF mesh, GPU-deformed)
    const { geometry, minY } = createBlobBodyGeometry(quality.segments, quality.segments);
    this.minY = minY;
    this.floorY = minY - 0.01;
    this.bodyMesh = new THREE.Mesh(geometry, createBlobBodyMaterial(this.uniforms, bodyColor));
    this.bodyMesh.name = 'blob_body';
    this.bodyMesh.frustumCulled = false; // shader displacement leaves the static bounds

    // 2. Face
    this.faceGroup = new THREE.Group();
    this.faceGroup.name = 'face_group';

    const eyeGeoms = createEyeGeometries();
    const eyeMats = createEyeMaterials();

    const buildEye = (anchor: THREE.Vector2, base: THREE.Vector3) => {
      const group = new THREE.Group();
      base.set(anchor.x, anchor.y, getFrontSurfaceZ(anchor.x, anchor.y) + 0.055);
      group.position.copy(base);

      const pupil = new THREE.Group();
      const socket = new THREE.Mesh(eyeGeoms.eyeSocketGeom, eyeMats.eyeSocketMaterial);
      socket.position.z = -0.042;
      const eye = new THREE.Mesh(eyeGeoms.eyeGeom, eyeMats.eyeMaterial);
      const catchPrimary = new THREE.Mesh(eyeGeoms.primaryCatchlightGeom, eyeMats.primaryCatchlightMat);
      catchPrimary.position.set(0.038, 0.046, 0.088);
      const catchSecondary = new THREE.Mesh(eyeGeoms.secondaryCatchlightGeom, eyeMats.secondaryCatchlightMat);
      catchSecondary.position.set(-0.032, -0.038, 0.082);
      pupil.add(socket, eye, catchPrimary, catchSecondary);
      group.add(pupil);
      return { group, pupil };
    };

    const left = buildEye(LEFT_EYE, this.leftEyeBase);
    const right = buildEye(RIGHT_EYE, this.rightEyeBase);
    this.leftEyeGroup = left.group;
    this.leftPupil = left.pupil;
    this.rightEyeGroup = right.group;
    this.rightPupil = right.pupil;

    this.mouthBase.set(MOUTH.x, MOUTH.y, getFrontSurfaceZ(MOUTH.x, MOUTH.y) + 0.03);
    this.mouthMesh = new THREE.Mesh(createMouthGeometry(true), createMouthMaterial());
    this.mouthMesh.position.copy(this.mouthBase);

    // Cheek blush lives in the body shader; give it surface-anchored centres.
    this.uniforms.uBlushL.value.set(BLUSH_L.x, BLUSH_L.y, getFrontSurfaceZ(BLUSH_L.x, BLUSH_L.y));
    this.uniforms.uBlushR.value.set(BLUSH_R.x, BLUSH_R.y, getFrontSurfaceZ(BLUSH_R.x, BLUSH_R.y));

    this.faceGroup.add(this.leftEyeGroup, this.rightEyeGroup, this.mouthMesh);
    this.bodyMesh.add(this.faceGroup);

    // 3. Contact shadow
    const { material: shadowMat, texture } = createShadowMaterial();
    this.shadowTexture = texture;
    this.shadowMesh = new THREE.Mesh(createShadowGeometry(), shadowMat);
    this.shadowMesh.name = 'blob_contact_shadow';
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = this.floorY - 0.002;
    this.shadowMesh.renderOrder = -1;
    this.shadowMesh.scale.set(3.6, 2.7, 1);

    this.rootGroup.add(this.bodyMesh, this.shadowMesh);
  }

  /* ------------------------------ public control ------------------------------ */

  setExpression(state: BlobAnimationState) {
    this.animController.setState(state);
  }

  setAudioLevel(level: number) {
    this.animController.setAudioLevel(level);
  }

  setExternalBreath(phase01: number | null) {
    this.animController.setExternalBreath(phase01);
  }

  /** Smooth microphone activity into a small, volume-preserving body pulse. */
  setVoiceLevel(level: number) {
    this.targetVoiceLevel = THREE.MathUtils.clamp(level, 0, 1);
  }

  /** `active` = a real target (pointer / CTA); otherwise the eyes idle-wander. */
  setGaze(normX: number, normY: number, active = true) {
    this.animController.setTargetGaze(normX, normY, active);
  }

  setReducedMotion(reduced: boolean) {
    this.physics.reducedMotion = reduced;
  }

  /** Tactile squash on a tap or key press. */
  tap(intensity = 1) {
    this.physics.tap(intensity);
    this.animController.pulse(0.9 * intensity);
    this.animController.blinkNow();
  }

  /** Finger lands. Pass a raycaster aimed through the pointer to dent the real surface point. */
  press(raycaster?: THREE.Raycaster) {
    let point: THREE.Vector3 | null = null;
    if (raycaster) {
      this.bodyMesh.updateWorldMatrix(true, false);
      const hit = raycaster.intersectObject(this.bodyMesh, false)[0];
      if (hit) point = this.bodyMesh.worldToLocal(_hit.copy(hit.point)).clone();
    }
    this.physics.press(point);
  }

  updateDrag(dx: number, dy: number) {
    this.physics.updateDrag(dx, dy);
  }

  /** Release after a drag or a press: springs home with a jelly rebound. */
  release(wasTap: boolean) {
    this.physics.release();
    if (wasTap) this.tap(0.8);
    else this.animController.pulse(0.6);
  }

  /** True when nothing is moving, so the render loop may sleep (reduced motion). */
  isSettled(): boolean {
    return this.physics.isSettled();
  }

  /* ------------------------------ per-frame update ------------------------------ */

  step(dt: number, totalTime: number, isReducedMotion = false) {
    const ph = this.physics;
    ph.reducedMotion = isReducedMotion;
    ph.step(dt);

    const pose = this.animController.update(dt, totalTime, isReducedMotion);
    this.voiceLevel +=
      (this.targetVoiceLevel - this.voiceLevel) * (1 - Math.exp(-10 * dt));

    // --- Body transform: volume-preserving, planted on the floor -----------------------
    const breathDelta = pose.breatheScale - 1;
    const voicePulse = this.voiceLevel * 0.055;
    let sx = ph.scaleX.value * (1 + breathDelta * 0.78 + voicePulse * 0.55);
    let sy = ph.scaleY.value * (1 + breathDelta * 0.46 + voicePulse);
    let sz = ph.scaleZ.value * (1 + breathDelta * 1.08 + voicePulse * 0.2);
    // Keep the clay's volume (≈ constant): squash must bulge elsewhere. A tiny residual
    // is allowed so breathing still reads as the body filling with air.
    const volume = Math.cbrt(sx * sy * sz) / (1 + breathDelta * 0.55);
    const norm = 1 / Math.max(volume, 0.5);
    sx *= norm;
    sy *= norm;
    sz *= norm;
    this.bodyMesh.scale.set(sx, sy, sz);

    // The hover cycle swings ±0.045; offset it so the base only ever rises off the floor.
    const lift = Math.max(0, pose.floatElevation + 0.06);
    const rotX = ph.rotX.value + pose.lookTiltX;
    const rotY = ph.rotY.value + pose.lookTiltY;
    const rotZ = ph.rotZ.value + pose.bodyRoll;
    // Scale and rotation pivot about the body centre. Compensate so the base stays on the
    // floor: squash keeps the bottom planted, and tilting lifts the body onto its low edge
    // instead of sinking that edge into the floor.
    const tilt = Math.min(Math.hypot(rotX, rotZ), 0.6);
    const tiltLift = BASE_RADIUS * Math.sin(tilt);
    this.bodyMesh.position.set(ph.posX.value, lift + this.minY * (1 - sy) + tiltLift, 0);
    this.bodyMesh.rotation.set(rotX, rotY, rotZ);

    // --- Shader uniforms (GPU jelly) ---------------------------------------------------
    const u = this.uniforms;
    u.uTime.value = totalTime;
    u.uIdle.value = isReducedMotion ? 0 : 1;
    u.uBreath.value = pose.breath;
    u.uBlush.value = pose.blushOpacity;
    u.uAudio.value = pose.audioLevel;
    u.uSwirl.value = pose.swirlAmount;
    u.uStateTint.value.set(pose.tintR, pose.tintG, pose.tintB);
    _lag.set(ph.lagX.value, ph.lagY.value, ph.lagZ.value);
    u.uLag.value.copy(_lag);
    u.uWobble.value.set(ph.wobble0.value, ph.wobble1.value, ph.wobble2.value);
    u.uPoke.value.set(ph.pokeCenter.x, ph.pokeCenter.y, ph.pokeCenter.z, ph.pokeDepth.value);

    // --- Face follows the jelly lag so features never slide off the surface -------------
    this.leftEyeGroup.position.copy(this.leftEyeBase).addScaledVector(_lag, lagWeight(LEFT_EYE.y));
    this.rightEyeGroup.position.copy(this.rightEyeBase).addScaledVector(_lag, lagWeight(RIGHT_EYE.y));
    this.mouthMesh.position.copy(this.mouthBase).addScaledVector(_lag, lagWeight(MOUTH.y));

    // --- Eyes --------------------------------------------------------------------------
    const eyeY = BlobAnimationController.eyeScaleY(pose);
    this.leftEyeGroup.scale.set(pose.eyeSizeScale, eyeY, 1);
    this.rightEyeGroup.scale.set(pose.eyeSizeScale, eyeY, 1);
    this.leftEyeGroup.rotation.z = -pose.eyeAngleZ;
    this.rightEyeGroup.rotation.z = pose.eyeAngleZ;

    // Pointer up → eyes up (positive Y). Eyes are slightly asymmetric, like a relaxed gaze.
    const maxX = 0.085;
    const maxY = 0.065;
    const gx = THREE.MathUtils.clamp(pose.pupilX * 0.11, -maxX, maxX);
    const gy = THREE.MathUtils.clamp(pose.pupilY * 0.09, -maxY, maxY);
    this.leftPupil.position.set(gx, gy, 0);
    this.rightPupil.position.set(gx * 0.92, gy * 0.96, 0);

    // --- Mouth -------------------------------------------------------------------------
    this.mouthMesh.scale.set(pose.mouthScaleX, pose.mouthScaleY, 1);

    // --- Contact shadow: tightens + darkens near the floor, widens + fades when lifted ---
    const clearance = lift;
    const spread = 1 + clearance * 0.9;
    const shadowMat = this.shadowMesh.material as THREE.MeshBasicMaterial;
    this.shadowMesh.position.x = ph.posX.value * 0.9;
    this.shadowMesh.scale.set(3.6 * sx * spread, 2.7 * sz * spread, 1);
    shadowMat.opacity = THREE.MathUtils.clamp(0.95 - clearance * 2.2, 0.35, 0.95);
  }

  /* ------------------------------ teardown ------------------------------ */

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.rootGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => materials.add(m));
      else if (mat) materials.add(mat);
    });

    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => {
      const map = (m as THREE.MeshBasicMaterial).map;
      map?.dispose();
      m.dispose();
    });
    this.shadowTexture.dispose();
    this.rootGroup.removeFromParent();
  }
}
