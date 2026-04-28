import { useEffect, useRef, useState } from "react";
import { Square, BookOpen, Users, FileMusic } from "lucide-react";
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

export const PracticeMode = ({ title, byline, focus, tags, goal, startedAt, onEnd }: Props) => {
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
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [startedAt]);

  useEffect(() => {
    setNoteCount(loadNotebook(title, byline).entries.length);
  }, [title, byline, notebookOpen]);

  return (
    <div className="fixed inset-0 z-50 bg-background paper-grain overflow-y-auto animate-fade-in-slow">
      <div className="max-w-md mx-auto px-6 pt-10 pb-32 min-h-screen flex flex-col">
        {/* Piece header */}
        <div className="text-center animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">In session</p>
          <h2 className="font-serif text-2xl font-light text-ink text-balance leading-snug max-w-xs mx-auto">
            {title}
          </h2>
          {byline && (
            <p className="font-serif italic text-ink-soft text-sm mt-1">{byline}</p>
          )}
          {focus && (
            <p className="mt-3 font-serif italic text-ink-soft text-sm max-w-xs mx-auto">"{focus}"</p>
          )}
          {goal && (
            <p className="mt-2 text-xs text-muted-foreground tabular">{goal}</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {tags.map((t) => (
                <span key={t} className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex-1 flex flex-col items-center justify-center py-12 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-64 w-64 rounded-full bg-sepia/5 animate-breathe" />
          </div>
          <div className="relative">
            <div className="font-serif text-7xl sm:text-8xl font-light tabular text-ink tracking-tight">
              {formatDuration(elapsed)}
            </div>
          </div>
        </div>

        {/* Metronome */}
        <div className="mb-5">
          <Metronome compact />
        </div>

        {/* Tools menu */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setNotebookOpen(true)}
            className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-4 shadow-soft text-left hover:border-ink/40 transition"
          >
            <div className="flex items-center justify-between mb-1">
              <BookOpen className="h-4 w-4 text-ink-soft" />
              {noteCount > 0 && (
                <span className="text-[10px] tabular text-muted-foreground">{noteCount}</span>
              )}
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Notebook</p>
            <p className="font-serif text-sm text-ink mt-1">Notes for this piece</p>
          </button>

          <button
            onClick={async () => {
              setScoresOpen(true);
              try { setScores(await listMyScores()); } catch {}
            }}
            className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-4 shadow-soft text-left hover:border-ink/40 transition"
          >
            <div className="flex items-center justify-between mb-1">
              <FileMusic className="h-4 w-4 text-ink-soft" />
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sheet music</p>
            <p className="font-serif text-sm text-ink mt-1">Open & annotate a score</p>
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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-paper rounded-full pl-5 pr-6 py-3 flex items-center gap-2 shadow-elev hover:opacity-90 transition"
        >
          <Square className="h-3.5 w-3.5 fill-paper" />
          <span className="text-sm tracking-wide">End session</span>
        </button>
      </div>

      <Notebook
        title={title}
        byline={byline}
        open={notebookOpen}
        onClose={() => setNotebookOpen(false)}
        onChange={(entries) => setNoteCount(entries.length)}
      />
    </div>
  );
};
