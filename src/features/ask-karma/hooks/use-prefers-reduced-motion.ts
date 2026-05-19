"use client";

import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Reactive `prefers-reduced-motion` reader. Returns `true` when the user has
 * opted into reduced motion via the OS or browser. Updates on changes.
 *
 * Local to the ask-karma feature because the only consumer right now is the
 * chip-fly animation gate. Promote to `hooks/` if a third caller appears.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    setPrefersReduced(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}
