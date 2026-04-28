import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listMyEnsembles, createEnsemble, ensembleMembers, DbEnsemble } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type MemberRow = { user_id: string; role: string; profiles: { username: string; display_name: string | null; instrument: string | null } | null };

const Ensembles = () => {
  const { user } = useAuth();
  const [ensembles, setEnsembles] = useState<DbEnsemble[]>([]);
  const [members, setMembers] = useState<Record<string, MemberRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => { document.title = "Ensembles — Tempo"; }, []);

  const refresh = async () => {
    if (!user) return;
    const list = await listMyEnsembles(user.id);
    setEnsembles(list);
    const all: Record<string, MemberRow[]> = {};
    await Promise.all(list.map(async (e) => { all[e.id] = (await ensembleMembers(e.id)) as any; }));
    setMembers(all);
  };

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [user]);

  const create = async () => {
    if (!name.trim()) return;
    try {
      await createEnsemble(name.trim(), desc.trim());
      setName(""); setDesc(""); setOpen(false); refresh();
    } catch (e: any) { toast.error(e.message ?? "Could not create"); }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-14">
      <header className="flex items-center justify-between mb-10">
        <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight">Ensembles</h1>
        <button
          onClick={() => setOpen(true)}
          className="h-11 w-11 rounded-full glass-button grid place-items-center"
          aria-label="New ensemble"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin text-foreground/40" /></div>
      ) : ensembles.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center text-foreground/45 text-[15px]">
          No ensembles yet
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ensembles.map((e) => (
            <li key={e.id}>
              <Link
                to={`/ensembles/${e.id}`}
                className="glass rounded-3xl p-6 block spring-tap hover:bg-white/[0.10] transition-colors"
              >
                <div className="text-[20px] font-semibold tracking-tight truncate">{e.name}</div>
                <div className="mt-3 flex items-center gap-1.5 text-[12.5px] text-foreground/45">
                  <Users className="h-3.5 w-3.5" />
                  <span>{members[e.id]?.length ?? 0}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong border-white/15">
          <DialogHeader><DialogTitle className="text-[20px]">New ensemble</DialogTitle></DialogHeader>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="glass-input w-full h-12 px-4 rounded-2xl text-[15px]"
          />
          <textarea
            rows={2} value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            className="glass-input w-full px-4 py-3 rounded-2xl text-[14px] resize-none"
          />
          <button
            onClick={create} disabled={!name.trim()}
            className="h-11 rounded-full pill-primary text-[14px] font-semibold disabled:opacity-40"
          >
            Create
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Ensembles;
