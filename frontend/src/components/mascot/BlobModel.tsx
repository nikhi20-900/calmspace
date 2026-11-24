import * as THREE from 'three';
import { BlobController } from './BlobController';
import { EyeController } from './BlobEyes';

export interface BlobModelOutput {
  rootGroup: THREE.Group;
  bodyMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  eyeController: EyeController;
  updateDeformation: (time: number, breathScale: number, jiggleAmount: number) => void;
}

/**
 * Creates the volumetric Calmspace character using BlobController.
 * Maintained for backward compatibility.
 */
export function createBlobCharacter(): BlobModelOutput {
  const controller = new BlobController();

  const eyeController: EyeController = {
    group: controller.faceGroup,
    leftEyeGroup: controller.leftEyeGroup,
    rightEyeGroup: controller.rightEyeGroup,
    mouthMesh: controller.mouthMesh,
    leftBlush: controller.leftBlush,
    rightBlush: controller.rightBlush,
    setGaze: (normX: number, normY: number) => {
      controller.setGaze(normX, normY);
    },
    setBlink: (progress: number) => {
      const scaleY = THREE.MathUtils.lerp(1.18, 0.04, progress);
      controller.leftEyeGroup.scale.y = scaleY;
      controller.rightEyeGroup.scale.y = scaleY;
    },
    setExpression: (expr: string) => {
      controller.setExpression(expr as any);
    },
  };

  const updateDeformation = (time: number, breathScale: number, jiggleAmount: number) => {
    controller.animController.currentState = 'idle';
  };

  return {
    rootGroup: controller.rootGroup,
    bodyMesh: controller.bodyMesh,
    shadowMesh: controller.shadowMesh,
    eyeController,
    updateDeformation,
  };
}
