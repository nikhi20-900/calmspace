import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BlobController, BLOB_QUALITY_HIGH, BLOB_QUALITY_MOBILE } from './BlobController';
import { createLightRig, setupStudioEnvironment, StudioEnvironmentHandle } from './BlobMaterials';
import { BlobAnimationState } from './BlobAnimations';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type BlobExpression = BlobAnimationState;

export interface BlobSceneProps {
  expression?: BlobExpression;
  isCtaHovered?: boolean;
  isBreathingActive?: boolean;
  audioLevel?: number;
  breathingPhase?: number | null;
  /** Normalized microphone activity (0–1), smoothed into a subtle body pulse. */
  voiceLevel?: number;
  /** Hex tint for the companion's procedural clay body. */
  bodyColor?: number;
  onBlobClick?: () => void;
  className?: string;
}

/** Handle the React pointer handlers use to talk to the (single, long-lived) engine. */
interface BlobEngine {
  controller: BlobController;
  wake: (ms?: number) => void;
  /** Ray through a client-space point, or undefined if the canvas has no size. */
  rayAt: (clientX: number, clientY: number) => THREE.Raycaster | undefined;
}

interface InteractionState {
  hovering: boolean;
  pressed: boolean;
  moved: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  /** Last pointer position anywhere on the page (drives the eyes). */
  clientX: number;
  clientY: number;
  lastMove: number;
}

const TAP_SLOP_PX = 6;
const GAZE_MEMORY_MS = 3500;
const BASE_CAMERA_Z = 6.4;

export const BlobScene: React.FC<BlobSceneProps> = ({
  expression = 'idle',
  isCtaHovered = false,
  isBreathingActive = false,
  audioLevel = 0,
  breathingPhase = null,
  voiceLevel = 0,
  bodyColor = 0xa79de3,
  onBlobClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isReducedMotion = useReducedMotion();

  const [hasWebGlError, setHasWebGlError] = useState(false);
  const [isContextLost, setIsContextLost] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Props the render loop reads every frame. Updating them never rebuilds the scene.
  const expressionRef = useRef(expression);
  const ctaHoveredRef = useRef(isCtaHovered);
  const breathingRef = useRef(isBreathingActive);
  const audioLevelRef = useRef(audioLevel);
  const breathingPhaseRef = useRef(breathingPhase);
  const voiceLevelRef = useRef(voiceLevel);
  const reducedRef = useRef(isReducedMotion);
  const onClickRef = useRef(onBlobClick);
  const engineRef = useRef<BlobEngine | null>(null);

  const interaction = useRef<InteractionState>({
    hovering: false,
    pressed: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    clientX: 0,
    clientY: 0,
    lastMove: -Infinity,
  });

  useEffect(() => {
    expressionRef.current = expression;
    ctaHoveredRef.current = isCtaHovered;
    breathingRef.current = isBreathingActive;
    audioLevelRef.current = audioLevel;
    breathingPhaseRef.current = breathingPhase;
    voiceLevelRef.current = voiceLevel;
    reducedRef.current = isReducedMotion;
    onClickRef.current = onBlobClick;
    engineRef.current?.wake();
  }, [expression, isCtaHovered, isBreathingActive, audioLevel, breathingPhase, voiceLevel, isReducedMotion, onBlobClick]);

  /* ------------------------------------------------------------------------------------
   * Engine: created once per mount. Everything below is torn down in the cleanup.
   * ---------------------------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const coarse =
      window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640;
    const maxDpr = coarse ? 1.5 : 2;
    let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'default', // a hero mascot should not wake the discrete GPU
      });
    } catch (e) {
      console.warn('WebGL init failed, using fallback', e);
      setHasWebGlError(true);
      return;
    }
    renderer.setPixelRatio(dpr);
    renderer.toneMapping = THREE.NeutralToneMapping; // keeps the lavender hue (ACES desaturates it)
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0.15, BASE_CAMERA_Z);

    let studioEnv: StudioEnvironmentHandle | null = null;
    let controller: BlobController;
    try {
      studioEnv = setupStudioEnvironment(renderer, scene);
      scene.add(createLightRig());
      controller = new BlobController(coarse ? BLOB_QUALITY_MOBILE : BLOB_QUALITY_HIGH, bodyColor);
      scene.add(controller.rootGroup);
    } catch (e) {
      console.warn('Blob scene setup failed, using fallback', e);
      studioEnv?.dispose();
      renderer.dispose();
      setHasWebGlError(true);
      return;
    }

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    /* ---- sizing ---- */
    const applySize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      const aspect = w / h;
      camera.aspect = aspect;
      // Narrow stages pull back so the blob (and its drag reach) is never clipped.
      camera.position.z = Math.max(BASE_CAMERA_Z, 6.85 / aspect);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
    };
    applySize();

    /* ---- loop control ---- */
    const t0 = performance.now();
    let raf = 0;
    let running = false;
    let lastFrame = 0;
    let activeUntil = 0;
    let inView = true;
    let docVisible = !document.hidden;
    let contextLost = false;
    let avgFrameMs = 16.7;
    let lastDprAdjust = 0;
    let firstFrameDone = false;

    const shouldRun = () => inView && docVisible && !contextLost;

    const stopLoop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      running = false;
      lastFrame = 0;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!running) return;

      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
      if (lastFrame) avgFrameMs = avgFrameMs * 0.94 + Math.min(now - lastFrame, 100) * 0.06;
      lastFrame = now;

      const reduced = reducedRef.current;
      const inter = interaction.current;

      // Expression precedence: guided breathing > press/drag > CTA hover > curious hover.
      let exp: BlobExpression = expressionRef.current;
      if (breathingRef.current) exp = 'breathing';
      else if (inter.pressed) exp = 'interacting';
      else if (ctaHoveredRef.current) exp = 'welcoming';
      else if (inter.hovering && exp === 'idle') exp = 'curious';
      controller.setExpression(exp);
      controller.setAudioLevel(audioLevelRef.current);
      controller.setExternalBreath(breathingPhaseRef.current);

      // During conversation the blob keeps a gentle, steady gaze toward the user.
      // Direct manipulation and the hero CTA still take precedence.
      if (ctaHoveredRef.current) {
        controller.setGaze(0, -0.75, true);
      } else if (inter.pressed) {
        const rect = container.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.42;
        const range = Math.max(rect.width, 480) * 0.7;
        controller.setGaze(
          THREE.MathUtils.clamp((inter.clientX - cx) / range, -1, 1),
          THREE.MathUtils.clamp(-(inter.clientY - cy) / (range * 0.85), -1, 1),
          true
        );
      } else if (['listening', 'speaking', 'support', 'breathing'].includes(exp)) {
        controller.setGaze(0, 0.08, true);
      } else if (now - inter.lastMove < GAZE_MEMORY_MS) {
        const rect = container.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.42;
        const range = Math.max(rect.width, 480) * 0.7;
        controller.setGaze(
          THREE.MathUtils.clamp((inter.clientX - cx) / range, -1, 1),
          THREE.MathUtils.clamp(-(inter.clientY - cy) / (range * 0.85), -1, 1),
          true
        );
      } else {
        controller.setGaze(0, 0, false);
      }

      controller.setVoiceLevel(voiceLevelRef.current);
      controller.step(dt, (now - t0) / 1000, reduced);
      renderer.render(scene, camera);

      if (!firstFrameDone) {
        firstFrameDone = true;
        setIsLoaded(true);
      }

      // Dynamic resolution: if we sustain well under ~36 fps, drop the pixel ratio once per 2.5s.
      if (now - lastDprAdjust > 2500 && avgFrameMs > 28 && dpr > 1) {
        dpr = Math.max(1, dpr * 0.8);
        lastDprAdjust = now;
        applySize();
      }

      // Reduced motion lets the loop sleep once everything has settled.
      const continuous = !reduced || breathingRef.current || inter.pressed;
      if (continuous || now < activeUntil || !controller.isSettled()) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
        lastFrame = 0;
      }
    };

    const wake = (ms = 1500) => {
      activeUntil = Math.max(activeUntil, performance.now() + ms);
      if (!running && shouldRun()) {
        running = true;
        lastFrame = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    /* ---- visibility ---- */
    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[entries.length - 1].isIntersecting;
        if (shouldRun()) wake();
        else stopLoop();
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    const onVisibility = () => {
      docVisible = !document.hidden;
      if (shouldRun()) wake();
      else stopLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const ro = new ResizeObserver(() => {
      applySize();
      wake();
    });
    ro.observe(container);

    /* ---- pointer gaze (anywhere on the page) ---- */
    const onWindowPointer = (e: PointerEvent) => {
      const inter = interaction.current;
      inter.clientX = e.clientX;
      inter.clientY = e.clientY;
      inter.lastMove = performance.now();
      wake(GAZE_MEMORY_MS);
    };
    window.addEventListener('pointermove', onWindowPointer, { passive: true });
    window.addEventListener('pointerdown', onWindowPointer, { passive: true });

    /* ---- WebGL context loss / restore ---- */
    const onContextLost = (e: Event) => {
      e.preventDefault(); // allows the browser to restore the context
      contextLost = true;
      stopLoop();
      setIsContextLost(true);
    };
    const onContextRestored = () => {
      contextLost = false;
      // Render-target contents (the PMREM env map) don't survive a lost context.
      studioEnv?.dispose();
      studioEnv = setupStudioEnvironment(renderer, scene);
      setIsContextLost(false);
      wake();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    engineRef.current = {
      controller,
      wake,
      rayAt: (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return undefined;
        ndc.set(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -(((clientY - rect.top) / rect.height) * 2 - 1)
        );
        raycaster.setFromCamera(ndc, camera);
        return raycaster;
      },
    };

    wake();

    return () => {
      engineRef.current = null;
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onWindowPointer);
      window.removeEventListener('pointerdown', onWindowPointer);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);

      controller.dispose();
      studioEnv?.dispose();
      scene.clear();
      // Deliberately no forceContextLoss(): React StrictMode re-runs this effect on the
      // *same* canvas, and a force-lost context cannot be reacquired.
      renderer.dispose();
    };
  }, [bodyColor]);

  /* ------------------------------------------------------------------------------------
   * Pointer, touch and keyboard interaction
   * ---------------------------------------------------------------------------------- */
  const endPress = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const inter = interaction.current;
    if (!inter.pressed || e.pointerId !== inter.pointerId) return;
    const wasTap = commit && !inter.moved;
    inter.pressed = false;
    inter.moved = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be gone (pointercancel / lostpointercapture) */
    }
    const engine = engineRef.current;
    engine?.controller.release(wasTap);
    engine?.wake();
    if (wasTap) onClickRef.current?.();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const inter = interaction.current;
    inter.pressed = true;
    inter.moved = false;
    inter.pointerId = e.pointerId;
    inter.startX = e.clientX;
    inter.startY = e.clientY;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* unsupported / already captured */
    }
    const engine = engineRef.current;
    if (engine) {
      engine.controller.press(engine.rayAt(e.clientX, e.clientY));
      engine.wake();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const inter = interaction.current;
    if (e.pointerType === 'mouse') inter.hovering = true;
    if (!inter.pressed || e.pointerId !== inter.pointerId) return;

    if (!inter.moved && Math.hypot(e.clientX - inter.startX, e.clientY - inter.startY) > TAP_SLOP_PX) {
      inter.moved = true;
    }
    if (inter.moved) {
      const rect = e.currentTarget.getBoundingClientRect();
      engineRef.current?.controller.updateDrag(
        (e.clientX - inter.startX) / (rect.width * 0.5),
        -(e.clientY - inter.startY) / (rect.height * 0.5)
      );
    }
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') {
      interaction.current.hovering = true;
      engineRef.current?.wake();
    }
  };

  const handlePointerLeave = () => {
    interaction.current.hovering = false;
    engineRef.current?.wake();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const engine = engineRef.current;
    engine?.controller.tap(1);
    engine?.wake();
    onClickRef.current?.();
  };

  const showFallback = hasWebGlError || isContextLost || !isLoaded;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center select-none touch-pan-y cursor-grab active:cursor-grabbing rounded-[2rem] outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]/50 [-webkit-tap-highlight-color:transparent] ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => endPress(e, true)}
      onPointerCancel={(e) => endPress(e, false)}
      onLostPointerCapture={(e) => endPress(e, false)}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Calmspace mascot, a soft lavender blob. Press Enter to say hello, or drag it gently."
    >
      {/* WebGL Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`w-full h-full transition-opacity duration-500 ${
          isLoaded && !hasWebGlError && !isContextLost ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Graceful fallback while loading, if WebGL is unavailable, or while the context is lost */}
      {showFallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div
            className={`w-52 h-52 sm:w-56 sm:h-56 rounded-[50%_50%_46%_46%] shadow-2xl flex flex-col items-center justify-center border-2 border-white/50 transition-transform duration-500 ${
              isBreathingActive || expression === 'breathing'
                ? 'bg-gradient-to-b from-[#BCE2DC] to-[#98CFC8]'
                : expression === 'support'
                  ? 'bg-gradient-to-b from-[#CBE6D4] to-[#9FC9AF]'
                  : expression === 'error'
                    ? 'bg-gradient-to-b from-[#F4DCCB] to-[#E2BBA2]'
                    : 'bg-gradient-to-b from-[#C4BDF8] to-[#AFA6EC]'
            } ${!isReducedMotion ? 'motion-safe:animate-pulse' : ''}`}
            style={{
              transform:
                !isReducedMotion && (expression === 'listening' || expression === 'speaking')
                  ? `scale(${1 + Math.min(audioLevel, 1) * 0.08})`
                  : !isReducedMotion && (isBreathingActive || expression === 'breathing') && breathingPhase !== null
                    ? `scale(${0.94 + breathingPhase * 0.14})`
                    : undefined,
            }}
          >
            <div className="flex gap-10 mb-4">
              <div className="w-4 h-5 rounded-full bg-[#25233B] transition-transform duration-200" style={{ transform: `scaleY(${isBreathingActive || expression === 'breathing' || expression === 'support' ? 0.76 : expression === 'listening' ? 1.12 : 1})` }} />
              <div className="w-4 h-5 rounded-full bg-[#25233B] transition-transform duration-200" style={{ transform: `scaleY(${isBreathingActive || expression === 'breathing' || expression === 'support' ? 0.76 : expression === 'listening' ? 1.12 : 1})` }} />
            </div>
            <div
              className={`border-b-2 border-[#48436E] rounded-full transition-all duration-150 ${
                expression === 'speaking' ? 'w-7 h-3' : 'w-6 h-2'
              }`}
              style={expression === 'speaking' ? { transform: `scaleY(${0.35 + Math.min(Math.max(audioLevel, 0), 1) * 1.4})` } : undefined}
            />
          </div>
          <span className="text-xs text-[#625F78] mt-4 font-medium">
            Calm ({isBreathingActive ? 'breathing' : expression})
          </span>
        </div>
      )}
    </div>
  );
};

export default BlobScene;
