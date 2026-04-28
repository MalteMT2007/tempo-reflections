import { Session, computeStats, computePieceStats, formatMinutes } from "@/lib/storage";
import { Clock, Play, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Props = {
  sessions: Session[];
  onStart: (resume?: { title: string; byline: string }) => void;
};

const dayLabel = (ts: number) => {
  const d = new Date(ts);
  return ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
};

const relativeDay = (ts: number) => {
  const d = new Date(ts);
  const today = new Date();
  const diff = Math.floor((today.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const Dashboard = ({ sessions, onStart }: Props) => {
  const stats = computeStats(sessions);
  const pieces = computePieceStats(sessions);
  const maxBar = Math.max(...stats.last7.map((d) => d.total), 1);

  return (
    <div className="min-h-screen pb-36">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 pt-8 sm:pt-10">
        <PageHeader title="Practice" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-7">
          <Stat label="Today" value={formatMinutes(stats.todaySec)} />
          <Stat label="Week" value={formatMinutes(stats.weekSec)} />
          <Stat label="Streak" value={`${stats.streak}`} suffix={stats.streak === 1 ? "day" : "days"} />
        </div>

        {/* Weekly graph */}
        <section className="rounded-2xl border border-border p-5 mt-4">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Last 7 days</span>
            <span className="text-[12px] text-muted-foreground tabular">{formatMinutes(stats.weekSec)}</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-24">
            {stats.last7.map((d, i) => {
              const h = (d.total / maxBar) * 100;
              const isToday = i === 6;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className={`w-full rounded-sm transition-all ${
                        d.total > 0
                          ? isToday
                            ? "bg-foreground"
                            : "bg-foreground/40"
                          : "bg-muted"
                      }`}
                      style={{ height: `${Math.max(h, d.total > 0 ? 6 : 3)}%` }}
                    />
                  </div>
                  <span className={`text-[11px] tabular ${isToday ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {dayLabel(d.day)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pieces */}
        {pieces.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[15px] font-semibold tracking-tight mb-3">Continue</h2>
            <ul className="space-y-1.5">
              {pieces.slice(0, 6).map((p) => (
                <li key={p.key}>
                  <button
                    onClick={() => onStart({ title: p.title, byline: p.byline })}
                    className="group w-full text-left rounded-xl border border-border p-4 flex items-center gap-3 hover:bg-muted/60 transition-colors spring-tap"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted grid place-items-center shrink-0 group-hover:bg-foreground transition-colors">
                      <Play className="h-3.5 w-3.5 text-foreground group-hover:text-background translate-x-[1px]" fill="currentColor" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium truncate leading-tight">{p.title}</p>
                      {p.byline && (
                        <p className="text-[13px] text-muted-foreground truncate mt-0.5">{p.byline}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* History */}
        {sessions.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[15px] font-semibold tracking-tight mb-3">History</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
              {sessions.slice(0, 10).map((s) => {
                const titleLine = s.title || s.focus;
                const byline = s.composer || s.artist;
                return (
                  <li key={s.id} className="px-4 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[15px] font-medium truncate">{titleLine}</p>
                      <span className="text-[12px] text-muted-foreground tabular shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatMinutes(s.durationSec)}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {relativeDay(s.startedAt)}
                      {byline && <span> · {byline}</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {sessions.length === 0 && (
          <div className="mt-12 text-center py-16 border border-dashed border-border rounded-2xl">
            <p className="text-[15px] text-muted-foreground">Tap below to begin.</p>
          </div>
        )}
      </div>

      {/* Floating start button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-40">
        <button
          onClick={() => onStart()}
          className="pointer-events-auto group rounded-full bg-foreground text-background pl-2 pr-6 py-2 shadow-elev flex items-center gap-3 spring-tap"
        >
          <span className="h-11 w-11 rounded-full bg-background/15 grid place-items-center">
            <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
          </span>
          <span className="text-[15px] font-medium pr-1">Start</span>
        </button>
      </div>
    </div>
  );
};

const Stat = ({ label, value, suffix }: { label: string; value: string; suffix?: string }) => (
  <div className="rounded-2xl border border-border p-4">
    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-1.5">{label}</p>
    <p className="text-[24px] font-semibold tabular leading-none">
      {value}
      {suffix && <span className="text-[12px] text-muted-foreground ml-1.5 font-normal">{suffix}</span>}
    </p>
  </div>
);
