import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Genre, Profile } from "@/lib/storage";

type Props = {
  onComplete: (p: Profile) => void;
};

const COMMON_INSTRUMENTS = [
  "Piano", "Violin", "Cello", "Guitar", "Voice", "Flute", "Clarinet", "Saxophone", "Drums", "Bass",
];

const GENRES: { value: Genre; label: string; hint: string }[] = [
  { value: "classical", label: "Classical", hint: "Pieces by composer — Bach, Debussy, Brahms…" },
  { value: "jazz", label: "Jazz", hint: "Standards, improvisation, swing…" },
  { value: "rock", label: "Rock", hint: "Riffs, songs, bands…" },
  { value: "pop", label: "Pop", hint: "Songs, chord progressions, hooks…" },
  { value: "folk", label: "Folk", hint: "Traditional songs, fingerstyle…" },
];

export const Onboarding = ({ onComplete }: Props) => {
  const [step, setStep] = useState<0 | 1>(0);
  const [instrument, setInstrument] = useState("");
  const [ownLabel, setOwnLabel] = useState("");
  const [showOwn, setShowOwn] = useState(false);

  const finish = (g: Genre, label?: string) => {
    onComplete({
      instrument: instrument.trim(),
      genre: g,
      genreLabel: label,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-fade-in-slow">
      <div className="max-w-md mx-auto px-6 pt-16 pb-12 min-h-screen flex flex-col">
        <div className="mb-10 animate-fade-in">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Welcome</p>
          <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight leading-none">
            {step === 0 ? "Which instrument do you play?" : "And what kind of music?"}
          </h1>
          <p className="font-serif italic text-ink-soft mt-3">
            {step === 0
              ? "We'll tailor your practice space to it."
              : "This shapes how we describe the pieces you work on."}
          </p>
        </div>

        {step === 0 && (
          <div className="space-y-6 animate-fade-in flex-1">
            <input
              autoFocus
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              placeholder="e.g. Violin"
              className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-3 font-serif text-2xl placeholder:text-muted-foreground/60 placeholder:italic transition-colors"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Or pick one</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_INSTRUMENTS.map((i) => (
                  <button
                    key={i}
                    onClick={() => setInstrument(i)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      instrument === i
                        ? "bg-ink text-paper border-ink"
                        : "border-border text-ink-soft hover:border-ink/40"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <button
              disabled={!instrument.trim()}
              onClick={() => setStep(1)}
              className="mt-6 w-full bg-ink text-paper rounded-full py-4 flex items-center justify-center gap-2 font-medium tracking-wide disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition shadow-elev"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 animate-fade-in flex-1">
            {GENRES.map((g) => (
              <button
                key={g.value}
                onClick={() => finish(g.value)}
                className="w-full text-left rounded-lg border border-border hover:border-ink/40 p-4 transition bg-card/40"
              >
                <p className="font-serif text-xl font-light text-ink">{g.label}</p>
                <p className="text-xs text-ink-soft mt-1 font-serif italic">{g.hint}</p>
              </button>
            ))}

            {!showOwn ? (
              <button
                onClick={() => setShowOwn(true)}
                className="w-full text-left rounded-lg border border-dashed border-border hover:border-ink/40 p-4 transition bg-card/20"
              >
                <p className="font-serif text-xl font-light text-ink">Your own…</p>
                <p className="text-xs text-ink-soft mt-1 font-serif italic">Name your style.</p>
              </button>
            ) : (
              <div className="rounded-lg border border-border p-4 bg-card/40 space-y-3">
                <input
                  autoFocus
                  value={ownLabel}
                  onChange={(e) => setOwnLabel(e.target.value)}
                  placeholder="e.g. Bluegrass, Flamenco, Worship…"
                  className="w-full bg-transparent border-b border-border focus:border-ink outline-none py-2 font-serif text-lg placeholder:text-muted-foreground/60 placeholder:italic"
                />
                <button
                  disabled={!ownLabel.trim()}
                  onClick={() => finish("own", ownLabel.trim())}
                  className="w-full bg-ink text-paper rounded-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-30 hover:opacity-90 transition"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => setStep(0)}
              className="text-xs text-muted-foreground hover:text-ink transition mt-4"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
