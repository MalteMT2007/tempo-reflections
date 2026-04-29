/**
 * library.ts
 * Smart-collection aggregator for the Library page.
 * Builds Composers / Instruments / Tags(folders) / Ensembles / Concerts / Shared / Favorites
 * groups from existing score data, plus per-score practice statistics.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Score } from "./scores";

export type CollectionKind =
  | "recent"
  | "composer"
  | "instrument"
  | "tag"
  | "ensemble"
  | "concert"
  | "shared"
  | "favorites"
  | "all";

export type Collection = {
  kind: CollectionKind;
  /** Stable id within its kind (e.g. composer name, ensemble id). */
  id: string;
  label: string;
  /** Sublabel shown small under the title (e.g. "12 scores"). */
  subtitle?: string;
  count: number;
};

export type ScoreWithStats = Score & {
  practice_seconds: number;
  practice_sessions: number;
  last_practiced_at: string | null;
  shared_by_me: boolean;   // owner = me
};

// ---------- Collections ----------

function bucketBy<T>(items: T[], key: (t: T) => string | null | undefined) {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = (key(it) || "").trim();
    if (!k) continue;
    const arr = m.get(k) ?? [];
    arr.push(it);
    m.set(k, arr);
  }
  return m;
}

export function buildComposerCollections(scores: Score[]): Collection[] {
  const m = bucketBy(scores, (s) => s.composer);
  return Array.from(m.entries())
    .map(([name, list]) => ({
      kind: "composer" as const,
      id: name,
      label: name,
      count: list.length,
      subtitle: `${list.length} ${list.length === 1 ? "stycke" : "stycken"}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function buildInstrumentCollections(scores: Score[]): Collection[] {
  const m = bucketBy(scores, (s) => s.instrument);
  return Array.from(m.entries())
    .map(([name, list]) => ({
      kind: "instrument" as const,
      id: name,
      label: name,
      count: list.length,
      subtitle: `${list.length} ${list.length === 1 ? "stycke" : "stycken"}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function buildTagCollections(scores: Score[]): Collection[] {
  const m = new Map<string, number>();
  for (const s of scores) {
    for (const tRaw of s.tags || []) {
      const t = (tRaw || "").trim();
      if (!t) continue;
      m.set(t, (m.get(t) ?? 0) + 1);
    }
  }
  return Array.from(m.entries())
    .map(([t, n]) => ({
      kind: "tag" as const,
      id: t,
      label: t,
      count: n,
      subtitle: `${n} ${n === 1 ? "stycke" : "stycken"}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// ---------- Ensembles a user has access to ----------

export type EnsembleCollection = Collection & { ensemble_id: string };

export async function listMyEnsembleCollections(userId: string): Promise<EnsembleCollection[]> {
  const { data: members } = await supabase
    .from("ensemble_members")
    .select("ensemble_id, ensembles(id, name)")
    .eq("user_id", userId);
  const ensembles = (members ?? [])
    .map((r: { ensembles: { id: string; name: string } | null }) => r.ensembles)
    .filter((e): e is { id: string; name: string } => !!e);
  if (ensembles.length === 0) return [];
  const ids = ensembles.map((e) => e.id);
  const { data: shares } = await supabase
    .from("score_ensembles")
    .select("ensemble_id")
    .in("ensemble_id", ids);
  const counts = new Map<string, number>();
  for (const r of (shares ?? []) as { ensemble_id: string }[]) {
    counts.set(r.ensemble_id, (counts.get(r.ensemble_id) ?? 0) + 1);
  }
  return ensembles.map((e) => ({
    kind: "ensemble" as const,
    id: e.id,
    ensemble_id: e.id,
    label: e.name,
    count: counts.get(e.id) ?? 0,
    subtitle: `${counts.get(e.id) ?? 0} delade`,
  }));
}

/** Returns score IDs shared into a given ensemble. */
export async function listScoreIdsInEnsemble(ensembleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("score_ensembles")
    .select("score_id")
    .eq("ensemble_id", ensembleId);
  if (error) throw error;
  return (data ?? []).map((r: { score_id: string }) => r.score_id);
}

// ---------- Practice stats per score ----------

/**
 * Aggregates practice time per score:
 * 1) Direct via session_scores (authoritative link)
 * 2) Fallback: title+composer match against practice_sessions
 */
export async function getPracticeStatsByScore(scores: Score[], userId: string) {
  const map = new Map<string, { seconds: number; sessions: number; last: string | null }>();
  if (scores.length === 0) return map;

  // 1) Linked sessions
  const scoreIds = scores.map((s) => s.id);
  const { data: links } = await supabase
    .from("session_scores")
    .select("score_id, session_id, practice_sessions!inner(duration_sec, started_at, user_id)")
    .in("score_id", scoreIds);
  for (const row of (links ?? []) as Array<{
    score_id: string;
    practice_sessions: { duration_sec: number; started_at: string; user_id: string } | null;
  }>) {
    const ps = row.practice_sessions;
    if (!ps || ps.user_id !== userId) continue;
    const cur = map.get(row.score_id) ?? { seconds: 0, sessions: 0, last: null };
    cur.seconds += ps.duration_sec || 0;
    cur.sessions += 1;
    if (!cur.last || cur.last < ps.started_at) cur.last = ps.started_at;
    map.set(row.score_id, cur);
  }

  // 2) Title fallback: match practice_sessions whose title/byline matches a score
  // Only fetch this user's recent sessions (last 500) to keep it cheap.
  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("id, title, byline, duration_sec, started_at")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(500);
  // Mark which session ids were already linked, so we don't double-count.
  const linkedSessionIds = new Set(
    ((links ?? []) as { session_id: string }[]).map((r) => r.session_id)
  );

  // Build lookup by normalized title+composer
  const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();
  const byKey = new Map<string, Score[]>();
  for (const s of scores) {
    const k = `${norm(s.title)}|${norm(s.composer)}`;
    const titleOnly = norm(s.title);
    for (const key of [k, titleOnly]) {
      const arr = byKey.get(key) ?? [];
      arr.push(s);
      byKey.set(key, arr);
    }
  }
  for (const sess of (sessions ?? []) as Array<{
    id: string; title: string; byline: string | null; duration_sec: number; started_at: string;
  }>) {
    if (linkedSessionIds.has(sess.id)) continue;
    const k1 = `${norm(sess.title)}|${norm(sess.byline)}`;
    const k2 = norm(sess.title);
    const matches = byKey.get(k1) ?? byKey.get(k2);
    if (!matches || matches.length === 0) continue;
    // If multiple scores share a title, attribute to the first deterministically.
    const score = matches[0];
    const cur = map.get(score.id) ?? { seconds: 0, sessions: 0, last: null };
    cur.seconds += sess.duration_sec || 0;
    cur.sessions += 1;
    if (!cur.last || cur.last < sess.started_at) cur.last = sess.started_at;
    map.set(score.id, cur);
  }

  return map;
}

export function formatDuration(sec: number): string {
  if (!sec || sec < 60) return `${Math.max(0, Math.round(sec))}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} t ${mm} min` : `${h} t`;
}

export function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (!d) return "—";
  const diff = Date.now() - d;
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "idag";
  if (days === 1) return "igår";
  if (days < 7) return `${days}d sen`;
  if (days < 30) return `${Math.floor(days / 7)}v sen`;
  if (days < 365) return `${Math.floor(days / 30)}mån sen`;
  return `${Math.floor(days / 365)}å sen`;
}
