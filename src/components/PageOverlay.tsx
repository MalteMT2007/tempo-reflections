import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

/**
 * Overlay frame used by every non-reader page. Sits above the persistent
 * background ScoreReader (z-30), with a heavily blurred + dimmed scrim so
 * pills/UI read clearly.
 *
 * Interaction model:
 * - The blurred scrim covers the full screen and is interactive ONLY in
 *   the side gutters (left/right of the content column). Tapping a gutter
 *   navigates to /reader (dismisses overlay).
 * - The center content column has `pointer-events-auto`, so ALL children
 *   (not just GlassPill) receive clicks/taps normally — this is required
 *   for sub-pages like EnsembleDetail that use Tabs, Inputs, Dialogs, etc.
 * - A "Back to score" CTA in the top-left provides an explicit way out.
 */
export function PageOverlay({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const goReader = () => navigate("/reader");

  return (
    <div className="fixed inset-0 z-30 animate-fade-in">
      {/* Full-screen blurred + dimmed scrim (visual only, non-interactive) */}
      <div className="absolute inset-0 pointer-events-none bg-background/70 backdrop-blur-2xl backdrop-saturate-150" />
      {/* Subtle vignette for extra contrast */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_100%)]" />

      {/* Left gutter — tap to return to reader */}
      <button
        type="button"
        aria-label="Open reader"
        onClick={goReader}
        className="absolute top-0 bottom-0 left-0 w-[max(env(safe-area-inset-left,0px),16px)] sm:w-[calc((100vw-28rem)/2)] hidden sm:block"
      />
      {/* Right gutter — tap to return to reader */}
      <button
        type="button"
        aria-label="Open reader"
        onClick={goReader}
        className="absolute top-0 bottom-0 right-0 w-[max(env(safe-area-inset-right,0px),16px)] sm:w-[calc((100vw-28rem)/2)] hidden sm:block"
      />

      {/* Back-to-score CTA, top-left */}
      <button
        type="button"
        onClick={goReader}
        aria-label="Back to score"
        className="absolute z-[5] inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1.5 bg-background/80 backdrop-blur-xl border border-border/60 text-[12px] font-medium text-foreground spring-tap shadow-[0_4px_16px_-6px_rgba(0,0,0,0.25)]"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 14px)",
          left: "calc(env(safe-area-inset-left, 0px) + 14px)",
        }}
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Score
      </button>

      {/* Content column — fully interactive. All children receive pointer
          events normally (works for both pill pages and full sub-pages). */}
      <div className="relative h-full overflow-y-auto overscroll-contain">
        <div
          className="max-w-md mx-auto px-5 pb-32 flex flex-col gap-3 pointer-events-auto"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
