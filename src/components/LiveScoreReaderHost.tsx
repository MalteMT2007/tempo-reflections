import { useEffect, useState } from "react";
import { ScoreReader } from "@/components/ScoreReader";
import { listMyScores, type Score } from "@/lib/scores";
import { getRecentMap } from "@/lib/recentScores";

/**
 * Single, app-wide persistent ScoreReader that lives behind every page.
 * Always renders the user's most-recently-opened score. All other pages
 * mount as overlays on top of this reader — there is only ONE reader in
 * the app at any time, which avoids stale tap targets when navigating.
 *
 * If the user has no scores, renders a soft gradient fallback.
 */
export function LiveScoreReaderHost() {
  const [score, setScore] = useState<Score | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const scores = await listMyScores();
        if (cancelled || !scores.length) return;
        const recents = getRecentMap();
        const sorted = [...scores].sort((a, b) => {
          const ao = recents[a.id] || new Date(a.updated_at || a.created_at).getTime();
          const bo = recents[b.id] || new Date(b.updated_at || b.created_at).getTime();
          return bo - ao;
        });
        setScore(sorted[0]);
      } catch {}
    })();

    const onSwitch = (e: Event) => {
      const detail = (e as CustomEvent).detail as Score | undefined;
      if (detail) setScore(detail);
    };
    window.addEventListener("reader-set-score", onSwitch as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("reader-set-score", onSwitch as EventListener);
    };
  }, []);

  if (!score) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--muted))_0%,hsl(var(--background))_60%)]"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-0">
      <ScoreReader key={score.id} score={score} onClose={() => { /* no-op */ }} />
    </div>
  );
}

/** Helper for pages/pills to swap the background score. */
export function setBackgroundScore(score: Score) {
  window.dispatchEvent(new CustomEvent("reader-set-score", { detail: score }));
}
