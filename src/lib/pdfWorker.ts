// PDF.js worker setup
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";

let configured = false;

export function ensurePdfWorker() {
  if (configured) return;
  // Use CDN worker matching the installed pdfjs-dist version. Avoids Vite
  // bundling issues that have caused "getOrInsertComputed is not a function"
  // when worker/runtime versions drift.
  GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;
  configured = true;
}
