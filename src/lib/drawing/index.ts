export { StrokeProcessor, DEFAULT_OPTIONS, normalizePoints } from "./strokeEngine";
export type { Point, StrokeSegment, StrokeOptions } from "./strokeEngine";
export { StrokeRenderer } from "./renderer";
export {
  extractCoalescedPoints,
  extractPredictedPoints,
  isDrawingPointer,
} from "./inputHandler";
export type { PointerSample, PointerKind } from "./inputHandler";
