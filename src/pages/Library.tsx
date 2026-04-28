import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Grid3x3,
  List as ListIcon,
  Search,
  FileMusic,
  Trash2,
  X,
} from "lucide-react";
import {
  Score,
  deleteScore,
  listMyScores,
  listSessionsForScore,
  uploadScore,
} from "@/lib/scores";
import { ScoreReader } from "@/components/ScoreReader";

type View = "grid" | "list";

const Library = () => {
  const [scores, setScores] = useState<Score[]>([]);
  const [view, setView] = useState<View>("grid");
  const [query, setQuery] = useState("");
  const [filterInstrument, setFilterInstrument] = useState<string>("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openScore, setOpenScore] = useState<Score | null>(null);
  const [detail, setDetail] = useState<Score | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setScores(await listMyScores());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    document.title = "Library — Practice";
  }, []);

  const instruments = useMemo(() => {
    const s = new Set<string>();
    scores.forEach((x) => x.instrument && s.add(x.instrument));
    return Array.from(s);
  }, [scores]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scores.filter((s) => {
      if (filterInstrument && s.instrument !== filterInstrument) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.composer || "").toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [scores, query, filterInstrument]);

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-3xl mx-auto px-6 pt-10">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink-soft hover:text-ink transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <button
            onClick={() => setUploadOpen(true)}
            className="rounded-full bg-ink text-paper px-4 py-2 text-sm flex items-center gap-2 shadow-soft hover:opacity-90"
          >
            <Upload className="h-3.5 w-3.5" /> Upload PDF
          </button>
        </div>

        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">Sheet music</p>
          <h1 className="font-serif text-4xl font-light text-ink leading-none">Library</h1>
          <p className="font-serif italic text-ink-soft mt-2">
            Your scores, annotations, and the sessions they shaped.
          </p>
        </header>

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, composer, tag…"
              className="w-full pl-9 pr-3 py-2 rounded-full border border-border bg-card/40 text-sm focus:border-ink outline-none"
            />
          </div>
          {instruments.length > 0 && (
            <select
              value={filterInstrument}
              onChange={(e) => setFilterInstrument(e.target.value)}
              className="rounded-full border border-border bg-card/40 text-sm px-3 py-2 focus:border-ink outline-none"
            >
              <option value="">All instruments</option>
              {instruments.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          )}
          <div className="flex rounded-full border border-border overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`p-2 ${view === "grid" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
              aria-label="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-2 ${view === "list" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
              aria-label="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-center text-ink-soft font-serif italic py-12">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <FileMusic className="h-8 w-8 mx-auto mb-3 text-ink-soft" />
            <p className="font-serif italic text-ink-soft">
              {scores.length === 0
                ? "Your library is empty. Upload your first PDF to begin."
                : "No scores match your search."}
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => setDetail(s)}
                className="group text-left rounded-lg border border-border bg-card/40 overflow-hidden hover:border-ink/40 transition shadow-soft"
              >
                <div className="aspect-[3/4] bg-paper border-b border-border flex items-center justify-center">
                  <FileMusic className="h-10 w-10 text-ink-soft/60 group-hover:text-ink transition" />
                </div>
                <div className="p-3">
                  <p className="font-serif text-sm text-ink truncate leading-tight">{s.title}</p>
                  {s.composer && (
                    <p className="font-serif italic text-[11px] text-ink-soft truncate">{s.composer}</p>
                  )}
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                    {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setDetail(s)}
                  className="w-full text-left py-4 flex items-center gap-3 hover:bg-card/40 transition px-2 rounded"
                >
                  <FileMusic className="h-5 w-5 text-ink-soft" />
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-base text-ink truncate">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.composer || "—"}{s.instrument ? ` · ${s.instrument}` : ""} · {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {s.tags.length > 0 && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
                      {s.tags.slice(0, 2).join(" · ")}
                    </span>
                  )}
                </button>
              </li>
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

      {detail && (
        <ScoreDetail
          score={detail}
          onClose={() => setDetail(null)}
          onOpen={() => { const s = detail; setDetail(null); setOpenScore(s); }}
          onDeleted={() => { setDetail(null); refresh(); }}
        />
      )}

      {openScore && (
        <ScoreReader score={openScore} onClose={() => setOpenScore(null)} />
      )}
    </div>
  );
};

export default Library;

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
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-paper border border-border rounded-lg shadow-elev w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-ink">Upload sheet music</h3>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4 text-ink" />
          </button>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-ink/40 transition mb-4"
        >
          <Upload className="h-6 w-6 mx-auto mb-2 text-ink-soft" />
          <p className="font-serif text-sm text-ink">{file ? file.name : "Tap to choose a PDF"}</p>
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
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title *" className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif" />
          <input value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Composer (optional)" className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif italic" />
          <input value={instrument} onChange={(e) => setInstrument(e.target.value)} placeholder="Instrument (optional)" className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 text-sm" />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma-separated" className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 text-sm" />
        </div>

        {err && <p className="text-xs text-destructive mt-3">{err}</p>}

        <button
          onClick={onSubmit}
          disabled={busy}
          className="mt-6 w-full bg-ink text-paper rounded-full py-3 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Add to library"}
        </button>
      </div>
    </div>
  );
};

// ---------- Score detail panel ----------
const ScoreDetail = ({
  score,
  onClose,
  onOpen,
  onDeleted,
}: {
  score: Score;
  onClose: () => void;
  onOpen: () => void;
  onDeleted: () => void;
}) => {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    listSessionsForScore(score.id).then(setSessions).catch(() => {});
  }, [score.id]);

  const remove = async () => {
    if (!confirm("Delete this score and its annotations?")) return;
    await deleteScore(score);
    onDeleted();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-paper border border-border rounded-t-lg sm:rounded-lg shadow-elev w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <h3 className="font-serif text-2xl text-ink truncate">{score.title}</h3>
            {score.composer && <p className="font-serif italic text-ink-soft truncate">{score.composer}</p>}
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
              {score.instrument || "—"} · {score.page_count || "?"} pages · added {new Date(score.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center shrink-0">
            <X className="h-4 w-4 text-ink" />
          </button>
        </div>

        {score.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {score.tags.map((t) => (
              <span key={t} className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">{t}</span>
            ))}
          </div>
        )}

        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Linked sessions</p>
          {sessions.length === 0 ? (
            <p className="font-serif italic text-xs text-ink-soft">Not yet attached to a practice session.</p>
          ) : (
            <ul className="space-y-1">
              {sessions.slice(0, 5).map((row: any) => {
                const ps = row.practice_sessions;
                if (!ps) return null;
                return (
                  <li key={row.session_id} className="text-xs text-ink-soft flex justify-between">
                    <span>{new Date(ps.started_at).toLocaleDateString()}</span>
                    <span className="tabular text-muted-foreground">{Math.round(ps.duration_sec / 60)} min</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpen}
            className="flex-1 bg-ink text-paper rounded-full py-3 text-sm"
          >
            Open & annotate
          </button>
          <button
            onClick={remove}
            className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-ink-soft hover:text-destructive hover:border-destructive/40"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
