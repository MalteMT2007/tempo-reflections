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
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-fade-in">
      <div className="max-w-md mx-auto px-6 pt-12 pb-12">
        {/* Visual: just the duration. No copy. */}
        <div className="text-center mb-12">
          <div className="text-[64px] font-semibold tabular tracking-tight leading-none">
            {formatDuration(durationSec)}
          </div>
          <p className="text-[12px] uppercase tracking-[0.2em] text-muted-foreground mt-3">Done</p>
        </div>

        <div className="space-y-7">
          {tags.length > 0 && (
            <div>
              <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-4">How did it feel?</p>
              <div className="space-y-4">
                {tags.map((t) => {
                  const value = tagRatings[t] ?? 3;
                  return (
                    <div key={t}>
                      <p className="text-[14px] mb-2">{t}</p>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setTag(t, n)}
                            className={`flex-1 h-9 rounded-lg border transition-colors ${
                              value >= n ? "bg-foreground border-foreground" : "border-border hover:border-foreground/40"
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
            <textarea
              value={improved}
              onChange={(e) => setImproved(e.target.value)}
              rows={2}
              placeholder="What improved?"
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[15px] resize-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <textarea
              value={needsWork}
              onChange={(e) => setNeedsWork(e.target.value)}
              rows={2}
              placeholder="What still needs work?"
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[15px] resize-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Focus</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`flex-1 h-11 rounded-lg border transition-colors ${
                    rating >= n ? "bg-foreground border-foreground" : "border-border hover:border-foreground/40"
                  }`}
                  aria-label={`Rate ${n}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-4 rounded-full border border-border text-[14px] text-muted-foreground hover:bg-muted/60 spring-tap transition-colors"
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
            className="flex-1 py-4 rounded-full bg-foreground text-background text-[14px] font-medium flex items-center justify-center gap-2 spring-tap shadow-elev"
          >
            <Check className="h-4 w-4" /> Save
          </button>
        </div>
      </div>
    </div>
  );
};
