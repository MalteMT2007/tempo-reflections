import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Users2, Check, X, Inbox as InboxIcon, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  listMyPendingInvites,
  acceptInvite,
  declineEnsembleInvite,
  type ResolvedEnsembleInvite,
} from "@/lib/ensembles";
import {
  listMyInvites,
  respondToInvite,
  type RoomInvite,
} from "@/lib/social";
import {
  listUnreadConversations,
  type UnreadConversation,
} from "@/lib/messages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PagePillFrame, GlassPill, PillSectionHeader } from "@/components/PagePill";

type EnsembleInviteRow = Awaited<ReturnType<typeof listMyPendingInvites>>[number];

export default function Inbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ensembleInvites, setEnsembleInvites] = useState<EnsembleInviteRow[]>([]);
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([]);
  const [unreadDMs, setUnreadDMs] = useState<UnreadConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ens, rooms, dms] = await Promise.all([
        listMyPendingInvites(),
        listMyInvites(),
        listUnreadConversations(),
      ]);
      setEnsembleInvites(ens);
      setRoomInvites(rooms);
      setUnreadDMs(dms);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("inbox-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ensemble_invites" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_invites" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const onAcceptEnsemble = async (inv: EnsembleInviteRow) => {
    try {
      const ensembleId = await acceptInvite(inv.token);
      navigate(`/ensembles/${ensembleId}`);
    } catch (e: any) { toast.error(e.message); }
  };
  const onDeclineEnsemble = async (inv: EnsembleInviteRow) => {
    try { await declineEnsembleInvite(inv.id); load(); } catch (e: any) { toast.error(e.message); }
  };
  const onAcceptRoom = async (inv: RoomInvite) => {
    try {
      const roomId = await respondToInvite(inv.id, true);
      if (roomId) navigate(`/spaces`); else load();
    } catch (e: any) { toast.error(e.message); }
  };
  const onDeclineRoom = async (inv: RoomInvite) => {
    try { await respondToInvite(inv.id, false); load(); } catch (e: any) { toast.error(e.message); }
  };

  const unreadTotal = ensembleInvites.length + roomInvites.length + unreadDMs.length;
  const dmTop = unreadDMs.slice(0, 3);

  return (
    <PagePillFrame>
      <GlassPill>
        <PillSectionHeader icon={InboxIcon} label="Inbox" count={unreadTotal} />
        <h1 className="mt-1.5 text-[28px] font-light tracking-tight leading-tight">
          {loading ? "…" : unreadTotal === 0 ? "All caught up." : "What's new."}
        </h1>
      </GlassPill>

      {!loading && unreadDMs.length > 0 && (
        <GlassPill>
          <PillSectionHeader icon={MessageCircle} label="Messages" count={unreadDMs.length} />
          <ul className="mt-2 divide-y divide-border/40">
            {dmTop.map((c) => {
              const name = c.profile?.display_name || c.profile?.username || "Message";
              return (
                <li key={`dm-${c.other_id}`}>
                  <button
                    onClick={() => navigate(`/messages/${c.other_id}`)}
                    className="w-full flex items-center gap-3 py-2.5 text-left spring-tap"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-muted/60 grid place-items-center relative">
                      {c.profile?.avatar_url ? (
                        <img src={c.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[12px] font-semibold">{name.charAt(0).toUpperCase()}</span>
                      )}
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#FF3B30] ring-2 ring-background" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium truncate leading-tight">{name}</p>
                      <p className="text-[12px] text-muted-foreground truncate">{c.last_message}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </GlassPill>
      )}

      {!loading && (ensembleInvites.length > 0 || roomInvites.length > 0) && (
        <GlassPill>
          <PillSectionHeader icon={Users} label="Invites" count={ensembleInvites.length + roomInvites.length} />
          <ul className="mt-2 divide-y divide-border/40">
            {ensembleInvites.map((inv) => (
              <li key={inv.id} className="py-2.5 flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/60 grid place-items-center">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium truncate leading-tight">{inv.ensemble?.name ?? "Ensemble"}</p>
                  <p className="text-[12px] text-muted-foreground truncate capitalize">{inv.role.replace("_", " ")}</p>
                </div>
                <button onClick={() => onDeclineEnsemble(inv)} className="h-7 w-7 rounded-full bg-foreground/10 hover:bg-foreground/15 grid place-items-center spring-tap" aria-label="Decline">
                  <X className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onAcceptEnsemble(inv)} className="h-7 w-7 rounded-full bg-foreground text-background grid place-items-center spring-tap" aria-label="Accept">
                  <Check className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {roomInvites.map((inv) => (
              <li key={inv.id} className="py-2.5 flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/60 grid place-items-center">
                  <Users2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium truncate leading-tight">{inv.room?.name ?? "Room"}</p>
                </div>
                <button onClick={() => onDeclineRoom(inv)} className="h-7 w-7 rounded-full bg-foreground/10 hover:bg-foreground/15 grid place-items-center spring-tap" aria-label="Decline">
                  <X className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onAcceptRoom(inv)} className="h-7 w-7 rounded-full bg-foreground text-background grid place-items-center spring-tap" aria-label="Accept">
                  <Check className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </GlassPill>
      )}

      {!loading && unreadTotal === 0 && (
        <GlassPill>
          <p className="text-center text-[13.5px] text-muted-foreground py-4">
            No new messages or invites.
          </p>
        </GlassPill>
      )}
    </PagePillFrame>
  );
}
