import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbSession } from "./api";

const DAY_MS = 86_400_000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  // Monday-based week
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

export type PracticeStats = {
  sessions: DbSession[];
  weeklySeconds: number;
  weeklyByDay: number[]; // length 7, Mon..Sun
  streak: number;
  totalSeconds: number;
  byPiece: { key: string; title: string; byline: string | null; seconds: number; count: number }[];
};

async function fetchStats(): Promise<PracticeStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { sessions: [], weeklySeconds: 0, weeklyByDay: [0, 0, 0, 0, 0, 0, 0], streak: 0, totalSeconds: 0, byPiece: [] };
  }
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const sessions = (data ?? []) as DbSession[];

  const now = new Date();
  const weekStart = startOfWeek(now);
  const weeklyByDay = [0, 0, 0, 0, 0, 0, 0];
  let weeklySeconds = 0;
  let totalSeconds = 0;
  const pieceMap = new Map<string, { title: string; byline: string | null; seconds: number; count: number }>();

  for (const s of sessions) {
    totalSeconds += s.duration_sec;
    const d = new Date(s.started_at);
    if (d >= weekStart) {
      const idx = Math.min(6, Math.floor((d.getTime() - weekStart.getTime()) / DAY_MS));
      weeklyByDay[idx] += s.duration_sec;
      weeklySeconds += s.duration_sec;
    }
    const key = `${(s.title || "").toLowerCase().trim()}|${(s.byline || "").toLowerCase().trim()}`;
    const cur = pieceMap.get(key);
    if (cur) { cur.seconds += s.duration_sec; cur.count += 1; }
    else pieceMap.set(key, { title: s.title, byline: s.byline, seconds: s.duration_sec, count: 1 });
  }

  // Streak: consecutive days ending today (or yesterday) with any session
  const daySet = new Set<string>();
  for (const s of sessions) daySet.add(startOfDay(new Date(s.started_at)).toDateString());
  let streak = 0;
  let cursor = startOfDay(now);
  if (!daySet.has(cursor.toDateString())) cursor = new Date(cursor.getTime() - DAY_MS);
  while (daySet.has(cursor.toDateString())) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  const byPiece = Array.from(pieceMap.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.seconds - a.seconds);

  return { sessions, weeklySeconds, weeklyByDay, streak, totalSeconds, byPiece };
}

export function usePracticeStats() {
  return useQuery({
    queryKey: ["practice-stats"],
    queryFn: fetchStats,
    staleTime: 30_000,
  });
}
