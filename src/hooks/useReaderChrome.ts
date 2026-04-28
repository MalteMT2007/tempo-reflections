import { useEffect, useState } from "react";

/**
 * Subscribes to reader chrome visibility broadcast by ScoreReader.
 * Returns true when reader's top/bottom toolbars are visible (i.e. user
 * tapped the score). Used by floating dock + hamburger to mirror the
 * reader toolbar's show/hide rhythm.
 */
export function useReaderChrome() {
  const [visible, setVisible] = useState(
    typeof document !== "undefined" &&
      document.body.hasAttribute("data-reader-chrome")
  );

  useEffect(() => {
    const sync = () =>
      setVisible(document.body.hasAttribute("data-reader-chrome"));
    sync();
    window.addEventListener("reader-chrome-change", sync);
    return () => window.removeEventListener("reader-chrome-change", sync);
  }, []);

  return visible;
}
