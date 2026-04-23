import { useState } from "react";
import { ArrowRight, X } from "lucide-react";

type Props = {
  onStart: (data: { focus: string; tags: string[]; goal: string }) => void;
  onCancel: () => void;
};

const SUGGESTED_TAGS = ["technique", "scales", "repertoire", "sight-reading", "etudes", "improv"];

export const SessionSetup = ({ onStart, onCancel }: Props) => {
  const [focus, setFocus] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [goal, setGoal] = useState("");

  const toggleTag = (t: string) =>
    setTags((curr) => (curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t]));

  return (
    <div className="fixed inset-0 z-50 bg-background animate-fade-in-slow overflow-y-auto">
      <div className="max-w-md mx-auto px-6 pt-6 pb-12">
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-ink-soft"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 mb-10 animate-fade-in">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">Begin a session</p>
          <h1 className="font-serif text-4xl font-light leading-tight text-balance text-ink">
            What are you focusing on today?
          </h1>
        </div>

        <div className="space-y-8 animate-fade-in" style={{ animationDelay: "120ms" }}>
          <div>
            <textarea
              autoFocus
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Bach Partita No. 2, Allemande — voice clarity in left hand…"
              rows={3}
              className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-xl resize-none placeholder:text-muted-foreground/60 placeholder:italic transition-colors"
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Focus areas</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((t) => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      active
                        ? "bg-ink text-paper border-ink"
                        : "border-border text-ink-soft hover:border-ink/40"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Goal (optional)</p>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. mm. 24–48 at ♩ = 80"
              className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 text-sm placeholder:text-muted-foreground/60 transition-colors"
            />
          </div>
        </div>

        <button
          disabled={!focus.trim()}
          onClick={() => onStart({ focus: focus.trim(), tags, goal: goal.trim() })}
          className="mt-12 w-full bg-ink text-paper rounded-full py-4 flex items-center justify-center gap-2 font-medium tracking-wide disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition shadow-elev"
        >
          Begin practice <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
