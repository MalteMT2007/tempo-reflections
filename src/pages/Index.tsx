import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { SessionSetup } from "@/components/SessionSetup";
import { PracticeMode } from "@/components/PracticeMode";
import { Reflection } from "@/components/Reflection";
import { Onboarding } from "@/components/Onboarding";
import {
  Profile,
  Session,
  loadProfile,
  saveProfile,
  loadSessions,
  saveSession,
  computePieceStats,
} from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, updateProfile, recordSession } from "@/lib/api";

type Phase = "dashboard" | "setup" | "practice" | "reflect";
type Resume = { title: string; byline: string } | null;

type Draft = {
  title: string;
  composer?: string;
  artist?: string;
  focus: string;
  tags: string[];
  goal: string;
  startedAt: number;
  durationSec: number;
  notes: string;
};

const Index = () => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("dashboard");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [resume, setResume] = useState<Resume>(null);

  const recentPieces = computePieceStats(sessions).slice(0, 5).map((p) => ({
    title: p.title,
    byline: p.byline,
  }));

  // Load profile: try Cloud first, fall back to local
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadProfile();
      if (user) {
        try {
          const db = await getProfile(user.id);
          if (db?.instrument && db?.genre) {
            const merged: Profile = {
              instrument: db.instrument,
              genre: (db.genre as Profile["genre"]) ?? "classical",
              genreLabel: db.genre_label ?? undefined,
              createdAt: local?.createdAt ?? Date.now(),
            };
            if (!cancelled) {
              saveProfile(merged);
              setProfile(merged);
              setProfileLoaded(true);
            }
            return;
          }
        } catch { /* ignore */ }
      }
      if (!cancelled) {
        setProfile(local);
        setProfileLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    setSessions(loadSessions());
    document.title = "Practice — A companion for musicians";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "A minimal, distraction-free practice companion for musicians: timer, metronome, notebook, and reflective progress tracking.";
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
    // Sync to cloud (fire and forget — public visibility is piece + time only)
    if (user) {
      recordSession({
        title: s.title,
        byline: s.composer || s.artist,
        duration_sec: s.durationSec,
        started_at: s.startedAt,
        ended_at: s.endedAt,
      }).catch(() => {});
    }
    setDraft(null);
    setPhase("dashboard");
  };

  if (!profileLoaded) return <main className="min-h-screen" />;

  if (!profile) {
    return (
      <main className="min-h-screen">
        <Onboarding
          onComplete={(p) => {
            saveProfile(p);
            setProfile(p);
            if (user) {
              updateProfile(user.id, {
                instrument: p.instrument,
                genre: p.genre,
                genre_label: p.genreLabel ?? null,
              }).catch(() => {});
            }
          }}
        />
      </main>
    );
  }

  const byline = (d: Draft) => d.composer || d.artist || "";

  return (
    <main className="min-h-screen">
      <Dashboard
        sessions={sessions}
        onStart={(r) => {
          setResume(r ?? null);
          setPhase("setup");
        }}
      />

      {phase === "setup" && (
        <SessionSetup
          genre={profile.genre}
          recentPieces={recentPieces}
          prefill={resume ?? undefined}
          onCancel={() => { setResume(null); setPhase("dashboard"); }}
          onStart={({ title, composer, artist, focus, tags, goal }) => {
            setDraft({
              title,
              composer,
              artist,
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
          title={draft.title}
          byline={byline(draft)}
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
          tags={draft.tags}
          onSkip={() =>
            finalize({
              id: crypto.randomUUID(),
              startedAt: draft.startedAt,
              endedAt: Date.now(),
              durationSec: draft.durationSec,
              title: draft.title,
              composer: draft.composer,
              artist: draft.artist,
              focus: draft.focus,
              tags: draft.tags,
              goal: draft.goal || undefined,
              notes: draft.notes,
            })
          }
          onSave={({ improved, needsWork, rating, tagRatings }) =>
            finalize({
              id: crypto.randomUUID(),
              startedAt: draft.startedAt,
              endedAt: Date.now(),
              durationSec: draft.durationSec,
              title: draft.title,
              composer: draft.composer,
              artist: draft.artist,
              focus: draft.focus,
              tags: draft.tags,
              goal: draft.goal || undefined,
              notes: draft.notes,
              improved,
              needsWork,
              rating,
              tagRatings,
            })
          }
        />
      )}
    </main>
  );
};

export default Index;
