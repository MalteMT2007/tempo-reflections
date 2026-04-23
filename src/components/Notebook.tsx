import { useEffect, useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { NoteEntry, Notebook as NotebookType, loadNotebook, saveNotebook } from "@/lib/storage";

type Props = {
  title: string;
  byline: string;
  open: boolean;
  onClose: () => void;
  onChange?: (entries: NoteEntry[]) => void;
};

const formatStamp = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const Notebook = ({ title, byline, open, onClose, onChange }: Props) => {
  const [nb, setNb] = useState<NotebookType | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) {
      const loaded = loadNotebook(title, byline);
      setNb(loaded);
    }
  }, [open, title, byline]);

  if (!open || !nb) return null;

  const persist = (next: NotebookType) => {
    setNb(next);
    saveNotebook(next);
    onChange?.(next.entries);
  };

  const addEntry = () => {
    if (!draft.trim()) return;
    const entry: NoteEntry = { id: crypto.randomUUID(), at: Date.now(), text: draft.trim() };
    persist({ ...nb, entries: [entry, ...nb.entries] });
    setDraft("");
  };

  const removeEntry = (id: string) => {
    persist({ ...nb, entries: nb.entries.filter((e) => e.id !== id) });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background animate-fade-in overflow-y-auto">
      <div className="max-w-md mx-auto px-6 pt-6 pb-12 min-h-screen flex flex-col">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Notebook</p>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-ink-soft"
            aria-label="Close notebook"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 mb-6">
          <h2 className="font-serif text-2xl font-light text-ink leading-snug">{nb.title}</h2>
          {nb.byline && <p className="font-serif italic text-ink-soft text-sm mt-1">{nb.byline}</p>}
        </div>

        {/* New entry */}
        <div className="rounded-lg border border-border bg-card/60 p-4 shadow-soft mb-6">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="A new thought…"
            rows={3}
            className="w-full bg-transparent outline-none resize-none font-serif text-base placeholder:italic placeholder:text-muted-foreground/60"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={addEntry}
              disabled={!draft.trim()}
              className="text-xs px-4 py-2 rounded-full bg-ink text-paper flex items-center gap-1.5 disabled:opacity-30 hover:opacity-90 transition"
            >
              <Plus className="h-3 w-3" /> Save note
            </button>
          </div>
        </div>

        {/* Entries */}
        <div className="flex-1">
          {nb.entries.length === 0 ? (
            <p className="font-serif italic text-center text-ink-soft py-12">
              "Blank pages await."
            </p>
          ) : (
            <ul className="space-y-3">
              {nb.entries.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-border bg-card/40 p-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-serif text-base text-ink whitespace-pre-wrap flex-1 leading-relaxed">
                      {e.text}
                    </p>
                    <button
                      onClick={() => removeEntry(e.id)}
                      className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-ink"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
                    {formatStamp(e.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
