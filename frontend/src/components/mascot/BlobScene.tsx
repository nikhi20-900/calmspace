import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BlobController } from './BlobController';
import { setupStudioEnvironment, StudioEnvironmentHandle } from './BlobMaterials';
import { BlobAnimationState } from './BlobAnimations';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type BlobExpression = BlobAnimationState;

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
  const controllerRef = useRef<BlobController | null>(null);
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

    // 1. SETUP THREE.JS SCENE, CAMERA & RENDERER
    // WebGLRenderer performs the capability check itself. Creating a separate
    // context here prevents Three.js from acquiring its own context on this canvas.
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
      renderer.toneMappingExposure = 1.0;
    } catch (e) {
      console.warn('WebGL init failed, using fallback', e);
      setHasWebGlError(true);
      return;
    }

    // 2. STUDIO PMREM ENVIRONMENT (Soft Image-Based Lighting)
    let studioEnv: StudioEnvironmentHandle | null = null;
    try {
      studioEnv = setupStudioEnvironment(renderer, scene);
    } catch (e) {
      console.warn('Studio PMREM Environment init notice:', e);
    }

    // 3. STUDIO 4-POINT LIGHTING WITH SOFT HIGHLIGHTS
    // A. Ambient sky/ground hemisphere
    const hemiLight = new THREE.HemisphereLight(0xF7F6FB, 0x777087, 0.72);
    scene.add(hemiLight);

    // B. Warm peach key light (Top-Right)
    const keyLight = new THREE.DirectionalLight(0xFFF4E8, 2.1);
    keyLight.position.set(4.5, 5.5, 4.0);
    scene.add(keyLight);

    // A broad studio panel creates the long, soft clay highlight that reveals curvature.
    const keyPanel = new THREE.RectAreaLight(0xF5EEFF, 2.4, 3.2, 3.8);
    keyPanel.position.set(-3.2, 2.8, 4.2);
    keyPanel.lookAt(0, 0.05, 0);
    scene.add(keyPanel);

    // C. Cool mint fill light (Bottom-Left)
    const fillLight = new THREE.DirectionalLight(0xDCE4F7, 0.28);
    fillLight.position.set(-4.0, 0.2, 2.5);
    scene.add(fillLight);

    // D. Soft lavender rim light (Behind-Above for glowing silhouette)
    const rimLight = new THREE.DirectionalLight(0xDCD6FB, 1.25);
    rimLight.position.set(0, 4.5, -4.5);
    scene.add(rimLight);

    // E. Warm floor bounce light
    const floorBounce = new THREE.DirectionalLight(0xF4DCCB, 0.16);
    floorBounce.position.set(0, -3.5, 1.5);
    scene.add(floorBounce);

    // 4. CREATE VOLUMETRIC CHARACTER CONTROLLER
    const controller = new BlobController();
    controllerRef.current = controller;
    scene.add(controller.rootGroup);

    setIsLoaded(true);

    // 5. ANIMATION & TIMING LOOP
    let animFrameId: number;
    let lastTime = performance.now();
    let isVisible = true;

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

    // Main Render Loop
    const renderLoop = (time: number) => {
      animFrameId = requestAnimationFrame(renderLoop);

      if (!isVisible) return;

      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const sec = time / 1000;

      // Determine active expression state
      let activeExp: BlobExpression = currentExpressionRef.current;
      if (isBreathingActive) {
        activeExp = 'breathing';
      } else if (pointerRef.current.isDragging) {
        activeExp = 'interacting';
      } else if (isCtaHovered) {
        activeExp = 'welcoming';
      } else if (pointerRef.current.isHovering && activeExp === 'idle') {
        activeExp = 'curious';
      }

      controller.setExpression(activeExp);

      // Gaze Tracking
      let targetGazeX = pointerRef.current.x;
      let targetGazeY = pointerRef.current.y;

      if (isCtaHovered) {
        // Look downward with welcoming gaze toward the primary CTA
        targetGazeX = 0;
        targetGazeY = -0.75;
      }

      controller.setGaze(targetGazeX, targetGazeY);

      // Advance physics springs & animation poses
      controller.step(dt, sec, isReducedMotion);

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

    // 7. TEARDOWN AND RESOURCE CLEANUP
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      observer.disconnect();

      studioEnv?.dispose();
      controller.dispose();
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

    try {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      // Safe fallback
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

    if (pointerRef.current.isDragging && controllerRef.current) {
      const dx = (e.clientX - dragStartRef.current.x) / (rect.width * 0.35);
      const dy = -(e.clientY - dragStartRef.current.y) / (rect.height * 0.35);

      if (Math.hypot(dx, dy) > 0.04) {
        hasDraggedRef.current = true;
      }

      controllerRef.current.updateDrag(dx, dy);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerRef.current.isDragging) return;
    pointerRef.current.isDragging = false;

    try {
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    } catch {
      // Safe fallback
    }

    if (controllerRef.current) {
      if (!hasDraggedRef.current) {
        // Pure click/tap: soft squash & stretch impulse
        controllerRef.current.triggerSquashImpulse(1.0);
        onBlobClick?.();
      } else {
        // Released after dragging: rubber-band spring back to center
        controllerRef.current.releaseDrag();
      }
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
      className={`relative w-full h-full flex items-center justify-center select-none touch-none cursor-grab active:cursor-grabbing ${className}`}
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
    </div>
  );
};
