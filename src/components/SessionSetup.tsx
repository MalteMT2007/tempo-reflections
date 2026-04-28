import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
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

const SUGGESTED_TAGS = ["technique", "scales", "repertoire", "sight-reading", "etudes", "tone", "rhythm", "intonation"];

export const SessionSetup = ({ genre, recentPieces = [], prefill, onStart, onCancel }: Props) => {
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [byline, setByline] = useState(prefill?.byline ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const [showAdv, setShowAdv] = useState(false);
  const [goal, setGoal] = useState("");

  const [suggestions, setSuggestions] = useState<PieceSuggestion[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isClassical = isClassicalGenre(genre);
  const titlePh = isClassical ? "Bach — Allemande" : "Blackbird";
  const bylinePh = isClassical ? "J. S. Bach" : "The Beatles";

  useEffect(() => {
    if (!isClassical) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (title.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      searchClassicalPieces(title, ctrl.signal).then(setSuggestions);
    }, 350);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [title, isClassical]);

  const toggleTag = (t: string) =>
    setTags((curr) => (curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t]));

  const pickSuggestion = (s: PieceSuggestion) => {
    setTitle(s.title);
    if (s.composer) setByline(s.composer);
    setShowSugg(false);
    setSuggestions([]);
  };

  const canStart = title.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-background animate-fade-in overflow-y-auto">
      <div className="max-w-md mx-auto px-6 pt-5 pb-12">
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="h-10 w-10 rounded-full hover:bg-muted grid place-items-center spring-tap"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h1 className="mt-6 text-[34px] font-semibold tracking-tight leading-tight">
          What are you<br />working on?
        </h1>

        {recentPieces.length > 0 && (
          <div className="mt-7 -mx-6 px-6 overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {recentPieces.map((p, i) => {
                const active = title.trim().toLowerCase() === p.title.toLowerCase();
                return (
                  <button
                    key={i}
                    onClick={() => { setTitle(p.title); setByline(p.byline); }}
                    className={`shrink-0 rounded-full px-4 h-9 text-[13px] transition-colors ${
                      active
                        ? "bg-foreground text-background"
                        : "bg-muted text-foreground/80 hover:bg-muted/70"
                    }`}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-7 space-y-5">
          <div className="relative">
            <input
              autoFocus
              value={title}
              onChange={(e) => { setTitle(e.target.value); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => window.setTimeout(() => setShowSugg(false), 150)}
              placeholder={titlePh}
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-3 text-[22px] font-medium placeholder:text-muted-foreground/50 transition-colors"
            />
            {isClassical && showSugg && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-background border border-border rounded-xl shadow-elev z-10 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted transition border-b border-border last:border-0"
                  >
                    <p className="text-[14px] truncate">{s.title}</p>
                    {s.composer && <p className="text-[12px] text-muted-foreground truncate">{s.composer}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            value={byline}
            onChange={(e) => setByline(e.target.value)}
            placeholder={bylinePh}
            className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2.5 text-[16px] text-muted-foreground placeholder:text-muted-foreground/50 transition-colors"
          />
        </div>

        {/* Optional details */}
        <button
          onClick={() => setShowAdv((v) => !v)}
          className="mt-8 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdv ? "Hide details" : "Add focus or goal"}
        </button>

        {showAdv && (
          <div className="mt-4 space-y-5 animate-fade-in">
            <div>
              <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground mb-2.5">Focus</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TAGS.map((t) => {
                  const active = tags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTag(t)}
                      className={`text-[13px] px-3.5 py-1.5 rounded-full border transition-colors ${
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Goal — e.g. mm. 24–48 at ♩=80"
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-[14px] placeholder:text-muted-foreground/50"
            />
          </div>
        )}

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
          className="mt-10 w-full bg-foreground text-background rounded-full py-4 flex items-center justify-center gap-2 text-[15px] font-medium disabled:opacity-30 spring-tap shadow-elev"
        >
          Start <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
