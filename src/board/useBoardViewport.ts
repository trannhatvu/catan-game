import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';

export type BoardTransform = { x: number; y: number; scale: number };
export type ViewportSize = { width: number; height: number };
export type ViewportPoint = { x: number; y: number };

export const INITIAL_BOARD_TRANSFORM: BoardTransform = { x: 0, y: 0, scale: 1 };
export const MIN_BOARD_SCALE = 1;
export const MAX_BOARD_SCALE = 3;

const PAN_MARGIN = 48;
const DRAG_THRESHOLD = 6;

function boundedScale(scale: number): number {
  const value = Number.isFinite(scale) ? scale : MIN_BOARD_SCALE;
  return Math.max(MIN_BOARD_SCALE, Math.min(MAX_BOARD_SCALE, value));
}

export function clampBoardTransform(transform: BoardTransform, size: ViewportSize): BoardTransform {
  const scale = boundedScale(transform.scale);
  const maxX = Math.max(0, (size.width * (scale - 1)) / 2 + PAN_MARGIN);
  const maxY = Math.max(0, (size.height * (scale - 1)) / 2 + PAN_MARGIN);
  const x = Number.isFinite(transform.x) ? transform.x : 0;
  const y = Number.isFinite(transform.y) ? transform.y : 0;
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
    scale,
  };
}

export function panBoardTransform(
  transform: BoardTransform,
  dx: number,
  dy: number,
  size: ViewportSize,
): BoardTransform {
  return clampBoardTransform({ ...transform, x: transform.x + dx, y: transform.y + dy }, size);
}

export function zoomBoardTransform(
  transform: BoardTransform,
  scale: number,
  point: ViewportPoint,
  size: ViewportSize,
): BoardTransform {
  const nextScale = boundedScale(scale);
  const ratio = nextScale / transform.scale;
  const x = point.x - size.width / 2;
  const y = point.y - size.height / 2;
  return clampBoardTransform(
    {
      scale: nextScale,
      x: x - (x - transform.x) * ratio,
      y: y - (y - transform.y) * ratio,
    },
    size,
  );
}

export function pinchBoardTransform(
  transform: BoardTransform,
  scale: number,
  startCenter: ViewportPoint,
  currentCenter: ViewportPoint,
  size: ViewportSize,
): BoardTransform {
  const nextScale = boundedScale(scale);
  const ratio = nextScale / transform.scale;
  const startX = startCenter.x - size.width / 2;
  const startY = startCenter.y - size.height / 2;
  const currentX = currentCenter.x - size.width / 2;
  const currentY = currentCenter.y - size.height / 2;
  return clampBoardTransform(
    {
      scale: nextScale,
      x: currentX - (startX - transform.x) * ratio,
      y: currentY - (startY - transform.y) * ratio,
    },
    size,
  );
}

type Gesture =
  | { kind: 'pan'; pointerId: number; start: ViewportPoint; initial: BoardTransform; moved: boolean }
  | {
      kind: 'pinch';
      pointerIds: [number, number];
      startDistance: number;
      startCenter: ViewportPoint;
      initial: BoardTransform;
    };

function midpoint(a: ViewportPoint, b: ViewportPoint): ViewportPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a: ViewportPoint, b: ViewportPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isBoardControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-board-control]') !== null;
}

function viewportSize(element: HTMLDivElement): ViewportSize {
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function localPoint(element: HTMLDivElement, clientX: number, clientY: number): ViewportPoint {
  const rect = element.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function writeTransform(element: HTMLDivElement, transform: BoardTransform): void {
  element.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
}

export function useBoardViewport() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<BoardTransform>({ ...INITIAL_BOARD_TRANSFORM });
  const pointers = useRef(new Map<number, ViewportPoint>());
  const gesture = useRef<Gesture | null>(null);
  const suppressedClicks = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const applyTransform = useCallback((next: BoardTransform, size: ViewportSize) => {
    const bounded = clampBoardTransform(next, size);
    transformRef.current = bounded;
    if (mapRef.current) writeTransform(mapRef.current, bounded);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => applyTransform(transformRef.current, viewportSize(viewport)));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [applyTransform]);

  const onWheel = useCallback(
    (event: WheelEvent) => {
      const viewport = viewportRef.current;
      if (!viewport || isBoardControl(event.target) || event.deltaY === 0) return;
      event.preventDefault();
      const size = viewportSize(viewport);
      const point = localPoint(viewport, event.clientX, event.clientY);
      const scale = transformRef.current.scale * Math.exp(-event.deltaY * 0.001);
      applyTransform(zoomBoardTransform(transformRef.current, scale, point, size), size);
    },
    [applyTransform],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const reset = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    pointers.current.clear();
    gesture.current = null;
    suppressedClicks.current = 0;
    setIsDragging(false);
    applyTransform(INITIAL_BOARD_TRANSFORM, viewportSize(viewport));
  }, [applyTransform]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (isBoardControl(event.target)) {
        suppressedClicks.current = 0;
        return;
      }
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (pointers.current.size === 0) suppressedClicks.current = 0;

      const point = localPoint(event.currentTarget, event.clientX, event.clientY);
      pointers.current.set(event.pointerId, point);
      if (pointers.current.size === 1) {
        gesture.current = {
          kind: 'pan',
          pointerId: event.pointerId,
          start: point,
          initial: transformRef.current,
          moved: false,
        };
        return;
      }
      if (pointers.current.size !== 2) return;

      const entries = Array.from(pointers.current.entries());
      const first = entries[0];
      const second = entries[1];
      if (!first || !second) return;
      const pointerIds: [number, number] = [first[0], second[0]];
      const firstPoint = first[1];
      const secondPoint = second[1];
      gesture.current = {
        kind: 'pinch',
        pointerIds,
        startDistance: Math.max(distance(firstPoint, secondPoint), 1),
        startCenter: midpoint(firstPoint, secondPoint),
        initial: transformRef.current,
      };
      suppressedClicks.current = 2;
      setIsDragging(true);
      for (const pointerId of pointerIds) {
        if (!event.currentTarget.hasPointerCapture(pointerId)) event.currentTarget.setPointerCapture(pointerId);
      }
      event.preventDefault();
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return;
      const point = localPoint(event.currentTarget, event.clientX, event.clientY);
      pointers.current.set(event.pointerId, point);
      const currentGesture = gesture.current;
      if (!currentGesture) return;
      const size = viewportSize(event.currentTarget);

      if (currentGesture.kind === 'pan') {
        if (currentGesture.pointerId !== event.pointerId) return;
        const dx = point.x - currentGesture.start.x;
        const dy = point.y - currentGesture.start.y;
        if (!currentGesture.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        if (!currentGesture.moved) {
          currentGesture.moved = true;
          suppressedClicks.current = 1;
          setIsDragging(true);
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }
        applyTransform(panBoardTransform(currentGesture.initial, dx, dy, size), size);
        return;
      }

      const first = pointers.current.get(currentGesture.pointerIds[0]);
      const second = pointers.current.get(currentGesture.pointerIds[1]);
      if (!first || !second) return;
      const currentDistance = distance(first, second);
      const scale = currentGesture.initial.scale * (currentDistance / currentGesture.startDistance);
      applyTransform(
        pinchBoardTransform(
          currentGesture.initial,
          scale,
          currentGesture.startCenter,
          midpoint(first, second),
          size,
        ),
        size,
      );
    },
    [applyTransform],
  );

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const currentGesture = gesture.current;
    if (currentGesture?.kind === 'pan' && currentGesture.pointerId === event.pointerId && currentGesture.moved) {
      suppressedClicks.current = Math.max(suppressedClicks.current, 1);
    }
    pointers.current.delete(event.pointerId);

    if (pointers.current.size === 1) {
      const remaining = Array.from(pointers.current.entries())[0];
      if (remaining) {
        const [pointerId, point] = remaining;
        gesture.current = {
          kind: 'pan',
          pointerId,
          start: point,
          initial: transformRef.current,
          moved: true,
        };
        setIsDragging(true);
        if (!event.currentTarget.hasPointerCapture(pointerId)) event.currentTarget.setPointerCapture(pointerId);
        return;
      }
    }

    gesture.current = null;
    setIsDragging(false);
  }, []);

  const onPointerCancel = useCallback(() => {
    pointers.current.clear();
    gesture.current = null;
    suppressedClicks.current = 0;
    setIsDragging(false);
  }, []);

  const onClickCapture = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (suppressedClicks.current <= 0) return;
    suppressedClicks.current -= 1;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    viewportRef,
    mapRef,
    isDragging,
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  };
}
