import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Genre, Profile } from "@/lib/storage";

type Props = {
  onComplete: (p: Profile) => void;
};

const COMMON_INSTRUMENTS = [
  "Piano", "Violin", "Cello", "Guitar", "Voice", "Flute", "Clarinet", "Saxophone", "Drums", "Bass",
];

export const Onboarding = ({ onComplete }: Props) => {
  const [step, setStep] = useState<0 | 1>(0);
  const [instrument, setInstrument] = useState("");
  const [genre, setGenre] = useState<Genre | null>(null);

  const finish = (g: Genre) => {
    onComplete({
      instrument: instrument.trim(),
      genre: g,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-fade-in-slow">
      <div className="max-w-md mx-auto px-6 pt-16 pb-12 min-h-screen flex flex-col">
        <div className="mb-10 animate-fade-in">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Welcome</p>
          <h1 className="font-serif text-4xl font-light leading-tight text-balance text-ink">
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
          <div className="space-y-4 animate-fade-in flex-1">
            <button
              onClick={() => { setGenre("classical"); finish("classical"); }}
              className="w-full text-left rounded-lg border border-border hover:border-ink/40 p-5 transition group bg-card/40"
            >
              <p className="font-serif text-2xl font-light text-ink">Classical</p>
              <p className="text-sm text-ink-soft mt-1 font-serif italic">
                Pieces by composer — Bach, Debussy, Brahms…
              </p>
            </button>
            <button
              onClick={() => { setGenre("other"); finish("other"); }}
              className="w-full text-left rounded-lg border border-border hover:border-ink/40 p-5 transition group bg-card/40"
            >
              <p className="font-serif text-2xl font-light text-ink">Other</p>
              <p className="text-sm text-ink-soft mt-1 font-serif italic">
                Songs by artist — jazz, rock, pop, folk, your own…
              </p>
            </button>
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
