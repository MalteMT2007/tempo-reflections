/**
 * ReaderSheet.tsx
 * Frosted-glass options sheet for the score reader.
 * Triggered by double-tap on the score (image_1 reference).
 */
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Sun, Rows2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Half page
  halfPage: boolean;
  setHalfPage: (v: boolean) => void;
  // Warm screen
  warmScreen: boolean;
  setWarmScreen: (v: boolean) => void;
  // Navigation passthrough
  onPrev: () => void;
  onNext: () => void;
  pageLabel: string;
};

export function ReaderSheet({
  open, onOpenChange,
  halfPage, setHalfPage,
  warmScreen, setWarmScreen,
  onPrev, onNext, pageLabel,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-ink/10 bg-background/85 backdrop-blur-2xl max-h-[60vh]"
      >
        <SheetTitle className="sr-only">Reader options</SheetTitle>

        {/* Section: Navigation */}
        <div className="mx-auto max-w-md">
          <SectionHeader>Navigering</SectionHeader>
          <div className="flex items-center justify-between rounded-2xl bg-foreground/5 px-3 py-2">
            <button
              onClick={onPrev}
              className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-foreground/10 transition"
              aria-label="Föregående sida"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-[13px] text-foreground/70 tabular-nums">{pageLabel}</div>
            <button
              onClick={onNext}
              className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-foreground/10 transition"
              aria-label="Nästa sida"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Section: Alternativ */}
          <SectionHeader className="mt-5">Alternativ</SectionHeader>

          <Row
            icon={<Rows2 className="h-4 w-4" />}
            title="Bläddra halva sidan"
            subtitle="Visar översta halvan, nästa visar nedersta."
          >
            <Switch checked={halfPage} onCheckedChange={setHalfPage} />
          </Row>

          <Row
            icon={<Sun className="h-4 w-4" />}
            title="Skärmvärme"
            subtitle="Varm sepia-ton för bättre läsning i mörker."
          >
            <Switch checked={warmScreen} onCheckedChange={setWarmScreen} />
          </Row>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[11px] uppercase tracking-wider text-foreground/45 mb-2 ${className}`}>
      {children}
    </div>
  );
}

function Row({
  icon, title, subtitle, children,
}: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-foreground/5 px-3 py-3 mb-2">
      <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground/70">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-foreground">{title}</div>
        {subtitle && <div className="text-[12px] text-foreground/55">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}
