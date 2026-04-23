import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { SessionSetup } from "@/components/SessionSetup";
import { PracticeMode } from "@/components/PracticeMode";
import { Reflection } from "@/components/Reflection";
import { Session, loadSessions, saveSession } from "@/lib/storage";

type Phase = "dashboard" | "setup" | "practice" | "reflect";

type Draft = {
  focus: string;
  tags: string[];
  goal: string;
  startedAt: number;
  durationSec: number;
  notes: string;
};

const Index = () => {
  const [phase, setPhase] = useState<Phase>("dashboard");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    setSessions(loadSessions());
    document.title = "Practice — A companion for musicians";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "A minimal, distraction-free practice companion for musicians: timer, metronome, notes, and reflective progress tracking.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  const finalize = (s: Session) => {
    saveSession(s);
    setSessions(loadSessions());
    setDraft(null);
    setPhase("dashboard");
  };

  return (
    <main className="min-h-screen">
      <Dashboard sessions={sessions} onStart={() => setPhase("setup")} />

      {phase === "setup" && (
        <SessionSetup
          onCancel={() => setPhase("dashboard")}
          onStart={({ focus, tags, goal }) => {
            setDraft({
              focus,
              tags,
              goal,
              startedAt: Date.now(),
              durationSec: 0,
              notes: "",
            });
            setPhase("practice");
          }}
        />
      )}

      {phase === "practice" && draft && (
        <PracticeMode
          focus={draft.focus}
          tags={draft.tags}
          goal={draft.goal}
          startedAt={draft.startedAt}
          onEnd={({ durationSec, notes }) => {
            setDraft({ ...draft, durationSec, notes });
            setPhase("reflect");
          }}
        />
      )}

      {phase === "reflect" && draft && (
        <Reflection
          durationSec={draft.durationSec}
          onSkip={() =>
            finalize({
              id: crypto.randomUUID(),
              startedAt: draft.startedAt,
              endedAt: Date.now(),
              durationSec: draft.durationSec,
              focus: draft.focus,
              tags: draft.tags,
              goal: draft.goal || undefined,
              notes: draft.notes,
            })
          }
          onSave={({ improved, needsWork, rating }) =>
            finalize({
              id: crypto.randomUUID(),
              startedAt: draft.startedAt,
              endedAt: Date.now(),
              durationSec: draft.durationSec,
              focus: draft.focus,
              tags: draft.tags,
              goal: draft.goal || undefined,
              notes: draft.notes,
              improved,
              needsWork,
              rating,
            })
          }
        />
      )}
    </main>
  );
};

export default Index;
