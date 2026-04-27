import { useEffect, useRef, useState } from "react";
import { ArrowRight, X, Plus, Music2 } from "lucide-react";
import { Genre, isClassicalGenre } from "@/lib/storage";
import { searchClassicalPieces, PieceSuggestion } from "@/lib/pieceSearch";

type RecentPiece = { title: string; byline: string };

type Props = {
  genre: Genre;
  recentPieces?: RecentPiece[];
  prefill?: { title: string; byline: string };
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

const SUGGESTED_TAGS = ["technique", "scales", "repertoire", "sight-reading", "etudes", "improv", "tone", "rhythm", "dynamics", "intonation"];

export const SessionSetup = ({ genre, recentPieces = [], prefill, onStart, onCancel }: Props) => {
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [byline, setByline] = useState(prefill?.byline ?? ""); // composer or artist
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [goal, setGoal] = useState("");

  const [suggestions, setSuggestions] = useState<PieceSuggestion[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isClassical = isClassicalGenre(genre);
  const titleLabel = isClassical ? "Piece" : "Song";
  const bylineLabel = isClassical ? "Composer" : "Artist";
  const titlePh = isClassical ? "Bach — Partita No. 2, Allemande" : "Blackbird";
  const bylinePh = isClassical ? "J. S. Bach" : "The Beatles";

  // Debounced classical piece search
  useEffect(() => {
    if (!isClassical) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (title.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      searchClassicalPieces(title, ctrl.signal).then((res) => {
        setSuggestions(res);
      });
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [title, isClassical]);

  const toggleTag = (t: string) =>
    setTags((curr) => (curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t]));

  const addCustomTag = () => {
    const t = customTag.trim().toLowerCase();
    if (!t) return;
    if (!tags.includes(t)) setTags((curr) => [...curr, t]);
    setCustomTag("");
  };

  const pickSuggestion = (s: PieceSuggestion) => {
    setTitle(s.title);
    if (s.composer) setByline(s.composer);
    setShowSugg(false);
    setSuggestions([]);
  };

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
          {/* Title with autocomplete */}
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{titleLabel}</p>
            <input
              autoFocus
              value={title}
              onChange={(e) => { setTitle(e.target.value); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => window.setTimeout(() => setShowSugg(false), 150)}
              placeholder={titlePh}
              className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-xl placeholder:text-muted-foreground/60 placeholder:italic transition-colors"
            />
            {isClassical && showSugg && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-elev z-10 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition border-b border-border last:border-0"
                  >
                    <p className="font-serif text-sm text-ink truncate">{s.title}</p>
                    {s.composer && (
                      <p className="text-[11px] font-serif italic text-ink-soft truncate">{s.composer}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
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

          {/* Focus areas (merged: tags + custom) */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Focus areas</p>
            <p className="text-xs text-ink-soft font-serif italic mb-3">
              Pick what you want to work on — you'll rate each one after.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
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
              {tags
                .filter((t) => !SUGGESTED_TAGS.includes(t))
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className="text-xs px-3 py-1.5 rounded-full border bg-ink text-paper border-ink"
                  >
                    {t}
                  </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addCustomTag(); }
                }}
                placeholder="Add your own focus…"
                className="flex-1 bg-transparent border-b border-border focus:border-ink outline-none py-1.5 text-sm placeholder:italic placeholder:text-muted-foreground/60"
              />
              <button
                onClick={addCustomTag}
                disabled={!customTag.trim()}
                className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-ink-soft hover:border-ink/40 disabled:opacity-30"
                aria-label="Add focus"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
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
              focus: "",
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
