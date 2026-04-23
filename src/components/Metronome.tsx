import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Play, Pause, Settings2 } from "lucide-react";

type Props = { compact?: boolean };

type SoundKind = "click" | "wood" | "beep" | "tick";

const PRESET_SIGS = [
  "2/4", "3/4", "4/4", "6/8", "9/8", "12/8", "5/4", "7/8", "4/16", "3/8",
];

const SOUNDS: { value: SoundKind; label: string }[] = [
  { value: "click", label: "Click" },
  { value: "wood", label: "Wood" },
  { value: "beep", label: "Beep" },
  { value: "tick", label: "Tick" },
];

export const Metronome = ({ compact = false }: Props) => {
  const [bpm, setBpm] = useState(72);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [noteValue, setNoteValue] = useState(4); // denominator
  const [sigDraft, setSigDraft] = useState("4/4");
  const [accents, setAccents] = useState<boolean[]>([true, false, false, false]);
  const [sound, setSound] = useState<SoundKind>("click");
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const beatRef = useRef(0);
  const accentsRef = useRef(accents);
  const soundRef = useRef(sound);

  useEffect(() => { accentsRef.current = accents; }, [accents]);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current!;
  };

  const playSound = (accent: boolean) => {
    const ctx = ensureCtx();
    const t = ctx.currentTime;
    const kind = soundRef.current;

    if (kind === "wood") {
      // Short noise burst with bandpass for woodblock feel
      const buffer = ctx.createBuffer(1, 0.05 * ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = accent ? 2200 : 1500;
      bp.Q.value = 8;
      const gain = ctx.createGain();
      gain.gain.value = accent ? 0.5 : 0.32;
      src.connect(bp).connect(gain).connect(ctx.destination);
      src.start(t);
      src.stop(t + 0.05);
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (kind === "beep") {
      osc.type = "sine";
      osc.frequency.value = accent ? 1200 : 800;
    } else if (kind === "tick") {
      osc.type = "triangle";
      osc.frequency.value = accent ? 2400 : 1800;
    } else {
      osc.type = "square";
      osc.frequency.value = accent ? 1600 : 1100;
    }
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ctx.destination);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.22, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.start(t);
    osc.stop(t + 0.07);
  };

  // Keep accents array sized to beatsPerBar
  useEffect(() => {
    setAccents((curr) => {
      if (curr.length === beatsPerBar) return curr;
      const next = Array.from({ length: beatsPerBar }, (_, i) => curr[i] ?? (i === 0));
      return next;
    });
  }, [beatsPerBar]);

  // Adjust interval for note value (denominator). 4 = quarter note baseline.
  // For 8th-note feel (e.g. 6/8), beats tick faster.
  const beatMs = (60000 / bpm) * (4 / noteValue);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    beatRef.current = 0;
    setBeat(0);
    playSound(accentsRef.current[0] ?? true);
    intervalRef.current = window.setInterval(() => {
      beatRef.current = (beatRef.current + 1) % beatsPerBar;
      setBeat(beatRef.current);
      playSound(accentsRef.current[beatRef.current] ?? false);
    }, beatMs);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, beatMs, beatsPerBar]);

  const adjust = (delta: number) => setBpm((b) => Math.max(30, Math.min(240, b + delta)));

  const applySig = (s: string) => {
    const m = s.match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/);
    if (!m) return;
    const num = Math.max(1, Math.min(16, Number(m[1])));
    const den = Math.max(1, Math.min(32, Number(m[2])));
    if (![1, 2, 4, 8, 16, 32].includes(den)) return;
    setBeatsPerBar(num);
    setNoteValue(den);
    setSigDraft(`${num}/${den}`);
  };

  const toggleAccent = (i: number) => {
    setAccents((curr) => curr.map((a, idx) => (idx === i ? !a : a)));
  };

  const tempoMark =
    bpm < 60 ? "Largo" :
    bpm < 76 ? "Adagio" :
    bpm < 108 ? "Andante" :
    bpm < 120 ? "Moderato" :
    bpm < 156 ? "Allegro" :
    bpm < 176 ? "Vivace" : "Presto";

  return (
    <div className={`rounded-lg border border-border bg-card/60 backdrop-blur-sm ${compact ? "p-4" : "p-6"} shadow-soft`}>
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Metronome</span>
        <span className="font-serif italic text-sm text-ink-soft">{tempoMark}</span>
      </div>

      <div className="flex items-center justify-center gap-6 mb-5">
        <button
          onClick={() => adjust(-1)}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Decrease BPM"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="font-serif text-5xl font-light tabular leading-none text-ink">{bpm}</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">bpm</div>
        </div>
        <button
          onClick={() => adjust(1)}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Increase BPM"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <input
        type="range"
        min={30}
        max={240}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        className="w-full accent-ink mb-5"
      />

      {/* Beat indicators with accent toggles */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Beats — tap to set accent
          </span>
          <span className="text-[10px] tabular text-muted-foreground">
            {beatsPerBar}/{noteValue}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: beatsPerBar }).map((_, i) => {
            const isAccent = accents[i];
            const isActive = running && beat === i;
            return (
              <button
                key={i}
                onClick={() => toggleAccent(i)}
                className={`flex-1 min-w-[24px] h-8 rounded-md border transition-all flex items-center justify-center text-[10px] tabular ${
                  isAccent
                    ? "bg-ink text-paper border-ink"
                    : "border-border text-ink-soft hover:border-ink/40"
                } ${isActive ? "ring-2 ring-accent ring-offset-1 ring-offset-background" : ""}`}
                aria-label={`Beat ${i + 1} ${isAccent ? "accent" : "normal"}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Settings
        </button>
        <button
          onClick={() => setRunning((r) => !r)}
          className="h-10 w-10 rounded-full bg-ink text-paper flex items-center justify-center hover:opacity-90 transition"
          aria-label={running ? "Stop metronome" : "Start metronome"}
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
      </div>

      {showSettings && (
        <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Time signature</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_SIGS.map((s) => (
                <button
                  key={s}
                  onClick={() => applySig(s)}
                  className={`text-[11px] px-2 py-1 rounded-md border transition ${
                    `${beatsPerBar}/${noteValue}` === s
                      ? "bg-ink text-paper border-ink"
                      : "border-border text-ink-soft hover:border-ink/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={sigDraft}
                onChange={(e) => setSigDraft(e.target.value)}
                onBlur={() => applySig(sigDraft)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applySig(sigDraft); } }}
                placeholder="e.g. 7/16"
                className="flex-1 bg-transparent border-b border-border focus:border-ink outline-none py-1 text-sm tabular placeholder:italic placeholder:text-muted-foreground/60"
              />
              <button
                onClick={() => applySig(sigDraft)}
                className="text-[11px] px-3 py-1 rounded-md border border-border text-ink-soft hover:border-ink/40"
              >
                Set
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              Denominator must be 1, 2, 4, 8, 16 or 32.
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Sound</p>
            <div className="flex flex-wrap gap-1.5">
              {SOUNDS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setSound(s.value); playSound(true); }}
                  className={`text-[11px] px-3 py-1.5 rounded-full border transition ${
                    sound === s.value
                      ? "bg-ink text-paper border-ink"
                      : "border-border text-ink-soft hover:border-ink/40"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
