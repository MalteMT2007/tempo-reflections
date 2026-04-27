import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, UserPlus, Check, X, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  searchProfiles,
  listFriendships,
  requestFriend,
  respondFriend,
  removeFriend,
  friendsFeed,
  FriendshipRow,
  DbSession,
} from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { formatMinutes } from "@/lib/storage";
import { toast } from "sonner";

type ProfileLite = { id: string; username: string; display_name: string | null; instrument: string | null };

const relativeDay = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const Collegues = () => {
  const { user } = useAuth();
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileLite>>({});
  const [feed, setFeed] = useState<DbSession[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Collegues — Practice"; }, []);

  const refresh = async () => {
    if (!user) return;
    const fs = await listFriendships();
    setFriendships(fs);
    const ids = Array.from(new Set(fs.flatMap((f) => [f.requester_id, f.addressee_id]))).filter((i) => i !== user.id);
    if (ids.length) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, instrument")
        .in("id", ids);
      const map: Record<string, ProfileLite> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfilesById(map);
    } else {
      setProfilesById({});
    }
    const acceptedIds = fs
      .filter((f) => f.status === "accepted")
      .map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id));
    setFeed(await friendsFeed(acceptedIds));
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [user]);

  // Search debounced
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchProfiles(query, user?.id);
        setResults(r as ProfileLite[]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, user]);

  const { incoming, outgoing, accepted } = useMemo(() => {
    if (!user) return { incoming: [], outgoing: [], accepted: [] as FriendshipRow[] };
    return {
      incoming: friendships.filter((f) => f.status === "pending" && f.addressee_id === user.id),
      outgoing: friendships.filter((f) => f.status === "pending" && f.requester_id === user.id),
      accepted: friendships.filter((f) => f.status === "accepted"),
    };
  }, [friendships, user]);

  const sendRequest = async (id: string) => {
    try {
      await requestFriend(id);
      toast.success("Request sent");
      setQuery("");
      setResults([]);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not send");
    }
  };

  const otherSide = (f: FriendshipRow) =>
    f.requester_id === user?.id ? f.addressee_id : f.requester_id;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>;
  }

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-md mx-auto px-6 pt-10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-ink-soft hover:text-ink mb-6">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>

        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Collegues</p>
          <h1 className="font-serif text-4xl font-light text-ink">What they practice.</h1>
          <p className="font-serif italic text-ink-soft mt-1">A glimpse into your circle's studios.</p>
        </header>

        {/* Search */}
        <section className="mb-8">
          <div className="flex items-center gap-2 border-b border-border focus-within:border-ink transition">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a musician by name…"
              className="flex-1 bg-transparent outline-none py-3 font-serif text-base placeholder:text-muted-foreground/60 placeholder:italic"
            />
            {searching && <Loader2 className="h-3 w-3 animate-spin text-ink-soft" />}
          </div>
          {results.length > 0 && (
            <ul className="mt-3 space-y-2">
              {results.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/40">
                  <div className="h-9 w-9 rounded-full bg-ink text-paper flex items-center justify-center font-serif">
                    {(p.display_name || p.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-base text-ink truncate">{p.display_name || p.username}</p>
                    <p className="text-xs text-ink-soft truncate">@{p.username}{p.instrument ? ` · ${p.instrument}` : ""}</p>
                  </div>
                  <button
                    onClick={() => sendRequest(p.id)}
                    className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border border-border hover:border-ink/40 transition"
                  >
                    <UserPlus className="h-3 w-3" /> Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pending */}
        {incoming.length > 0 && (
          <section className="mb-8">
            <h2 className="font-serif text-xl text-ink mb-3">Requests</h2>
            <ul className="space-y-2">
              {incoming.map((f) => {
                const p = profilesById[otherSide(f)];
                return (
                  <li key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/40">
                    <div className="h-9 w-9 rounded-full bg-ink text-paper flex items-center justify-center font-serif">
                      {(p?.display_name || p?.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-base text-ink truncate">{p?.display_name || p?.username || "Unknown"}</p>
                      <p className="text-xs text-ink-soft truncate">wants to follow your practice</p>
                    </div>
                    <button onClick={async () => { await respondFriend(f.id, true); refresh(); }}
                      className="h-8 w-8 rounded-full border border-border hover:border-ink/40 flex items-center justify-center"><Check className="h-3 w-3" /></button>
                    <button onClick={async () => { await respondFriend(f.id, false); refresh(); }}
                      className="h-8 w-8 rounded-full border border-border hover:border-ink/40 flex items-center justify-center"><X className="h-3 w-3" /></button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="mb-8">
            <h2 className="font-serif text-xl text-ink mb-3">Pending</h2>
            <ul className="space-y-2">
              {outgoing.map((f) => {
                const p = profilesById[otherSide(f)];
                return (
                  <li key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/30">
                    <div className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-ink-soft font-serif">
                      {(p?.display_name || p?.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-base text-ink truncate">{p?.display_name || p?.username || "Unknown"}</p>
                      <p className="text-xs text-ink-soft italic font-serif">awaiting reply</p>
                    </div>
                    <button onClick={async () => { await removeFriend(f.id); refresh(); }}
                      className="text-xs text-ink-soft hover:text-ink">Cancel</button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Friends list */}
        <section className="mb-8">
          <h2 className="font-serif text-xl text-ink mb-3">Your circle</h2>
          {accepted.length === 0 ? (
            <p className="font-serif italic text-ink-soft text-sm">No collegues yet — search for a name above.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {accepted.map((f) => {
                const p = profilesById[otherSide(f)];
                return (
                  <li key={f.id} className="px-3 py-1.5 rounded-full border border-border text-sm text-ink-soft">
                    {p?.display_name || p?.username || "Unknown"}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Activity feed */}
        <section>
          <h2 className="font-serif text-xl text-ink mb-3">Recently in their studios</h2>
          {feed.length === 0 ? (
            <p className="font-serif italic text-ink-soft text-sm">When your collegues practice, you'll see it here.</p>
          ) : (
            <ul className="divide-y divide-border">
              {feed.map((s) => {
                const p = profilesById[s.user_id];
                return (
                  <li key={s.id} className="py-4">
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <p className="font-serif text-base text-ink truncate">{s.title}</p>
                      <span className="text-xs text-muted-foreground tabular shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatMinutes(s.duration_sec)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        <span className="text-ink-soft">{p?.display_name || p?.username || "Someone"}</span>
                        {s.byline && <span className="font-serif italic"> · {s.byline}</span>}
                      </span>
                      <span>{relativeDay(s.started_at)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default Collegues;
