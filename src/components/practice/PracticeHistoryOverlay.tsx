import { useEffect } from "react";
import { X, Clock3, Flame, Music2 } from "lucide-react";
import { usePracticeStats } from "@/lib/practiceStats";

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const that = new Date(d); that.setHours(0,0,0,0);
  const diff = Math.round((today.getTime() - that.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function PracticeHistoryOverlay({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = usePracticeStats();

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const sessions = data?.sessions ?? [];
  const byPiece = data?.byPiece ?? [];
  const weekly = data?.weeklySeconds ?? 0;
  const total = data?.totalSeconds ?? 0;
  const streak = data?.streak ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-background animate-fade-in overflow-y-auto">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-tight">Practice history</h1>
          <button
            onClick={onClose}
            className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted spring-tap"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          <Stat label="This week" value={fmtDuration(weekly)} icon={<Clock3 className="h-3 w-3" />} />
          <Stat label="Streak" value={`${streak}${streak === 1 ? " day" : " days"}`} icon={<Flame className="h-3 w-3" />} />
          <Stat label="All time" value={fmtDuration(total)} icon={<Music2 className="h-3 w-3" />} />
        </div>

        {/* By piece */}
        <section className="mb-12">
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-3 px-1">By piece</h2>
          {isLoading ? (
            <div className="text-[14px] text-muted-foreground px-1">Loading…</div>
          ) : byPiece.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-[14px] text-muted-foreground">
              No practice yet. Start a session from the Practice menu.
            </div>
          ) : (
            <div className="space-y-1">
              {byPiece.slice(0, 8).map((p) => {
                const pct = Math.max(4, Math.round((p.seconds / byPiece[0].seconds) * 100));
                return (
                  <div key={p.key} className="py-2.5 px-1">
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-[14.5px] font-medium truncate">{p.title || "Untitled"}</div>
                        {p.byline && (
                          <div className="text-[12.5px] text-muted-foreground truncate">{p.byline}</div>
                        )}
                      </div>
                      <div className="text-[13px] text-muted-foreground tabular-nums shrink-0">
                        {fmtDuration(p.seconds)} · {p.count}
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-foreground rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent sessions */}
        <section>
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-3 px-1">Recent sessions</h2>
          {sessions.length === 0 ? (
            <div className="text-[14px] text-muted-foreground px-1">No sessions recorded yet.</div>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {sessions.slice(0, 30).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-medium truncate">{s.title || "Untitled"}</div>
                    <div className="text-[12.5px] text-muted-foreground truncate">
                      {s.byline ? `${s.byline} · ` : ""}{fmtDate(s.started_at)}
                    </div>
                  </div>
                  <div className="text-[13.5px] tabular-nums text-muted-foreground">
                    {fmtDuration(s.duration_sec)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-[22px] font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
