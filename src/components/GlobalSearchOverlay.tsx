import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, FileMusic, Calendar, User } from "lucide-react";
import { listMyScores, Score } from "@/lib/scores";
import { listMyUpcomingEvents, MyUpcomingEvent } from "@/lib/ensembles";
import { discoverProfiles } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  instrument: string | null;
  avatar_url: string | null;
};

export function GlobalSearchOverlay({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [scores, setScores] = useState<Score[]>([]);
  const [events, setEvents] = useState<MyUpcomingEvent[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    listMyScores().then(setScores).catch(() => {});
    listMyUpcomingEvents(50).then(setEvents).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setPeople([]); return; }
      try {
        const res = await discoverProfiles(q, user?.id);
        setPeople(res as Profile[]);
      } catch {}
    }, 220);
    return () => clearTimeout(t);
  }, [q, user]);

  const term = q.trim().toLowerCase();
  const filteredScores = useMemo(() => {
    if (!term) return [];
    return scores.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        (s.composer || "").toLowerCase().includes(term) ||
        s.tags.some((t) => t.toLowerCase().includes(term))
    ).slice(0, 8);
  }, [scores, term]);

  const filteredEvents = useMemo(() => {
    if (!term) return [];
    return events.filter(
      (e) =>
        e.project_title.toLowerCase().includes(term) ||
        e.ensemble_name.toLowerCase().includes(term) ||
        (e.location || "").toLowerCase().includes(term)
    ).slice(0, 8);
  }, [events, term]);

  const open = (cb: () => void) => { cb(); onClose(); };

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl animate-fade-in flex flex-col">
      <div className="px-5 pt-6 sm:pt-10 max-w-2xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search scores, events, people"
              className="w-full pl-11 pr-3 h-12 rounded-2xl bg-muted text-[15px] outline-none border border-transparent focus:border-border placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={onClose}
            aria-label="Close search"
            className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted spring-tap"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto mt-6 pb-10">
          {!term && (
            <p className="text-[13.5px] text-muted-foreground px-1">
              Search across your sheet music, upcoming rehearsals & concerts, and other musicians.
            </p>
          )}

          {term && (
            <>
              <Group title="Sheet music" empty={filteredScores.length === 0}>
                {filteredScores.map((s) => (
                  <ResultRow
                    key={s.id}
                    icon={FileMusic}
                    title={s.title}
                    subtitle={s.composer || undefined}
                    onClick={() => open(() => navigate(`/library?open=${s.id}`))}
                  />
                ))}
              </Group>

              <Group title="Upcoming events" empty={filteredEvents.length === 0}>
                {filteredEvents.map((e) => (
                  <ResultRow
                    key={e.id}
                    icon={Calendar}
                    title={e.project_title || e.ensemble_name}
                    subtitle={`${e.ensemble_name} · ${new Date(e.starts_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                    onClick={() => open(() => navigate(`/ensembles/${e.ensemble_id}`))}
                  />
                ))}
              </Group>

              <Group title="People" empty={people.length === 0}>
                {people.slice(0, 10).map((p) => (
                  <ResultRow
                    key={p.id}
                    icon={User}
                    title={p.display_name || p.username}
                    subtitle={p.instrument || `@${p.username}`}
                    avatar={p.avatar_url}
                    onClick={() => open(() => navigate(`/colleagues`))}
                  />
                ))}
              </Group>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <section className="mt-2 mb-6">
      <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground px-1 mb-2">{title}</h3>
      {empty ? (
        <p className="text-[13.5px] text-muted-foreground px-1 py-2">No matches.</p>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </section>
  );
}

function ResultRow({
  icon: Icon,
  title,
  subtitle,
  avatar,
  onClick,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  avatar?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted spring-tap"
    >
      <span className="h-9 w-9 rounded-full bg-muted grid place-items-center overflow-hidden shrink-0">
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-[16px] w-[16px] text-muted-foreground" strokeWidth={1.7} />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-medium truncate">{title}</p>
        {subtitle && <p className="text-[12.5px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </button>
  );
}
