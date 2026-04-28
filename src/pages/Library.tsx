import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  FileMusic,
  Trash2,
  X,
  AlertCircle,
  Upload,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Star,
} from "lucide-react";
import {
  Score,
  deleteScore,
  listMyScores,
  setScoreFavorite,
  uploadScore,
} from "@/lib/scores";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScoreReader } from "@/components/ScoreReader";
import { PageHeader } from "@/components/PageHeader";
import { ProgressHeaderCard } from "@/components/practice/ProgressHeaderCard";
import { PracticeHistoryOverlay } from "@/components/practice/PracticeHistoryOverlay";

type View = "grid" | "list";
const VIEW_KEY = "tempo:lib-view";
const OPEN_SCORE_KEY = "tempo:lib-open-score";

const Library = () => {
  const [scores, setScores] = useState<Score[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>(
    (typeof localStorage !== "undefined" && (localStorage.getItem(VIEW_KEY) as View)) || "list"
  );
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openScore, setOpenScore] = useState<Score | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listMyScores();
      setScores(list);
      // Restore last opened score (only on first load when no score is currently open)
      const savedId = typeof localStorage !== "undefined" ? localStorage.getItem(OPEN_SCORE_KEY) : null;
      if (savedId && !openScore) {
        const match = list.find((s) => s.id === savedId);
        if (match) setOpenScore(match);
        else localStorage.removeItem(OPEN_SCORE_KEY);
      }
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

  // Persist the currently open score so it reopens on next visit
  useEffect(() => {
    if (openScore) localStorage.setItem(OPEN_SCORE_KEY, openScore.id);
    else localStorage.removeItem(OPEN_SCORE_KEY);
  }, [openScore]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scores;
    return scores.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.composer || "").toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [scores, query]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] pb-24">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-8 sm:pt-10">
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

        {/* Progress Header — gateway to practice history */}
        <div className="mt-6">
          <ProgressHeaderCard onOpen={() => setHistoryOpen(true)} />
        </div>

        {/* Search */}
        <div className="relative mt-6 mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or composer"
            className="w-full pl-11 pr-3 h-11 rounded-2xl bg-muted text-[15px] outline-none border border-transparent focus:border-border placeholder:text-muted-foreground"
          />
        </div>

        {/* Content */}
        {loading ? (
          view === "grid" ? <LoadingGrid /> : <LoadingList />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : filtered.length === 0 ? (
          <EmptyState
            empty={scores.length === 0}
            onAdd={() => setUploadOpen(true)}
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
            {filtered.map((s) => (
              <ScoreCardGrid
                key={s.id}
                score={s}
                onOpen={() => setOpenScore(s)}
                onChanged={refresh}
              />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
            {filtered.map((s) => (
              <ScoreRow
                key={s.id}
                score={s}
                onOpen={() => setOpenScore(s)}
                onChanged={refresh}
              />
            ))}
          </ul>
        )}
      </div>

      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onUploaded={() => { setUploadOpen(false); refresh(); }}
        />
      )}

      {openScore && (
        <ScoreReader score={openScore} onClose={() => setOpenScore(null)} />
      )}

      {historyOpen && <PracticeHistoryOverlay onClose={() => setHistoryOpen(false)} />}
    </div>
  );
};

export default Library;

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
const UploadDialog = ({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [composer, setComposer] = useState("");
  const [instrument, setInstrument] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!file) { setErr("Choose a PDF file"); return; }
    if (!title.trim()) { setErr("Title is required"); return; }
    setBusy(true); setErr(null);
    try {
      await uploadScore({
        file,
        title: title.trim(),
        composer: composer.trim() || undefined,
        instrument: instrument.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      onUploaded();
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background border border-border rounded-2xl shadow-elev w-full max-w-md p-6">
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
          <input value={instrument} onChange={(e) => setInstrument(e.target.value)} placeholder="Instrument (optional)" className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[14px]" />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma-separated" className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[14px]" />
        </div>

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

