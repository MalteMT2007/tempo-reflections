import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Calendar, Mic2, Clock3, Flame, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { listMyUpcomingEvents, MyUpcomingEvent } from "@/lib/ensembles";
import { usePracticeStats } from "@/lib/practiceStats";

function fmtHours(sec: number) {
  if (!sec) return "0m";
  const h = sec / 3600;
  if (h >= 10) return `${Math.round(h)}h`;
  if (h >= 1) return `${h.toFixed(1)}h`;
  return `${Math.round(sec / 60)}m`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<MyUpcomingEvent[]>([]);
  const [pending, setPending] = useState(0);
  const [expandedRehearsals, setExpandedRehearsals] = useState(false);
  const [expandedConcerts, setExpandedConcerts] = useState(false);
  const [expandedPractice, setExpandedPractice] = useState(false);
  const stats = usePracticeStats();

  useEffect(() => {
    document.title = "Home — Tempo";
    listMyUpcomingEvents(40).then(setEvents).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [{ count: ec }, { count: rc }, { count: dc }] = await Promise.all([
          supabase.from("ensemble_invites").select("id", { head: true, count: "exact" }).eq("status", "pending"),
          supabase.from("room_invites").select("id", { head: true, count: "exact" }).eq("status", "pending").eq("invitee_id", user.id),
          supabase.from("direct_messages").select("id", { head: true, count: "exact" }).eq("recipient_id", user.id).is("read_at", null),
        ]);
        if (!cancelled) setPending((ec ?? 0) + (rc ?? 0) + (dc ?? 0));
      } catch {}
    };
    load();
    const ch = supabase
      .channel("inbox-badge-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "ensemble_invites" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_invites" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  const rehearsals = events.filter((e) => e.type === "rehearsal");
  const concerts = events.filter((e) => e.type === "concert");
  const nextRehearsal = rehearsals[0];
  const nextConcert = concerts[0];

  const totalSessions = stats.data?.sessions.length ?? 0;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pb-32">
      <div className="max-w-2xl mx-auto px-5 pt-12 sm:pt-16">
        {/* Inbox tile */}
        <Link
          to="/inbox"
          aria-label="Open inbox"
          className="relative inline-flex items-center gap-2 text-[12.5px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <span className="relative inline-grid place-items-center h-7 w-7 rounded-full bg-muted">
            <Bell className="h-[15px] w-[15px]" strokeWidth={1.8} />
            {pending > 0 && (
              <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[#FF3B30]" />
            )}
          </span>
          Inbox
          {pending > 0 && (
            <span className="text-foreground/80 normal-case tracking-normal text-[12.5px]">
              · {pending} new
            </span>
          )}
        </Link>

        <h1 className="text-[34px] sm:text-[40px] font-semibold tracking-tight leading-tight">
          Welcome back.
        </h1>
        <p className="text-[15px] text-muted-foreground mt-1.5">
          A quiet overview of what's ahead.
        </p>

        {/* Sections */}
        <div className="mt-10 space-y-3">
          <Section
            icon={Calendar}
            label="Upcoming rehearsals"
            primary={nextRehearsal ? fmtDate(nextRehearsal.starts_at) : "Nothing scheduled"}
            secondary={nextRehearsal ? `${nextRehearsal.ensemble_name} · ${fmtTime(nextRehearsal.starts_at)}` : undefined}
            count={rehearsals.length}
            expanded={expandedRehearsals}
            onToggle={() => setExpandedRehearsals((v) => !v)}
            onOpen={() => nextRehearsal && navigate(`/ensembles/${nextRehearsal.ensemble_id}`)}
          >
            {rehearsals.slice(0, 6).map((e) => (
              <EventRow key={e.id} ev={e} onClick={() => navigate(`/ensembles/${e.ensemble_id}`)} />
            ))}
            {rehearsals.length === 0 && <Empty>No rehearsals coming up.</Empty>}
          </Section>

          <Section
            icon={Mic2}
            label="Upcoming concerts"
            primary={nextConcert ? fmtDate(nextConcert.starts_at) : "Nothing scheduled"}
            secondary={nextConcert ? `${nextConcert.ensemble_name} · ${fmtTime(nextConcert.starts_at)}` : undefined}
            count={concerts.length}
            expanded={expandedConcerts}
            onToggle={() => setExpandedConcerts((v) => !v)}
            onOpen={() => nextConcert && navigate(`/ensembles/${nextConcert.ensemble_id}`)}
          >
            {concerts.slice(0, 6).map((e) => (
              <EventRow key={e.id} ev={e} onClick={() => navigate(`/ensembles/${e.ensemble_id}`)} />
            ))}
            {concerts.length === 0 && <Empty>No concerts on the horizon.</Empty>}
          </Section>

          <Section
            icon={Clock3}
            label="Recent practice"
            primary={fmtHours(stats.data?.weeklySeconds ?? 0)}
            secondary={
              stats.data
                ? `${stats.data.streak} day streak · ${totalSessions} session${totalSessions === 1 ? "" : "s"}`
                : "—"
            }
            count={undefined}
            expanded={expandedPractice}
            onToggle={() => setExpandedPractice((v) => !v)}
            onOpen={() => navigate("/library")}
          >
            <div className="grid grid-cols-3 gap-3 px-1">
              <Stat label="This week" value={fmtHours(stats.data?.weeklySeconds ?? 0)} icon={Clock3} />
              <Stat label="Streak" value={`${stats.data?.streak ?? 0}d`} icon={Flame} />
              <Stat label="All time" value={fmtHours(stats.data?.totalSeconds ?? 0)} icon={Clock3} />
            </div>
            <button
              onClick={() => navigate("/library")}
              className="mt-3 w-full text-left px-1 py-2 text-[13px] text-muted-foreground hover:text-foreground inline-flex items-center"
            >
              Open practice history
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </button>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default Home;

// ---------- Pieces ----------
function Section({
  icon: Icon,
  label,
  primary,
  secondary,
  count,
  expanded,
  onToggle,
  onOpen,
  children,
}: {
  icon: any;
  label: string;
  primary: string;
  secondary?: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-background overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/40 transition-colors"
        aria-expanded={expanded}
      >
        <span className="h-9 w-9 rounded-full bg-muted grid place-items-center shrink-0">
          <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
            {typeof count === "number" && count > 0 && (
              <span className="normal-case tracking-normal text-[11px] text-muted-foreground">· {count}</span>
            )}
          </div>
          <p className="mt-0.5 text-[17px] font-medium text-foreground truncate">{primary}</p>
          {secondary && (
            <p className="text-[13px] text-muted-foreground truncate mt-0.5">{secondary}</p>
          )}
        </div>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-5 pb-5 pt-1 animate-fade-in">
          <div className="space-y-1">{children}</div>
          <button
            onClick={onOpen}
            className="mt-3 inline-flex items-center text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            Go to feature <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function EventRow({ ev, onClick }: { ev: MyUpcomingEvent; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 py-2.5 rounded-xl hover:bg-muted/50 px-2 -mx-2"
    >
      <div className="w-12 shrink-0 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {new Date(ev.starts_at).toLocaleDateString(undefined, { month: "short" })}
        </p>
        <p className="text-xl font-semibold leading-none tabular-nums">
          {new Date(ev.starts_at).getDate()}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium truncate">{ev.project_title || ev.ensemble_name}</p>
        <p className="text-[12.5px] text-muted-foreground truncate">
          {ev.ensemble_name} · {fmtTime(ev.starts_at)}
          {ev.location ? ` · ${ev.location}` : ""}
        </p>
      </div>
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[13.5px] text-muted-foreground py-2 px-1">{children}</p>;
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl bg-muted/50 px-3 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 text-[20px] font-semibold tabular-nums leading-none">{value}</p>
    </div>
  );
}
