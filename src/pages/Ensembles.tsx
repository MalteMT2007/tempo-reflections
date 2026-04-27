import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Music2, Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listMyEnsembles, createEnsemble, ensembleMembers, leaveEnsemble, DbEnsemble } from "@/lib/api";
import { toast } from "sonner";

type MemberRow = { user_id: string; role: string; profiles: { username: string; display_name: string | null; instrument: string | null } | null };

const Ensembles = () => {
  const { user } = useAuth();
  const [ensembles, setEnsembles] = useState<DbEnsemble[]>([]);
  const [members, setMembers] = useState<Record<string, MemberRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => { document.title = "Ensembles — Practice"; }, []);

  const refresh = async () => {
    if (!user) return;
    const list = await listMyEnsembles(user.id);
    setEnsembles(list);
    const all: Record<string, MemberRow[]> = {};
    await Promise.all(
      list.map(async (e) => {
        all[e.id] = (await ensembleMembers(e.id)) as any;
      })
    );
    setMembers(all);
  };

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [user]);

  const create = async () => {
    if (!name.trim()) return;
    try {
      await createEnsemble(name.trim(), desc.trim());
      toast.success("Ensemble created.");
      setName(""); setDesc(""); setCreating(false);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not create");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>;
  }

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-md mx-auto px-6 pt-10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-ink-soft hover:text-ink mb-6">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>

        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Ensembles</p>
            <h1 className="font-serif text-4xl font-light text-ink">Together.</h1>
            <p className="font-serif italic text-ink-soft mt-1">Quartets, orchestras, bands — your shared studios.</p>
          </div>
          <button
            onClick={() => setCreating((v) => !v)}
            className="h-10 w-10 rounded-full bg-ink text-paper flex items-center justify-center shadow-elev shrink-0"
          >
            <Plus className="h-4 w-4" />
          </button>
        </header>

        {creating && (
          <section className="mb-8 rounded-lg border border-border bg-card/50 p-5 animate-fade-in">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">New ensemble</p>
            <input
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Name (e.g. The Allegro Quartet)"
              className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-lg placeholder:text-muted-foreground/60 placeholder:italic mb-3"
            />
            <textarea
              rows={2} value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="A short description (optional)"
              className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-sm placeholder:text-muted-foreground/60 placeholder:italic resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={create} disabled={!name.trim()}
                className="flex-1 bg-ink text-paper rounded-full py-2 text-sm disabled:opacity-40 hover:opacity-90 transition">
                Create
              </button>
              <button onClick={() => setCreating(false)}
                className="px-4 rounded-full border border-border text-sm text-ink-soft hover:text-ink transition">
                Cancel
              </button>
            </div>
          </section>
        )}

        {ensembles.length === 0 && !creating ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Music2 className="h-6 w-6 text-ink-soft mx-auto mb-3" />
            <p className="font-serif italic text-ink-soft">No ensembles yet.</p>
            <p className="text-xs text-muted-foreground mt-2">Create one to gather your group.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {ensembles.map((e) => (
              <li key={e.id} className="rounded-lg border border-border bg-card/40 p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-serif text-xl text-ink leading-tight">{e.name}</p>
                    {e.description && <p className="font-serif italic text-sm text-ink-soft mt-1">{e.description}</p>}
                  </div>
                  {e.created_by !== user?.id && (
                    <button
                      onClick={async () => { await leaveEnsemble(e.id); refresh(); }}
                      className="text-[10px] uppercase tracking-wider text-ink-soft hover:text-ink"
                    >
                      Leave
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-3">
                  <Users className="h-3 w-3" />
                  <span>{(members[e.id]?.length ?? 0)} member{(members[e.id]?.length ?? 0) === 1 ? "" : "s"}</span>
                </div>
                {members[e.id] && members[e.id].length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {members[e.id].map((m) => (
                      <li key={m.user_id} className="text-xs px-2.5 py-1 rounded-full border border-border text-ink-soft">
                        {m.profiles?.display_name || m.profiles?.username || "Member"}
                        {m.profiles?.instrument && <span className="text-muted-foreground"> · {m.profiles.instrument}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-4 font-serif italic normal-case">
                  Shared scores & rehearsal calendar — coming soon
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default Ensembles;
