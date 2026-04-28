import { useEffect, useRef, useState } from "react";
import {
  Plus, Search, Hash, Lock, Users, Loader2, ArrowLeft, MoreHorizontal, Send,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Room, RoomMessage, ProfileLite,
  listMyRooms, searchPublicRooms, createRoom, joinPublicRoom, leaveRoom,
  listMessages, sendMessage, inviteUserToRoom, searchProfiles,
} from "@/lib/social";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Segmented } from "@/components/ui/segmented";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); return `${d}d`;
}
const initial = (s?: string | null) => (s?.[0] || "?").toUpperCase();

function CreateRoomDialog({ open, onClose, onCreated }: any) {
  const [name, setName] = useState(""); const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const id = await createRoom({ name: name.trim(), is_public: isPublic });
      setName(""); setIsPublic(true); onCreated(id); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-white/15">
        <DialogHeader><DialogTitle className="text-[20px]">New room</DialogTitle></DialogHeader>
        <input
          autoFocus value={name} onChange={(e) => setName(e.target.value)}
          maxLength={80} placeholder="Room name"
          className="glass-input w-full h-12 px-4 rounded-2xl text-[15px]"
        />
        <Segmented
          value={isPublic ? "public" : "private"}
          onChange={(v) => setIsPublic(v === "public")}
          segments={[{ value: "public", label: "Public" }, { value: "private", label: "Private" }]}
          className="self-center"
        />
        <button
          onClick={submit} disabled={busy || !name.trim()}
          className="h-11 rounded-full pill-primary text-[14px] font-semibold disabled:opacity-40"
        >
          Create
        </button>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ open, onClose, roomId, excludeIds }: any) {
  const [q, setQ] = useState(""); const [results, setResults] = useState<ProfileLite[]>([]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try { setResults(await searchProfiles(q, excludeIds)); } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, excludeIds]);
  const invite = async (uid: string) => {
    try { await inviteUserToRoom(roomId, uid); toast.success("Invite sent");
      setResults((rs) => rs.filter((p) => p.id !== uid));
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-white/15">
        <DialogHeader><DialogTitle className="text-[20px]">Invite</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Find people"
            className="glass-input w-full h-11 pl-11 pr-4 rounded-full text-[14px]"
          />
        </div>
        <div className="max-h-72 overflow-y-auto -mx-2">
          {results.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-2 py-2 hover:bg-white/[0.06] rounded-xl">
              <Avatar className="h-10 w-10">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="bg-white/10 text-[12px]">{initial(p.display_name || p.username)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">{p.display_name || p.username}</div>
                <div className="text-[12px] text-foreground/45 truncate">@{p.username}</div>
              </div>
              <button onClick={() => invite(p.id)} className="h-8 w-8 rounded-full glass-button grid place-items-center">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ))}
          {q && !results.length && <p className="text-center text-[13px] text-foreground/45 py-6">No matches</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoomView({ room, onBack, onChanged }: { room: Room; onBack: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState(""); const [sending, setSending] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [m, members] = await Promise.all([
        listMessages(room.id),
        supabase.from("room_members").select("user_id").eq("room_id", room.id),
      ]);
      setMessages(m);
      setMemberIds(((members.data ?? []) as any[]).map((r) => r.user_id));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`room-${room.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${room.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [room.id]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length]);

  const onSend = async () => {
    const t = text.trim(); if (!t) return;
    setSending(true);
    try { await sendMessage(room.id, t); setText(""); }
    catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  const onLeave = async () => {
    if (!confirm(`Leave "${room.name}"?`)) return;
    try { await leaveRoom(room.id); onBack(); onChanged(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="h-16 px-4 flex items-center gap-3 glass border-b-0">
        <button onClick={onBack} className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/[0.06] spring-tap md:hidden">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-10 w-10 rounded-2xl glass grid place-items-center">
          {room.is_public ? <Hash className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">{room.name}</div>
          <div className="text-[12px] text-foreground/45">{room.member_count} {room.member_count === 1 ? "member" : "members"}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/[0.06]">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="glass-strong border-white/15">
            {room.is_admin && <DropdownMenuItem onClick={() => setInviteOpen(true)}>Invite people</DropdownMenuItem>}
            <DropdownMenuItem onClick={onLeave} className="text-destructive focus:text-destructive">Leave room</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-3">
        {loading ? (
          <div className="grid place-items-center py-12 text-foreground/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-[14px] text-foreground/40 py-12">Say hello.</p>
        ) : (
          messages.map((m) => {
            const mine = m.author_id === user?.id;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-8 w-8 mt-0.5">
                  <AvatarImage src={m.author?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-white/10 text-[10px]">{initial(m.author?.display_name || m.author?.username)}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`px-4 py-2.5 rounded-3xl text-[14.5px] whitespace-pre-wrap break-words ${
                    mine ? "bg-white text-[hsl(250_30%_6%)]" : "glass"
                  }`}>
                    {m.content}
                  </div>
                  <div className="text-[11px] text-foreground/35 px-2 mt-1">{timeAgo(m.created_at)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Message"
          maxLength={2000}
          className="flex-1 h-12 px-5 rounded-full glass-input text-[15px]"
        />
        <button
          onClick={onSend} disabled={sending || !text.trim()}
          className="h-12 w-12 rounded-full pill-primary grid place-items-center disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} roomId={room.id} excludeIds={memberIds} />
    </div>
  );
}

export default function RoomsPanel() {
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [discover, setDiscover] = useState<Room[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"mine" | "discover">("mine");

  const load = async () => {
    setLoading(true);
    try {
      const [mine, disc] = await Promise.all([listMyRooms(), searchPublicRooms(search)]);
      setMyRooms(mine); setDiscover(disc);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (view !== "discover") return;
    const t = setTimeout(async () => {
      try { setDiscover(await searchPublicRooms(search)); } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [search, view]);

  const onJoin = async (room: Room) => {
    try { await joinPublicRoom(room.id); await load(); setActiveId(room.id); setView("mine"); }
    catch (e: any) { toast.error(e.message); }
  };

  const list = view === "mine" ? myRooms : discover;
  const activeRoom =
    myRooms.find((r) => r.id === activeId) || discover.find((r) => r.id === activeId) || null;

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 pb-12 grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4 md:gap-6">
      {/* List */}
      <aside className={`glass rounded-3xl flex flex-col min-h-0 ${activeRoom && "hidden md:flex"}`}>
        <div className="p-4 flex items-center gap-2">
          <Segmented
            value={view}
            onChange={(v) => setView(v as any)}
            segments={[{ value: "mine", label: "Mine" }, { value: "discover", label: "Discover" }]}
          />
          <button onClick={() => setCreateOpen(true)} className="ml-auto h-9 w-9 rounded-full glass-button grid place-items-center" aria-label="New room">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {view === "discover" && (
          <div className="px-4 pb-3 relative">
            <Search className="h-4 w-4 absolute left-7 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Find rooms"
              className="w-full h-10 pl-10 pr-4 rounded-full glass-input text-[14px]"
            />
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="p-6 grid place-items-center text-foreground/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : list.length === 0 ? (
            <p className="p-6 text-center text-[13px] text-foreground/45">
              {view === "mine" ? "No rooms yet." : "No public rooms."}
            </p>
          ) : (
            list.map((r) => {
              const active = activeId === r.id;
              const isMember = r.is_member ?? view === "mine";
              return (
                <button
                  key={r.id}
                  onClick={() => isMember ? setActiveId(r.id) : onJoin(r)}
                  className={`w-full text-left px-3 py-2.5 my-0.5 rounded-2xl flex items-center gap-3 spring-tap transition-colors ${
                    active ? "bg-white/[0.10]" : "hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="h-10 w-10 rounded-2xl glass grid place-items-center">
                    {r.is_public ? <Hash className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-medium truncate">{r.name}</div>
                  </div>
                  <span className="text-[11px] text-foreground/45 px-2 py-0.5 rounded-full bg-white/[0.06]">
                    {r.member_count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Detail */}
      <section className="glass rounded-3xl min-h-[70vh] overflow-hidden">
        {activeRoom && activeRoom.is_member ? (
          <RoomView room={activeRoom} onBack={() => setActiveId(null)} onChanged={load} />
        ) : (
          <div className="h-full grid place-items-center text-center text-foreground/45 p-10">
            <div>
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-[15px]">Pick a room</p>
            </div>
          </div>
        )}
      </section>

      <CreateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id: string) => { load(); setActiveId(id); setView("mine"); }}
      />
    </div>
  );
}
