import "server-only";

/**
 * The year shown in the footer copyright line, fixed at build time.
 *
 * `new Date()` during render is an *unstable value* under `cacheComponents`:
 * it cannot appear in a prerendered shell. The footer is global chrome, so that
 * single read was enough to stop 79 routes from prerendering — more than any
 * other cause measured in the readiness build.
 *
 * Module scope is evaluated once when the server bundle loads, outside the
 * prerender pass, so by the time any component renders this is a plain
 * constant. `server-only` is the load-bearing part: if this module were ever
 * pulled into a client bundle the browser would evaluate it at hydration and
 * produce the *current* year against a prerendered shell holding the build
 * year — a hydration mismatch every January. The value is threaded down as a
 * prop instead, so the client components never compute it.
 *
 * The trade-off, taken deliberately: between January 1st and the next deploy
 * the footer shows the previous year. That is the ordinary staleness of a
 * copyright line, and any deploy corrects it.
 */
export const COPYRIGHT_YEAR: number = new Date().getFullYear();
