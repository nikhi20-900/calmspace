# Mascot Components

This folder contains the interactive Calmspace blob, the 3D cat and dog companions, and Mochi, a small page-wide SVG cat. Pick the component that matches the surface; the three scenes have different interaction and rendering needs.

## Choose a component

| Component | Use | Notes |
|---|---|---|
| [`BlobScene.tsx`](./BlobScene.tsx) | Interactive blob on the landing and companion pages | Three.js/WebGL scene with expressions, pointer and keyboard input, reduced-motion support, and a CSS fallback if WebGL is unavailable. |
| [`PetScene.tsx`](./PetScene.tsx) | 3D cat or dog in the voice companion | Pass `type="cat"` or `type="dog"`; speaking, listening, thinking, and voice level drive subtle movement. Requires WebGL. |
| [`RoamingPet.tsx`](./RoamingPet.tsx) | Small companion that walks along the app edge | Lightweight inline SVG and CSS. It can show a short message, link to Calm, or be hidden. |

## Use `BlobScene`

Give the scene a parent with a real height. The component fills its parent, so an auto-height wrapper can leave the canvas at zero height.

```tsx
<div className="h-64 w-full">
  <BlobScene
    expression={isListening ? 'listening' : 'idle'}
    voiceLevel={voiceLevel}
    bodyColor={0xa79de3}
    onBlobClick={handleBlobClick}
    className="h-full w-full"
  />
</div>
```

`BlobSceneProps` also includes `isCtaHovered`, `isBreathingActive`, `audioLevel`, and `breathingPhase`. Expressions are defined by `BlobExpression` in `BlobScene.tsx`. `bodyColor` is a numeric hex color.

The blob can be activated by click, Enter, or Space and dragged with a pointer. The canvas itself is hidden from assistive technology; the wrapper exposes a button role and label. When reduced motion is enabled, ambient animation is limited while direct interactions still work.

## Use `PetScene`

`PetScene` also fills a sized parent. Its props are `type`, `speaking`, `listening`, `thinking`, `voiceLevel`, and `className`.

```tsx
<div className="h-80 w-full">
  <PetScene type="cat" listening={isListening} voiceLevel={voiceLevel} />
</div>
```

The component observes its container size and disposes its renderer, geometries, and materials when it unmounts. Unlike `BlobScene`, it currently has no non-WebGL fallback.

## Files and ownership

| File | Responsibility |
|---|---|
| `BlobScene.tsx` | React wrapper, input, sizing, render-loop visibility, reduced motion, WebGL fallback, and context recovery |
| `BlobController.ts` | Scene hierarchy, per-frame pose updates, quality settings, and owned-resource cleanup |
| `BlobPhysics.ts` | Body and jelly motion, wobble, drag, and tap response |
| `BlobAnimations.ts` | Expression targets, gaze, blinking, and breathing |
| `BlobMaterials.ts` | Clay shader, lighting, and scene environment |
| `BlobGeometry.ts` | Procedural body, eye, and mouth geometry |
| `PetScene.tsx` | Procedural cat and dog scenes for voice interaction |
| `RoamingPet.tsx` | App-wide Mochi SVG, short messages, and hide/show controls |
| `blobColorways.ts` | Available blob colors and best-effort local preference storage |

## Change checklist

- Keep the blob scene long-lived for one mount. Its React props are read through refs so ordinary state updates do not rebuild WebGL resources.
- Dispose geometries, materials, renderers, observers, and animation frames when adding scene resources or listeners.
- Preserve the `BlobScene` keyboard activation, accessible label, reduced-motion behavior, and fallback.
- Keep the roaming cat's reduced-motion rules in `frontend/src/styles/animations.css` when changing its CSS animations.
- Check each scene at phone and desktop sizes; its parent must provide a non-zero height.
