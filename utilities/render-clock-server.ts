import "server-only";

import { cacheLife } from "next/cache";

/**
 * How coarse the clock baked into cached output is.
 *
 * Every value in a cached page has to be identical between two regenerations
 * that saw the same data, or the platform stores a new copy of the page (an
 * ISR write) even though nothing a reader cares about changed. A millisecond
 * clock made every regeneration unique, so each one rewrote the HTML, the RSC
 * payload and every prefetch segment. At one hour the cached HTML judges a
 * deadline with a clock up to an hour old — the client switches to the live
 * clock on mount (`useRenderNow()`), so only the no-JS first paint sees it.
 */
export const RENDER_CLOCK_RESOLUTION_MS = 60 * 60 * 1000;

/** `epochMs` rounded down to the render clock's resolution. */
export function quantizeRenderTime(epochMs: number): number {
  return epochMs - (epochMs % RENDER_CLOCK_RESOLUTION_MS);
}

/**
 * The wall clock as a prerendered document may observe it.
 *
 * `cacheComponents` treats the current time as IO: `Date.now()` and `new Date()`
 * abort a prerender wherever they run, Client Components included —
 *
 *   Next.js encountered the unstable value `new Date()` in a Client Component.
 *     at isProgramEnabled (utilities/funding-programs.ts:78)
 *
 * — unless the read happens inside a cache scope, where it is prerendered as
 * part of the cached value. That is what this function is: one clock read,
 * cached, that the root layout hands to every Client Component through
 * `RenderClockProvider`. Anything that needs "now" during render on a
 * Cache-class route reads `useRenderNow()` instead of the clock.
 *
 * The value is rounded to `RENDER_CLOCK_RESOLUTION_MS` so that it only changes
 * once an hour: it is serialized into every route's payload, and a value that
 * changed every minute made every regeneration of every page a new write.
 * `cacheLife("minutes")` still refreshes it promptly after the hour turns.
 */
export async function getRenderClock(): Promise<number> {
  "use cache";
  cacheLife("minutes");

  return quantizeRenderTime(Date.now());
}
