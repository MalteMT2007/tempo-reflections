import { useEffect, useState } from "react";
import { Search, Loader2, UserPlus, UserMinus, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { discoverProfiles, followUser, unfollowUser, listFollowing } from "@/lib/api";
import { toast } from "sonner";
import { PagePillFrame, GlassPill, PillSectionHeader } from "@/components/PagePill";

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
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { document.title = "Discover — Tempo"; }, []);

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
    }
  };

  const visible = showAll ? results : results.slice(0, 5);

  return (
    <PagePillFrame>
      <GlassPill>
        <PillSectionHeader icon={Users} label="Discover" />
        <h1 className="mt-1.5 text-[28px] font-light tracking-tight leading-tight">Find musicians.</h1>
        <p className="text-[13.5px] text-muted-foreground mt-1">
          Follow others and see what they practice.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-full bg-muted/60 px-3.5 h-10">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username or name…"
            className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-muted-foreground/60"
          />
        </div>
      </GlassPill>

      <GlassPill>
        <PillSectionHeader icon={Users} label="Musicians" count={results.length} />
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : results.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground text-center py-3">No musicians found.</p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-border/40">
              {visible.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-muted/60 grid place-items-center">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[12px] font-semibold">{(p.display_name || p.username).charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium truncate leading-tight">{p.display_name || p.username}</p>
                    <p className="text-[12px] text-muted-foreground truncate">@{p.username}{p.instrument ? ` · ${p.instrument}` : ""}</p>
                  </div>
                  <button
                    onClick={() => toggleFollow(p.id)}
                    className={`text-[11.5px] inline-flex items-center gap-1 px-2.5 h-7 rounded-full spring-tap transition-colors ${
                      following.has(p.id)
                        ? "bg-foreground text-background"
                        : "bg-foreground/10 hover:bg-foreground/15 text-foreground"
                    }`}
                  >
                    {following.has(p.id)
                      ? <><UserMinus className="h-3 w-3" /> Following</>
                      : <><UserPlus className="h-3 w-3" /> Follow</>}
                  </button>
                </li>
              ))}
            </ul>
            {results.length > 5 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground/10 hover:bg-foreground/15 text-foreground py-2 text-[12.5px] font-medium spring-tap transition-colors"
              >
                {showAll ? "Show less" : `Show all ${results.length}`}
              </button>
            )}
          </>
        )}
      </GlassPill>
    </PagePillFrame>
  );
};

export default Discover;
