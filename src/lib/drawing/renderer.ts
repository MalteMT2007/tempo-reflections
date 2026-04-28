/**
 * renderer.ts
 * Canvas2D incremental renderer for stroke segments.
 * Owns no React state — driven by the React layer through plain method calls.
 */

import type { StrokeSegment } from "./strokeEngine";

export interface RendererOptions {
  color: string;
  /** Multiply width from engine. */
  widthScale?: number;
}

export class StrokeRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { desynchronized: true, alpha: true });
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.applyTransform();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  resize(cssW: number, cssH: number): void {
    const c = this.ctx.canvas;
    this.dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(cssW * this.dpr);
    c.height = Math.floor(cssH * this.dpr);
    c.style.width = `${cssW}px`;
    c.style.height = `${cssH}px`;
    this.applyTransform();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  clear(): void {
    const c = this.ctx.canvas;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, c.width, c.height);
    this.ctx.restore();
  }

  /** Draw new segments incrementally — does not clear the canvas. */
  drawSegments(segments: readonly StrokeSegment[], opts: RendererOptions): void {
    const ctx = this.ctx;
    const ws = opts.widthScale ?? 1;
    ctx.strokeStyle = opts.color;
    for (const s of segments) {
      ctx.lineWidth = Math.max(0.4, s.width * ws);
      ctx.beginPath();
      ctx.moveTo(s.p0.x, s.p0.y);
      ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p3.x, s.p3.y);
      ctx.stroke();
    }
  }

  /** Re-render the entire stroke (used after finalize / for preview). */
  redrawStroke(segments: readonly StrokeSegment[], opts: RendererOptions): void {
    this.clear();
    this.drawSegments(segments, opts);
  }

  private applyTransform() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
}
