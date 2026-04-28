import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listMyEnsembles, createEnsemble, ensembleMembers, DbEnsemble, EnsembleType } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type MemberRow = { user_id: string; role: string; profiles: { username: string; display_name: string | null; instrument: string | null } | null };

const TYPE_LABEL: Record<EnsembleType, string> = {
  orchestra: "Orchestra",
  band: "Band",
  choir: "Choir",
};

const Ensembles = () => {
  const { user } = useAuth();
  const [ensembles, setEnsembles] = useState<DbEnsemble[]>([]);
  const [members, setMembers] = useState<Record<string, MemberRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<EnsembleType>("orchestra");
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
      await createEnsemble(name.trim(), type, desc.trim());
      setName(""); setDesc(""); setType("orchestra"); setOpen(false); refresh();
    } catch (e: any) { toast.error(e.message ?? "Could not create"); }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-14">
      <header className="flex items-end justify-between mb-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Ensembles</p>
          <h1 className="text-[34px] md:text-[40px] tracking-tight leading-none font-light">Together.</h1>
        </div>
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
                {e.type && (
                  <div className="text-[10px] uppercase tracking-[0.3em] text-foreground/45 mb-2">
                    {TYPE_LABEL[e.type]}
                  </div>
                )}
                <div className="tracking-tight truncate font-normal mx-0 text-lg">{e.name}</div>
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
        <DialogContent className="glass-strong border-white/15 space-y-3">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">New</p>
            <DialogTitle className="text-[28px] font-semibold tracking-tight leading-none">Ensemble</DialogTitle>
          </DialogHeader>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            maxLength={80}
            className="glass-input w-full h-12 px-4 rounded-2xl text-[15px]"
          />
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Type</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_LABEL) as EnsembleType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`h-11 rounded-2xl text-[13px] font-medium transition border ${
                    type === t
                      ? "border-foreground/80 bg-foreground/10"
                      : "border-white/10 text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={3} value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            maxLength={500}
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
