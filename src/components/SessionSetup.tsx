import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Genre } from "@/lib/storage";

type Props = {
  genre: Genre;
  onStart: (data: {
    title: string;
    composer?: string;
    artist?: string;
    focus: string;
    tags: string[];
    goal: string;
  }) => void;
  onCancel: () => void;
};

const SUGGESTED_TAGS = ["technique", "scales", "repertoire", "sight-reading", "etudes", "improv", "tone", "rhythm"];

export const SessionSetup = ({ genre, onStart, onCancel }: Props) => {
  const [title, setTitle] = useState("");
  const [byline, setByline] = useState(""); // composer or artist
  const [focus, setFocus] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [goal, setGoal] = useState("");

  const isClassical = genre === "classical";
  const titleLabel = isClassical ? "Piece" : "Song";
  const bylineLabel = isClassical ? "Composer" : "Artist";
  const titlePh = isClassical ? "Bach — Partita No. 2, Allemande" : "Blackbird";
  const bylinePh = isClassical ? "J. S. Bach" : "The Beatles";

  const toggleTag = (t: string) =>
    setTags((curr) => (curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t]));

  const canStart = title.trim().length > 0;

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
            What are you working on?
          </h1>
        </div>

        <div className="space-y-7 animate-fade-in" style={{ animationDelay: "120ms" }}>
          {/* Title */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{titleLabel}</p>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePh}
              className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-xl placeholder:text-muted-foreground/60 placeholder:italic transition-colors"
            />
          </div>

          {/* Byline */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{bylineLabel}</p>
            <input
              value={byline}
              onChange={(e) => setByline(e.target.value)}
              placeholder={bylinePh}
              className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-lg placeholder:text-muted-foreground/60 placeholder:italic transition-colors"
            />
          </div>

          {/* Focus */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Focus today (optional)</p>
            <textarea
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder={isClassical ? "Voice clarity in the left hand…" : "Solo phrasing, smoother chord changes…"}
              rows={2}
              className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-base resize-none placeholder:text-muted-foreground/60 placeholder:italic transition-colors"
            />
          </div>

          {/* Tags */}
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

          {/* Goal */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Goal (optional)</p>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={isClassical ? "e.g. mm. 24–48 at ♩ = 80" : "e.g. nail the bridge transition"}
              className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 text-sm placeholder:text-muted-foreground/60 transition-colors"
            />
          </div>
        </div>

        <button
          disabled={!canStart}
          onClick={() =>
            onStart({
              title: title.trim(),
              composer: isClassical ? byline.trim() : undefined,
              artist: !isClassical ? byline.trim() : undefined,
              focus: focus.trim(),
              tags,
              goal: goal.trim(),
            })
          }
          className="mt-12 w-full bg-ink text-paper rounded-full py-4 flex items-center justify-center gap-2 font-medium tracking-wide disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition shadow-elev"
        >
          Begin practice <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
