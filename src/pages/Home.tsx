import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Inbox, Calendar, Mic2, Clock3, Flame, ChevronRight, Play, FileMusic, Library as LibraryIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { listMyUpcomingEvents, MyUpcomingEvent } from "@/lib/ensembles";
import { usePracticeStats } from "@/lib/practiceStats";
import { listMyScores, type Score } from "@/lib/scores";
import { getRecentMap, markScoreOpened } from "@/lib/recentScores";
import { ScoreReader } from "@/components/ScoreReader";

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
  const [scores, setScores] = useState<Score[]>([]);
  const [activeScore, setActiveScore] = useState<Score | null>(null);
  // Landing overlay visible by default; tap on score area dismisses it and enters reader.
  const [overlayVisible, setOverlayVisible] = useState(true);
  const stats = usePracticeStats();

  useEffect(() => {
    document.title = "Tempo";
    listMyUpcomingEvents(40).then(setEvents).catch(() => {});
    listMyScores().then(setScores).catch(() => {});
  }, []);

  // Pick most-recently-opened score for the background
  const recommended = useMemo(() => {
    const recents = getRecentMap();
    const sorted = [...scores].sort((a, b) => {
      const ao = recents[a.id] || new Date(a.updated_at || a.created_at).getTime();
      const bo = recents[b.id] || new Date(b.updated_at || b.created_at).getTime();
      return bo - ao;
    });
    return sorted;
  }, [scores]);

  useEffect(() => {
    if (!activeScore && recommended.length > 0) {
      setActiveScore(recommended[0]);
    }
  }, [recommended, activeScore]);

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

  const greetingName = (user?.user_metadata as any)?.display_name || (user?.email?.split("@")[0]) || "";

  const dismissOverlay = () => setOverlayVisible(false);

  const pickScore = (s: Score) => {
    setActiveScore(s);
    markScoreOpened(s.id);
    setOverlayVisible(false);
  };

  // ----- No scores yet: plain welcome page -----
  if (scores.length === 0) {
    return <PlainWelcome
      greetingName={greetingName}
      pending={pending}
      events={events}
      stats={stats}
      navigate={navigate}
      nextRehearsal={nextRehearsal}
      nextConcert={nextConcert}
      rehearsals={rehearsals}
      concerts={concerts}
      totalSessions={totalSessions}
    />;
  }

  return (
    <>
      {/* Background full-screen ScoreReader */}
      {activeScore && (
        <ScoreReader
          key={activeScore.id}
          score={activeScore}
          onClose={() => setOverlayVisible(true)}
        />
      )}

      {/* Landing overlay: tinted/blurred backdrop + welcome pills */}
      {overlayVisible && (
        <div className="fixed inset-0 z-[60] animate-fade-in">
          {/* Backdrop blur + tint over the score */}
          <button
            type="button"
            aria-label="Dismiss welcome"
            onClick={dismissOverlay}
            className="absolute inset-0 w-full h-full bg-background/55 backdrop-blur-md"
          />

          {/* Pills, vertically stacked, scrollable */}
          <div className="relative h-full overflow-y-auto pointer-events-none">
            <div
              className="max-w-md mx-auto px-5 pb-32 flex flex-col gap-3 pointer-events-none"
              style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
            >
              {/* Inbox pill (top-left, kept) */}
              <Link
                to="/inbox"
                aria-label="Open inbox"
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-auto fixed z-[61] h-10 w-10 grid place-items-center rounded-full spring-tap bg-background/40 backdrop-blur-2xl backdrop-saturate-150 border border-white/15 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:bg-background/55 transition-colors"
                style={{
                  top: "calc(env(safe-area-inset-top, 0px) + 14px)",
                  left: "calc(env(safe-area-inset-left, 0px) + 14px)",
                }}
              >
                <Inbox className="h-[16px] w-[16px] text-foreground" strokeWidth={1.8} />
                {pending > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#FF3B30] ring-2 ring-background/60" />
                )}
              </Link>

              {/* Greeting pill */}
              <GlassPill onClick={(e) => e.stopPropagation()}>
                <h1 className="text-[28px] sm:text-[32px] font-light tracking-tight leading-tight">
                  Welcome back{greetingName ? `, ${greetingName}` : ""}.
                </h1>
                <p className="text-[14px] text-muted-foreground mt-1.5">
                  A quiet overview of what's ahead.
                </p>
              </GlassPill>

              {/* Recommended pieces pill */}
              {recommended.length > 0 && (
                <GlassPill onClick={(e) => e.stopPropagation()}>
                  <SectionHeader icon={Play} label="Continue practicing" />
                  <div className="mt-2 -mx-1 flex gap-2 overflow-x-auto pb-1">
                    {recommended.slice(0, 6).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => pickScore(s)}
                        className={`shrink-0 w-40 text-left rounded-2xl border p-3 spring-tap transition-colors ${
                          activeScore?.id === s.id
                            ? "border-foreground/50 bg-foreground/5"
                            : "border-border/60 bg-background/30 hover:bg-background/60"
                        }`}
                      >
                        <div className="h-16 rounded-lg bg-muted/60 grid place-items-center mb-2">
                          <FileMusic className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-[13px] font-medium truncate">{s.title}</p>
                        {s.composer && (
                          <p className="text-[11.5px] text-muted-foreground truncate">{s.composer}</p>
                        )}
                      </button>
                    ))}
                  </div>
                  {activeScore && (
                    <button
                      onClick={dismissOverlay}
                      className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground text-background py-2 text-[13px] font-medium spring-tap"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Open {activeScore.title}
                    </button>
                  )}
                </GlassPill>
              )}

              {/* Rehearsals pill */}
              <GlassPill onClick={(e) => { e.stopPropagation(); nextRehearsal && navigate(`/ensembles/${nextRehearsal.ensemble_id}`); }}>
                <SectionHeader icon={Calendar} label="Upcoming rehearsals" count={rehearsals.length} />
                <p className="mt-1.5 text-[16px] font-medium truncate">
                  {nextRehearsal ? fmtDate(nextRehearsal.starts_at) : "Nothing scheduled"}
                </p>
                {nextRehearsal && (
                  <p className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                    {nextRehearsal.ensemble_name} · {fmtTime(nextRehearsal.starts_at)}
                  </p>
                )}
              </GlassPill>

              {/* Concerts pill */}
              <GlassPill onClick={(e) => { e.stopPropagation(); nextConcert && navigate(`/ensembles/${nextConcert.ensemble_id}`); }}>
                <SectionHeader icon={Mic2} label="Upcoming concerts" count={concerts.length} />
                <p className="mt-1.5 text-[16px] font-medium truncate">
                  {nextConcert ? fmtDate(nextConcert.starts_at) : "Nothing scheduled"}
                </p>
                {nextConcert && (
                  <p className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                    {nextConcert.ensemble_name} · {fmtTime(nextConcert.starts_at)}
                  </p>
                )}
              </GlassPill>

              {/* Practice pill */}
              <GlassPill onClick={(e) => { e.stopPropagation(); navigate("/library"); }}>
                <SectionHeader icon={Clock3} label="Recent practice" />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Stat label="Week" value={fmtHours(stats.data?.weeklySeconds ?? 0)} icon={Clock3} />
                  <Stat label="Streak" value={`${stats.data?.streak ?? 0}d`} icon={Flame} />
                  <Stat label="All time" value={fmtHours(stats.data?.totalSeconds ?? 0)} icon={Clock3} />
                </div>
                <p className="mt-2 text-[11.5px] text-muted-foreground">
                  {totalSessions} session{totalSessions === 1 ? "" : "s"} logged
                </p>
              </GlassPill>

              <p className="text-center text-[11.5px] text-muted-foreground/80 mt-2 pointer-events-none">
                Tap the score to start reading.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;

// ---------- Pieces ----------

function GlassPill({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className="pointer-events-auto rounded-3xl px-5 py-4 bg-background/70 backdrop-blur-2xl backdrop-saturate-150 border border-border/60 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.12)] cursor-default"
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, count }: { icon: any; label: string; count?: number }) {
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

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl bg-muted/40 px-2.5 py-2.5 border border-border/30">
      <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <p className="mt-1 text-[16px] font-semibold tabular-nums leading-none">{value}</p>
    </div>
  );
}

// ---------- Plain welcome (no scores yet) ----------

function PlainWelcome({
  greetingName, pending, stats, navigate,
  nextRehearsal, nextConcert, rehearsals, concerts, totalSessions,
}: any) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] pb-32">
      <div className="max-w-2xl mx-auto px-5 pt-12 sm:pt-16">
        <Link
          to="/inbox"
          aria-label="Open inbox"
          className="fixed z-40 h-10 w-10 grid place-items-center rounded-full spring-tap bg-background/40 backdrop-blur-2xl backdrop-saturate-150 border border-white/15 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:bg-background/55 transition-colors"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 14px)",
            left: "calc(env(safe-area-inset-left, 0px) + 14px)",
          }}
        >
          <Inbox className="h-[16px] w-[16px] text-foreground" strokeWidth={1.8} />
          {pending > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#FF3B30] ring-2 ring-background/60" />}
        </Link>

        <h1 className="text-[34px] sm:text-[40px] font-light tracking-tight leading-tight">
          Welcome back{greetingName ? `, ${greetingName}` : ""}.
        </h1>
        <p className="text-[15px] text-muted-foreground mt-1.5">
          Add your first score in the library to start practicing.
        </p>
        <button
          onClick={() => navigate("/library")}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-5 py-2.5 text-[14px] font-medium spring-tap"
        >
          <FileMusic className="h-4 w-4" />
          Open library
        </button>

        <div className="mt-10 space-y-3">
          <div className="rounded-3xl border border-border bg-background p-5">
            <SectionHeader icon={Calendar} label="Upcoming rehearsals" count={rehearsals.length} />
            <p className="mt-1.5 text-[16px] font-medium">
              {nextRehearsal ? fmtDate(nextRehearsal.starts_at) : "Nothing scheduled"}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-background p-5">
            <SectionHeader icon={Mic2} label="Upcoming concerts" count={concerts.length} />
            <p className="mt-1.5 text-[16px] font-medium">
              {nextConcert ? fmtDate(nextConcert.starts_at) : "Nothing scheduled"}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-background p-5">
            <SectionHeader icon={Clock3} label="Recent practice" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Stat label="Week" value={fmtHours(stats.data?.weeklySeconds ?? 0)} icon={Clock3} />
              <Stat label="Streak" value={`${stats.data?.streak ?? 0}d`} icon={Flame} />
              <Stat label="All time" value={fmtHours(stats.data?.totalSeconds ?? 0)} icon={Clock3} />
            </div>
            <p className="mt-2 text-[11.5px] text-muted-foreground">
              {totalSessions} session{totalSessions === 1 ? "" : "s"} logged
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
