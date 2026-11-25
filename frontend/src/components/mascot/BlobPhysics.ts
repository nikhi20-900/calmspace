import * as THREE from 'three';

/**
 * Calmspace Blob Physics — tactile soft-body dynamics.
 *
 * Single source of truth for every spring in the mascot. Body motion (position,
 * scale, tilt) is driven by classic damped springs; the "jelly" feel comes from
 * extra underdamped springs (lag + wobble modes + poke) whose values are fed to
 * the body shader as uniforms, so no vertex data is touched on the CPU.
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
  return { value: initialValue, velocity: 0, target: initialValue, stiffness, damping, mass };
}

const MAX_DT = 0.05;
const SUBSTEP = 1 / 120;

/** Semi-implicit Euler with sub-stepping so stiff springs stay stable at any frame rate. */
export function updateSpring(spring: Spring1D, dt: number, dampingScale = 1): void {
  const total = Math.min(dt, MAX_DT);
  if (total <= 0) return;
  const steps = Math.max(1, Math.ceil(total / SUBSTEP));
  const h = total / steps;
  for (let i = 0; i < steps; i++) {
    const accel =
      (-spring.stiffness * (spring.value - spring.target) -
        spring.damping * dampingScale * spring.velocity) /
      spring.mass;
    spring.velocity += accel * h;
    spring.value += spring.velocity * h;
  }
}

export function isSpringSettled(spring: Spring1D, eps = 5e-4): boolean {
  return Math.abs(spring.value - spring.target) < eps && Math.abs(spring.velocity) < eps * 4;
}

/** World-space reach (in scene units) of the pulled "upper mass" while dragging. */
const DRAG_REACH_X = 0.9;
const DRAG_REACH_UP = 0.5;
const DRAG_REACH_DOWN = 0.22;
const POKE_DEPTH = 0.075;

const softLimit = (v: number, max: number) => Math.tanh(v / max) * max;

export class BlobPhysicsController {
  // Rigid-ish body motion
  posX = createSpring(0, 190, 15, 1.1);
  scaleX = createSpring(1, 260, 14, 0.9);
  scaleY = createSpring(1, 260, 14, 0.9);
  scaleZ = createSpring(1, 260, 14, 0.9);
  rotX = createSpring(0, 150, 16, 1);
  rotY = createSpring(0, 150, 16, 1);
  rotZ = createSpring(0, 150, 16, 1);

  // Jelly: the upper mass trails behind the planted base (underdamped on purpose).
  lagX = createSpring(0, 130, 6.5, 1);
  lagY = createSpring(0, 130, 6.5, 1);
  lagZ = createSpring(0, 130, 6.5, 1);

  // Surface ringing modes (different frequencies avoid a mechanical single-note wobble).
  wobble0 = createSpring(0, 420, 5.0, 1);
  wobble1 = createSpring(0, 330, 4.4, 1);
  wobble2 = createSpring(0, 520, 6.0, 1);

  // Finger press: positive = dent, negative = rebound bulge.
  pokeDepth = createSpring(0, 280, 9, 1);
  readonly pokeCenter = new THREE.Vector3(0, 0, 1.4);

  isDragging = false;
  dragMagnitude = 0;
  isPressed = false;

  /** Reduced motion: no overshoot, softer impulses. */
  reducedMotion = false;

  private get dampingScale() {
    return this.reducedMotion ? 2.6 : 1;
  }

  private get impulseScale() {
    return this.reducedMotion ? 0.25 : 1;
  }

  private allSprings(): Spring1D[] {
    return [
      this.posX, this.scaleX, this.scaleY, this.scaleZ,
      this.rotX, this.rotY, this.rotZ,
      this.lagX, this.lagY, this.lagZ,
      this.wobble0, this.wobble1, this.wobble2,
      this.pokeDepth,
    ];
  }

  /** Soft clay squash on tap. Volume-conserving: Y compresses while X/Z swell. */
  tap(intensity = 1): void {
    const k = intensity * this.impulseScale;
    this.scaleY.velocity -= 5.4 * k;
    this.scaleX.velocity += 2.7 * k;
    this.scaleZ.velocity += 2.7 * k;
    this.kickWobble(k);
  }

  private kickWobble(k: number): void {
    this.wobble0.velocity += 13 * k;
    this.wobble1.velocity += 9 * k * (Math.random() < 0.5 ? -1 : 1);
    this.wobble2.velocity += 10 * k;
  }

  /** Finger lands on the surface at `localPoint` (blob object space). */
  press(localPoint: THREE.Vector3 | null): void {
    this.isPressed = true;
    if (localPoint) this.pokeCenter.copy(localPoint);
    else this.pokeCenter.set(0, 0.1, 1.4);
    this.pokeDepth.target = POKE_DEPTH * (this.reducedMotion ? 0.5 : 1);
    this.scaleY.target = 0.96;
    this.scaleX.target = 1.02;
    this.scaleZ.target = 1.02;
  }

  /**
   * Pull the upper mass toward the pointer. `dx`/`dy` are in container half-widths
   * (-2..2). The base stays planted; the body leans and stretches like pulled clay.
   */
  updateDrag(dx: number, dy: number): void {
    this.isDragging = true;
    this.dragMagnitude = Math.hypot(dx, dy);

    const ox = softLimit(dx * DRAG_REACH_X, DRAG_REACH_X);
    const oy = dy > 0 ? softLimit(dy * DRAG_REACH_UP, DRAG_REACH_UP) : softLimit(dy * DRAG_REACH_DOWN, DRAG_REACH_DOWN);

    this.lagX.target = ox * 0.95;
    this.lagY.target = oy * 0.75;
    this.lagZ.target = 0;

    this.posX.target = ox * 0.22;
    this.rotZ.target = -ox * 0.13;
    this.rotX.target = -oy * 0.1;

    // Stretch when pulled up, squash when pushed down, slight pinch when pulled sideways.
    const side = Math.abs(ox);
    this.scaleY.target = 1 + oy * 0.34 - side * 0.05;
    this.scaleX.target = 1 - oy * 0.14 + side * 0.1;
    this.scaleZ.target = 1 - oy * 0.14 + side * 0.04;

    // The dent gives way to the stretch once the finger is clearly dragging.
    this.pokeDepth.target = this.dragMagnitude > 0.12 ? 0 : this.pokeDepth.target;
  }

  /** Let go: everything springs home with a jelly overshoot proportional to the pull. */
  release(): void {
    const energy = Math.min(this.dragMagnitude, 1.6);
    this.isDragging = false;
    this.isPressed = false;
    this.dragMagnitude = 0;

    this.posX.target = 0;
    this.lagX.target = 0;
    this.lagY.target = 0;
    this.lagZ.target = 0;
    this.rotX.target = 0;
    this.rotY.target = 0;
    this.rotZ.target = 0;
    this.scaleX.target = 1;
    this.scaleY.target = 1;
    this.scaleZ.target = 1;

    // Rebound out of the dent (spring overshoots into a gentle bulge).
    this.pokeDepth.target = 0;
    this.pokeDepth.velocity -= 0.5 * this.impulseScale;

    if (energy > 0.05) this.kickWobble(Math.min(0.5 + energy * 0.5, 1.1) * this.impulseScale);
  }

  step(dt: number): void {
    const d = this.dampingScale;
    for (const s of this.allSprings()) updateSpring(s, dt, d);
  }

  isSettled(): boolean {
    return this.allSprings().every((s) => isSpringSettled(s));
  }
}
