"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const RenderClockCtx = createContext<number | null>(null);

/**
 * Hands the server's cached clock (`getRenderClock()`) to the client tree.
 * Rendered once, by the root layout.
 */
export function RenderClockProvider({
  renderedAt,
  children,
}: {
  renderedAt: number;
  children: React.ReactNode;
}) {
  return <RenderClockCtx.Provider value={renderedAt}>{children}</RenderClockCtx.Provider>;
}

/**
 * The time the document was rendered, as a stable epoch millisecond value.
 *
 * Use it where a timestamp has to describe the server render itself — a React
 * Query seed's `initialDataUpdatedAt`, for instance — rather than the moment
 * the reader happens to look.
 */
export function useRenderedAt(): number {
  const renderedAt = useContext(RenderClockCtx);
  // Outside the app shell (tests, stories) there is no provider; the wall
  // clock is the honest fallback and no prerender is in progress to object.
  const [fallback] = useState(() => renderedAt ?? Date.now());
  return renderedAt ?? fallback;
}

/**
 * "Now", as a Client Component may read it on a prerendered route.
 *
 * During the prerender (and the first client render, so hydration matches)
 * this is the cached server clock. After mount it becomes the live clock, so
 * a deadline that passed between the cached render and the visit is judged
 * correctly once JavaScript runs. The initial HTML is at most one cache
 * revalidation behind, which is the same freshness as the data it describes.
 *
 * Prefer this over `new Date()` in any component that can render above the
 * crawlable content of a Cache-class route: the clock read is what aborts the
 * prerender, and DEV-612 forbids the Suspense boundary that would hide it.
 */
export function useRenderNow(): Date {
  const renderedAt = useRenderedAt();
  const [now, setNow] = useState(renderedAt);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  return useMemo(() => new Date(now), [now]);
}
