/**
 * inputHandler.ts
 * Bridges browser PointerEvents to the platform-independent Point model.
 */

import type { Point } from "./strokeEngine";

export type PointerKind = "pen" | "touch" | "mouse";

export interface PointerSample extends Point {
  kind: PointerKind;
  predicted?: boolean;
}

export interface ExtractOptions {
  /** Element used to compute relative coordinates. */
  target: Element;
  /** Multiply coordinates (e.g. for zoom). Default 1. */
  scale?: number;
  /** Force-treat touch/mouse as pen for testing. */
  acceptAll?: boolean;
}

/** Default pressure when device doesn't report it (pen w/o pressure, mouse). */
const FALLBACK_PRESSURE = 0.5;

function toPoint(
  e: PointerEvent,
  rect: DOMRect,
  scale: number,
  predicted = false,
): PointerSample {
  const kind: PointerKind =
    e.pointerType === "pen"
      ? "pen"
      : e.pointerType === "touch"
        ? "touch"
        : "mouse";

  const pressure =
    kind === "pen"
      ? // Some pens report 0 on initial down — clamp lightly.
        e.pressure > 0
        ? e.pressure
        : FALLBACK_PRESSURE
      : FALLBACK_PRESSURE;

  return {
    x: (e.clientX - rect.left) * scale,
    y: (e.clientY - rect.top) * scale,
    pressure,
    tiltX: (e as PointerEvent).tiltX ?? 0,
    tiltY: (e as PointerEvent).tiltY ?? 0,
    time: e.timeStamp,
    kind,
    predicted,
  };
}

/** Extract real + coalesced events as Points (high-frequency sampling). */
export function extractCoalescedPoints(
  e: PointerEvent,
  opts: ExtractOptions,
): PointerSample[] {
  const rect = opts.target.getBoundingClientRect();
  const scale = opts.scale ?? 1;
  const out: PointerSample[] = [];

  const coalesced =
    typeof (e as any).getCoalescedEvents === "function"
      ? (e as any).getCoalescedEvents()
      : [];
  if (coalesced && coalesced.length > 0) {
    for (const c of coalesced) out.push(toPoint(c, rect, scale, false));
  } else {
    out.push(toPoint(e, rect, scale, false));
  }
  return out;
}

/** Extract predicted future points (used only for the live preview). */
export function extractPredictedPoints(
  e: PointerEvent,
  opts: ExtractOptions,
): PointerSample[] {
  const rect = opts.target.getBoundingClientRect();
  const scale = opts.scale ?? 1;
  const predicted =
    typeof (e as any).getPredictedEvents === "function"
      ? (e as any).getPredictedEvents()
      : [];
  if (!predicted || predicted.length === 0) return [];
  return predicted.map((p: PointerEvent) => toPoint(p, rect, scale, true));
}

/** True when this event should be accepted as drawing input. */
export function isDrawingPointer(
  e: PointerEvent,
  opts: { acceptAll?: boolean; allowTouch?: boolean } = {},
): boolean {
  if (opts.acceptAll) return true;
  if (e.pointerType === "pen") return true;
  if (e.pointerType === "mouse") return true;
  if (e.pointerType === "touch" && opts.allowTouch) return true;
  return false;
}
