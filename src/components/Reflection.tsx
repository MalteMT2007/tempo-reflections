import { useState } from "react";
import { Check } from "lucide-react";
import { TagRating, formatDuration } from "@/lib/storage";

type Props = {
  durationSec: number;
  tags: string[];
  onSave: (data: {
    improved: string;
    needsWork: string;
    rating: number;
    tagRatings: TagRating[];
  }) => void;
  onSkip: () => void;
};

const RATING_LABELS = ["", "barely", "a little", "noticeably", "a lot", "transformed"];

export const Reflection = ({ durationSec, tags, onSave, onSkip }: Props) => {
  const [improved, setImproved] = useState("");
  const [needsWork, setNeedsWork] = useState("");
  const [rating, setRating] = useState(3);
  const [tagRatings, setTagRatings] = useState<Record<string, number>>(
    Object.fromEntries(tags.map((t) => [t, 3]))
  );

  const setTag = (t: string, n: number) =>
    setTagRatings((curr) => ({ ...curr, [t]: n }));

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-fade-in-slow">
      <div className="max-w-md mx-auto px-6 pt-10 pb-12">
        <div className="text-center mb-10 animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Session complete</p>
          <div className="font-serif text-5xl font-light tabular text-ink">{formatDuration(durationSec)}</div>
          <p className="font-serif italic text-ink-soft mt-3">A moment to reflect.</p>
        </div>

        <div className="space-y-8 animate-fade-in" style={{ animationDelay: "100ms" }}>
          {/* Per-tag improvement ratings */}
          {tags.length > 0 && (
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground block mb-4">
                How much better does each feel?
              </label>
              <div className="space-y-5">
                {tags.map((t) => {
                  const value = tagRatings[t] ?? 3;
                  return (
                    <div key={t}>
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="font-serif text-base text-ink">{t}</span>
                        <span className="font-serif italic text-xs text-ink-soft">
                          {RATING_LABELS[value]}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setTag(t, n)}
                            className={`flex-1 h-9 rounded-md border transition-all ${
                              value >= n
                                ? "bg-ink border-ink"
                                : "border-border hover:border-ink/40"
                            }`}
                            aria-label={`${t} rating ${n}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground block mb-3">Overall focus quality</label>
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
            onClick={() =>
              onSave({
                improved,
                needsWork,
                rating,
                tagRatings: tags.map((t) => ({ tag: t, rating: tagRatings[t] ?? 3 })),
              })
            }
            className="flex-1 py-4 rounded-full bg-ink text-paper text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-elev"
          >
            <Check className="h-4 w-4" /> Save session
          </button>
        </div>
      </div>
    </div>
  );
};
