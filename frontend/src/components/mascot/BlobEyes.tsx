import * as THREE from 'three';

export interface EyeController {
  group: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  leftHighlight: THREE.Mesh;
  rightHighlight: THREE.Mesh;
  leftPupilGroup: THREE.Group;
  rightPupilGroup: THREE.Group;
  mouth: THREE.Line | THREE.Mesh;
  setGaze: (normX: number, normY: number) => void;
  setBlink: (blinkProgress: number) => void;
  setExpression: (expression: string) => void;
}

export function createBlobEyes(): EyeController {
  const group = new THREE.Group();
  group.name = 'eyes_group';

  // Eye Materials
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x25233B, // Deep dark obsidian
    roughness: 0.18,
    metalness: 0.05,
  });

  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
  });

  const eyeGeom = new THREE.SphereGeometry(0.12, 32, 24);
  eyeGeom.scale(1, 1.15, 0.7); // slightly oblong, friendly eye shape

  const highlightGeom = new THREE.SphereGeometry(0.038, 16, 16);
  const microHighlightGeom = new THREE.SphereGeometry(0.02, 16, 16);

  // Left Eye Assembly
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(-0.46, 0.22, 1.34);

  const leftPupilGroup = new THREE.Group();
  const leftEye = new THREE.Mesh(eyeGeom, eyeMaterial);
  leftEye.castShadow = true;

  const leftHighlight = new THREE.Mesh(highlightGeom, highlightMaterial);
  leftHighlight.position.set(0.035, 0.045, 0.08);

  const leftMicroHighlight = new THREE.Mesh(microHighlightGeom, highlightMaterial);
  leftMicroHighlight.position.set(-0.03, -0.035, 0.075);

  leftPupilGroup.add(leftEye, leftHighlight, leftMicroHighlight);
  leftEyeGroup.add(leftPupilGroup);

  // Right Eye Assembly
  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.position.set(0.46, 0.22, 1.34);

  const rightPupilGroup = new THREE.Group();
  const rightEye = new THREE.Mesh(eyeGeom, eyeMaterial);
  rightEye.castShadow = true;

  const rightHighlight = new THREE.Mesh(highlightGeom, highlightMaterial);
  rightHighlight.position.set(0.035, 0.045, 0.08);

  const rightMicroHighlight = new THREE.Mesh(microHighlightGeom, highlightMaterial);
  rightMicroHighlight.position.set(-0.03, -0.035, 0.075);

  rightPupilGroup.add(rightEye, rightHighlight, rightMicroHighlight);
  rightEyeGroup.add(rightPupilGroup);

  // Soft subtle mouth (calm smile arc)
  const mouthCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.14, 0.0, 0),
    new THREE.Vector3(0, -0.07, 0),
    new THREE.Vector3(0.14, 0.0, 0)
  );
  const mouthPoints = mouthCurve.getPoints(20);
  const mouthGeom = new THREE.BufferGeometry().setFromPoints(mouthPoints);
  const mouthMaterial = new THREE.LineBasicMaterial({
    color: 0x6E689C,
    linewidth: 2,
  });
  const mouth = new THREE.Line(mouthGeom, mouthMaterial);
  mouth.position.set(0, -0.02, 1.44);

  // Soft blush spots on cheeks
  const blushGeom = new THREE.CircleGeometry(0.14, 24);
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xF4DCCB,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const leftBlush = new THREE.Mesh(blushGeom, blushMat);
  leftBlush.position.set(-0.72, 0.04, 1.25);
  leftBlush.rotation.y = -0.4;
  leftBlush.rotation.x = -0.05;

  const rightBlush = new THREE.Mesh(blushGeom, blushMat);
  rightBlush.position.set(0.72, 0.04, 1.25);
  rightBlush.rotation.y = 0.4;
  rightBlush.rotation.x = -0.05;

  group.add(leftEyeGroup, rightEyeGroup, mouth, leftBlush, rightBlush);

  // Clamped Gaze Tracking
  function setGaze(normX: number, normY: number) {
    // Clamp gaze to natural bounds inside face area
    const maxGazeX = 0.09;
    const maxGazeY = 0.07;
    const targetX = THREE.MathUtils.clamp(normX * 0.12, -maxGazeX, maxGazeX);
    const targetY = THREE.MathUtils.clamp(-normY * 0.1, -maxGazeY, maxGazeY);

    leftPupilGroup.position.x = THREE.MathUtils.lerp(leftPupilGroup.position.x, targetX, 0.15);
    leftPupilGroup.position.y = THREE.MathUtils.lerp(leftPupilGroup.position.y, targetY, 0.15);

    rightPupilGroup.position.x = THREE.MathUtils.lerp(rightPupilGroup.position.x, targetX, 0.15);
    rightPupilGroup.position.y = THREE.MathUtils.lerp(rightPupilGroup.position.y, targetY, 0.15);
  }

  // Blinking: scales eyes down vertically to a flat slit
  function setBlink(progress: number) {
    // progress: 0 = fully open, 1 = fully closed
    const scaleY = THREE.MathUtils.lerp(1.15, 0.04, progress);
    leftEyeGroup.scale.y = scaleY;
    rightEyeGroup.scale.y = scaleY;
  }

  function setExpression(expression: string) {
    if (expression === 'resting') {
      setBlink(0.95); // gentle closed eyes during mindful breather
      mouth.scale.set(1, 0.6, 1);
    } else if (expression === 'welcoming') {
      leftEyeGroup.rotation.z = -0.06;
      rightEyeGroup.rotation.z = 0.06;
      mouth.scale.set(1.15, 1.3, 1);
    } else if (expression === 'curious') {
      leftEyeGroup.scale.set(1.08, 1.08, 1);
      rightEyeGroup.scale.set(1.08, 1.08, 1);
      leftEyeGroup.rotation.z = 0.08;
      rightEyeGroup.rotation.z = 0.08;
      mouth.scale.set(0.9, 0.8, 1);
    } else {
      // idle default
      leftEyeGroup.rotation.z = 0;
      rightEyeGroup.rotation.z = 0;
      leftEyeGroup.scale.set(1, 1, 1);
      rightEyeGroup.scale.set(1, 1, 1);
      mouth.scale.set(1, 1, 1);
    }
  }

  return {
    group,
    leftEye,
    rightEye,
    leftHighlight,
    rightHighlight,
    leftPupilGroup,
    rightPupilGroup,
    mouth,
    setGaze,
    setBlink,
    setExpression,
  };
}
