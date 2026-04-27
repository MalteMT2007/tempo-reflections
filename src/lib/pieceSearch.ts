// Classical piece search via MusicBrainz public API.
// Works = compositions (composer-attributed), not recordings/artists.
// We filter, dedupe, and format suggestions cleanly.

export type PieceSuggestion = {
  title: string;
  composer: string;
};

const cache = new Map<string, PieceSuggestion[]>();

// Normalize a composer name to "Surname" or "F. Surname" format
// e.g. "Sergei Vasilyevich Rachmaninoff" -> "Rachmaninoff"
//      "Johann Sebastian Bach"           -> "J. S. Bach"
function formatComposer(name: string): string {
  const clean = name.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const parts = clean.split(" ");
  if (parts.length === 1) return parts[0];
  const surname = parts[parts.length - 1];
  // Common famous surnames — surname only is recognizable
  const surnameOnly = new Set([
    "bach", "mozart", "beethoven", "chopin", "rachmaninoff", "rachmaninov",
    "tchaikovsky", "debussy", "ravel", "brahms", "schubert", "schumann",
    "liszt", "mendelssohn", "haydn", "handel", "vivaldi", "sibelius",
    "grieg", "dvořák", "dvorak", "mahler", "bartók", "bartok", "prokofiev",
    "shostakovich", "stravinsky", "wagner", "verdi", "puccini", "scarlatti",
    "satie", "fauré", "faure", "saint-saëns", "saint-saens", "berlioz",
    "bizet", "elgar", "holst", "copland", "gershwin", "barber", "ives",
  ]);
  if (surnameOnly.has(surname.toLowerCase())) return surname;
  // Otherwise initials + surname
  const initials = parts.slice(0, -1).map((p) => p[0].toUpperCase() + ".").join(" ");
  return `${initials} ${surname}`;
}

// Title cleanup — MusicBrainz often appends ": I. Allegro" sub-movements
// Strip ", op. X" duplications, normalize "no" -> "No.", "op" -> "Op."
function formatTitle(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  // Normalize common abbreviations
  t = t.replace(/\bno\.?\s*(\d)/gi, "No. $1");
  t = t.replace(/\bop\.?\s*(\d)/gi, "Op. $1");
  t = t.replace(/\bbwv\s*(\d)/gi, "BWV $1");
  t = t.replace(/\bk\.?\s*(\d{2,})/g, "K. $1");
  return t;
}

// Strip trailing movement designators to dedupe at the work level
// "Piano Concerto No. 2: I. Moderato" -> "Piano Concerto No. 2"
function workRoot(title: string): string {
  return title.split(/[:;]/)[0].trim();
}

export async function searchClassicalPieces(
  query: string,
  signal?: AbortSignal,
): Promise<PieceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  if (cache.has(q)) return cache.get(q)!;

  // Restrict to works that have a composer relationship — this filters out
  // recordings/performers being mistaken for composers.
  const url = `https://musicbrainz.org/ws/2/work/?query=${encodeURIComponent(q)}&fmt=json&limit=25`;
  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const works = (data.works ?? []) as Array<{
      title: string;
      score?: number;
      relations?: Array<{ type: string; artist?: { name: string; "sort-name"?: string } }>;
    }>;

    // Only keep works that have an explicit composer relation
    const composed = works.filter((w) =>
      w.relations?.some((r) => r.type === "composer" && r.artist?.name),
    );

    // Group by (workRoot + composer) to dedupe movements / variants
    const grouped = new Map<string, { suggestion: PieceSuggestion; score: number }>();
    for (const w of composed) {
      const composerRel = w.relations!.find((r) => r.type === "composer" && r.artist?.name)!;
      const composerRaw = composerRel.artist!["sort-name"]?.split(",").reverse().join(" ").trim()
        || composerRel.artist!.name;
      const composer = formatComposer(composerRaw);
      const root = workRoot(formatTitle(w.title));
      const key = `${root.toLowerCase()}|${composer.toLowerCase()}`;
      const score = w.score ?? 0;
      const existing = grouped.get(key);
      if (!existing || score > existing.score) {
        grouped.set(key, {
          suggestion: { title: root, composer },
          score,
        });
      }
    }

    const out = Array.from(grouped.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((g) => g.suggestion);

    cache.set(q, out);
    return out;
  } catch {
    return [];
  }
}
