import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  FileMusic,
  Trash2,
  X,
  AlertCircle,
  Upload,
} from "lucide-react";
import {
  Score,
  deleteScore,
  listMyScores,
  listSessionsForScore,
  uploadScore,
} from "@/lib/scores";
import { ScoreReader } from "@/components/ScoreReader";

// Deterministic tint per score (Apple-style soft pastels)
const TINTS = [
  "#FF9F0A", "#FF375F", "#BF5AF2", "#0A84FF", "#30D158",
  "#64D2FF", "#FF6482", "#FFD60A", "#5E5CE6", "#FF453A",
];
const tintFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
};

const Library = () => {
  const [scores, setScores] = useState<Score[]>([]);
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openScore, setOpenScore] = useState<Score | null>(null);
  const [detail, setDetail] = useState<Score | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setScores(await listMyScores());
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Title row */}
        <div className="flex items-end justify-between mb-5">
          <h1 className="text-[34px] font-semibold tracking-tight leading-none">Library</h1>
          <button
            onClick={() => setUploadOpen(true)}
            aria-label="Add sheet music"
            className="h-10 w-10 grid place-items-center rounded-full bg-foreground text-background spring-tap"
          >
            <Plus className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full pl-10 pr-3 h-10 rounded-xl bg-muted text-[15px] outline-none border border-transparent focus:border-border placeholder:text-muted-foreground"
          />
        </div>

        {/* Content */}
        {loading ? (
          <LoadingGrid />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : filtered.length === 0 ? (
          <EmptyState
            empty={scores.length === 0}
            onAdd={() => setUploadOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filtered.map((s) => (
              <ScoreCard key={s.id} score={s} onOpen={() => setDetail(s)} />
            ))}
          </div>
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

// ---------- Card ----------
const ScoreCard = ({ score, onOpen }: { score: Score; onOpen: () => void }) => {
  const tint = tintFor(score.id);
  const cover = (score as any).cover_url as string | undefined;
  return (
    <button
      onClick={onOpen}
      className="group text-left spring-tap focus:outline-none"
    >
      <div
        className="aspect-[3/4] rounded-2xl overflow-hidden relative shadow-soft"
        style={{
          background: cover ? undefined : `linear-gradient(160deg, ${tint} 0%, ${tint}CC 100%)`,
        }}
      >
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <FileMusic className="h-10 w-10 text-white/85" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="px-1 pt-2.5">
        <p className="text-[14px] font-medium text-foreground truncate leading-tight">{score.title}</p>
        {score.composer && (
          <p className="text-[12px] text-muted-foreground truncate mt-0.5">{score.composer}</p>
        )}
      </div>
    </button>
  );
};

// ---------- States ----------
const LoadingGrid = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="space-y-2.5">
        <div className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
        <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ empty, onAdd }: { empty: boolean; onAdd: () => void }) => (
  <div className="text-center py-20">
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
  <div className="text-center py-20">
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
