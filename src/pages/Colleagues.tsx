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

function initials(name: string | null | undefined, fallback: string) {
  const s = (name || fallback || "?").trim();
  return s.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
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
    try { await acceptRequest(id); load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const onDecline = async (id: string) => {
    try { await declineRequest(id); load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const onRemove = async (id: string) => {
    try { await removeColleague(id); toast.success("Removed"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-14">
      <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight mb-8">Colleagues</h1>

      {/* Search */}
      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-foreground/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find people"
          className="glass-input w-full h-12 rounded-full pl-12 pr-4 text-[15px]"
        />
        {query.trim() && (
          <div className="glass mt-3 rounded-3xl p-2 max-h-[420px] overflow-y-auto animate-fade-in">
            {searching && <div className="px-4 py-3 text-sm text-foreground/50">Searching…</div>}
            {!searching && results.length === 0 && (
              <div className="px-4 py-3 text-sm text-foreground/50">No people found</div>
            )}
            {results.map((p) => {
              const already = colleagueIds.has(p.id);
              const requested = outgoingIds.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/[0.06]">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-white/10 text-foreground text-sm">
                      {initials(p.display_name, p.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium truncate">{p.display_name || p.username}</div>
                    <div className="text-[13px] text-foreground/50 truncate">@{p.username}</div>
                  </div>
                  {already ? (
                    <span className="text-[12px] text-foreground/40 px-3">Colleague</span>
                  ) : requested ? (
                    <span className="text-[12px] text-foreground/40 px-3">Requested</span>
                  ) : (
                    <button
                      onClick={() => onSend(p.id)}
                      className="h-9 w-9 rounded-full glass-button grid place-items-center"
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
          <h2 className="text-[13px] uppercase tracking-wider text-foreground/40 mb-3 px-1">Requests</h2>
          <div className="space-y-2">
            {incoming.map((r) => (
              <div key={r.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-white/10 text-foreground">
                    {initials(r.profile?.display_name ?? null, r.profile?.username ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium truncate">
                    {r.profile?.display_name || r.profile?.username || "Unknown"}
                  </div>
                  <div className="text-[12.5px] text-foreground/50 truncate">@{r.profile?.username}</div>
                </div>
                <button
                  onClick={() => onDecline(r.id)}
                  className="h-9 w-9 rounded-full glass-button grid place-items-center"
                  aria-label="Decline"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onAccept(r.id)}
                  className="h-9 w-9 rounded-full pill-primary grid place-items-center"
                  aria-label="Accept"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Colleagues grid */}
      <section>
        {colleagues.length === 0 && incoming.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="text-[15px] text-foreground/50">Find people above to add as colleagues.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {colleagues.map((p) => (
              <div key={p.id} className="glass rounded-3xl p-5 flex flex-col items-center text-center group relative">
                <Avatar className="h-16 w-16 mb-3">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-white/10 text-foreground text-base">
                    {initials(p.display_name, p.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-[14.5px] font-medium truncate w-full">{p.display_name || p.username}</div>
                <div className="text-[12.5px] text-foreground/45 truncate w-full">@{p.username}</div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="absolute top-2 right-2 h-8 w-8 rounded-full grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] transition-opacity"
                      aria-label="More"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass-strong border-white/15">
                    <DropdownMenuItem onClick={() => onRemove(p.id)} className="text-destructive focus:text-destructive">
                      Remove colleague
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
