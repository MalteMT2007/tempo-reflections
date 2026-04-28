import { useEffect, useRef, useState } from "react";
import { Square, BookOpen, FileMusic, X } from "lucide-react";
import { Metronome } from "./Metronome";
import { Notebook } from "./Notebook";
import { ScoreReader } from "./ScoreReader";
import { listMyScores, type Score } from "@/lib/scores";
import { formatDuration, loadNotebook } from "@/lib/storage";

type Props = {
  title: string;
  byline: string;
  focus: string;
  tags: string[];
  goal: string;
  startedAt: number;
  onEnd: (data: { durationSec: number; notes: string }) => void;
};

export const PracticeMode = ({ title, byline, tags, goal, startedAt, onEnd }: Props) => {
  const [elapsed, setElapsed] = useState(0);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [scoresOpen, setScoresOpen] = useState(false);
  const [openScore, setOpenScore] = useState<Score | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [startedAt]);

  useEffect(() => {
    setNoteCount(loadNotebook(title, byline).entries.length);
  }, [title, byline, notebookOpen]);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-fade-in">
      <div className="max-w-md mx-auto px-6 pt-8 pb-32 min-h-screen flex flex-col">
        {/* Piece — minimal */}
        <div className="text-center">
          <h2 className="text-[22px] font-semibold tracking-tight leading-tight max-w-xs mx-auto">{title}</h2>
          {byline && <p className="text-[14px] text-muted-foreground mt-1">{byline}</p>}
          {goal && <p className="mt-2 text-[12px] text-muted-foreground tabular">{goal}</p>}
        </div>

        {/* Timer — the focal point */}
        <div className="flex-1 flex items-center justify-center py-12 relative">
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="h-64 w-64 rounded-full bg-muted/40 animate-breathe" />
          </div>
          <div className="relative text-[88px] sm:text-[104px] font-semibold tabular tracking-tight leading-none">
            {formatDuration(elapsed)}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-5">
            {tags.map((t) => (
              <span key={t} className="text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Metronome */}
        <div className="mb-4">
          <Metronome compact />
        </div>

        {/* Tools — minimal icons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setNotebookOpen(true)}
            className="rounded-2xl border border-border p-4 flex items-center gap-3 hover:bg-muted/60 transition-colors spring-tap"
          >
            <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span className="text-[14px] font-medium">Notes</span>
            {noteCount > 0 && (
              <span className="ml-auto text-[12px] text-muted-foreground tabular">{noteCount}</span>
            )}
          </button>

          <button
            onClick={async () => {
              setScoresOpen(true);
              try { setScores(await listMyScores()); } catch {}
            }}
            className="rounded-2xl border border-border p-4 flex items-center gap-3 hover:bg-muted/60 transition-colors spring-tap"
          >
            <FileMusic className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span className="text-[14px] font-medium">Score</span>
          </button>
        </div>

        {/* End */}
        <button
          onClick={() => {
            const nb = loadNotebook(title, byline);
            const recent = nb.entries
              .filter((e) => e.at >= startedAt)
              .map((e) => e.text)
              .join("\n\n");
            onEnd({ durationSec: elapsed, notes: recent });
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background rounded-full pl-5 pr-6 py-3 flex items-center gap-2 shadow-elev spring-tap"
        >
          <Square className="h-3.5 w-3.5" fill="currentColor" />
          <span className="text-[14px] font-medium">End</span>
        </button>
      </div>

      <Notebook
        title={title}
        byline={byline}
        open={notebookOpen}
        onClose={() => setNotebookOpen(false)}
        onChange={(entries) => setNoteCount(entries.length)}
      />

      {scoresOpen && !openScore && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-background border border-border rounded-t-2xl sm:rounded-2xl shadow-elev w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold tracking-tight">Open a score</h3>
              <button onClick={() => setScoresOpen(false)} className="h-9 w-9 rounded-full hover:bg-muted grid place-items-center spring-tap">
                <X className="h-4 w-4" />
              </button>
            </div>
            {scores.length === 0 ? (
              <p className="text-[14px] text-muted-foreground text-center py-8">Your library is empty.</p>
            ) : (
              <ul className="divide-y divide-border">
                {scores.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => { setOpenScore(s); setScoresOpen(false); }}
                      className="w-full text-left py-3 hover:bg-muted/60 px-2 rounded-lg transition-colors"
                    >
                      <p className="text-[14.5px] font-medium truncate">{s.title}</p>
                      {s.composer && <p className="text-[12.5px] text-muted-foreground truncate">{s.composer}</p>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {openScore && (
        <ScoreReader score={openScore} onClose={() => setOpenScore(null)} />
      )}
    </div>
  );
};
