/**
 * strokeEngine.ts
 * Portable, dependency-free stroke processing.
 * No DOM / canvas / React. Designed to be ported to Swift later.
 */

export interface Point {
  x: number;
  y: number;
  pressure: number; // 0..1
  tiltX: number;    // -90..90
  tiltY: number;    // -90..90
  time: number;     // ms (DOMHighResTimeStamp or epoch — caller stays consistent)
}

export interface StrokeOptions {
  /** Minimum distance (px) between accepted samples — jitter filter. */
  minDistance: number;
  /** Maximum distance — beyond this we keep the point (avoid skipping fast strokes). */
  maxDistance: number;
  /** Smoothing weight for pressure (0 = no smoothing, 1 = freeze). */
  pressureSmoothing: number;
  /** EMA factor for position stabilization (0 = raw, ~0.5 = stable). */
  positionStabilization: number;
  /** Max width in px at full pressure. */
  maxWidth: number;
  /** Min width in px at zero pressure. */
  minWidth: number;
  /** Velocity (px/ms) at which width starts to thin. */
  velocityThinning: number;
}

export const DEFAULT_OPTIONS: StrokeOptions = {
  minDistance: 1.2,
  maxDistance: 80,
  pressureSmoothing: 0.55,
  positionStabilization: 0.35,
  maxWidth: 6,
  minWidth: 0.6,
  velocityThinning: 1.5,
};

export interface StrokeSegment {
  /** Cubic bezier: from p0 -> p3 with control points c1, c2. */
  p0: Point;
  c1: { x: number; y: number };
  c2: { x: number; y: number };
  p3: Point;
  /** Average width along this segment (px). */
  width: number;
}

/**
 * Stateful processor for a single in-progress stroke.
 * Consumes raw points and emits filtered/smoothed points and bezier segments.
 */
export class StrokeProcessor {
  private opts: StrokeOptions;
  private raw: Point[] = [];
  private filtered: Point[] = [];
  private segments: StrokeSegment[] = [];
  /** Number of segments already consumed by renderer. */
  private committedSegments = 0;
  /** EMA state. */
  private emaX = 0;
  private emaY = 0;
  private emaP = 0;
  private hasEma = false;

  constructor(opts: Partial<StrokeOptions> = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
  }

  /** Push raw input — may include coalesced events. Returns newly accepted filtered points. */
  push(points: Point[]): Point[] {
    const accepted: Point[] = [];
    for (const p of points) {
      const f = this.filterAndSmooth(p);
      if (f) {
        this.filtered.push(f);
        accepted.push(f);
        this.rebuildLastSegments();
      }
    }
    return accepted;
  }

  /** Finalize the stroke (e.g. on pointerup). */
  finalize(): void {
    // Optional pass: smoothing again with slightly higher stabilization.
    this.rebuildLastSegments(true);
  }

  getFilteredPoints(): readonly Point[] {
    return this.filtered;
  }

  getSegments(): readonly StrokeSegment[] {
    return this.segments;
  }

  /** Returns segments not yet rendered, then marks them as committed. */
  drainPending(): StrokeSegment[] {
    const pending = this.segments.slice(this.committedSegments);
    this.committedSegments = this.segments.length;
    return pending;
  }

  reset(): void {
    this.raw = [];
    this.filtered = [];
    this.segments = [];
    this.committedSegments = 0;
    this.hasEma = false;
  }

  // ---------- internals ----------

  private filterAndSmooth(p: Point): Point | null {
    this.raw.push(p);

    // Distance filter against last accepted.
    const last = this.filtered[this.filtered.length - 1];
    if (last) {
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const d = Math.hypot(dx, dy);
      if (d < this.opts.minDistance) return null;
    }

    // EMA stabilization.
    const a = this.opts.positionStabilization;
    if (!this.hasEma) {
      this.emaX = p.x;
      this.emaY = p.y;
      this.emaP = p.pressure;
      this.hasEma = true;
    } else {
      this.emaX = this.emaX * a + p.x * (1 - a);
      this.emaY = this.emaY * a + p.y * (1 - a);
      const ap = this.opts.pressureSmoothing;
      this.emaP = this.emaP * ap + p.pressure * (1 - ap);
    }

    return {
      x: this.emaX,
      y: this.emaY,
      pressure: this.emaP,
      tiltX: p.tiltX,
      tiltY: p.tiltY,
      time: p.time,
    };
  }

  /**
   * Build bezier segments from filtered points using Catmull-Rom -> Bezier conversion.
   * Only rebuilds the last few segments to keep work bounded.
   */
  private rebuildLastSegments(_final = false): void {
    const pts = this.filtered;
    if (pts.length < 2) return;

    // We can build a segment between pts[i] and pts[i+1] when i-1 and i+2 exist.
    // For boundary cases we duplicate endpoints.
    const lastIdx = pts.length - 2;
    // Re-derive only the newest segment (and previous one if it didn't exist).
    const startIdx = Math.max(this.segments.length - 1, 0);

    for (let i = startIdx; i <= lastIdx; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? pts[i + 1];

      // Catmull-Rom to Bezier (tension 0.5).
      const c1 = {
        x: p1.x + (p2.x - p0.x) / 6,
        y: p1.y + (p2.y - p0.y) / 6,
      };
      const c2 = {
        x: p2.x - (p3.x - p1.x) / 6,
        y: p2.y - (p3.y - p1.y) / 6,
      };

      const dt = Math.max(1, p2.time - p1.time);
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const velocity = dist / dt; // px/ms
      const avgPressure = (p1.pressure + p2.pressure) / 2;

      const pressureWidth =
        this.opts.minWidth +
        (this.opts.maxWidth - this.opts.minWidth) * clamp01(avgPressure);
      const velocityFactor = clamp01(1 - velocity / this.opts.velocityThinning);
      // Blend: width thins at high velocity.
      const width = pressureWidth * (0.5 + 0.5 * velocityFactor);

      const seg: StrokeSegment = { p0: p1, c1, c2, p3: p2, width };
      if (i < this.segments.length) {
        this.segments[i] = seg;
        // If we modified an already-committed segment, mark it pending again.
        if (i < this.committedSegments) this.committedSegments = i;
      } else {
        this.segments.push(seg);
      }
    }
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Convert a list of filtered points into normalized 0..1 coords for storage. */
export function normalizePoints(
  pts: readonly Point[],
  width: number,
  height: number,
): { x: number; y: number; pressure: number }[] {
  return pts.map((p) => ({
    x: p.x / width,
    y: p.y / height,
    pressure: p.pressure,
  }));
}
