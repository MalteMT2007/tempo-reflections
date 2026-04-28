import { useEffect, useMemo, useState } from "react";
import { Search, Check, X, Plus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listColleagues,
  listIncomingRequests,
  listOutgoingRequests,
  searchColleagues,
  sendRequest,
  acceptRequest,
  declineRequest,
  removeColleague,
  type ColleagueProfile,
  type ColleagueRequest,
} from "@/lib/colleagues";
import { PageHeader } from "@/components/PageHeader";

function initials(name: string | null | undefined, fallback: string) {
  const s = (name || fallback || "?").trim();
  return s.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

// Deterministic soft tint for avatar background fallback (Apple-like).
const TINTS = [
  "hsl(210 70% 92%)", "hsl(280 60% 92%)", "hsl(150 50% 90%)", "hsl(30 80% 90%)",
  "hsl(0 65% 92%)", "hsl(190 70% 90%)", "hsl(50 85% 90%)", "hsl(330 60% 92%)",
];
function tintFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export default function Colleagues() {
  const [colleagues, setColleagues] = useState<ColleagueProfile[]>([]);
  const [incoming, setIncoming] = useState<ColleagueRequest[]>([]);
  const [outgoing, setOutgoing] = useState<{ id: string; addressee_id: string }[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ColleagueProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    try {
      const [c, i, o] = await Promise.all([
        listColleagues(),
        listIncomingRequests(),
        listOutgoingRequests(),
      ]);
      setColleagues(c);
      setIncoming(i);
      setOutgoing(o);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { setResults(await searchColleagues(term)); }
      catch (e: any) { toast.error(e.message); }
      finally { setSearching(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const colleagueIds = useMemo(() => new Set(colleagues.map((c) => c.id)), [colleagues]);
  const outgoingIds = useMemo(() => new Set(outgoing.map((o) => o.addressee_id)), [outgoing]);

  const onSend = async (id: string) => {
    try { await sendRequest(id); toast.success("Request sent"); load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const onAccept = async (id: string) => {
    try { await acceptRequest(id); load(); } catch (e: any) { toast.error(e.message); }
  };
  const onDecline = async (id: string) => {
    try { await declineRequest(id); load(); } catch (e: any) { toast.error(e.message); }
  };
  const onRemove = async (id: string) => {
    try { await removeColleague(id); toast.success("Removed"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-8 sm:pt-10 pb-20">
      <PageHeader title="Colleagues" />

      {/* Search */}
      <div className="relative mt-7 mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find people"
          className="w-full h-12 rounded-full bg-muted pl-12 pr-4 text-[15px] outline-none border border-transparent focus:border-border placeholder:text-muted-foreground"
        />
        {query.trim() && (
          <div className="mt-3 rounded-2xl border border-border bg-background p-2 max-h-[420px] overflow-y-auto animate-fade-in shadow-soft">
            {searching && <div className="px-4 py-3 text-[14px] text-muted-foreground">Searching…</div>}
            {!searching && results.length === 0 && (
              <div className="px-4 py-3 text-[14px] text-muted-foreground">No people found</div>
            )}
            {results.map((p) => {
              const already = colleagueIds.has(p.id);
              const requested = outgoingIds.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback
                      className="text-foreground text-[13px] font-medium"
                      style={{ backgroundColor: tintFor(p.id) }}
                    >
                      {initials(p.display_name, p.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium truncate">{p.display_name || p.username}</div>
                    <div className="text-[13px] text-muted-foreground truncate">@{p.username}</div>
                  </div>
                  {already ? (
                    <span className="text-[12px] text-muted-foreground px-3">Colleague</span>
                  ) : requested ? (
                    <span className="text-[12px] text-muted-foreground px-3">Requested</span>
                  ) : (
                    <button
                      onClick={() => onSend(p.id)}
                      className="h-9 w-9 rounded-full bg-foreground text-background grid place-items-center spring-tap"
                      aria-label="Add"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Requests */}
      {incoming.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-3 px-1">Requests</h2>
          <div className="space-y-2">
            {incoming.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border p-3 flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                  <AvatarFallback
                    className="text-foreground text-[13px] font-medium"
                    style={{ backgroundColor: tintFor(r.id) }}
                  >
                    {initials(r.profile?.display_name ?? null, r.profile?.username ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium truncate">
                    {r.profile?.display_name || r.profile?.username || "Unknown"}
                  </div>
                  <div className="text-[12.5px] text-muted-foreground truncate">@{r.profile?.username}</div>
                </div>
                <button
                  onClick={() => onDecline(r.id)}
                  className="h-9 w-9 rounded-full bg-muted grid place-items-center spring-tap"
                  aria-label="Decline"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onAccept(r.id)}
                  className="h-9 w-9 rounded-full bg-foreground text-background grid place-items-center spring-tap"
                  aria-label="Accept"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Colleagues */}
      <section>
        {colleagues.length === 0 && incoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-[15px] text-muted-foreground">Find people above to add as colleagues.</p>
          </div>
        ) : (
          <>
            <h2 className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-3 px-1">
              {colleagues.length} {colleagues.length === 1 ? "colleague" : "colleagues"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {colleagues.map((p) => (
                <ProfileCard key={p.id} profile={p} onRemove={() => onRemove(p.id)} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// Refined LinkedIn-style profile card
function ProfileCard({
  profile,
  onRemove,
}: {
  profile: ColleagueProfile;
  onRemove: () => void;
}) {
  return (
    <div className="group relative rounded-2xl border border-border p-5 flex flex-col items-center text-center bg-background hover:bg-muted/40 transition-colors">
      {/* Tinted halo behind avatar */}
      <div className="relative mb-3">
        <div
          className="absolute inset-0 rounded-full blur-md opacity-60"
          style={{ background: tintFor(profile.id) }}
          aria-hidden
        />
        <Avatar className="h-16 w-16 relative ring-2 ring-background">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback
            className="text-foreground text-[15px] font-medium"
            style={{ backgroundColor: tintFor(profile.id) }}
          >
            {initials(profile.display_name, profile.username)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="text-[14.5px] font-semibold truncate w-full leading-tight">
        {profile.display_name || profile.username}
      </div>
      <div className="text-[12.5px] text-muted-foreground truncate w-full mt-0.5">
        @{profile.username}
      </div>
      {(profile as any).instrument && (
        <div className="text-[12px] text-muted-foreground truncate w-full mt-1.5">
          {(profile as any).instrument}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="absolute top-2 right-2 h-8 w-8 rounded-full grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
            aria-label="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
            Remove colleague
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
