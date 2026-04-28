import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Loader2, Users, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listMyEnsembles, createEnsemble, ensembleMembers, DbEnsemble, EnsembleType } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PagePillFrame, GlassPill, PillSectionHeader, BrowseCta } from "@/components/PagePill";

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
  const [showAll, setShowAll] = useState(false);
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

  const visible = showAll ? ensembles : ensembles.slice(0, 5);

  return (
    <PagePillFrame>
      <GlassPill>
        <PillSectionHeader icon={Users} label="Ensembles" count={ensembles.length} />
        <h1 className="mt-1.5 text-[28px] font-light tracking-tight leading-tight">Together.</h1>
        <p className="text-[13.5px] text-muted-foreground mt-1">
          Rehearse, share scores and stay in sync with your groups.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground/10 hover:bg-foreground/15 text-foreground py-2 text-[12.5px] font-medium spring-tap transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New ensemble
        </button>
      </GlassPill>

      {loading ? (
        <GlassPill>
          <div className="grid place-items-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </GlassPill>
      ) : ensembles.length === 0 ? (
        <GlassPill>
          <p className="text-center text-[14px] text-muted-foreground py-6">
            You're not in any ensembles yet.
          </p>
        </GlassPill>
      ) : (
        <GlassPill>
          <PillSectionHeader icon={Users} label="Your ensembles" />
          <ul className="mt-2 divide-y divide-border/40">
            {visible.map((e) => (
              <li key={e.id}>
                <Link
                  to={`/ensembles/${e.id}`}
                  className="w-full flex items-center gap-3 py-2.5 text-left spring-tap group"
                >
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/60 grid place-items-center">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium truncate leading-tight">{e.name}</p>
                    <p className="text-[12px] text-muted-foreground truncate">
                      {e.type ? TYPE_LABEL[e.type] : "Ensemble"} · {members[e.id]?.length ?? 0} members
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
          {ensembles.length > 5 && (
            <BrowseCta
              icon={Users}
              label={showAll ? "Show less" : `Show all ${ensembles.length}`}
              onClick={() => setShowAll((v) => !v)}
            />
          )}
        </GlassPill>
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
    </PagePillFrame>
  );
};

export default Ensembles;
