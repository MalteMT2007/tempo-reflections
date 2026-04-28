// Tracks when scores were last opened, locally per device.
const KEY = "tempo:lib-recent-opened";

type Map = Record<string, number>;

function read(): Map {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Map) : {};
  } catch {
    return {};
  }
}

export function markScoreOpened(id: string) {
  const m = read();
  m[id] = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {}
}

export function getOpenedAt(id: string): number {
  return read()[id] ?? 0;
}

export function getRecentMap(): Map {
  return read();
}
