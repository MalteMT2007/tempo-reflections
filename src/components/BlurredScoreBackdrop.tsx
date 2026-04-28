import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "@/lib/pdfWorker";
import { listMyScores, getScoreFileUrl } from "@/lib/scores";
import { getRecentMap } from "@/lib/recentScores";

/**
 * Heavily blurred + darkened sheet music background used on every main page.
 * Renders the first page of the most-recently-opened score as a static,
 * blurred, low-opacity image. Pure presentation — no interactivity.
 *
 * If no score exists or rendering fails, falls back to a soft gradient.
 */
export function BlurredScoreBackdrop() {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let revokeUrl: string | null = null;

    (async () => {
      try {
        const scores = await listMyScores();
        if (!scores.length) return;
        const recents = getRecentMap();
        const sorted = [...scores].sort((a, b) => {
          const ao = recents[a.id] || new Date(a.updated_at || a.created_at).getTime();
          const bo = recents[b.id] || new Date(b.updated_at || b.created_at).getTime();
          return bo - ao;
        });
        const top = sorted[0];
        const url = await getScoreFileUrl(top.file_path);
        const pdf = await pdfjsLib.getDocument(url).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        const blob: Blob | null = await new Promise((res) =>
          canvas.toBlob((b) => res(b), "image/jpeg", 0.7)
        );
        if (!blob || cancelled) return;
        revokeUrl = URL.createObjectURL(blob);
        setImgUrl(revokeUrl);
      } catch {
        /* fall back to gradient */
      }
    })();

    return () => {
      cancelled = true;
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background pointer-events-none">
      {imgUrl ? (
        <img
          src={imgUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{ filter: "blur(28px) saturate(120%) brightness(0.55)", opacity: 0.55 }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--muted))_0%,hsl(var(--background))_60%)]" />
      )}
      {/* Dark veil + vignette for readability over any content */}
      <div className="absolute inset-0 bg-background/65 backdrop-blur-2xl backdrop-saturate-150" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.55)_100%)]" />
    </div>
  );
}
