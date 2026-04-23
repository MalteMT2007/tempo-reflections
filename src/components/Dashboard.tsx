import { Session, computeStats, formatMinutes } from "@/lib/storage";
import { Flame, Clock } from "lucide-react";

type Props = {
  sessions: Session[];
  onStart: () => void;
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
  const maxBar = Math.max(...stats.last7.map((d) => d.total), 1);

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-md mx-auto px-6 pt-12">
        {/* Header */}
        <header className="mb-10 animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Practice</p>
          <h1 className="font-serif text-5xl font-light text-ink leading-none">
            {greeting()}.
          </h1>
          <p className="font-serif italic text-ink-soft mt-3 text-lg">
            {sessions.length === 0
              ? "Your studio awaits."
              : "What will you discover today?"}
          </p>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-in" style={{ animationDelay: "80ms" }}>
          <StatCard label="Today" value={formatMinutes(stats.todaySec)} />
          <StatCard label="This week" value={formatMinutes(stats.weekSec)} />
          <StatCard
            label="Streak"
            value={`${stats.streak}`}
            suffix={stats.streak === 1 ? "day" : "days"}
            icon={stats.streak > 0 ? <Flame className="h-3 w-3 text-accent" /> : undefined}
          />
        </div>

        {/* Weekly graph */}
        <section className="rounded-lg border border-border bg-card/50 p-5 mb-8 shadow-soft animate-fade-in" style={{ animationDelay: "140ms" }}>
          <div className="flex items-baseline justify-between mb-5">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Last 7 days</span>
            <span className="font-serif italic text-sm text-ink-soft">{formatMinutes(stats.weekSec)}</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-28">
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
                            ? "bg-ink"
                            : "bg-sepia-soft"
                          : "bg-border/60"
                      }`}
                      style={{ height: `${Math.max(h, d.total > 0 ? 6 : 3)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] tabular ${isToday ? "text-ink font-medium" : "text-muted-foreground"}`}>
                    {dayLabel(d.day)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* History */}
        <section className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <h2 className="font-serif text-2xl font-light text-ink mb-4">Recent sessions</h2>
          {sessions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <p className="font-serif italic text-ink-soft">
                "The practice room is where the music begins."
              </p>
              <p className="text-xs text-muted-foreground mt-2">Tap below to begin your first session.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.slice(0, 12).map((s) => {
                const titleLine = s.title || s.focus;
                const byline = s.composer || s.artist;
                return (
                <li key={s.id} className="py-4">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <p className="font-serif text-lg text-ink leading-snug truncate">
                      {titleLine}
                    </p>
                    <span className="text-xs text-muted-foreground tabular shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatMinutes(s.durationSec)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>
                      {relativeDay(s.startedAt)}
                      {byline && <span className="font-serif italic text-ink-soft"> · {byline}</span>}
                    </span>
                    {s.tags.length > 0 && (
                      <span className="italic font-serif text-ink-soft truncate">{s.tags.join(" · ")}</span>
                    )}
                  </div>
                  {s.focus && s.title && (
                    <p className="mt-1 text-xs text-ink-soft font-serif italic truncate">"{s.focus}"</p>
                  )}
                  {(s.improved || s.needsWork) && (
                    <div className="mt-2 pl-3 border-l-2 border-sepia/40 space-y-0.5">
                      {s.improved && (
                        <p className="text-xs text-ink-soft">
                          <span className="text-muted-foreground">+ </span>{s.improved}
                        </p>
                      )}
                      {s.needsWork && (
                        <p className="text-xs text-ink-soft">
                          <span className="text-muted-foreground">△ </span>{s.needsWork}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Floating start button */}
      <button
        onClick={onStart}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-paper rounded-full px-8 py-4 shadow-elev hover:opacity-90 transition flex items-center gap-3 group"
      >
        <span className="h-2 w-2 rounded-full bg-paper animate-pulse-soft" />
        <span className="font-medium tracking-wide">Begin a session</span>
      </button>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon?: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border bg-card/50 p-4 shadow-soft">
    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-1">
      {icon}
      {label}
    </p>
    <p className="font-serif text-2xl font-light text-ink tabular leading-none">
      {value}
      {suffix && <span className="text-xs text-muted-foreground ml-1 font-sans">{suffix}</span>}
    </p>
  </div>
);

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Late hours";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
};
