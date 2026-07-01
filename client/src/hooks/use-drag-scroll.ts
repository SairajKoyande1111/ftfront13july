import { useRef, useCallback, useEffect } from "react";

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasDragged = useRef(false);

  // Inertia state
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocityX = useRef(0);
  const rafId = useRef<number | null>(null);

  const stopInertia = () => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    velocityX.current = 0;
  };

  const startInertia = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const tick = () => {
      if (!ref.current || Math.abs(velocityX.current) < 0.5) {
        velocityX.current = 0;
        rafId.current = null;
        return;
      }
      ref.current.scrollLeft -= velocityX.current;
      velocityX.current *= 0.92; // deceleration factor — tune for feel
      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const el = ref.current;
    if (!el) return;

    const x = e.pageX - el.offsetLeft;
    const walk = x - startX.current;

    if (Math.abs(walk) > 4) hasDragged.current = true;

    el.scrollLeft = scrollLeft.current - walk;

    // Track velocity for inertia
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      const dx = e.pageX - lastX.current;
      // Smooth velocity with exponential moving average
      velocityX.current = velocityX.current * 0.4 + (dx / dt) * 16 * 0.6;
    }
    lastX.current = e.pageX;
    lastTime.current = now;
  }, []);

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    const el = ref.current;
    isDragging.current = false;
    if (el) {
      el.style.cursor = "grab";
      el.style.userSelect = "";
    }
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    // Launch inertia only if there was meaningful velocity
    if (Math.abs(velocityX.current) > 1) {
      startInertia();
    }
  }, [onMouseMove, startInertia]);

  const onMouseDown = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;

    stopInertia();

    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
    lastX.current = e.pageX;
    lastTime.current = performance.now();
    velocityX.current = 0;

    el.style.cursor = "grabbing";
    el.style.userSelect = "none";

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [onMouseMove, onMouseUp]);

  const onClickCapture = useCallback((e: MouseEvent) => {
    if (hasDragged.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  const onDragStart = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.cursor = "grab";
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      stopInertia();
    };
  }, [onMouseDown, onMouseMove, onMouseUp, onClickCapture, onDragStart]);

  return ref;
}
