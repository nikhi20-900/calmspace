import * as THREE from 'three';

export interface EyeController {
  group: THREE.Group;
  leftEyeGroup: THREE.Group;
  rightEyeGroup: THREE.Group;
  mouthMesh: THREE.Mesh;
  leftBlush: THREE.Mesh;
  rightBlush: THREE.Mesh;
  setGaze: (normX: number, normY: number) => void;
  setBlink: (blinkProgress: number) => void;
  setExpression: (expression: string) => void;
}

export function createBlobEyes(): EyeController {
  const group = new THREE.Group();
  group.name = 'face_group';

  // 1. PREMIUM EYE MATERIAL (Deep Glossy Obsidian)
  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1E1C30,
    roughness: 0.1,
    metalness: 0.08,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
    reflectivity: 0.8,
  });

  // Specular Highlight Materials (Dual catchlights)
  const primaryHighlightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  const secondaryHighlightMat = new THREE.MeshBasicMaterial({ color: 0xF2F1FD });

  // Oblong, friendly, slightly anime/Pixar eye geometry
  const eyeGeom = new THREE.SphereGeometry(0.125, 32, 28);
  eyeGeom.scale(1, 1.18, 0.75);

  const primaryCatchlightGeom = new THREE.SphereGeometry(0.042, 16, 16);
  const secondaryCatchlightGeom = new THREE.SphereGeometry(0.022, 16, 16);

  // LEFT EYE ASSEMBLY
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(-0.48, 0.24, 1.35);

  const leftPupil = new THREE.Group();
  const leftEyeMesh = new THREE.Mesh(eyeGeom, eyeMaterial);
  leftEyeMesh.castShadow = true;

  const leftCatchlight = new THREE.Mesh(primaryCatchlightGeom, primaryHighlightMat);
  leftCatchlight.position.set(0.038, 0.046, 0.088);

  const leftSecondaryCatchlight = new THREE.Mesh(secondaryCatchlightGeom, secondaryHighlightMat);
  leftSecondaryCatchlight.position.set(-0.032, -0.038, 0.082);

  leftPupil.add(leftEyeMesh, leftCatchlight, leftSecondaryCatchlight);
  leftEyeGroup.add(leftPupil);

  // RIGHT EYE ASSEMBLY
  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.position.set(0.48, 0.24, 1.35);

  const rightPupil = new THREE.Group();
  const rightEyeMesh = new THREE.Mesh(eyeGeom, eyeMaterial);
  rightEyeMesh.castShadow = true;

  const rightCatchlight = new THREE.Mesh(primaryCatchlightGeom, primaryHighlightMat);
  rightCatchlight.position.set(0.038, 0.046, 0.088);

  const rightSecondaryCatchlight = new THREE.Mesh(secondaryCatchlightGeom, secondaryHighlightMat);
  rightSecondaryCatchlight.position.set(-0.032, -0.038, 0.082);

  rightPupil.add(rightEyeMesh, rightCatchlight, rightSecondaryCatchlight);
  rightEyeGroup.add(rightPupil);

  // 2. VOLUMETRIC 3D MOUTH (Rounded 3D Clay Tube)
  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 0.01, 0),
    new THREE.Vector3(-0.08, -0.048, 0.02),
    new THREE.Vector3(0, -0.075, 0.03),
    new THREE.Vector3(0.08, -0.048, 0.02),
    new THREE.Vector3(0.15, 0.01, 0),
  ]);
  const mouthGeom = new THREE.TubeGeometry(mouthCurve, 28, 0.022, 12, false);
  const mouthMaterial = new THREE.MeshStandardMaterial({
    color: 0x48446E,
    roughness: 0.35,
    metalness: 0.05,
  });
  const mouthMesh = new THREE.Mesh(mouthGeom, mouthMaterial);
  mouthMesh.position.set(0, -0.02, 1.45);
  mouthMesh.castShadow = true;

  // 3. WARM PEACH BLUSH CHEEKS (Soft tactile discs)
  const blushGeom = new THREE.CircleGeometry(0.15, 32);
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xF4DCCB,
    transparent: true,
    opacity: 0.52,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const leftBlush = new THREE.Mesh(blushGeom, blushMat);
  leftBlush.position.set(-0.74, 0.06, 1.25);
  leftBlush.rotation.y = -0.42;
  leftBlush.rotation.x = -0.05;

  const rightBlush = new THREE.Mesh(blushGeom, blushMat);
  rightBlush.position.set(0.74, 0.06, 1.25);
  rightBlush.rotation.y = 0.42;
  rightBlush.rotation.x = -0.05;

  group.add(leftEyeGroup, rightEyeGroup, mouthMesh, leftBlush, rightBlush);

  // Clamped gaze tracking with smooth interpolation
  function setGaze(normX: number, normY: number) {
    const maxX = 0.085;
    const maxY = 0.065;
    const targetX = THREE.MathUtils.clamp(normX * 0.11, -maxX, maxX);
    const targetY = THREE.MathUtils.clamp(-normY * 0.09, -maxY, maxY);

    leftPupil.position.x = THREE.MathUtils.lerp(leftPupil.position.x, targetX, 0.18);
    leftPupil.position.y = THREE.MathUtils.lerp(leftPupil.position.y, targetY, 0.18);

    rightPupil.position.x = THREE.MathUtils.lerp(rightPupil.position.x, targetX, 0.18);
    rightPupil.position.y = THREE.MathUtils.lerp(rightPupil.position.y, targetY, 0.18);
  }

  // Smooth vertical eyelid blink (progress: 0 = open, 1 = closed)
  function setBlink(progress: number) {
    const scaleY = THREE.MathUtils.lerp(1.18, 0.03, progress);
    leftEyeGroup.scale.y = scaleY;
    rightEyeGroup.scale.y = scaleY;
  }

  // Expression transitions
  function setExpression(expression: string) {
    if (expression === 'resting') {
      setBlink(0.96);
      mouthMesh.scale.set(0.9, 0.55, 1);
      leftEyeGroup.rotation.z = 0;
      rightEyeGroup.rotation.z = 0;
    } else if (expression === 'welcoming') {
      leftEyeGroup.rotation.z = -0.07;
      rightEyeGroup.rotation.z = 0.07;
      mouthMesh.scale.set(1.2, 1.35, 1);
      blushMat.opacity = 0.65;
    } else if (expression === 'curious') {
      leftEyeGroup.rotation.z = 0.09;
      rightEyeGroup.rotation.z = 0.09;
      leftEyeGroup.scale.set(1.1, 1.1, 1);
      rightEyeGroup.scale.set(1.1, 1.1, 1);
      mouthMesh.scale.set(0.85, 0.8, 1);
    } else if (expression === 'interacting') {
      // Squished playful happy expression
      leftEyeGroup.rotation.z = -0.1;
      rightEyeGroup.rotation.z = 0.1;
      mouthMesh.scale.set(1.25, 1.4, 1);
      blushMat.opacity = 0.72;
    } else {
      // Default idle
      leftEyeGroup.rotation.z = 0;
      rightEyeGroup.rotation.z = 0;
      leftEyeGroup.scale.set(1, 1, 1);
      rightEyeGroup.scale.set(1, 1, 1);
      mouthMesh.scale.set(1, 1, 1);
      blushMat.opacity = 0.52;
    }
  }

  return {
    group,
    leftEyeGroup,
    rightEyeGroup,
    mouthMesh,
    leftBlush,
    rightBlush,
    setGaze,
    setBlink,
    setExpression,
  };
}
