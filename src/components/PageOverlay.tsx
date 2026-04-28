import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Overlay frame used by every non-reader page. Sits above the persistent
 * background ScoreReader (z-30), with a heavily blurred + dimmed scrim so
 * pills read clearly. Tapping the scrim (anywhere outside the pills)
 * dismisses the overlay and reveals the reader by navigating to /reader.
 */
export function PageOverlay({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-30 animate-fade-in">
      {/* Scrim — tap to enter reader */}
      <button
        type="button"
        aria-label="Open reader"
        onClick={() => navigate("/reader")}
        className="absolute inset-0 w-full h-full bg-background/75 backdrop-blur-2xl backdrop-saturate-150"
      />
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.35)_100%)]" />

      {/* Pills column — pointer events on children only */}
      <div className="relative h-full overflow-y-auto pointer-events-none">
        <div
          className="max-w-md mx-auto px-5 pb-32 flex flex-col gap-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
        >
          {/* Each direct pill child should opt in to pointer events via .pointer-events-auto */}
          {children}
        </div>
      </div>
    </div>
  );
}
