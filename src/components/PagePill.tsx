import { ReactNode } from "react";

/**
 * Centered glass pill container, matching the Home landing-pill aesthetic.
 * Use as the wrapper for content on main pages over BlurredScoreBackdrop.
 */
export function PagePillFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-start justify-center">
      <div
        className="w-full max-w-md mx-auto px-5 pb-32 flex flex-col gap-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function GlassPill({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl px-5 py-4 bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border border-border/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.12)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PillSectionHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: any;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
      <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
      {label}
      {typeof count === "number" && count > 0 && (
        <span className="normal-case tracking-normal">· {count}</span>
      )}
    </div>
  );
}

/**
 * The standard grey "Browse X" CTA used at the bottom of pills.
 */
export function BrowseCta({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground/10 hover:bg-foreground/15 text-foreground py-2 text-[12.5px] font-medium spring-tap transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
