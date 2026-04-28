import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Hash,
  Lock,
  Users,
  Loader2,
  LogOut,
  UserPlus,
  Send,
  Mail,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Room,
  RoomMessage,
  RoomInvite,
  ProfileLite,
  listMyRooms,
  searchPublicRooms,
  createRoom,
  joinPublicRoom,
  leaveRoom,
  listMessages,
  sendMessage,
  listMyInvites,
  inviteUserToRoom,
  respondToInvite,
  searchProfiles,
} from "@/lib/social";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function Avatar({ url, name, size = 32 }: { url?: string | null; name?: string | null; size?: number }) {
  const initial = (name?.[0] || "?").toUpperCase();
  return (
    <div
      className="rounded-full bg-secondary text-foreground grid place-items-center font-medium overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {url ? <img src={url} alt={name || ""} className="w-full h-full object-cover" /> : initial}
    </div>
  );
}

function CreateRoomDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const id = await createRoom({
        name: name.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
      });
      toast.success("Room created");
      setName(""); setDescription(""); setIsPublic(true);
      onCreated(id);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a room</DialogTitle>
          <DialogDescription>Group conversations for your bandmates, sections, or fans.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[13px] font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Brass section"
              className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What is this room about?"
              className="w-full px-3 py-2 rounded-lg border bg-background text-[14px] mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPublic(true)}
              className={`flex-1 h-10 px-3 rounded-lg border text-[14px] font-medium flex items-center justify-center gap-2 ${
                isPublic ? "bg-primary text-primary-foreground border-primary" : "bg-background"
              }`}
            >
              <Hash className="h-4 w-4" /> Public
            </button>
            <button
              onClick={() => setIsPublic(false)}
              className={`flex-1 h-10 px-3 rounded-lg border text-[14px] font-medium flex items-center justify-center gap-2 ${
                !isPublic ? "bg-primary text-primary-foreground border-primary" : "bg-background"
              }`}
            >
              <Lock className="h-4 w-4" /> Private
            </button>
          </div>
          <p className="text-[12px] text-muted-foreground">
            {isPublic ? "Anyone can find and join this room." : "Only people you invite can join."}
          </p>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="h-10 px-4 rounded-lg border text-[14px] font-medium">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={busy || !name.trim()}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-[14px] font-semibold disabled:opacity-50"
          >
            Create
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({
  open,
  onClose,
  roomId,
  excludeIds,
}: {
  open: boolean;
  onClose: () => void;
  roomId: string;
  excludeIds: string[];
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const r = await searchProfiles(q, excludeIds);
        setResults(r);
      } catch {/* ignore */}
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, excludeIds]);

  const invite = async (uid: string) => {
    setBusy(true);
    try {
      await inviteUserToRoom(roomId, uid);
      toast.success("Invite sent");
      setResults((rs) => rs.filter((p) => p.id !== uid));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const link = `${window.location.origin}/spaces`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to room</DialogTitle>
          <DialogDescription>Search by username or display name.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border bg-background text-[14px]"
            />
          </div>
          <div className="max-h-72 overflow-y-auto -mx-2">
            {results.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-2 py-2 hover:bg-accent rounded-lg">
                <Avatar url={p.avatar_url} name={p.display_name || p.username} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium truncate">{p.display_name || p.username}</div>
                  <div className="text-[12px] text-muted-foreground truncate">@{p.username}</div>
                </div>
                <button
                  disabled={busy}
                  onClick={() => invite(p.id)}
                  className="h-8 px-3 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
            ))}
            {q && !results.length && (
              <p className="text-center text-[13px] text-muted-foreground py-6">No matches</p>
            )}
          </div>
          <div className="border-t pt-3">
            <p className="text-[12px] text-muted-foreground mb-2">Or share a link</p>
            <div className="flex gap-2">
              <input readOnly value={link} className="flex-1 h-9 px-3 rounded-lg border bg-secondary text-[13px]" />
              <button
                onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}
                className="h-9 px-3 rounded-lg border text-[13px] font-medium"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoomView({
  room,
  onLeft,
  onChanged,
}: {
  room: Room;
  onLeft: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [m, members] = await Promise.all([
        listMessages(room.id),
        supabase.from("room_members").select("user_id").eq("room_id", room.id),
      ]);
      setMessages(m);
      setMemberIds(((members.data ?? []) as any[]).map((r) => r.user_id));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // realtime new messages
    const ch = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${room.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages.length]);

  const onSend = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await sendMessage(room.id, t);
      setText("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const onLeave = async () => {
    if (!confirm(`Leave "${room.name}"?`)) return;
    try {
      await leaveRoom(room.id);
      toast.success("Left room");
      onLeft();
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <header className="h-14 px-5 border-b flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-secondary grid place-items-center">
          {room.is_public ? <Hash className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">{room.name}</div>
          <div className="text-[12px] text-muted-foreground truncate">
            {room.member_count} member{room.member_count === 1 ? "" : "s"}
            {room.description ? ` · ${room.description}` : ""}
          </div>
        </div>
        {room.is_admin && (
          <button
            onClick={() => setInviteOpen(true)}
            className="h-9 px-3 rounded-full border text-[13px] font-medium flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" /> Invite
          </button>
        )}
        <button
          onClick={onLeave}
          className="h-9 px-3 rounded-full border text-[13px] font-medium flex items-center gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Leave
        </button>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading ? (
          <div className="grid place-items-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-[14px] text-muted-foreground py-12">
            No messages yet. Say hello.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.author_id === user?.id;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar url={m.author?.avatar_url} name={m.author?.display_name || m.author?.username} size={32} />
                <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="text-[11px] text-muted-foreground px-2">
                    {m.author?.display_name || m.author?.username} · {timeAgo(m.created_at)}
                  </div>
                  <div
                    className={`mt-0.5 px-3 py-2 rounded-2xl text-[14px] whitespace-pre-wrap break-words ${
                      mine ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder={`Message #${room.name}`}
          maxLength={2000}
          className="flex-1 h-11 px-4 rounded-full border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={onSend}
          disabled={sending || !text.trim()}
          className="h-11 px-4 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold disabled:opacity-50 flex items-center gap-1.5"
        >
          <Send className="h-4 w-4" /> Send
        </button>
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        roomId={room.id}
        excludeIds={memberIds}
      />
    </div>
  );
}

export default function RoomsPanel() {
  const { user } = useAuth();
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [discover, setDiscover] = useState<Room[]>([]);
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"mine" | "discover">("mine");

  const load = async () => {
    setLoading(true);
    try {
      const [mine, disc, invs] = await Promise.all([
        listMyRooms(),
        searchPublicRooms(search),
        listMyInvites(),
      ]);
      setMyRooms(mine);
      setDiscover(disc);
      setInvites(invs);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-search with debounce when in discover view
  useEffect(() => {
    if (view !== "discover") return;
    const t = setTimeout(async () => {
      try {
        const disc = await searchPublicRooms(search);
        setDiscover(disc);
      } catch {/* ignore */}
    }, 200);
    return () => clearTimeout(t);
  }, [search, view]);

  const onJoin = async (room: Room) => {
    try {
      await joinPublicRoom(room.id);
      toast.success(`Joined ${room.name}`);
      await load();
      setActiveId(room.id);
      setView("mine");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onAcceptInvite = async (inv: RoomInvite) => {
    try {
      const roomId = await respondToInvite(inv.id, true);
      toast.success("Invite accepted");
      await load();
      if (roomId) setActiveId(roomId);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onDeclineInvite = async (inv: RoomInvite) => {
    try {
      await respondToInvite(inv.id, false);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const activeRoom =
    myRooms.find((r) => r.id === activeId) || discover.find((r) => r.id === activeId) || null;

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[340px_1fr]">
      {/* Left: rooms list */}
      <aside className="border-r flex flex-col min-h-0 bg-background">
        <div className="p-4 space-y-3 border-b">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-lg bg-secondary p-1 gap-1">
              <button
                onClick={() => setView("mine")}
                className={`px-3 py-1 rounded-md text-[13px] font-medium ${
                  view === "mine" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                My rooms
              </button>
              <button
                onClick={() => setView("discover")}
                className={`px-3 py-1 rounded-md text-[13px] font-medium ${
                  view === "discover" ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                Discover
              </button>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="h-9 w-9 grid place-items-center rounded-full bg-primary text-primary-foreground"
              aria-label="Create room"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {view === "discover" && (
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search public rooms…"
                className="w-full h-10 pl-9 pr-3 rounded-lg border bg-background text-[14px]"
              />
            </div>
          )}
        </div>

        {/* Invites */}
        {invites.length > 0 && view === "mine" && (
          <div className="px-3 py-2 border-b">
            <div className="px-1 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
              <Mail className="h-3 w-3 inline mr-1" /> Invitations
            </div>
            {invites.map((inv) => (
              <div key={inv.id} className="mt-2 p-3 rounded-lg border bg-card">
                <div className="text-[13px] font-medium truncate">{inv.room?.name}</div>
                {inv.room?.description && (
                  <div className="text-[11px] text-muted-foreground truncate">{inv.room.description}</div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onAcceptInvite(inv)}
                    className="h-8 px-3 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold flex items-center gap-1"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    onClick={() => onDeclineInvite(inv)}
                    className="h-8 px-3 rounded-full border text-[12px] font-medium flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 grid place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : view === "mine" ? (
            myRooms.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-muted-foreground">
                You haven't joined any rooms yet. Tap Discover to find one or + to create.
              </p>
            ) : (
              myRooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  className={`w-full text-left px-4 py-3 border-b flex items-center gap-3 hover:bg-accent transition-colors ${
                    activeId === r.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="h-9 w-9 rounded-xl bg-secondary grid place-items-center">
                    {r.is_public ? <Hash className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate">{r.name}</div>
                    <div className="text-[12px] text-muted-foreground truncate">
                      {r.member_count} members
                    </div>
                  </div>
                </button>
              ))
            )
          ) : discover.length === 0 ? (
            <p className="p-6 text-center text-[13px] text-muted-foreground">
              No public rooms found.
            </p>
          ) : (
            discover.map((r) => (
              <div key={r.id} className="px-4 py-3 border-b flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-secondary grid place-items-center">
                  <Hash className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate">{r.name}</div>
                  <div className="text-[12px] text-muted-foreground truncate">
                    {r.description || `${r.member_count} members`}
                  </div>
                </div>
                {r.is_member ? (
                  <button
                    onClick={() => { setActiveId(r.id); setView("mine"); }}
                    className="h-8 px-3 rounded-full border text-[12px] font-medium"
                  >
                    Open
                  </button>
                ) : (
                  <button
                    onClick={() => onJoin(r)}
                    className="h-8 px-3 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold"
                  >
                    Join
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Right: active room */}
      <section className="min-h-0">
        {activeRoom && activeRoom.is_member ? (
          <RoomView
            room={activeRoom}
            onLeft={() => setActiveId(null)}
            onChanged={load}
          />
        ) : (
          <div className="h-full grid place-items-center text-center text-muted-foreground p-10">
            <div>
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-[15px]">Select a room to start chatting</p>
              <p className="text-[13px] mt-1">Or create a new one with the + button.</p>
            </div>
          </div>
        )}
      </section>

      <CreateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => { load(); setActiveId(id); setView("mine"); }}
      />
    </div>
  );
}
