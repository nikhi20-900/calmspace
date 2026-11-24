import { useEffect, useRef, useState, useCallback } from 'react';

export interface PointerState {
  normX: number; // -1 to 1
  normY: number; // -1 to 1
  isHovering: boolean;
  isDragging: boolean;
  dragDeltaX: number;
  dragDeltaY: number;
}

export function useBlobPointer(containerRef: React.RefObject<HTMLElement | null>) {
  const [pointer, setPointer] = useState<PointerState>({
    normX: 0,
    normY: 0,
    isHovering: false,
    isDragging: false,
    dragDeltaX: 0,
    dragDeltaY: 0,
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasMovedSignificantlyRef = useRef(false);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // Normalized Coordinates inside element
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    if (isDraggingRef.current) {
      const dx = (e.clientX - dragStartRef.current.x) / (rect.width * 0.5);
      const dy = -(e.clientY - dragStartRef.current.y) / (rect.height * 0.5);

      if (Math.hypot(dx, dy) > 0.02) {
        hasMovedSignificantlyRef.current = true;
      }

      setPointer((prev) => ({
        ...prev,
        normX: Math.max(-1, Math.min(1, x)),
        normY: Math.max(-1, Math.min(1, y)),
        dragDeltaX: dx,
        dragDeltaY: dy,
      }));
    } else {
      setPointer((prev) => ({
        ...prev,
        normX: Math.max(-1, Math.min(1, x)),
        normY: Math.max(-1, Math.min(1, y)),
      }));
    }
  }, [containerRef]);

  const onPointerDown = useCallback((e: PointerEvent) => {
    // Only respond to primary button
    if (e.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;

    isDraggingRef.current = true;
    hasMovedSignificantlyRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    try {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      // Fallback
    }

    setPointer((prev) => ({ ...prev, isDragging: true, dragDeltaX: 0, dragDeltaY: 0 }));
  }, [containerRef]);

  const onPointerUp = useCallback((e: PointerEvent, onClick?: () => void) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    } catch {
      // Fallback
    }

    // If release was quick with minimal movement, treat as click
    if (!hasMovedSignificantlyRef.current && onClick) {
      onClick();
    }

    setPointer((prev) => ({
      ...prev,
      isDragging: false,
      dragDeltaX: 0,
      dragDeltaY: 0,
    }));
  }, []);

  const onPointerEnter = useCallback(() => {
    setPointer((prev) => ({ ...prev, isHovering: true }));
  }, []);

  const onPointerLeave = useCallback(() => {
    if (!isDraggingRef.current) {
      setPointer((prev) => ({
        ...prev,
        isHovering: false,
        normX: 0,
        normY: 0,
      }));
    }
  }, []);

  return {
    pointer,
    onPointerMove,
    onPointerDown,
    onPointerUp,
    onPointerEnter,
    onPointerLeave,
  };
}
