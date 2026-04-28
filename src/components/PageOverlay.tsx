import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Overlay frame used by every non-reader page. Sits above the persistent
 * background ScoreReader (z-30), with a heavily blurred + dimmed scrim so
 * pills read clearly. Tapping the scrim (anywhere outside the pills)
 * dismisses the overlay and reveals the reader by navigating to /reader.
 *
 * Pages do NOT need to wrap themselves — AppLayout wraps every non-reader
 * route automatically. Pages just return their pill content.
 */
export function PageOverlay({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-30 animate-fade-in">
      {/* Blurred + dimmed scrim. Tap to enter reader. */}
      <button
        type="button"
        aria-label="Open reader"
        onClick={() => navigate("/reader")}
        className="absolute inset-0 w-full h-full bg-background/70 backdrop-blur-2xl backdrop-saturate-150"
      />
      {/* Subtle vignette for extra contrast */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_100%)]" />

      {/* Pills column — content is scrollable, only pills get pointer events */}
      <div className="relative h-full overflow-y-auto pointer-events-none overscroll-contain">
        <div
          className="max-w-md mx-auto px-5 pb-32 flex flex-col gap-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
