# Calmspace Blob (mascot)

Three.js soft-clay mascot. One long-lived scene per mount; props are read from refs each frame, so hover and breathing changes never rebuild it.

| File | Role |
|---|---|
| `BlobScene.tsx` | React component: renderer, render loop, pointer/touch/keyboard input, visibility, context-loss recovery |
| `BlobController.ts` | Builds the hierarchy, applies pose + physics each frame, disposes everything it owns |
| `BlobPhysics.ts` | Single source of truth for springs (body, jelly lag, wobble modes, poke) |
| `BlobAnimations.ts` | Expression blending, blinking, gaze, breathing |
| `BlobMaterials.ts` | Body material (GPU deformation + clay shading), light rig, eye/mouth/shadow materials |
| `BlobGeometry.ts` | SDF body mesh (cached per quality tier), eye and mouth geometry |

## Known limitations

- **Residual per-mount GPU objects.** About 4 textures, 3 framebuffers and 1 buffer stay behind per remount. This reproduces in a bare Three.js renderer with only the environment bake, so it is not from this code. The browser frees them with the canvas. `forceContextLoss()` is deliberately not called, because React StrictMode reuses the same canvas and a force-lost context cannot be reacquired.
- **Timing checks.** The headless GPU used for testing is slow, so the tap-squash peak was too fast to sample. Squash, drag and release were confirmed visually in frames, not by number. The Enter-key reaction was not confirmed by a measurement. Feel and frame rate should be checked on a real phone.
- **Vertical drag on touch.** It scrolls the page instead (the cost of `touch-action: pan-y`, which keeps the blob from trapping page scroll). Horizontal drag, press and tap still work. Real touch scrolling was verified by CSS only, not by a gesture test.
- **Pixel ratio.** Dynamic resolution only steps down, never back up.
- **Landing page untouched.** `HeroSection` and the rest of the landing page are unchanged, including the hero's own 2.6 s expression-revert timeout.
