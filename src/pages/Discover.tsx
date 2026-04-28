import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Loader2, UserPlus, UserMinus } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { discoverProfiles, followUser, unfollowUser, listFollowing } from "@/lib/api";
import { toast } from "sonner";

type P = {
  id: string;
  username: string;
  display_name: string | null;
  instrument: string | null;
  bio: string | null;
  avatar_url: string | null;
};

const Discover = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => { document.title = "Discover — Practice"; }, []);

  const refreshFollowing = async () => {
    if (!user) return;
    const ids = await listFollowing(user.id);
    setFollowing(new Set(ids));
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([discoverProfiles("", user.id), listFollowing(user.id)])
      .then(([list, ids]) => {
        setResults(list as P[]);
        setFollowing(new Set(ids));
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(async () => {
      try {
        const list = await discoverProfiles(query, user.id);
        setResults(list as P[]);
      } catch {/* noop */}
    }, 250);
    return () => clearTimeout(t);
  }, [query, user]);

  const toggleFollow = async (id: string) => {
    try {
      if (following.has(id)) {
        await unfollowUser(id);
        setFollowing((s) => { const n = new Set(s); n.delete(id); return n; });
      } else {
        await followUser(id);
        setFollowing((s) => new Set(s).add(id));
      }
    } catch (e: any) {
      toast.error(e.message ?? "Could not update");
      refreshFollowing();
    }
  };

  return (
    <main className="min-h-screen pb-20">

      <div className="max-w-md mx-auto px-6 pt-10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-ink-soft hover:text-ink mb-6">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>

        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Discover</p>
          <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight leading-none">Find musicians.</h1>
          <p className="font-serif italic text-ink-soft mt-1">Follow others and see what they practice.</p>
        </header>

        <div className="flex items-center gap-2 border-b border-border focus-within:border-ink transition mb-6">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username or name…"
            className="flex-1 bg-transparent outline-none py-3 font-serif text-base placeholder:text-muted-foreground/60 placeholder:italic"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>
        ) : results.length === 0 ? (
          <p className="text-center font-serif italic text-ink-soft py-12">No musicians found.</p>
        ) : (
          <ul className="space-y-3">
            {results.map((p) => (
              <li key={p.id} className="rounded-lg border border-border bg-card/40 p-4 flex items-start gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-ink text-paper flex items-center justify-center font-serif text-lg shrink-0">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.username} className="h-full w-full object-cover" />
                    : (p.display_name || p.username).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-base text-ink truncate leading-tight">{p.display_name || p.username}</p>
                  <p className="text-xs text-ink-soft truncate">@{p.username}{p.instrument ? ` · ${p.instrument}` : ""}</p>
                  {p.bio && <p className="text-xs text-ink-soft mt-1.5 font-serif italic line-clamp-2">{p.bio}</p>}
                </div>
                <button
                  onClick={() => toggleFollow(p.id)}
                  className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border transition shrink-0 ${
                    following.has(p.id)
                      ? "border-ink/40 bg-ink text-paper"
                      : "border-border hover:border-ink/40"
                  }`}
                >
                  {following.has(p.id)
                    ? <><UserMinus className="h-3 w-3" /> Following</>
                    : <><UserPlus className="h-3 w-3" /> Follow</>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default Discover;
