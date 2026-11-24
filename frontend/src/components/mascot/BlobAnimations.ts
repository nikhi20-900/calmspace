import * as THREE from 'three';

/**
 * Calmspace Blob Animation System
 * 
 * Manages delta-time-based state transitions, respiratory rhythms,
 * natural blinking, gaze tracking interpolation, and expressive body postures.
 */

export type BlobAnimationState =
  | 'idle'
  | 'curious'
  | 'welcoming'
  | 'resting'
  | 'interacting'
  | 'breathing'
  | 'reducedMotion';

export interface AnimationPose {
  floatElevation: number;
  breatheScale: number;
  lookTiltX: number;
  lookTiltY: number;
  bodyRoll: number;
  eyeScaleY: number; // For blinking: 1.18 open, 0.04 closed
  eyeAngleZ: number; // Angle tilt for expressions
  eyeSizeScale: number; // Overall eye size
  mouthScaleX: number;
  mouthScaleY: number;
  blushOpacity: number;
}

export class BlobAnimationController {
  currentState: BlobAnimationState = 'idle';
  targetState: BlobAnimationState = 'idle';

  // Blinking system
  blinkTimer = 0;
  nextBlinkTime = 3.2;
  isBlinking = false;
  blinkProgress = 0; // 0 open -> 1 closed
  blinkDuration = 0.16;
  blinkElapsed = 0;
  isDoubleBlink = false;

  // Gaze tracking
  currentGazeX = 0;
  currentGazeY = 0;
  targetGazeX = 0;
  targetGazeY = 0;

  // Expression transition lerp
  transitionProgress = 1.0;
  transitionDuration = 0.35;

  setState(state: BlobAnimationState) {
    if (this.targetState !== state) {
      this.targetState = state;
      this.currentState = state;
    }
  }

  setTargetGaze(x: number, y: number) {
    this.targetGazeX = THREE.MathUtils.clamp(x, -1, 1);
    this.targetGazeY = THREE.MathUtils.clamp(y, -1, 1);
  }

  update(
    dt: number,
    totalTime: number,
    isReducedMotion = false
  ): AnimationPose {
    const sec = totalTime;

    // 1. Gaze Interpolation (Restrained expressive boundary)
    const gazeLerpRate = 1 - Math.exp(-12 * dt);
    this.currentGazeX = THREE.MathUtils.lerp(this.currentGazeX, this.targetGazeX, gazeLerpRate);
    this.currentGazeY = THREE.MathUtils.lerp(this.currentGazeY, this.targetGazeY, gazeLerpRate);

    // 2. Natural Eyelid Blinking
    let eyeScaleY = 1.18; // Default open oblong scale

    if (this.currentState === 'resting') {
      // In resting mode, eyes are gently closed
      eyeScaleY = 0.05;
      this.isBlinking = false;
    } else if (isReducedMotion) {
      eyeScaleY = 1.18;
      this.isBlinking = false;
    } else {
      this.blinkTimer += dt;
      if (!this.isBlinking && this.blinkTimer >= this.nextBlinkTime) {
        this.isBlinking = true;
        this.blinkElapsed = 0;
        this.isDoubleBlink = Math.random() < 0.25; // 25% chance of quick double-blink
      }

      if (this.isBlinking) {
        this.blinkElapsed += dt;
        const totalDuration = this.isDoubleBlink ? this.blinkDuration * 1.8 : this.blinkDuration;
        const progress = Math.min(this.blinkElapsed / totalDuration, 1.0);

        let blinkVal = 0;
        if (!this.isDoubleBlink) {
          // Single blink: close then open
          if (progress < 0.5) {
            blinkVal = progress * 2;
          } else {
            blinkVal = 1 - (progress - 0.5) * 2;
          }
        } else {
          // Double blink: dip twice
          const cycle = progress * 2 * Math.PI;
          blinkVal = Math.max(0, Math.sin(cycle));
        }

        eyeScaleY = THREE.MathUtils.lerp(1.18, 0.04, blinkVal);

        if (progress >= 1.0) {
          this.isBlinking = false;
          this.blinkTimer = 0;
          this.nextBlinkTime = 2.8 + Math.random() * 3.6;
        }
      }
    }

    // 3. Floating Elevation & Respiratory Cycles
    let floatElevation = 0;
    let breatheScale = 1.0;

    if (!isReducedMotion) {
      // Idle float cycle: gentle harmonic levitation
      floatElevation = Math.sin(sec * 1.05) * 0.035;
    }

    if (this.currentState === 'breathing') {
      // Guided breathing mode: 4 seconds inhale, 4 seconds exhale (T = 8.0s)
      // omega = 2 * PI / 8.0 = 0.7854
      const breathPhase = Math.sin(sec * 0.7854);
      breatheScale = 1.0 + breathPhase * 0.042;
      floatElevation += breathPhase * 0.025;
    } else if (this.currentState === 'resting') {
      // Meditative resting breath: slower and deeper (T ~ 7.2s)
      breatheScale = 1.0 + Math.sin(sec * 0.87) * 0.038;
      floatElevation -= 0.06; // Rests slightly closer to the floor
    } else if (!isReducedMotion) {
      // Subtle organic idle breathing (T ~ 4.3s)
      breatheScale = 1.0 + Math.sin(sec * 1.2) * 0.014;
    }

    // 4. Expression Postures
    let lookTiltX = THREE.MathUtils.clamp(-this.currentGazeY * 0.18, -0.18, 0.18);
    let lookTiltY = THREE.MathUtils.clamp(this.currentGazeX * 0.24, -0.26, 0.26);
    let bodyRoll = 0;
    let eyeAngleZ = 0;
    let eyeSizeScale = 1.0;
    let mouthScaleX = 1.0;
    let mouthScaleY = 1.0;
    let blushOpacity = 0.52;

    switch (this.currentState) {
      case 'welcoming':
        floatElevation += 0.09;
        eyeAngleZ = 0.07; // Cheerful upward eye slant
        mouthScaleX = 1.25;
        mouthScaleY = 1.35; // Broad soft smile
        blushOpacity = 0.68;
        break;

      case 'curious':
        lookTiltY += this.currentGazeX * 0.12;
        bodyRoll = 0.06 * Math.sign(this.currentGazeX || 1); // Curious head cock
        eyeAngleZ = 0.08;
        eyeSizeScale = 1.08; // Widened curious eyes
        mouthScaleX = 0.88;
        mouthScaleY = 0.82;
        break;

      case 'resting':
        lookTiltX = -0.05; // Gentle downward restful gaze
        lookTiltY = 0;
        mouthScaleX = 0.92;
        mouthScaleY = 0.6; // Peaceful resting line
        blushOpacity = 0.44;
        break;

      case 'interacting':
        mouthScaleX = 1.2;
        mouthScaleY = 1.25;
        blushOpacity = 0.72;
        eyeAngleZ = 0.08;
        break;

      case 'idle':
      default:
        // Subtle natural body roll oscillation
        if (!isReducedMotion) {
          bodyRoll = Math.sin(sec * 0.65) * 0.022;
        }
        break;
    }

    return {
      floatElevation,
      breatheScale,
      lookTiltX,
      lookTiltY,
      bodyRoll,
      eyeScaleY,
      eyeAngleZ,
      eyeSizeScale,
      mouthScaleX,
      mouthScaleY,
      blushOpacity,
    };
  }
}
