import { useRef, useState } from 'react';
import type React from 'react';

export type DragMode = 'move' | 'start' | 'end';

/**
 * Pointer-drag that snaps to whole days. `delta` is the live offset (in days) while dragging;
 * `onCommit` fires once on release if the bar actually moved.
 */
export function useDayDrag(dayWidth: number, onCommit: (mode: DragMode, deltaDays: number) => void) {
  const origin = useRef<{ x: number; mode: DragMode } | null>(null);
  const [drag, setDrag] = useState<{ mode: DragMode; delta: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const handle = (e.target as HTMLElement).closest<HTMLElement>('[data-drag]');
    const mode = (handle?.dataset.drag as DragMode | undefined) ?? 'move';
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    origin.current = { x: e.clientX, mode };
    setDrag({ mode, delta: 0 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!origin.current) return;
    const delta = Math.round((e.clientX - origin.current.x) / dayWidth);
    setDrag(d => (d && d.delta === delta ? d : { mode: origin.current!.mode, delta }));
  };

  const finish = (commit: boolean) => (e: React.PointerEvent<HTMLElement>) => {
    if (!origin.current) return;
    const { mode, x } = origin.current;
    const delta = Math.round((e.clientX - x) / dayWidth);
    origin.current = null;
    setDrag(null);
    if (commit && delta !== 0) onCommit(mode, delta);
  };

  return {
    drag,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish(true),
      onPointerCancel: finish(false),
    },
  };
}
