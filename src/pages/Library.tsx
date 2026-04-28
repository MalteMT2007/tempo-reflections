import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  FileMusic,
  Trash2,
  X,
  AlertCircle,
  Upload,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Star,
  ArrowDownAZ,
  ArrowUpAZ,
  Clock,
  ChevronDown,
} from "lucide-react";
import {
  Score,
  deleteScore,
  listMyScores,
  setScoreFavorite,
  uploadScore,
} from "@/lib/scores";
import { supabase } from "@/integrations/supabase/client";
import { listProjects, createProjectScore, type Project } from "@/lib/ensembles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { GlassPill } from "@/components/PagePill";
import { setBackgroundScore } from "@/components/LiveScoreReaderHost";
import { useNavigate } from "react-router-dom";
import { markScoreOpened, getOpenedAt } from "@/lib/recentScores";

type View = "grid" | "list";
type Sort = "az" | "za" | "recent";
const VIEW_KEY = "tempo:lib-view";
const SORT_KEY = "tempo:lib-sort";
const OPEN_SCORE_KEY = "tempo:lib-open-score";

const SORT_LABEL: Record<Sort, string> = {
  az: "A–Z",
  za: "Z–A",
  recent: "Recently opened",
};

const Library = () => {
  const navigate = useNavigate();
  const [scores, setScores] = useState<Score[]>([]);
  const [view, setView] = useState<View>(
    (typeof localStorage !== "undefined" && (localStorage.getItem(VIEW_KEY) as View)) || "list"
  );
  const [sort, setSort] = useState<Sort>(
    (typeof localStorage !== "undefined" && (localStorage.getItem(SORT_KEY) as Sort)) || "recent"
  );
  const [uploadOpen, setUploadOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const openInReader = (s: Score) => {
    markScoreOpened(s.id);
    setBackgroundScore(s);
    navigate("/reader");
  };

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);
  useEffect(() => { localStorage.setItem(SORT_KEY, sort); }, [sort]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listMyScores();
      setScores(list);
    } catch (e: any) {
      setError(e?.message || "Couldn't load your library.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    document.title = "Library — Tempo";
  }, []);

  // Handle ?open=<scoreId> from global search
  useEffect(() => {
    const id = searchParams.get("open");
    if (!id || scores.length === 0) return;
    const match = scores.find((s) => s.id === id);
    if (match) {
      openInReader(match);
      searchParams.delete("open");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, scores, setSearchParams]);

  const sorted = useMemo(() => {
    const arr = [...scores];
    if (sort === "az") {
      arr.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    } else if (sort === "za") {
      arr.sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: "base" }));
    } else {
      // recent: by last opened (local), fallback to updated_at/created_at
      arr.sort((a, b) => {
        const ao = getOpenedAt(a.id) || new Date(a.updated_at || a.created_at).getTime();
        const bo = getOpenedAt(b.id) || new Date(b.updated_at || b.created_at).getTime();
        return bo - ao;
      });
    }
    return arr;
  }, [scores, sort]);

  return (
    <>
      <GlassPill>
        <PageHeader
          title="Library"
          trailing={
            <>
              <ViewToggle view={view} onChange={setView} />
              <button
                onClick={() => setUploadOpen(true)}
                aria-label="Add sheet music"
                className="h-10 w-10 grid place-items-center rounded-full bg-foreground text-background spring-tap"
              >
                <Plus className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </>
          }
        />

        <div className="mt-4 mb-3 flex items-center justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            {scores.length} {scores.length === 1 ? "score" : "scores"}
          </p>
          <SortMenu sort={sort} onChange={setSort} />
        </div>

        {loading ? (
          view === "grid" ? <LoadingGrid /> : <LoadingList />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : sorted.length === 0 ? (
          <EmptyState empty onAdd={() => setUploadOpen(true)} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {sorted.map((s) => (
              <ScoreCardGrid
                key={s.id}
                score={s}
                onOpen={() => openInReader(s)}
                onChanged={refresh}
              />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border/50 rounded-2xl border border-border/50 overflow-hidden">
            {sorted.map((s) => (
              <ScoreRow
                key={s.id}
                score={s}
                onOpen={() => openInReader(s)}
                onChanged={refresh}
              />
            ))}
          </ul>
        )}
      </GlassPill>

      {uploadOpen && (
        <UploadDialog
          existingCategories={Array.from(
            new Set(scores.flatMap((s) => s.tags || []).filter(Boolean))
          ).sort((a, b) => a.localeCompare(b))}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => { setUploadOpen(false); refresh(); }}
        />
      )}
    </>
  );
};

export default Library;

// ---------- Sort menu ----------
const SortMenu = ({ sort, onChange }: { sort: Sort; onChange: (s: Sort) => void }) => {
  const Icon = sort === "az" ? ArrowDownAZ : sort === "za" ? ArrowUpAZ : Clock;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Sort"
          className="inline-flex items-center gap-1.5 h-9 pl-3 pr-2.5 rounded-full bg-muted text-[13px] text-foreground spring-tap"
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          {SORT_LABEL[sort]}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => onChange("recent")}>
          <Clock className="h-4 w-4 mr-2" /> Recently opened
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChange("az")}>
          <ArrowDownAZ className="h-4 w-4 mr-2" /> A–Z
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChange("za")}>
          <ArrowUpAZ className="h-4 w-4 mr-2" /> Z–A
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


// ---------- View toggle ----------
const ViewToggle = ({ view, onChange }: { view: View; onChange: (v: View) => void }) => (
  <div className="inline-flex h-10 rounded-full bg-muted p-1">
    <button
      onClick={() => onChange("list")}
      aria-label="List view"
      className={`h-8 w-8 grid place-items-center rounded-full transition-colors ${
        view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
      }`}
    >
      <ListIcon className="h-4 w-4" strokeWidth={2} />
    </button>
    <button
      onClick={() => onChange("grid")}
      aria-label="Grid view"
      className={`h-8 w-8 grid place-items-center rounded-full transition-colors ${
        view === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
      }`}
    >
      <LayoutGrid className="h-4 w-4" strokeWidth={2} />
    </button>
  </div>
);

// ---------- Score actions menu ----------
const ScoreActionsMenu = ({
  score,
  onChanged,
  className = "",
}: {
  score: Score;
  onChanged: () => void;
  className?: string;
}) => {
  const toggleFav = async (e: Event) => {
    e.preventDefault();
    try {
      await setScoreFavorite(score.id, !score.favorite);
      onChanged();
    } catch {}
  };
  const remove = async (e: Event) => {
    e.preventDefault();
    if (!confirm(`Delete "${score.title}"?`)) return;
    try {
      await deleteScore(score);
      onChanged();
    } catch {}
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label="More actions"
          className={`h-8 w-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground spring-tap ${className}`}
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={toggleFav}>
          <Star className={`h-4 w-4 mr-2 ${score.favorite ? "fill-current" : ""}`} />
          {score.favorite ? "Remove favorite" : "Favorite"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={remove} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ---------- Compact grid card ----------
const ScoreCardGrid = ({
  score,
  onOpen,
  onChanged,
}: {
  score: Score;
  onOpen: () => void;
  onChanged: () => void;
}) => {
  const cover = (score as any).cover_url as string | undefined;
  return (
    <div className="group relative">
      <button onClick={onOpen} className="w-full text-left spring-tap focus:outline-none">
        <div className="aspect-[3/4] rounded-xl overflow-hidden relative bg-muted border border-border">
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <FileMusic className="h-7 w-7 text-muted-foreground/70" strokeWidth={1.5} />
            </div>
          )}
          {score.favorite && (
            <Star className="absolute top-2 left-2 h-3.5 w-3.5 fill-foreground text-foreground drop-shadow" />
          )}
        </div>
        <div className="px-0.5 pt-3 pr-8">
          <p className="text-[14px] font-medium text-foreground truncate leading-tight">
            {score.title}
          </p>
          {score.composer && (
            <p className="text-[12.5px] text-muted-foreground truncate mt-0.5">{score.composer}</p>
          )}
        </div>
      </button>
      <div className="absolute right-0 bottom-0">
        <ScoreActionsMenu score={score} onChanged={onChanged} />
      </div>
    </div>
  );
};

// ---------- List row ----------
const ScoreRow = ({
  score,
  onOpen,
  onChanged,
}: {
  score: Score;
  onOpen: () => void;
  onChanged: () => void;
}) => {
  const cover = (score as any).cover_url as string | undefined;
  return (
    <li className="flex items-center gap-2 pr-2 hover:bg-muted/60 transition-colors">
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 text-left flex items-center gap-4 px-4 py-3 spring-tap"
      >
        <div className="h-12 w-9 rounded-md overflow-hidden bg-muted border border-border shrink-0 grid place-items-center">
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <FileMusic className="h-4 w-4 text-muted-foreground/70" strokeWidth={1.6} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {score.favorite && <Star className="h-3 w-3 fill-foreground text-foreground shrink-0" />}
            <p className="text-[15px] font-medium text-foreground truncate leading-tight">
              {score.title}
            </p>
          </div>
          {score.composer && (
            <p className="text-[13px] text-muted-foreground truncate mt-0.5">{score.composer}</p>
          )}
        </div>
        {score.page_count > 0 && (
          <span className="text-[12px] text-muted-foreground tabular shrink-0">
            {score.page_count} {score.page_count === 1 ? "pg" : "pgs"}
          </span>
        )}
      </button>
      <ScoreActionsMenu score={score} onChanged={onChanged} />
    </li>
  );
};

// ---------- States ----------
const LoadingGrid = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="space-y-2.5">
        <div className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
        <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
      </div>
    ))}
  </div>
);

const LoadingList = () => (
  <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
    {Array.from({ length: 6 }).map((_, i) => (
      <li key={i} className="flex items-center gap-4 px-4 py-3">
        <div className="h-12 w-9 rounded-md bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
        </div>
      </li>
    ))}
  </ul>
);

const EmptyState = ({ empty, onAdd }: { empty: boolean; onAdd: () => void }) => (
  <div className="text-center py-24">
    <div className="h-14 w-14 mx-auto rounded-2xl bg-muted grid place-items-center mb-4">
      <FileMusic className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
    </div>
    <p className="text-[17px] font-medium text-foreground">
      {empty ? "No sheet music yet" : "No matches"}
    </p>
    <p className="text-[14px] text-muted-foreground mt-1">
      {empty ? "Add your first PDF to get started." : "Try a different search."}
    </p>
    {empty && (
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-full bg-foreground text-background text-[14px] font-medium spring-tap"
      >
        <Plus className="h-4 w-4" strokeWidth={2.2} /> Add PDF
      </button>
    )}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="text-center py-24">
    <div className="h-14 w-14 mx-auto rounded-2xl bg-muted grid place-items-center mb-4">
      <AlertCircle className="h-7 w-7 text-destructive" strokeWidth={1.5} />
    </div>
    <p className="text-[17px] font-medium text-foreground">Something went wrong</p>
    <p className="text-[14px] text-muted-foreground mt-1 max-w-xs mx-auto">{message}</p>
    <button
      onClick={onRetry}
      className="mt-5 inline-flex h-10 px-5 items-center rounded-full bg-foreground text-background text-[14px] font-medium spring-tap"
    >
      Try again
    </button>
  </div>
);


// ---------- Upload Dialog ----------
type AdminEnsemble = { id: string; name: string; projects: Project[] };

const UploadDialog = ({
  existingCategories,
  onClose,
  onUploaded,
}: {
  existingCategories: string[];
  onClose: () => void;
  onUploaded: () => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [category, setCategory] = useState<string>("");
  const [newCategory, setNewCategory] = useState("");
  const [adminEnsembles, setAdminEnsembles] = useState<AdminEnsemble[]>([]);
  const [shareProjectId, setShareProjectId] = useState<string>(""); // "" = none
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load admin ensembles + their projects
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberships } = await supabase
        .from("ensemble_members")
        .select("ensemble_id, role, ensembles:ensemble_id(id, name)")
        .eq("user_id", user.id)
        .eq("role", "admin");
      const list: AdminEnsemble[] = [];
      for (const m of (memberships ?? []) as any[]) {
        const ens = m.ensembles;
        if (!ens) continue;
        try {
          const projects = await listProjects(ens.id);
          list.push({ id: ens.id, name: ens.name, projects });
        } catch {}
      }
      setAdminEnsembles(list);
    })();
  }, []);

  const onSubmit = async () => {
    if (!file) { setErr("Choose a PDF file"); return; }
    if (!title.trim()) { setErr("Title is required"); return; }
    const finalCategory = (newCategory.trim() || category).trim();
    setBusy(true); setErr(null);
    try {
      const created = await uploadScore({
        file,
        title: title.trim(),
        composer: composer.trim() || undefined,
        tags: finalCategory ? [finalCategory] : [],
      });

      // Optionally share to a project in an ensemble I admin
      if (shareProjectId) {
        const ens = adminEnsembles.find((e) =>
          e.projects.some((p) => p.id === shareProjectId)
        );
        if (!ens) throw new Error("Selected project not found");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");

        // Double-check admin status via the same function the RLS policy uses
        const { data: isAdmin, error: adminErr } = await supabase.rpc(
          "is_ensemble_admin",
          { _ensemble: ens.id, _user: user.id }
        );
        if (adminErr) throw adminErr;
        if (!isAdmin) {
          throw new Error("You must be an admin of the ensemble to share to its project");
        }

        // Share score with the ensemble (so members can view it via RLS)
        const { error: shareErr } = await supabase.from("score_ensembles").insert({
          score_id: created.id,
          ensemble_id: ens.id,
          shared_by: user.id,
        });
        if (shareErr) throw shareErr;

        // Add as a project score referencing this score (insert with score_id directly)
        const { error: psErr } = await supabase.from("project_scores").insert({
          project_id: shareProjectId,
          title: created.title,
          composer: created.composer || null,
          score_id: created.id,
          created_by: user.id,
        });
        if (psErr) throw psErr;
      }
      onUploaded();
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background border border-border rounded-2xl shadow-elev w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[20px] font-semibold tracking-tight">Upload sheet music</h3>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center spring-tap">
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-foreground/30 transition mb-4"
        >
          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-[14px]">{file ? file.name : "Tap to choose a PDF"}</p>
          {file && <p className="text-[11px] text-muted-foreground mt-1">{(file.size / 1024).toFixed(0)} KB</p>}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ""));
          }}
        />

        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[15px]" />
          <input value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Composer (optional)" className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[15px]" />
        </div>

        {/* Category */}
        <div className="mt-5">
          <p className="text-[12.5px] font-medium text-muted-foreground mb-2">Category</p>
          {existingCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {existingCategories.map((c) => {
                const active = category === c && !newCategory.trim();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCategory(active ? "" : c); setNewCategory(""); }}
                    className={`h-8 px-3 rounded-full text-[13px] border transition-colors ${
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}
          <input
            value={newCategory}
            onChange={(e) => { setNewCategory(e.target.value); if (e.target.value) setCategory(""); }}
            placeholder={existingCategories.length ? "or new category (e.g. Orchestra, Solo, Chamber)" : "New category (e.g. Orchestra, Solo, Chamber)"}
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[14px]"
          />
        </div>

        {/* Share to ensemble project */}
        {adminEnsembles.length > 0 && (
          <div className="mt-5">
            <p className="text-[12.5px] font-medium text-muted-foreground mb-2">
              Share to an ensemble project (optional)
            </p>
            <select
              value={shareProjectId}
              onChange={(e) => setShareProjectId(e.target.value)}
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[14px]"
            >
              <option value="">Don't share</option>
              {adminEnsembles.map((ens) => (
                <optgroup key={ens.id} label={ens.name}>
                  {ens.projects.length === 0 ? (
                    <option disabled value="">No projects</option>
                  ) : (
                    ens.projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))
                  )}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {err && <p className="text-xs text-destructive mt-3">{err}</p>}

        <button
          onClick={onSubmit}
          disabled={busy}
          className="mt-6 w-full bg-foreground text-background rounded-full py-3 disabled:opacity-50 text-[14px] font-medium spring-tap"
        >
          {busy ? "Uploading…" : "Add to library"}
        </button>
      </div>
    </div>
  );
};


