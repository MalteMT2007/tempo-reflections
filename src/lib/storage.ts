export type Genre = "classical" | "other";

export type Profile = {
  instrument: string;
  genre: Genre;
  createdAt: number;
};

export type TagRating = {
  tag: string;
  rating: number; // 1-5, "how much better does it feel?"
};

export type Session = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  // Piece info — classical uses title/composer, other uses title/artist
  title: string;
  composer?: string;
  artist?: string;
  focus: string; // free-text focus for the session
  tags: string[];
  goal?: string;
  notes: string; // legacy single-note (kept for compat)
  noteEntries?: NoteEntry[];
  improved?: string;
  needsWork?: string;
  rating?: number; // 1-5 overall focus quality
  tagRatings?: TagRating[];
};

export type NoteEntry = {
  id: string;
  at: number;
  text: string;
};

// A persisted notebook scoped to a piece (across sessions)
export type Notebook = {
  pieceKey: string; // normalized title|composer or title|artist
  title: string;
  byline: string; // composer or artist
  entries: NoteEntry[];
};

const KEY = "practice.sessions.v1";
const PROFILE_KEY = "practice.profile.v1";
const NOTEBOOK_KEY = "practice.notebooks.v1";

// Profile
export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

// Sessions
export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

export function saveSession(s: Session) {
  const all = loadSessions();
  all.unshift(s);
  localStorage.setItem(KEY, JSON.stringify(all));
}

// Notebooks
export function pieceKey(title: string, byline: string) {
  return `${title.trim().toLowerCase()}|${byline.trim().toLowerCase()}`;
}

export function loadNotebooks(): Record<string, Notebook> {
  try {
    const raw = localStorage.getItem(NOTEBOOK_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Notebook>) : {};
  } catch {
    return {};
  }
}

export function loadNotebook(title: string, byline: string): Notebook {
  const all = loadNotebooks();
  const key = pieceKey(title, byline);
  return (
    all[key] ?? {
      pieceKey: key,
      title,
      byline,
      entries: [],
    }
  );
}

export function saveNotebook(nb: Notebook) {
  const all = loadNotebooks();
  all[nb.pieceKey] = nb;
  localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(all));
}

export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatMinutes(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export function computeStats(sessions: Session[]) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const weekAgo = today - 6 * 86400000;

  const todaySec = sessions
    .filter((s) => s.startedAt >= today)
    .reduce((a, b) => a + b.durationSec, 0);
  const weekSec = sessions
    .filter((s) => s.startedAt >= weekAgo)
    .reduce((a, b) => a + b.durationSec, 0);

  const days = new Set(sessions.map((s) => startOfDay(new Date(s.startedAt))));
  let streak = 0;
  let cursor = today;
  if (!days.has(cursor)) cursor -= 86400000;
  while (days.has(cursor)) {
    streak++;
    cursor -= 86400000;
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = today - (6 - i) * 86400000;
    const total = sessions
      .filter((s) => {
        const d = startOfDay(new Date(s.startedAt));
        return d === day;
      })
      .reduce((a, b) => a + b.durationSec, 0);
    return { day, total };
  });

  return { todaySec, weekSec, streak, last7, total: sessions.length };
}
