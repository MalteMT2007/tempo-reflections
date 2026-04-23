export type Session = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  focus: string;
  tags: string[];
  goal?: string;
  notes: string;
  improved?: string;
  needsWork?: string;
  rating?: number; // 1-5
};

const KEY = "practice.sessions.v1";

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

  // Streak: consecutive days with at least one session, ending today or yesterday
  const days = new Set(sessions.map((s) => startOfDay(new Date(s.startedAt))));
  let streak = 0;
  let cursor = today;
  if (!days.has(cursor)) cursor -= 86400000;
  while (days.has(cursor)) {
    streak++;
    cursor -= 86400000;
  }

  // Last 7 days breakdown
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
