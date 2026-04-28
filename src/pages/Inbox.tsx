import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Hash, Check, X, Inbox as InboxIcon } from "lucide-react";
import { toast } from "sonner";
import { listMyPendingInvites, acceptInvite, declineEnsembleInvite } from "@/lib/ensembles";
import { listMyInvites, respondToInvite, type RoomInvite } from "@/lib/social";

type EnsembleInviteRow = Awaited<ReturnType<typeof listMyPendingInvites>>[number];

export default function Inbox() {
  const navigate = useNavigate();
  const [ensembleInvites, setEnsembleInvites] = useState<EnsembleInviteRow[]>([]);
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ens, rooms] = await Promise.all([listMyPendingInvites(), listMyInvites()]);
      setEnsembleInvites(ens);
      setRoomInvites(rooms);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onAcceptEnsemble = async (inv: EnsembleInviteRow) => {
    try {
      const ensembleId = await acceptInvite(inv.token);
      toast.success("Joined ensemble");
      navigate(`/ensembles/${ensembleId}`);
    } catch (e: any) { toast.error(e.message); }
  };
  const onDeclineEnsemble = async (inv: EnsembleInviteRow) => {
    try { await declineEnsembleInvite(inv.id); toast.success("Declined"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const onAcceptRoom = async (inv: RoomInvite) => {
    try {
      const roomId = await respondToInvite(inv.id, true);
      toast.success("Joined room");
      if (roomId) navigate(`/spaces?room=${roomId}`); else load();
    } catch (e: any) { toast.error(e.message); }
  };
  const onDeclineRoom = async (inv: RoomInvite) => {
    try { await respondToInvite(inv.id, false); toast.success("Declined"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const total = ensembleInvites.length + roomInvites.length;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total === 0 ? "No pending invitations" : `${total} pending invitation${total === 1 ? "" : "s"}`}
        </p>
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : total === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <InboxIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">You're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ensembleInvites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {inv.ensemble?.name ?? "Ensemble invite"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Role: {inv.role.replace("_", " ")}
                </div>
              </div>
              <button
                onClick={() => onDeclineEnsemble(inv)}
                className="h-9 w-9 rounded-full border grid place-items-center hover:bg-muted"
                aria-label="Decline"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={() => onAcceptEnsemble(inv)}
                className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Accept
              </button>
            </div>
          ))}

          {roomInvites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {inv.room?.name ?? "Room invite"}
                </div>
                {inv.room?.description && (
                  <div className="text-xs text-muted-foreground truncate">{inv.room.description}</div>
                )}
              </div>
              <button
                onClick={() => onDeclineRoom(inv)}
                className="h-9 w-9 rounded-full border grid place-items-center hover:bg-muted"
                aria-label="Decline"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={() => onAcceptRoom(inv)}
                className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Accept
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
