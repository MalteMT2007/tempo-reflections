// Lightweight piece search via MusicBrainz public API (no auth needed).
// Returns suggestions for classical works. Debounced by caller.

export type PieceSuggestion = {
  title: string;
  composer: string;
};

const cache = new Map<string, PieceSuggestion[]>();

export async function searchClassicalPieces(
  query: string,
  signal?: AbortSignal,
): Promise<PieceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  if (cache.has(q)) return cache.get(q)!;

  // MusicBrainz "work" search — works are compositions (independent of recordings).
  const url = `https://musicbrainz.org/ws/2/work/?query=${encodeURIComponent(q)}&fmt=json&limit=8`;
  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const works = (data.works ?? []) as Array<{
      title: string;
      relations?: Array<{ type: string; artist?: { name: string } }>;
    }>;
    const out: PieceSuggestion[] = [];
    const seen = new Set<string>();
    for (const w of works) {
      const composerRel = w.relations?.find(
        (r) => r.type === "composer" && r.artist?.name,
      );
      const composer = composerRel?.artist?.name ?? "";
      const key = `${w.title.toLowerCase()}|${composer.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ title: w.title, composer });
    }
    cache.set(q, out);
    return out;
  } catch {
    return [];
  }
}
