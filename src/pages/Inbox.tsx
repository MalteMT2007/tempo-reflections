import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Users2, Check, X, Inbox as InboxIcon, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  listMyPendingInvites,
  acceptInvite,
  declineEnsembleInvite,
  listMyResolvedInvites,
  type ResolvedEnsembleInvite,
} from "@/lib/ensembles";
import {
  listMyInvites,
  respondToInvite,
  listMyResolvedRoomInvites,
  type RoomInvite,
  type ResolvedRoomInvite,
} from "@/lib/social";
import {
  listUnreadConversations,
  listRecentReadConversations,
  type UnreadConversation,
  type ReadConversation,
} from "@/lib/messages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type EnsembleInviteRow = Awaited<ReturnType<typeof listMyPendingInvites>>[number];

export default function Inbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ensembleInvites, setEnsembleInvites] = useState<EnsembleInviteRow[]>([]);
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([]);
  const [unreadDMs, setUnreadDMs] = useState<UnreadConversation[]>([]);
  const [readDMs, setReadDMs] = useState<ReadConversation[]>([]);
  const [resolvedEnsembles, setResolvedEnsembles] = useState<ResolvedEnsembleInvite[]>([]);
  const [resolvedRooms, setResolvedRooms] = useState<ResolvedRoomInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ens, rooms, dms, readDms, resEns, resRooms] = await Promise.all([
        listMyPendingInvites(),
        listMyInvites(),
        listUnreadConversations(),
        listRecentReadConversations(30),
        listMyResolvedInvites(30),
        listMyResolvedRoomInvites(30),
      ]);
      setEnsembleInvites(ens);
      setRoomInvites(rooms);
      setUnreadDMs(dms);
      setReadDMs(readDms);
      setResolvedEnsembles(resEns);
      setResolvedRooms(resRooms);
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
  const readTotal = readDMs.length + resolvedEnsembles.length + resolvedRooms.length;

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-14">
      <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight mb-8">Inbox</h1>

      {loading ? (
        <div className="text-sm text-foreground/40">Loading…</div>
      ) : unreadTotal === 0 && readTotal === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <InboxIcon className="h-10 w-10 mx-auto text-foreground/30 mb-3" />
          <p className="text-[14px] text-foreground/45">All caught up.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {unreadTotal > 0 && (
            <div className="space-y-3">
              {unreadDMs.map((c) => {
                const name = c.profile?.display_name || c.profile?.username || "Message";
                const initial = name.charAt(0).toUpperCase();
                return (
                  <button
                    key={`dm-${c.other_id}`}
                    onClick={() => navigate(`/messages/${c.other_id}`)}
                    className="w-full glass rounded-3xl p-4 flex items-center gap-3 text-left spring-tap"
                  >
                    <div className="h-12 w-12 rounded-full overflow-hidden glass grid place-items-center shrink-0 relative">
                      {c.profile?.avatar_url ? (
                        <img src={c.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[15px] font-semibold">{initial}</span>
                      )}
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#FF3B30] ring-2 ring-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
                        <span className="text-[15px] font-medium truncate">{name}</span>
                      </div>
                      <div className="text-[12.5px] text-foreground/55 truncate">{c.last_message}</div>
                    </div>
                    <div className="text-[11px] text-foreground/40 shrink-0">
                      {c.unread_count > 1 ? `${c.unread_count} new` : "new"}
                    </div>
                  </button>
                );
              })}

              {ensembleInvites.map((inv) => (
                <div key={inv.id} className="glass rounded-3xl p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl glass grid place-items-center shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium truncate">{inv.ensemble?.name ?? "Ensemble"}</div>
                    <div className="text-[12.5px] text-foreground/45 capitalize">{inv.role.replace("_", " ")}</div>
                  </div>
                  <button onClick={() => onDeclineEnsemble(inv)} className="h-9 w-9 rounded-full glass-button grid place-items-center" aria-label="Decline">
                    <X className="h-4 w-4" />
                  </button>
                  <button onClick={() => onAcceptEnsemble(inv)} className="h-9 w-9 rounded-full pill-primary grid place-items-center" aria-label="Accept">
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {roomInvites.map((inv) => (
                <div key={inv.id} className="glass rounded-3xl p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl glass grid place-items-center shrink-0">
                    <Users2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium truncate">{inv.room?.name ?? "Room"}</div>
                  </div>
                  <button onClick={() => onDeclineRoom(inv)} className="h-9 w-9 rounded-full glass-button grid place-items-center" aria-label="Decline">
                    <X className="h-4 w-4" />
                  </button>
                  <button onClick={() => onAcceptRoom(inv)} className="h-9 w-9 rounded-full pill-primary grid place-items-center" aria-label="Accept">
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {readTotal > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3 px-1">
                <span className="text-[11px] uppercase tracking-[0.18em] text-foreground/40">Recent · last 30 days</span>
                <span className="flex-1 h-px bg-border/60" />
              </div>
              <div className="space-y-3 opacity-80">
                {readDMs.map((c) => {
                  const name = c.profile?.display_name || c.profile?.username || "Message";
                  const initial = name.charAt(0).toUpperCase();
                  return (
                    <button
                      key={`read-dm-${c.other_id}`}
                      onClick={() => navigate(`/messages/${c.other_id}`)}
                      className="w-full glass rounded-3xl p-4 flex items-center gap-3 text-left spring-tap"
                    >
                      <div className="h-12 w-12 rounded-full overflow-hidden glass grid place-items-center shrink-0">
                        {c.profile?.avatar_url ? (
                          <img src={c.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[15px] font-semibold text-foreground/70">{initial}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-3.5 w-3.5 text-foreground/30 shrink-0" />
                          <span className="text-[14px] font-medium text-foreground/75 truncate">{name}</span>
                        </div>
                        <div className="text-[12.5px] text-foreground/45 truncate">
                          {c.last_from_me ? "You: " : ""}{c.last_message}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {resolvedEnsembles.map((inv) => (
                  <div key={`res-ens-${inv.id}`} className="glass rounded-3xl p-4 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl glass grid place-items-center shrink-0">
                      <Users className="h-5 w-5 text-foreground/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-foreground/75 truncate">{inv.ensemble?.name ?? "Ensemble"}</div>
                      <div className="text-[12.5px] text-foreground/45 capitalize">{inv.role.replace("_", " ")}</div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full ${inv.status === "accepted" ? "bg-foreground/10 text-foreground/70" : "bg-foreground/5 text-foreground/45"}`}>
                      {inv.status === "accepted" ? "Accepted" : "Declined"}
                    </span>
                  </div>
                ))}

                {resolvedRooms.map((inv) => (
                  <div key={`res-room-${inv.id}`} className="glass rounded-3xl p-4 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl glass grid place-items-center shrink-0 overflow-hidden">
                      {inv.room?.avatar_url ? (
                        <img src={inv.room.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Users2 className="h-5 w-5 text-foreground/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-foreground/75 truncate">{inv.room?.name ?? "Room"}</div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full ${inv.status === "accepted" ? "bg-foreground/10 text-foreground/70" : "bg-foreground/5 text-foreground/45"}`}>
                      {inv.status === "accepted" ? "Accepted" : "Declined"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
