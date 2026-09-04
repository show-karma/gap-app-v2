import "server-only";

import { cacheLife } from "next/cache";

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
 * `cacheLife("minutes")` (revalidate 60s) matches the cached loaders whose
 * data the clock is compared against — a program's deadline is judged with a
 * clock as fresh as the program itself. After hydration `useRenderNow()`
 * upgrades to the live clock, so the cached value only ever decides the
 * initial HTML.
 */
export async function getRenderClock(): Promise<number> {
  "use cache";
  cacheLife("minutes");

  return Date.now();
}
