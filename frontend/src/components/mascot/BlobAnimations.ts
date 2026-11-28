import * as THREE from 'three';

/**
 * Calmspace Blob Animation System
 *
 * Delta-time driven (frame-rate independent). Expressions are *targets* that the
 * pose eases toward, so no state change ever snaps. Eyes lead and the head follows,
 * blinks use a fast-close / slow-open curve and can be triggered by big gaze shifts,
 * and breathing is phase-aware (guided breathing always starts on an inhale).
 */

export type BlobAnimationState =
  | 'idle'
  | 'curious'
  | 'welcoming'
  | 'resting'
  | 'interacting'
  | 'breathing'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'support'
  | 'error'
  | 'reducedMotion';

export interface AnimationPose {
  floatElevation: number;
  /** 0 = fully exhaled, 1 = fully inhaled (smoothed). */
  breath: number;
  /** 1 ± amplitude, kept for scale-based breathing. */
  breatheScale: number;
  lookTiltX: number;
  lookTiltY: number;
  bodyRoll: number;
  /** Lid-open scale of the eye group (1.18 = relaxed oblong open), blink excluded. */
  eyeOpen: number;
  /** 0 open → 1 closed. */
  blink: number;
  eyeAngleZ: number;
  eyeSizeScale: number;
  mouthScaleX: number;
  mouthScaleY: number;
  blushOpacity: number;
  /** Fast-following eye gaze, -1..1 (up is positive). */
  pupilX: number;
  pupilY: number;
  /** Smoothed audio reactivity (0..1) for voice/listening deformation. */
  audioLevel: number;
  /** Smoothed thinking swirl intensity (0..1). */
  swirlAmount: number;
  /** Smooth state tint RGB delta for subtle aura transitions. */
  tintR: number;
  tintG: number;
  tintB: number;
}

const EYE_OPEN = 1.18;
const EYE_CLOSED_FRACTION = 0.03;
const GUIDED_BREATH_PERIOD = 8; // 4s in, 4s out

const smooth = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

const smoothstep01 = (x: number) => {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
};

/** Fast close, brief hold, slower open — how real lids move. */
function blinkCurve(u: number): number {
  if (u <= 0 || u >= 1) return 0;
  if (u < 0.34) return smoothstep01(u / 0.34);
  if (u < 0.42) return 1;
  return 1 - smoothstep01((u - 0.42) / 0.58);
}

/** Natural idle breath: inhale ~40% of the cycle, longer relaxed exhale. */
function asymmetricBreath(phase01: number): number {
  const inhale = 0.4;
  return phase01 < inhale
    ? 0.5 - 0.5 * Math.cos((Math.PI * phase01) / inhale)
    : 0.5 + 0.5 * Math.cos((Math.PI * (phase01 - inhale)) / (1 - inhale));
}

export class BlobAnimationController {
  currentState: BlobAnimationState = 'idle';

  // Gaze
  targetGazeX = 0;
  targetGazeY = 0;
  private hasPointer = false;
  private prevTargetX = 0;
  private prevTargetY = 0;
  private wanderX = 0;
  private wanderY = 0;
  private wanderTimer = 1.5;
  private pointerIdleTime = 99;
  private eyeGazeX = 0;
  private eyeGazeY = 0;
  private headGazeX = 0;
  private headGazeY = 0;

  // Blink
  private blinkTimer = 0;
  private nextBlinkTime = 2.6;
  private blinkElapsed = -1; // -1 = not blinking
  private blinkDuration = 0.2;
  private queuedBlinks = 0;
  private blinkGap = 0;
  private sinceBlink = 0;
  private blinkValue = 0;

  // Breath
  private breathClock = 0;
  private breathValue = 0;

  // Reactions & voice
  private delight = 0;
  private stateTime = 0;
  private targetAudioLevel = 0;
  private smoothedAudioLevel = 0;
  private externalBreathPhase: number | null = null;

  private pose: AnimationPose = {
    floatElevation: 0,
    breath: 0,
    breatheScale: 1,
    lookTiltX: 0,
    lookTiltY: 0,
    bodyRoll: 0,
    eyeOpen: EYE_OPEN,
    blink: 0,
    eyeAngleZ: 0,
    eyeSizeScale: 1,
    mouthScaleX: 1,
    mouthScaleY: 1,
    blushOpacity: 0.52,
    pupilX: 0,
    pupilY: 0,
    audioLevel: 0,
    swirlAmount: 0,
    tintR: 0,
    tintG: 0,
    tintB: 0,
  };

  setAudioLevel(level: number) {
    this.targetAudioLevel = THREE.MathUtils.clamp(Number.isFinite(level) ? level : 0, 0, 1);
  }

  setExternalBreath(phase01: number | null) {
    this.externalBreathPhase =
      phase01 === null ? null : THREE.MathUtils.clamp(phase01, 0, 1);
  }

  setState(state: BlobAnimationState) {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateTime = 0;
    // Guided breathing must start at the bottom of an inhale so "in for 4s" is true.
    if (state === 'breathing') this.breathClock = 0;
  }

  /** `active` = a real pointer/CTA target exists; otherwise the eyes wander on their own. */
  setTargetGaze(x: number, y: number, active = true) {
    this.targetGazeX = THREE.MathUtils.clamp(x, -1, 1);
    this.targetGazeY = THREE.MathUtils.clamp(y, -1, 1);
    this.hasPointer = active;
    if (active) this.pointerIdleTime = 0;
  }

  /** A happy bump (tap / release): brightens the face briefly. */
  pulse(strength = 1) {
    this.delight = Math.max(this.delight, strength);
  }

  /** Reflex blink (impact, big gaze jump). */
  blinkNow(double = false) {
    if (this.blinkElapsed >= 0) return;
    this.startBlink(double);
  }

  private startBlink(double: boolean) {
    this.blinkElapsed = 0;
    this.blinkDuration = 0.17 + Math.random() * 0.06;
    this.queuedBlinks = double ? 1 : 0;
    this.blinkGap = 0;
  }

  update(dt: number, totalTime: number, isReducedMotion = false): AnimationPose {
    const sec = totalTime;
    const calm = isReducedMotion;
    this.stateTime += dt;
    this.pointerIdleTime += dt;
    this.sinceBlink += dt;

    /* 1. Gaze: eyes lead, head follows ------------------------------------------------ */
    let gx = this.targetGazeX;
    let gy = this.targetGazeY;

    if (calm) {
      gx *= 0.6;
      gy *= 0.6;
    } else if (this.currentState === 'thinking' && !this.hasPointer) {
      // Gentle upward contemplative gaze while reasoning
      gx = Math.sin(sec * 0.9) * 0.35 + 0.15;
      gy = 0.42 + Math.cos(sec * 0.7) * 0.08;
    } else if (!this.hasPointer && this.pointerIdleTime > 2.5) {
      // Nobody is looking: let the eyes drift between small, relaxed targets.
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 1.6 + Math.random() * 2.8;
        this.wanderX = (Math.random() - 0.5) * 0.7;
        this.wanderY = (Math.random() - 0.5) * 0.4;
      }
      gx = this.wanderX;
      gy = this.wanderY;
    }

    // A large jump in gaze target usually comes with a blink.
    const jump = Math.hypot(gx - this.prevTargetX, gy - this.prevTargetY);
    if (jump > 0.55 && this.sinceBlink > 0.9 && !calm && this.currentState !== 'resting') {
      this.startBlink(false);
    }
    this.prevTargetX = gx;
    this.prevTargetY = gy;

    this.eyeGazeX = smooth(this.eyeGazeX, gx, 16, dt);
    this.eyeGazeY = smooth(this.eyeGazeY, gy, 16, dt);
    this.headGazeX = smooth(this.headGazeX, gx, 3.6, dt);
    this.headGazeY = smooth(this.headGazeY, gy, 3.6, dt);

    /* 2. Blinking -------------------------------------------------------------------- */
    const resting = this.currentState === 'resting';
    if (resting || calm) {
      this.blinkElapsed = -1;
      this.blinkTimer = 0;
      this.blinkValue = smooth(this.blinkValue, 0, 12, dt);
    } else {
      this.blinkTimer += dt;
      if (this.blinkElapsed < 0 && this.blinkTimer >= this.nextBlinkTime) {
        this.startBlink(Math.random() < 0.2);
      }
      if (this.blinkElapsed >= 0) {
        if (this.blinkGap > 0) {
          this.blinkGap -= dt;
          this.blinkValue = 0;
          if (this.blinkGap <= 0) {
            this.blinkElapsed = 0;
            this.blinkGap = 0;
          }
        } else {
          this.blinkElapsed += dt;
          const u = this.blinkElapsed / this.blinkDuration;
          this.blinkValue = blinkCurve(u);
          if (u >= 1) {
            if (this.queuedBlinks > 0) {
              this.queuedBlinks--;
              this.blinkGap = 0.07;
            } else {
              this.blinkElapsed = -1;
              this.blinkTimer = 0;
              this.sinceBlink = 0;
              this.nextBlinkTime = 2.6 + Math.random() * 3.4;
              this.blinkValue = 0;
            }
          }
        }
      } else {
        this.blinkValue = 0;
      }
    }

    /* 3. Breathing + float ------------------------------------------------------------ */
    this.breathClock += dt;
    let breathTarget: number;
    let breathAmp: number;
    let floatElevation = 0;

    switch (this.currentState) {
      case 'breathing':
        breathTarget =
          this.externalBreathPhase !== null
            ? this.externalBreathPhase
            : 0.5 - 0.5 * Math.cos((2 * Math.PI * this.breathClock) / GUIDED_BREATH_PERIOD);
        breathAmp = calm ? 0.024 : 0.048;
        break;
      case 'support':
        breathTarget = 0.5 - 0.5 * Math.cos((2 * Math.PI * this.breathClock) / 6.8);
        breathAmp = calm ? 0 : 0.022;
        break;
      case 'resting':
        breathTarget = 0.5 - 0.5 * Math.cos((2 * Math.PI * this.breathClock) / 7.2);
        breathAmp = 0.038;
        break;
      default:
        breathTarget = asymmetricBreath((this.breathClock % 4.6) / 4.6);
        breathAmp = calm ? 0 : 0.014;
    }
    // Smoothing hides any phase discontinuity when the breathing mode changes.
    this.breathValue = smooth(this.breathValue, breathTarget, 9, dt);
    const breathSigned = this.breathValue * 2 - 1;

    // Smooth audio level quickly on rise, gently on fall so lip/body motion feels organic.
    const audioRate = this.targetAudioLevel > this.smoothedAudioLevel ? 18 : 9;
    this.smoothedAudioLevel = smooth(this.smoothedAudioLevel, this.targetAudioLevel, audioRate, dt);
    const audio = calm ? this.smoothedAudioLevel * 0.2 : this.smoothedAudioLevel;
    const speechOpen = smoothstep01((audio - 0.025) / 0.22);

    if (!calm) {
      floatElevation =
        Math.sin(sec * 1.05) * 0.032 + Math.sin(sec * 0.43 + 1.3) * 0.012;
    }
    if (this.currentState === 'breathing') floatElevation += breathSigned * 0.025;

    /* 4. Expression targets ----------------------------------------------------------- */
    let eyeOpen = EYE_OPEN;
    let eyeAngleZ = 0;
    let eyeSizeScale = 1;
    let mouthScaleX = 1;
    let mouthScaleY = 1;
    let blushOpacity = 0.52;
    let bodyRoll = 0;
    let tiltBoostY = 0;
    let lookDamp = 1;
    let swirlTarget = 0;
    let tintR = 0;
    let tintG = 0;
    let tintB = 0;

    switch (this.currentState) {
      case 'welcoming':
        floatElevation += 0.09;
        eyeOpen = 1.02; // cheerful smiling squint
        eyeAngleZ = 0.07;
        mouthScaleX = 1.25;
        mouthScaleY = 1.35;
        blushOpacity = 0.68;
        break;
      case 'curious':
        tiltBoostY = this.headGazeX * 0.12;
        bodyRoll = 0.07 * Math.tanh(this.headGazeX * 3);
        eyeOpen = 1.26;
        eyeAngleZ = 0.08;
        eyeSizeScale = 1.08;
        mouthScaleX = 0.88;
        mouthScaleY = 0.82;
        break;
      case 'listening':
        floatElevation += 0.025 + audio * 0.035;
        bodyRoll = calm ? 0 : Math.sin(sec * 1.1) * 0.025 + audio * 0.03;
        eyeOpen = 1.24;
        eyeSizeScale = 1.06 + audio * 0.04;
        eyeAngleZ = 0.03;
        mouthScaleX = 0.92 + audio * 0.08;
        mouthScaleY = 0.86 + audio * 0.12;
        blushOpacity = 0.58 + audio * 0.14;
        tintR = -0.02;
        tintG = 0.03;
        tintB = 0.08;
        break;
      case 'thinking':
        floatElevation += calm ? 0 : Math.sin(sec * 1.8) * 0.02;
        bodyRoll = calm ? 0 : Math.sin(sec * 1.4) * 0.055;
        tiltBoostY = calm ? 0 : Math.cos(sec * 1.1) * 0.08;
        eyeOpen = 1.06;
        eyeAngleZ = 0.04;
        mouthScaleX = 0.84;
        mouthScaleY = 0.78;
        blushOpacity = 0.48;
        swirlTarget = calm ? 0.2 : 1.0;
        tintR = 0.04;
        tintG = 0.01;
        tintB = 0.07;
        break;
      case 'speaking':
        floatElevation += (calm ? 0 : Math.sin(sec * 2.2) * 0.015) + speechOpen * 0.025;
        bodyRoll = calm ? 0 : Math.sin(sec * 1.5) * 0.025;
        eyeOpen = 1.16 - speechOpen * 0.08;
        eyeAngleZ = 0.05;
        eyeSizeScale = 1.02;
        // Let the mouth relax between syllables, then open smoothly with TTS amplitude.
        mouthScaleX = 0.86 + speechOpen * 0.52;
        mouthScaleY = 0.35 + speechOpen * 1.4;
        blushOpacity = 0.62 + audio * 0.12;
        tintR = 0.03;
        tintG = 0.02;
        tintB = 0.05;
        break;
      case 'support':
        floatElevation -= 0.02;
        bodyRoll = 0;
        eyeOpen = 1.08;
        eyeAngleZ = 0.04;
        mouthScaleX = 1.12;
        mouthScaleY = 1.08;
        blushOpacity = 0.68;
        lookDamp = 0.45;
        tintR = -0.03;
        tintG = 0.06;
        tintB = 0.03;
        break;
      case 'error':
        floatElevation -= 0.03;
        bodyRoll = 0.05;
        eyeOpen = 1.0;
        eyeAngleZ = -0.04;
        mouthScaleX = 0.9;
        mouthScaleY = 0.78;
        blushOpacity = 0.36;
        lookDamp = 0.5;
        tintR = 0.05;
        tintG = -0.02;
        tintB = -0.03;
        break;
      case 'resting':
        floatElevation -= 0.06;
        eyeOpen = 0.05;
        mouthScaleX = 0.92;
        mouthScaleY = 0.6;
        blushOpacity = 0.44;
        lookDamp = 0;
        break;
      case 'interacting':
        eyeOpen = 0.95;
        eyeAngleZ = 0.08;
        mouthScaleX = 1.2;
        mouthScaleY = 1.25;
        blushOpacity = 0.72;
        break;
      case 'breathing':
        eyeOpen = 0.9; // soft, calm lids
        mouthScaleX = 0.9 - breathSigned * 0.06;
        mouthScaleY = 0.85 + breathSigned * 0.1;
        blushOpacity = 0.6;
        lookDamp = 0.35;
        tintR = -0.02;
        tintG = 0.05;
        tintB = 0.06;
        break;
      case 'idle':
      case 'reducedMotion':
      default:
        if (!calm) bodyRoll = Math.sin(sec * 0.65) * 0.022;
        break;
    }

    // Delight bump from taps/releases (already a smooth decaying envelope).
    this.delight *= Math.exp(-2.2 * dt);
    if (this.delight < 0.002) this.delight = 0;
    const d = this.delight;
    eyeOpen -= 0.14 * d;
    blushOpacity += 0.2 * d;
    mouthScaleX += 0.16 * d;
    mouthScaleY += 0.2 * d;
    floatElevation += 0.03 * d;

    /* 5. Ease the pose toward its targets --------------------------------------------- */
    const p = this.pose;
    const lidRate = eyeOpen < p.eyeOpen ? 7 : 11; // drowsy close, quicker open
    p.eyeOpen = smooth(p.eyeOpen, eyeOpen, lidRate, dt);
    p.eyeAngleZ = smooth(p.eyeAngleZ, eyeAngleZ, 7, dt);
    p.eyeSizeScale = smooth(p.eyeSizeScale, eyeSizeScale, 7, dt);
    p.mouthScaleX = smooth(p.mouthScaleX, mouthScaleX, 12, dt);
    p.mouthScaleY = smooth(p.mouthScaleY, mouthScaleY, 14, dt);
    p.blushOpacity = smooth(p.blushOpacity, blushOpacity, 6, dt);
    p.bodyRoll = smooth(p.bodyRoll, bodyRoll, 5, dt);
    p.floatElevation = smooth(p.floatElevation, floatElevation, 8, dt);

    const tiltX = THREE.MathUtils.clamp(-this.headGazeY * 0.12, -0.12, 0.12) * lookDamp;
    const tiltY = THREE.MathUtils.clamp(this.headGazeX * 0.24 + tiltBoostY, -0.26, 0.26) * lookDamp;
    p.lookTiltX = smooth(p.lookTiltX, resting ? -0.05 : tiltX, 6, dt);
    p.lookTiltY = smooth(p.lookTiltY, tiltY, 6, dt);

    p.pupilX = this.eyeGazeX * lookDamp;
    p.pupilY = this.eyeGazeY * lookDamp;
    p.blink = this.blinkValue;
    p.breath = this.breathValue;
    p.breatheScale = 1 + breathSigned * breathAmp + (this.currentState === 'listening' || this.currentState === 'speaking' ? audio * 0.025 : 0);
    p.audioLevel = audio;
    p.swirlAmount = smooth(p.swirlAmount, swirlTarget, 5, dt);
    p.tintR = smooth(p.tintR, tintR, 4, dt);
    p.tintG = smooth(p.tintG, tintG, 4, dt);
    p.tintB = smooth(p.tintB, tintB, 4, dt);

    return p;
  }

  /** Final eye-group Y scale: lid openness with the blink applied. */
  static eyeScaleY(pose: AnimationPose): number {
    return pose.eyeOpen * (1 - (1 - EYE_CLOSED_FRACTION) * pose.blink);
  }
}
