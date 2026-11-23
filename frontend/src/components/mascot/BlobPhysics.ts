/**
 * Calmspace Blob Physics Engine
 * Damped harmonic oscillator for:
 * 1. Volumetric squash-and-stretch
 * 2. Elastic rubber-band drag & return
 * 3. Natural breathing & floating rhythm
 */

export interface Spring1D {
  value: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;
  mass: number;
}

export function createSpring(initialValue = 0, stiffness = 160, damping = 14, mass = 1): Spring1D {
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
  // Cap delta time to prevent instability
  const clampedDt = Math.min(dt, 0.05);
  const force = -spring.stiffness * (spring.value - spring.target);
  const dampingForce = -spring.damping * spring.velocity;
  const acceleration = (force + dampingForce) / spring.mass;

  spring.velocity += acceleration * clampedDt;
  spring.value += spring.velocity * clampedDt;
}

export class BlobPhysicsController {
  // Position springs (drag & spring back)
  posX = createSpring(0, 180, 16, 1.2);
  posY = createSpring(0, 180, 16, 1.2);
  posZ = createSpring(0, 180, 16, 1.2);

  // Scale springs (squash & stretch)
  scaleX = createSpring(1, 240, 14, 1);
  scaleY = createSpring(1, 240, 14, 1);
  scaleZ = createSpring(1, 240, 14, 1);

  // Rotation springs (subtle tilt toward pointer / drag)
  rotX = createSpring(0, 140, 15, 1);
  rotY = createSpring(0, 140, 15, 1);
  rotZ = createSpring(0, 140, 15, 1);

  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;

  // Trigger a squash & stretch impulse (on click/touch)
  triggerSquashImpulse(intensity = 1.0): void {
    // Compress vertically, expand horizontally (volume preservation)
    this.scaleY.velocity -= 5.5 * intensity;
    this.scaleX.velocity += 2.8 * intensity;
    this.scaleZ.velocity += 2.8 * intensity;
  }

  // Set drag target in normalized 3D space
  updateDrag(dx: number, dy: number): void {
    // Rubber-band resistance: displacement decays non-linearly
    const maxDrag = 1.6;
    const dist = Math.hypot(dx, dy);
    const resistance = Math.tanh(dist / maxDrag) * maxDrag;
    const angle = Math.atan2(dy, dx);

    const clampedX = Math.cos(angle) * resistance;
    const clampedY = Math.sin(angle) * resistance;

    this.posX.target = clampedX;
    this.posY.target = clampedY;

    // Stretch in the direction of the drag
    const stretchAmount = Math.min(dist * 0.25, 0.45);
    this.scaleX.target = 1 + stretchAmount * Math.abs(Math.cos(angle));
    this.scaleY.target = 1 + stretchAmount * Math.abs(Math.sin(angle));
    this.scaleZ.target = 1 - stretchAmount * 0.5;

    // Tilt in direction of drag
    this.rotZ.target = -clampedX * 0.3;
    this.rotX.target = clampedY * 0.3;
  }

  releaseDrag(): void {
    this.isDragging = false;
    this.posX.target = 0;
    this.posY.target = 0;
    this.posZ.target = 0;

    this.scaleX.target = 1;
    this.scaleY.target = 1;
    this.scaleZ.target = 1;

    this.rotX.target = 0;
    this.rotY.target = 0;
    this.rotZ.target = 0;

    // Small bounce impulse on release
    this.triggerSquashImpulse(0.7);
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
  }
}
