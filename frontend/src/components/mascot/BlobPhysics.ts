/**
 * Calmspace Blob Physics Engine — Enhanced Tactile Dynamics
 * Damped harmonic oscillator with secondary jelly jiggle & volume preservation
 */

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
  // Clamp dt to maintain mathematical stability
  const clampedDt = Math.min(dt, 0.033);
  const force = -spring.stiffness * (spring.value - spring.target);
  const dampingForce = -spring.damping * spring.velocity;
  const acceleration = (force + dampingForce) / spring.mass;

  spring.velocity += acceleration * clampedDt;
  spring.value += spring.velocity * clampedDt;
}

export class BlobPhysicsController {
  // 3D Position springs (drag, tether resistance, and return)
  posX = createSpring(0, 190, 15, 1.1);
  posY = createSpring(0, 190, 15, 1.1);
  posZ = createSpring(0, 190, 15, 1.1);

  // 3D Scale springs (volume-preserving squash & stretch)
  scaleX = createSpring(1, 260, 14, 0.9);
  scaleY = createSpring(1, 260, 14, 0.9);
  scaleZ = createSpring(1, 260, 14, 0.9);

  // 3D Rotation springs (tactile tilt in direction of motion/pointer)
  rotX = createSpring(0, 150, 16, 1);
  rotY = createSpring(0, 150, 16, 1);
  rotZ = createSpring(0, 150, 16, 1);

  // Secondary surface jiggle oscillation
  jiggleAmplitude = 0;
  jiggleDecay = 4.2;
  jiggleFrequency = 14;
  jiggleTime = 0;

  isDragging = false;
  dragDistance = 0;

  // Trigger a soft squash & stretch impulse (on tap/click)
  triggerSquashImpulse(intensity = 1.0): void {
    // Compress along Y, expand radially along X & Z for strict volume preservation
    this.scaleY.velocity -= 6.2 * intensity;
    this.scaleX.velocity += 3.1 * intensity;
    this.scaleZ.velocity += 3.1 * intensity;

    // Trigger secondary surface ripple
    this.jiggleAmplitude = Math.min(this.jiggleAmplitude + 0.18 * intensity, 0.35);
  }

  // Update drag target in normalized coordinates
  updateDrag(dx: number, dy: number): void {
    const maxDrag = 1.6;
    const dist = Math.hypot(dx, dy);
    this.dragDistance = dist;

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

  // Release drag with spring-back rebound
  releaseDrag(): void {
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

  step(dt: number): void {
    updateSpring(this.posX, dt);
    updateSpring(this.posY, dt);
    updateSpring(this.posZ, dt);

    updateSpring(this.scaleX, dt);
    updateSpring(this.scaleY, dt);
    updateSpring(this.scaleZ, dt);

    updateSpring(this.rotX, dt);
    updateSpring(this.rotY, dt);
    updateSpring(this.rotZ, dt);

    // Decay jiggle oscillation
    if (this.jiggleAmplitude > 0.001) {
      this.jiggleTime += dt;
      this.jiggleAmplitude *= Math.exp(-this.jiggleDecay * dt);
    } else {
      this.jiggleAmplitude = 0;
      this.jiggleTime = 0;
    }
  }

  getSurfaceJiggle(): number {
    if (this.jiggleAmplitude <= 0.001) return 0;
    return Math.sin(this.jiggleTime * this.jiggleFrequency) * this.jiggleAmplitude;
  }
}
