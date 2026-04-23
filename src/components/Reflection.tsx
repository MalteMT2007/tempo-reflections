import { useState } from "react";
import { Check } from "lucide-react";
import { formatDuration } from "@/lib/storage";

type Props = {
  durationSec: number;
  onSave: (data: { improved: string; needsWork: string; rating: number }) => void;
  onSkip: () => void;
};

export const Reflection = ({ durationSec, onSave, onSkip }: Props) => {
  const [improved, setImproved] = useState("");
  const [needsWork, setNeedsWork] = useState("");
  const [rating, setRating] = useState(3);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-fade-in-slow">
      <div className="max-w-md mx-auto px-6 pt-10 pb-12">
        <div className="text-center mb-10 animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Session complete</p>
          <div className="font-serif text-5xl font-light tabular text-ink">{formatDuration(durationSec)}</div>
          <p className="font-serif italic text-ink-soft mt-3">A moment to reflect.</p>
        </div>

        <div className="space-y-7 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">What improved?</label>
            <textarea
              value={improved}
              onChange={(e) => setImproved(e.target.value)}
              rows={3}
              placeholder="Cleaner shifts in the second variation…"
              className="w-full mt-2 bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-lg resize-none placeholder:italic placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">What still needs work?</label>
            <textarea
              value={needsWork}
              onChange={(e) => setNeedsWork(e.target.value)}
              rows={3}
              placeholder="Tempo wavers in mm. 32–36…"
              className="w-full mt-2 bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-lg resize-none placeholder:italic placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground block mb-3">Focus quality</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`flex-1 h-12 rounded-md border transition-all ${
                    rating >= n
                      ? "bg-ink border-ink"
                      : "border-border hover:border-ink/40"
                  }`}
                  aria-label={`Rate ${n}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
              <span>scattered</span>
              <span>flowing</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-4 rounded-full border border-border text-ink-soft text-sm hover:bg-muted transition"
          >
            Skip
          </button>
          <button
            onClick={() => onSave({ improved, needsWork, rating })}
            className="flex-1 py-4 rounded-full bg-ink text-paper text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-elev"
          >
            <Check className="h-4 w-4" /> Save session
          </button>
        </div>
      </div>
    </div>
  );
};
