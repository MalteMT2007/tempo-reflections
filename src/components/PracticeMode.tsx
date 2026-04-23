import { useEffect, useRef, useState } from "react";
import { Square } from "lucide-react";
import { Metronome } from "./Metronome";
import { formatDuration } from "@/lib/storage";

type Props = {
  focus: string;
  tags: string[];
  goal: string;
  startedAt: number;
  onEnd: (data: { durationSec: number; notes: string }) => void;
};

export const PracticeMode = ({ focus, tags, goal, startedAt, onEnd }: Props) => {
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState("");
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [startedAt]);

  return (
    <div className="fixed inset-0 z-50 bg-background paper-grain overflow-y-auto animate-fade-in-slow">
      <div className="max-w-md mx-auto px-6 pt-10 pb-32 min-h-screen flex flex-col">
        {/* Focus */}
        <div className="text-center animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">In session</p>
          <h2 className="font-serif italic text-xl font-light text-ink-soft text-balance leading-snug max-w-xs mx-auto">
            "{focus}"
          </h2>
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

        {/* Notes */}
        <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-4 shadow-soft">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Margin notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot a thought, fingering, breath mark…"
            rows={3}
            className="w-full bg-transparent outline-none resize-none font-serif text-base placeholder:italic placeholder:text-muted-foreground/60"
          />
        </div>

        {/* End */}
        <button
          onClick={() => onEnd({ durationSec: elapsed, notes })}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-paper rounded-full pl-5 pr-6 py-3 flex items-center gap-2 shadow-elev hover:opacity-90 transition"
        >
          <Square className="h-3.5 w-3.5 fill-paper" />
          <span className="text-sm tracking-wide">End session</span>
        </button>
      </div>
    </div>
  );
};
