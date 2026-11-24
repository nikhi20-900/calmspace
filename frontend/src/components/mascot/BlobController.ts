import * as THREE from 'three';
import {
  createBlobBodyGeometry,
  createEyeGeometries,
  createMouthGeometry,
  createBlushGeometry,
  createShadowGeometry,
  deformBlobGeometry,
  getFrontSurfaceZ,
  BlobGeometryData,
} from './BlobGeometry';
import {
  createBlobBodyMaterial,
  createEyeMaterials,
  createMouthMaterial,
  createBlushMaterial,
  createShadowMaterial,
} from './BlobMaterials';
import {
  BlobAnimationController,
  BlobAnimationState,
} from './BlobAnimations';

export interface Spring1D {
  value: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;
  mass: number;
}

export function createSpring(initialValue = 0, stiffness = 180, damping = 14, mass = 1): Spring1D {
  return {
    value: initialValue,
    velocity: 0,
    target: initialValue,
    stiffness,
    damping,
    mass,
  };
}

export function updateSpring(spring: Spring1D, dt: number): void {
  const clampedDt = Math.min(dt, 0.033);
  const force = -spring.stiffness * (spring.value - spring.target);
  const dampingForce = -spring.damping * spring.velocity;
  const acceleration = (force + dampingForce) / spring.mass;

  spring.velocity += acceleration * clampedDt;
  spring.value += spring.velocity * clampedDt;
}

export class BlobController {
  // Three.js Hierarchy
  rootGroup: THREE.Group;
  bodyMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  shadowTexture: THREE.CanvasTexture;

  // Face Components
  faceGroup: THREE.Group;
  leftEyeGroup: THREE.Group;
  rightEyeGroup: THREE.Group;
  leftPupil: THREE.Group;
  rightPupil: THREE.Group;
  mouthMesh: THREE.Mesh;
  leftBlush: THREE.Mesh;
  rightBlush: THREE.Mesh;
  blushMaterial: THREE.MeshBasicMaterial;

  // Geometry Base Attributes for Deformation
  geomData: BlobGeometryData;

  // Physics Springs
  posX = createSpring(0, 190, 15, 1.1);
  posY = createSpring(0, 190, 15, 1.1);
  posZ = createSpring(0, 190, 15, 1.1);

  scaleX = createSpring(1, 260, 14, 0.9);
  scaleY = createSpring(1, 260, 14, 0.9);
  scaleZ = createSpring(1, 260, 14, 0.9);

  rotX = createSpring(0, 150, 16, 1);
  rotY = createSpring(0, 150, 16, 1);
  rotZ = createSpring(0, 150, 16, 1);

  // Surface Jiggle Wave Oscillation
  jiggleAmplitude = 0;
  jiggleDecay = 4.2;
  jiggleFrequency = 14;
  jiggleTime = 0;

  // Drag interaction state
  isDragging = false;
  dragDistance = 0;

  // Animation controller
  animController = new BlobAnimationController();

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'calmspace_mascot_root';

    // 1. Build Procedural SDF Body Mesh
    this.geomData = createBlobBodyGeometry(88, 88);
    const bodyMaterial = createBlobBodyMaterial();
    this.bodyMesh = new THREE.Mesh(this.geomData.geometry, bodyMaterial);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = false;

    // 2. Build Face & Eyes
    this.faceGroup = new THREE.Group();
    this.faceGroup.name = 'face_group';

    const eyeGeoms = createEyeGeometries();
    const eyeMats = createEyeMaterials();

    // Left Eye
    this.leftEyeGroup = new THREE.Group();
    this.leftEyeGroup.position.set(-0.48, 0.24, getFrontSurfaceZ(-0.48, 0.24) + 0.055);

    this.leftPupil = new THREE.Group();
    const leftEyeSocket = new THREE.Mesh(eyeGeoms.eyeSocketGeom, eyeMats.eyeSocketMaterial);
    leftEyeSocket.position.z = -0.042;
    const leftEyeMesh = new THREE.Mesh(eyeGeoms.eyeGeom, eyeMats.eyeMaterial);
    const leftCatchlight = new THREE.Mesh(eyeGeoms.primaryCatchlightGeom, eyeMats.primaryCatchlightMat);
    leftCatchlight.position.set(0.038, 0.046, 0.088);
    const leftSecCatchlight = new THREE.Mesh(eyeGeoms.secondaryCatchlightGeom, eyeMats.secondaryCatchlightMat);
    leftSecCatchlight.position.set(-0.032, -0.038, 0.082);

    this.leftPupil.add(leftEyeSocket, leftEyeMesh, leftCatchlight, leftSecCatchlight);
    this.leftEyeGroup.add(this.leftPupil);

    // Right Eye
    this.rightEyeGroup = new THREE.Group();
    this.rightEyeGroup.position.set(0.48, 0.24, getFrontSurfaceZ(0.48, 0.24) + 0.055);

    this.rightPupil = new THREE.Group();
    const rightEyeSocket = new THREE.Mesh(eyeGeoms.eyeSocketGeom, eyeMats.eyeSocketMaterial);
    rightEyeSocket.position.z = -0.042;
    const rightEyeMesh = new THREE.Mesh(eyeGeoms.eyeGeom, eyeMats.eyeMaterial);
    const rightCatchlight = new THREE.Mesh(eyeGeoms.primaryCatchlightGeom, eyeMats.primaryCatchlightMat);
    rightCatchlight.position.set(0.038, 0.046, 0.088);
    const rightSecCatchlight = new THREE.Mesh(eyeGeoms.secondaryCatchlightGeom, eyeMats.secondaryCatchlightMat);
    rightSecCatchlight.position.set(-0.032, -0.038, 0.082);

    this.rightPupil.add(rightEyeSocket, rightEyeMesh, rightCatchlight, rightSecCatchlight);
    this.rightEyeGroup.add(this.rightPupil);

    // 3. Volumetric 3D Mouth
    const mouthGeom = createMouthGeometry(true);
    const mouthMat = createMouthMaterial();
    this.mouthMesh = new THREE.Mesh(mouthGeom, mouthMat);
    this.mouthMesh.position.set(0, -0.02, getFrontSurfaceZ(0, -0.02) + 0.025);

    // 4. Soft Peach Blush Cheeks
    const blushGeom = createBlushGeometry();
    this.blushMaterial = createBlushMaterial();

    this.leftBlush = new THREE.Mesh(blushGeom, this.blushMaterial);
    this.leftBlush.position.set(-0.74, 0.06, getFrontSurfaceZ(-0.74, 0.06) + 0.018);
    this.leftBlush.rotation.y = -0.42;
    this.leftBlush.rotation.x = -0.05;

    this.rightBlush = new THREE.Mesh(blushGeom, this.blushMaterial);
    this.rightBlush.position.set(0.74, 0.06, getFrontSurfaceZ(0.74, 0.06) + 0.018);
    this.rightBlush.rotation.y = 0.42;
    this.rightBlush.rotation.x = -0.05;

    this.faceGroup.add(
      this.leftEyeGroup,
      this.rightEyeGroup,
      this.mouthMesh,
      this.leftBlush,
      this.rightBlush
    );
    this.bodyMesh.add(this.faceGroup);

    // 5. Soft Contact Shadow Plane
    const shadowGeom = createShadowGeometry();
    const { material: shadowMat, texture: shadowTex } = createShadowMaterial();
    this.shadowTexture = shadowTex;
    this.shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = -1.62;

    this.rootGroup.add(this.bodyMesh, this.shadowMesh);
  }

  // Expression Control
  setExpression(state: BlobAnimationState) {
    this.animController.setState(state);
  }

  // Pointer Gaze Control
  setGaze(normX: number, normY: number) {
    this.animController.setTargetGaze(normX, normY);
  }

  // Tactile Click / Tap Squash Impulse
  triggerSquashImpulse(intensity = 1.0) {
    // Compress along Y, expand radially along X & Z for volume preservation
    this.scaleY.velocity -= 6.2 * intensity;
    this.scaleX.velocity += 3.1 * intensity;
    this.scaleZ.velocity += 3.1 * intensity;

    // Trigger secondary surface ripple
    this.jiggleAmplitude = Math.min(this.jiggleAmplitude + 0.18 * intensity, 0.35);
  }

  // Rubber-band Drag Interaction
  updateDrag(dx: number, dy: number) {
    const maxDrag = 1.6;
    const dist = Math.hypot(dx, dy);
    this.dragDistance = dist;
    this.isDragging = true;

    // Non-linear rubber-band resistance
    const resistance = Math.tanh(dist / maxDrag) * maxDrag;
    const angle = Math.atan2(dy, dx);

    const targetX = Math.cos(angle) * resistance;
    const targetY = Math.sin(angle) * resistance;

    this.posX.target = targetX;
    this.posY.target = targetY;

    // Tactile stretch along drag vector
    const stretchRatio = Math.min(dist * 0.28, 0.48);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    this.scaleX.target = 1 + stretchRatio * Math.abs(cosA) - stretchRatio * 0.35 * Math.abs(sinA);
    this.scaleY.target = 1 + stretchRatio * Math.abs(sinA) - stretchRatio * 0.35 * Math.abs(cosA);
    this.scaleZ.target = 1 - stretchRatio * 0.45;

    // Organic tilt in drag direction
    this.rotZ.target = -targetX * 0.28;
    this.rotX.target = targetY * 0.28;
  }

  // Release Drag with Spring-back Rebound
  releaseDrag() {
    this.isDragging = false;
    const releaseEnergy = Math.min(this.dragDistance * 0.8, 1.2);

    this.posX.target = 0;
    this.posY.target = 0;
    this.posZ.target = 0;

    this.scaleX.target = 1;
    this.scaleY.target = 1;
    this.scaleZ.target = 1;

    this.rotX.target = 0;
    this.rotY.target = 0;
    this.rotZ.target = 0;

    // Rebound squash impulse on release
    this.triggerSquashImpulse(Math.max(0.6, releaseEnergy));
  }

  // Main Per-Frame Physics & Animation Step
  step(dt: number, totalTime: number, isReducedMotion = false) {
    // 1. Advance Physics Springs
    updateSpring(this.posX, dt);
    updateSpring(this.posY, dt);
    updateSpring(this.posZ, dt);

    updateSpring(this.scaleX, dt);
    updateSpring(this.scaleY, dt);
    updateSpring(this.scaleZ, dt);

    updateSpring(this.rotX, dt);
    updateSpring(this.rotY, dt);
    updateSpring(this.rotZ, dt);

    // 2. Advance Surface Jiggle Oscillation
    if (this.jiggleAmplitude > 0.001) {
      this.jiggleTime += dt;
      this.jiggleAmplitude *= Math.exp(-this.jiggleDecay * dt);
    } else {
      this.jiggleAmplitude = 0;
      this.jiggleTime = 0;
    }

    // 3. Compute Pose from Animation Controller
    const pose = this.animController.update(dt, totalTime, isReducedMotion);

    // 4. Apply Position & Elevation
    this.bodyMesh.position.x = this.posX.value;
    this.bodyMesh.position.y = this.posY.value + pose.floatElevation;
    this.bodyMesh.position.z = this.posZ.value;

    // 5. Apply Rotations (Spring tilt + gaze look direction + body roll)
    this.bodyMesh.rotation.x = this.rotX.value + pose.lookTiltX;
    this.bodyMesh.rotation.y = this.rotY.value + pose.lookTiltY;
    this.bodyMesh.rotation.z = this.rotZ.value + pose.bodyRoll;

    // 6. Apply Scale. Breathing expands forward and sideways more than vertically,
    // which gives the clay mass a fuller, less mechanically uniform inhale.
    const breathDelta = pose.breatheScale - 1;
    this.bodyMesh.scale.x = this.scaleX.value * (1 + breathDelta * 0.78);
    this.bodyMesh.scale.y = this.scaleY.value * (1 + breathDelta * 0.46);
    this.bodyMesh.scale.z = this.scaleZ.value * (1 + breathDelta * 1.08);

    // 7. Update Eyes & Blink
    this.leftEyeGroup.scale.y = pose.eyeScaleY;
    this.rightEyeGroup.scale.y = pose.eyeScaleY;

    this.leftEyeGroup.rotation.z = -pose.eyeAngleZ;
    this.rightEyeGroup.rotation.z = pose.eyeAngleZ;

    this.leftEyeGroup.scale.x = pose.eyeSizeScale;
    this.rightEyeGroup.scale.x = pose.eyeSizeScale;

    // Smooth Gaze Pupil Offset (clamped to eye radius)
    const maxX = 0.085;
    const maxY = 0.065;
    const gazeOffsetX = THREE.MathUtils.clamp(this.animController.currentGazeX * 0.11, -maxX, maxX);
    const gazeOffsetY = THREE.MathUtils.clamp(-this.animController.currentGazeY * 0.09, -maxY, maxY);

    this.leftPupil.position.x = THREE.MathUtils.lerp(this.leftPupil.position.x, gazeOffsetX, 0.2);
    this.leftPupil.position.y = THREE.MathUtils.lerp(this.leftPupil.position.y, gazeOffsetY, 0.2);

    // Keep the eyes coordinated but not perfectly mirrored, as in a relaxed real gaze.
    this.rightPupil.position.x = THREE.MathUtils.lerp(this.rightPupil.position.x, gazeOffsetX * 0.92, 0.2);
    this.rightPupil.position.y = THREE.MathUtils.lerp(this.rightPupil.position.y, gazeOffsetY * 0.96, 0.2);

    // 8. Update Mouth & Blush
    this.mouthMesh.scale.x = pose.mouthScaleX;
    this.mouthMesh.scale.y = pose.mouthScaleY;
    this.blushMaterial.opacity = pose.blushOpacity;

    // 9. Secondary Jelly Surface Wave Deformation
    const jiggleWave =
      this.jiggleAmplitude > 0.001
        ? Math.sin(this.jiggleTime * this.jiggleFrequency) * this.jiggleAmplitude
        : 0;

    deformBlobGeometry(
      this.geomData.geometry,
      this.geomData.basePositions,
      this.geomData.baseNormals,
      totalTime,
      pose.breatheScale,
      jiggleWave
    );

    // 10. Dynamic Ground Contact Shadow Response
    const floatY = this.bodyMesh.position.y;
    const shadowScale = Math.max(0.5, (1.0 - floatY * 0.22) * this.bodyMesh.scale.x);
    this.shadowMesh.scale.setScalar(shadowScale);
    const shadowMat = this.shadowMesh.material as THREE.MeshBasicMaterial;
    shadowMat.opacity = Math.max(0.22, 0.82 - floatY * 0.35);
  }

  // Teardown / Resource Disposal
  dispose() {
    this.geomData.geometry.dispose();
    (this.bodyMesh.material as THREE.Material).dispose();
    this.shadowMesh.geometry.dispose();
    (this.shadowMesh.material as THREE.Material).dispose();
    this.shadowTexture.dispose();
    this.mouthMesh.geometry.dispose();
    (this.mouthMesh.material as THREE.Material).dispose();
    this.blushMaterial.map?.dispose();
    this.blushMaterial.dispose();
  }
}
