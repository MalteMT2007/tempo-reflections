// PDF.js worker setup — use bundled worker via Vite's ?url import
import { GlobalWorkerOptions } from "pdfjs-dist";
// @ts-ignore - vite handles ?url for arbitrary assets
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let configured = false;

export function ensurePdfWorker() {
  if (configured) return;
  GlobalWorkerOptions.workerSrc = workerSrc;
  configured = true;
}
