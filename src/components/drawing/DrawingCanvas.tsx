/**
 * DrawingCanvas.tsx
 * Thin React wrapper. All hot-path work happens through refs — no React state during drawing.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  StrokeProcessor,
  type Point,
  type StrokeOptions,
  type StrokeSegment,
} from "@/lib/drawing/strokeEngine";
import { StrokeRenderer } from "@/lib/drawing/renderer";
import {
  extractCoalescedPoints,
  extractPredictedPoints,
  isDrawingPointer,
} from "@/lib/drawing/inputHandler";

export interface CompletedStroke {
  segments: StrokeSegment[];
  points: Point[];
  color: string;
  widthScale: number;
}

export interface DrawingCanvasHandle {
  /** Clear the active preview layer (committed strokes live elsewhere). */
  clearPreview: () => void;
  /** Force resize to match parent (call when zoom changes). */
  resize: (w: number, h: number) => void;
}

export interface DrawingCanvasProps {
  width: number;
  height: number;
  color: string;
  /** Multiplier for engine-computed width (e.g. user-selected nib size). */
  widthScale?: number;
  /** Engine tuning. */
  engineOptions?: Partial<StrokeOptions>;
  /** Allow non-pen input (default true so it works on desktop too). */
  acceptAll?: boolean;
  /** Disable input. */
  disabled?: boolean;
  /** Called once a stroke is finalized — caller commits to its persistent layer. */
  onStrokeComplete: (stroke: CompletedStroke) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas(props, ref) {
    const {
      width,
      height,
      color,
      widthScale = 1,
      engineOptions,
      acceptAll = true,
      disabled,
      onStrokeComplete,
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<StrokeRenderer | null>(null);
    const processorRef = useRef<StrokeProcessor | null>(null);
    const activePointerRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const dirtyRef = useRef(false);
    // Latest props in refs so the handlers don't re-bind.
    const colorRef = useRef(color);
    const widthScaleRef = useRef(widthScale);
    const onCompleteRef = useRef(onStrokeComplete);
    colorRef.current = color;
    widthScaleRef.current = widthScale;
    onCompleteRef.current = onStrokeComplete;

    // Init renderer
    useEffect(() => {
      const c = canvasRef.current;
      if (!c) return;
      rendererRef.current = new StrokeRenderer(c);
      rendererRef.current.resize(width, height);
      return () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Resize when canvas dims change
    useEffect(() => {
      rendererRef.current?.resize(width, height);
    }, [width, height]);

    useImperativeHandle(
      ref,
      () => ({
        clearPreview: () => rendererRef.current?.clear(),
        resize: (w, h) => rendererRef.current?.resize(w, h),
      }),
      [],
    );

    const scheduleRender = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const proc = processorRef.current;
        const renderer = rendererRef.current;
        if (!proc || !renderer) return;
        if (!dirtyRef.current) return;
        dirtyRef.current = false;
        // Pull only pending segments (incremental). If earlier segments were
        // re-derived (smoothing tail), drainPending returns them too.
        const pending = proc.drainPending();
        if (pending.length === 0) return;
        renderer.drawSegments(pending, {
          color: colorRef.current,
          widthScale: widthScaleRef.current,
        });
      });
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const native = e.nativeEvent;
      if (!isDrawingPointer(native, { acceptAll })) return;
      if (activePointerRef.current != null) return; // single-stroke at a time
      e.preventDefault();
      activePointerRef.current = e.pointerId;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      processorRef.current = new StrokeProcessor(engineOptions);
      const samples = extractCoalescedPoints(native, {
        target: e.currentTarget,
      });
      processorRef.current.push(samples);
      dirtyRef.current = true;
      scheduleRender();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      const native = e.nativeEvent;
      const proc = processorRef.current;
      if (!proc) return;
      const samples = extractCoalescedPoints(native, {
        target: e.currentTarget,
      });
      proc.push(samples);
      // Predicted lookahead: feeds upcoming samples into a *temp* processor
      // to draw "ahead of the pen" without polluting the committed stroke.
      // We render predicted in the same RAF tick.
      const predicted = extractPredictedPoints(native, { target: e.currentTarget });
      if (predicted.length > 0) {
        // We don't need to keep them — they'll be replaced by real samples next frame.
        proc.push(predicted as unknown as Point[]);
      }
      dirtyRef.current = true;
      scheduleRender();
    };

    const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      activePointerRef.current = null;
      const proc = processorRef.current;
      processorRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!proc) return;
      proc.finalize();
      // Render any final segments before handing off.
      const renderer = rendererRef.current;
      if (renderer) {
        const pending = proc.drainPending();
        if (pending.length > 0) {
          renderer.drawSegments(pending, {
            color: colorRef.current,
            widthScale: widthScaleRef.current,
          });
        }
      }
      const segments = [...proc.getSegments()];
      const points = [...proc.getFilteredPoints()];
      if (segments.length > 0) {
        onCompleteRef.current({
          segments,
          points,
          color: colorRef.current,
          widthScale: widthScaleRef.current,
        });
      }
      // Clear the preview so the host layer can redraw the committed stroke.
      renderer?.clear();
    };

    return (
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onPointerLeave={(e) => {
          if (activePointerRef.current === e.pointerId) finishStroke(e);
        }}
        className={props.className}
        style={{
          touchAction: "none",
          ...props.style,
        }}
      />
    );
  },
);
