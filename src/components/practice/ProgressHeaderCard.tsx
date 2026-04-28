import { Flame, Clock3, ChevronRight } from "lucide-react";
import { usePracticeStats } from "@/lib/practiceStats";

function fmtHours(sec: number) {
  const h = sec / 3600;
  if (h >= 10) return `${Math.round(h)}h`;
  if (h >= 1) return `${h.toFixed(1)}h`;
  const m = Math.round(sec / 60);
  return `${m}m`;
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function ProgressHeaderCard({ onOpen }: { onOpen: () => void }) {
  const { data, isLoading } = usePracticeStats();

  const weekly = data?.weeklySeconds ?? 0;
  const streak = data?.streak ?? 0;
  const bars = data?.weeklyByDay ?? [0, 0, 0, 0, 0, 0, 0];
  const peak = Math.max(1, ...bars);
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <button
      onClick={onOpen}
      className="group w-full text-left rounded-3xl border border-border bg-background p-5 sm:p-6 hover:bg-muted/30 transition-colors animate-fade-in"
      aria-label="Open practice history"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Clock3 className="h-3 w-3" />
            Weekly focus
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[34px] sm:text-[40px] font-semibold tracking-tight leading-none tabular-nums">
              {isLoading ? "—" : fmtHours(weekly)}
            </span>
            <span className="text-[13px] text-muted-foreground">this week</span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Flame className="h-3 w-3" />
            Streak
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-[34px] sm:text-[40px] font-semibold tracking-tight leading-none tabular-nums">
              {isLoading ? "—" : streak}
            </span>
            <span className="text-[13px] text-muted-foreground">{streak === 1 ? "day" : "days"}</span>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="mt-5 flex items-end gap-1.5 h-12">
        {bars.map((sec, i) => {
          const h = Math.max(4, Math.round((sec / peak) * 100));
          const active = i === todayIdx;
          const has = sec > 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full rounded-full transition-colors ${
                  has ? "bg-foreground" : "bg-muted"
                } ${active && !has ? "bg-muted-foreground/30" : ""}`}
                style={{ height: `${h}%` }}
              />
              <span className={`text-[10px] ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {DAYS[i]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-end text-[12.5px] text-muted-foreground group-hover:text-foreground transition-colors">
        View history
        <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
      </div>
    </button>
  );
}
