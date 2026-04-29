/**
 * EraserPopover.tsx
 * Frosted-glass popover for eraser modes. Opens via long-press on the eraser tool.
 */
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type EraseMode = "precision" | "standard" | "stroke";

const OPTIONS: { id: EraseMode; label: string; sub: string }[] = [
  { id: "precision", label: "Precision", sub: "Suddar exakt där spetsen rör." },
  { id: "standard",  label: "Standard",  sub: "Bredare radie för snabb sudd." },
  { id: "stroke",    label: "Linje",     sub: "Suddar hela streck med ett tryck." },
];

type Props = {
  active: boolean;
  mode: EraseMode;
  onModeChange: (m: EraseMode) => void;
  onActivate: () => void;
};

export function EraserToolButton({ active, mode, onModeChange, onActivate }: Props) {
  const [open, setOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  // Long-press detection
  const startPress = () => {
    longPressed.current = false;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setOpen(true);
    }, 380);
  };
  const cancelPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => () => cancelPress(), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Eraser"
          title="Sudd (håll inne för läge)"
          onPointerDown={startPress}
          onPointerUp={(e) => {
            cancelPress();
            if (longPressed.current) {
              e.preventDefault();
              return;
            }
            onActivate();
          }}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          className={`pointer-events-auto h-9 w-9 rounded-full flex items-center justify-center transition shrink-0 ${
            active ? "bg-foreground text-background" : "text-foreground hover:bg-foreground/5"
          }`}
        >
          <Eraser className="h-[18px] w-[18px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={10}
        className="w-60 rounded-2xl border-foreground/10 bg-background/85 backdrop-blur-2xl p-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)]"
      >
        <div className="text-[11px] uppercase tracking-wider text-foreground/45 px-2.5 pt-1.5 pb-1">
          Sudd-läge
        </div>
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              onModeChange(o.id);
              onActivate();
              setOpen(false);
            }}
            className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-xl transition text-left ${
              mode === o.id ? "bg-foreground/10" : "hover:bg-foreground/5"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] text-foreground">{o.label}</div>
              <div className="text-[11.5px] text-foreground/55 leading-tight">{o.sub}</div>
            </div>
            {mode === o.id && (
              <div className="h-4 w-4 rounded-full bg-foreground/80 mt-1" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
