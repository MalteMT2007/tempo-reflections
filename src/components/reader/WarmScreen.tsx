/**
 * Global warm-screen overlay (sepia-style yellow tint).
 * Renders nothing visible when off; uses a fixed full-screen blend layer when on.
 */
import { useEffect } from "react";

type Props = { active: boolean };

export function WarmScreen({ active }: Props) {
  useEffect(() => {
    if (active) document.body.setAttribute("data-warm-screen", "true");
    else document.body.removeAttribute("data-warm-screen");
    return () => document.body.removeAttribute("data-warm-screen");
  }, [active]);

  if (!active) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] mix-blend-multiply transition-opacity duration-300"
      style={{
        background: "rgba(255, 198, 102, 0.30)",
      }}
    />
  );
}
