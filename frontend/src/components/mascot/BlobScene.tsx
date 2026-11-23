import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createBlobCharacter, BlobModelOutput } from './BlobModel';
import { BlobPhysicsController } from './BlobPhysics';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type BlobExpression = 'idle' | 'curious' | 'welcoming' | 'resting' | 'interacting' | 'reducedMotion';

export interface BlobSceneProps {
  expression?: BlobExpression;
  isCtaHovered?: boolean;
  isBreathingActive?: boolean;
  onBlobClick?: () => void;
  className?: string;
}

export const BlobScene: React.FC<BlobSceneProps> = ({
  expression = 'idle',
  isCtaHovered = false,
  isBreathingActive = false,
  onBlobClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isReducedMotion = useReducedMotion();

  const [hasWebGlError, setHasWebGlError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cross-frame references
  const physicsRef = useRef(new BlobPhysicsController());
  const blobModelRef = useRef<BlobModelOutput | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, isHovering: false, isDragging: false });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  const currentExpressionRef = useRef<BlobExpression>(expression);
  useEffect(() => {
    currentExpressionRef.current = expression;
  }, [expression]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Check WebGL availability
    try {
      const testGl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!testGl) {
        setHasWebGlError(true);
        return;
      }
    } catch {
      setHasWebGlError(true);
      return;
    }

    // 1. SETUP THREE.JS SCENE, CAMERA & RENDERER
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 0.15, 6.4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(container.clientWidth, container.clientHeight, false);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
    } catch (e) {
      console.warn('WebGL init failed, using fallback', e);
      setHasWebGlError(true);
      return;
    }

    // 2. STUDIO 4-POINT LIGHTING WITH SOFT HIGHLIGHTS
    // A. Ambient sky/ground hemisphere
    const hemiLight = new THREE.HemisphereLight(0xF7F6FB, 0xEDEBF7, 1.25);
    scene.add(hemiLight);

    // B. Warm peach key light (Top-Right)
    const keyLight = new THREE.DirectionalLight(0xFFF6EE, 1.5);
    keyLight.position.set(4.5, 5.5, 4.0);
    scene.add(keyLight);

    // C. Cool mint fill light (Bottom-Left)
    const fillLight = new THREE.DirectionalLight(0xDCE9DF, 0.75);
    fillLight.position.set(-4.0, -1.0, 2.5);
    scene.add(fillLight);

    // D. Soft lavender rim light (Behind-Above for glowing silhouette)
    const rimLight = new THREE.DirectionalLight(0xDCD6FB, 1.85);
    rimLight.position.set(0, 4.5, -4.5);
    scene.add(rimLight);

    // E. Warm floor bounce light
    const floorBounce = new THREE.DirectionalLight(0xF4DCCB, 0.45);
    floorBounce.position.set(0, -3.5, 1.5);
    scene.add(floorBounce);

    // 3. CREATE VOLUMETRIC CHARACTER
    const blobCharacter = createBlobCharacter();
    blobModelRef.current = blobCharacter;
    scene.add(blobCharacter.rootGroup);

    setIsLoaded(true);

    // 4. ANIMATION & BLINK TIMING
    let animFrameId: number;
    let lastTime = performance.now();
    let isVisible = true;
    let blinkTimer = 0;
    let nextBlinkTime = 3.2;
    let isBlinking = false;
    let blinkDuration = 0.16;
    let blinkElapsed = 0;

    // Visibility Observer to pause rendering when scrolled off-screen
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 5. MAIN RENDER LOOP
    const renderLoop = (time: number) => {
      animFrameId = requestAnimationFrame(renderLoop);

      if (!isVisible) return;

      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const physics = physicsRef.current;
      physics.step(dt);

      const sec = time / 1000;

      // Determine active expression
      let activeExp: BlobExpression = currentExpressionRef.current;
      if (isBreathingActive) {
        activeExp = 'resting';
      } else if (pointerRef.current.isDragging) {
        activeExp = 'interacting';
      } else if (isCtaHovered) {
        activeExp = 'welcoming';
      } else if (pointerRef.current.isHovering && activeExp === 'idle') {
        activeExp = 'curious';
      }

      // Blinking physics
      if (activeExp === 'resting') {
        blobCharacter.eyeController.setBlink(0.96);
      } else if (isReducedMotion) {
        blobCharacter.eyeController.setBlink(0);
      } else {
        blinkTimer += dt;
        if (!isBlinking && blinkTimer > nextBlinkTime) {
          isBlinking = true;
          blinkElapsed = 0;
        }

        if (isBlinking) {
          blinkElapsed += dt;
          const progress = blinkElapsed / blinkDuration;
          if (progress <= 0.5) {
            blobCharacter.eyeController.setBlink(progress * 2);
          } else if (progress < 1.0) {
            blobCharacter.eyeController.setBlink(1.0 - (progress - 0.5) * 2);
          } else {
            isBlinking = false;
            blinkTimer = 0;
            nextBlinkTime = 3.0 + Math.random() * 3.5;
            blobCharacter.eyeController.setBlink(0);
          }
        }
      }

      // Expression state
      blobCharacter.eyeController.setExpression(activeExp);

      // Gaze Tracking
      let targetGazeX = pointerRef.current.x;
      let targetGazeY = pointerRef.current.y;

      if (isCtaHovered) {
        // Look downward with welcoming gaze toward the primary button
        targetGazeX = 0;
        targetGazeY = -0.75;
      }

      blobCharacter.eyeController.setGaze(targetGazeX, targetGazeY);

      // Idle Floating & Natural Respiratory Rhythm
      const floatCycle = isReducedMotion ? 0 : Math.sin(sec * 1.3) * 0.11;
      const breatheCycle = isReducedMotion
        ? 1.0
        : isBreathingActive
        ? 1.0 + Math.sin(sec * 0.785) * 0.085 // 4s inhale, 4s exhale
        : 1.0 + Math.sin(sec * 1.45) * 0.024; // subtle idle breathing

      // Apply physics displacement to body
      const body = blobCharacter.bodyMesh;
      body.position.x = physics.posX.value;
      body.position.y = physics.posY.value + floatCycle;
      body.position.z = physics.posZ.value;

      // Pointer rotation influence (clamped to natural tilt)
      const lookRotY = THREE.MathUtils.clamp(targetGazeX * 0.24, -0.25, 0.25);
      const lookRotX = THREE.MathUtils.clamp(-targetGazeY * 0.18, -0.18, 0.18);

      body.rotation.x = physics.rotX.value + lookRotX;
      body.rotation.y = physics.rotY.value + lookRotY;
      body.rotation.z = physics.rotZ.value;

      // Apply squash, stretch, and breath scale
      body.scale.x = physics.scaleX.value * breatheCycle;
      body.scale.y = physics.scaleY.value * breatheCycle;
      body.scale.z = physics.scaleZ.value * breatheCycle;

      // Surface jiggle micro-waves
      blobCharacter.updateDeformation(sec, breatheCycle, physics.getSurfaceJiggle());

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(renderLoop);

    // 6. RESIZE HANDLER
    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      observer.disconnect();
      renderer.dispose();
    };
  }, [isBreathingActive, isCtaHovered, isReducedMotion]);

  // POINTER & TOUCH DRAG INTERACTIONS
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const container = containerRef.current;
    if (!container) return;

    pointerRef.current.isDragging = true;
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    physicsRef.current.isDragging = true;

    try {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    pointerRef.current.x = THREE.MathUtils.clamp(nx, -1, 1);
    pointerRef.current.y = THREE.MathUtils.clamp(ny, -1, 1);
    pointerRef.current.isHovering = true;

    if (pointerRef.current.isDragging) {
      const dx = (e.clientX - dragStartRef.current.x) / (rect.width * 0.35);
      const dy = -(e.clientY - dragStartRef.current.y) / (rect.height * 0.35);

      if (Math.hypot(dx, dy) > 0.04) {
        hasDraggedRef.current = true;
      }

      physicsRef.current.updateDrag(dx, dy);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerRef.current.isDragging) return;
    pointerRef.current.isDragging = false;

    try {
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    } catch {
      // safe fallback
    }

    if (!hasDraggedRef.current) {
      // Pure click/tap: soft squash & stretch impulse!
      physicsRef.current.triggerSquashImpulse(1.0);
      onBlobClick?.();
    } else {
      // Released after dragging: rubber-band spring back to center
      physicsRef.current.releaseDrag();
    }
  };

  const handlePointerLeave = () => {
    if (!pointerRef.current.isDragging) {
      pointerRef.current.isHovering = false;
      pointerRef.current.x = 0;
      pointerRef.current.y = 0;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[380px] sm:min-h-[460px] md:min-h-[520px] flex items-center justify-center select-none touch-none cursor-grab active:cursor-grabbing ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      role="img"
      aria-label="Calmspace interactive volumetric 3D lavender blob mascot that breathes, tracks gaze, reacts to touch, and springs on drag"
    >
      {/* WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full transition-opacity duration-500 ${
          isLoaded && !hasWebGlError ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Graceful Fallback if WebGL is unavailable or loading */}
      {(hasWebGlError || !isLoaded) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-56 h-56 rounded-[50%_50%_46%_46%] bg-gradient-to-b from-[#C4BDF8] to-[#AFA6EC] shadow-2xl flex flex-col items-center justify-center border-2 border-white/40 animate-pulse">
            <div className="flex gap-10 mb-4">
              <div className="w-4 h-5 rounded-full bg-[#25233B]" />
              <div className="w-4 h-5 rounded-full bg-[#25233B]" />
            </div>
            <div className="w-6 h-2 border-b-2 border-[#6E689C] rounded-full" />
          </div>
          <span className="text-xs text-[#625F78] mt-4 font-medium">
            Calmspace Blob
          </span>
        </div>
      )}

      {/* Tactile interaction badge */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xs px-3.5 py-1 rounded-full border border-[#E8E6F1] shadow-subtle pointer-events-none transition-opacity duration-300 opacity-60 hover:opacity-100">
        <span className="text-[11px] font-semibold text-[#5554B8] tracking-wide">
          Tap or drag the blob
        </span>
      </div>
    </div>
  );
};
