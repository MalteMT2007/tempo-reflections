import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Play, Pause } from "lucide-react";

type Props = { compact?: boolean };

export const Metronome = ({ compact = false }: Props) => {
  const [bpm, setBpm] = useState(72);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const beatRef = useRef(0);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current!;
  };

  const click = (accent: boolean) => {
    const ctx = ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1100;
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.22, t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.start(t);
    osc.stop(t + 0.07);
  };

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    beatRef.current = 0;
    setBeat(0);
    click(true);
    const interval = 60000 / bpm;
    intervalRef.current = window.setInterval(() => {
      beatRef.current = (beatRef.current + 1) % beatsPerBar;
      setBeat(beatRef.current);
      click(beatRef.current === 0);
    }, interval);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, bpm, beatsPerBar]);

  const adjust = (delta: number) => setBpm((b) => Math.max(30, Math.min(240, b + delta)));

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

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1.5">
          {Array.from({ length: beatsPerBar }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-all duration-150 ${
                running && beat === i
                  ? i === 0
                    ? "bg-accent scale-150"
                    : "bg-ink scale-150"
                  : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={beatsPerBar}
            onChange={(e) => setBeatsPerBar(Number(e.target.value))}
            className="bg-transparent border border-border rounded-md px-2 py-1 text-xs"
            aria-label="Time signature"
          >
            <option value={2}>2/4</option>
            <option value={3}>3/4</option>
            <option value={4}>4/4</option>
            <option value={6}>6/8</option>
          </select>
          <button
            onClick={() => setRunning((r) => !r)}
            className="h-10 w-10 rounded-full bg-ink text-paper flex items-center justify-center hover:opacity-90 transition"
            aria-label={running ? "Stop metronome" : "Start metronome"}
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
