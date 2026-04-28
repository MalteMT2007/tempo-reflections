import { useCallback, useEffect, useRef, useState } from "react";

export type DockEdge = "left" | "right" | "top" | "bottom";
export type DockPos = { edge: DockEdge; offset: number }; // offset = % along the edge (0-100)

const SNAP_THRESHOLD = 80; // px from edge to snap

const DEFAULT_POS: DockPos = { edge: "bottom", offset: 50 };

export function useDraggableSnap(storageKey: string, initial: DockPos = DEFAULT_POS) {
  const [pos, setPos] = useState<DockPos>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as DockPos;
    } catch {
      /* ignore */
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos, storageKey]);

  const dragRef = useRef<{ id: number; startX: number; startY: number } | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewXY, setPreviewXY] = useState<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only allow drag when clicking on a designated handle (data-drag-handle)
    const target = e.target as HTMLElement;
    if (!target.closest("[data-drag-handle]")) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY };
    setDragging(true);
    setPreviewXY({ x: e.clientX, y: e.clientY });
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || dragRef.current.id !== e.pointerId) return;
    setPreviewXY({ x: e.clientX, y: e.clientY });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || dragRef.current.id !== e.pointerId) return;
      const x = e.clientX;
      const y = e.clientY;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const distLeft = x;
      const distRight = w - x;
      const distTop = y;
      const distBottom = h - y;
      const min = Math.min(distLeft, distRight, distTop, distBottom);
      let edge: DockEdge = pos.edge;
      let offset: number;
      if (min === distLeft) {
        edge = "left";
        offset = (y / h) * 100;
      } else if (min === distRight) {
        edge = "right";
        offset = (y / h) * 100;
      } else if (min === distTop) {
        edge = "top";
        offset = (x / w) * 100;
      } else {
        edge = "bottom";
        offset = (x / w) * 100;
      }
      // Always snap to nearest edge (even if > threshold) so the toolbar never floats free
      void SNAP_THRESHOLD;
      setPos({ edge, offset: Math.max(10, Math.min(90, offset)) });
      dragRef.current = null;
      setDragging(false);
      setPreviewXY(null);
    },
    [pos.edge]
  );

  return {
    pos,
    setPos,
    dragging,
    previewXY,
    bind: {
      ref: elRef,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}

/**
 * Compute fixed-positioning style for a snapped panel.
 */
export function dockStyle(pos: DockPos, isVertical: boolean): React.CSSProperties {
  const offsetPct = `${pos.offset}%`;
  switch (pos.edge) {
    case "left":
      return { position: "fixed", left: 12, top: offsetPct, transform: "translateY(-50%)" };
    case "right":
      return { position: "fixed", right: 12, top: offsetPct, transform: "translateY(-50%)" };
    case "top":
      return { position: "fixed", top: 12, left: offsetPct, transform: "translateX(-50%)" };
    case "bottom":
    default:
      return { position: "fixed", bottom: 24, left: offsetPct, transform: "translateX(-50%)" };
  }
}

export function isVerticalEdge(edge: DockEdge) {
  return edge === "left" || edge === "right";
}
