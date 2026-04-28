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
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

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

  const total = ensembleInvites.length + roomInvites.length;

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-14">
      <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight mb-8">Inbox</h1>

      {loading ? (
        <div className="text-sm text-foreground/40">Loading…</div>
      ) : total === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <InboxIcon className="h-10 w-10 mx-auto text-foreground/30 mb-3" />
          <p className="text-[14px] text-foreground/45">All caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
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
                <Hash className="h-5 w-5" />
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
    </div>
  );
}
