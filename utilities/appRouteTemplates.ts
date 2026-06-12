import { PAGES } from "./pages";

/**
 * App route TEMPLATES (with `:param` placeholders) for the Karma agent backend.
 *
 * Derived by walking the ENTIRE `PAGES` object — every string route and every
 * route builder — so the list is comprehensive and stays in sync with the FE
 * automatically: add a route to `PAGES` and it shows up here, no manual edit.
 * Served (crawler-disallowed) via `app/extended-sitemap.xml/route.ts` so the
 * backend can FETCH the routes instead of hardcoding a copy that drifts.
 *
 * Builders are invoked with `:paramName` sentinels taken from their parameter
 * names. Optional params are omitted (we pass only the required arity), which
 * yields the canonical base path for each route.
 */

/** Extract `:paramName` sentinels (one per parameter) from a builder. */
function paramSentinels(fn: (...args: string[]) => unknown): string[] {
  const src = fn.toString();
  const parens = src.match(/^[^(]*\(([^)]*)\)/);
  const single = src.match(/^\s*([A-Za-z_$][\w$]*)\s*=>/);
  const raw = parens ? parens[1] : single ? single[1] : "";
  return raw.split(",").flatMap((part) => {
    const name = part.trim().split(/[=:?]/)[0].trim();
    return name ? [`:${name}`] : [];
  });
}

function addRoute(result: unknown, out: Set<string>): void {
  // A required param left out shows up as the literal "undefined" — skip those;
  // an OPTIONAL param left out resolves to "" inside the builder's conditional,
  // giving the clean base path. Restore `:` if encodeURIComponent touched it.
  if (typeof result === "string" && result.startsWith("/") && !result.includes("undefined")) {
    out.add(result.replace(/%3A/gi, ":"));
  }
}

function collectRoutes(node: unknown, out: Set<string>): void {
  if (typeof node === "string") {
    if (node.startsWith("/")) out.add(node);
    return;
  }
  if (typeof node === "function") {
    const fn = node as (...args: string[]) => unknown;
    const sentinels = paramSentinels(fn);
    // Call with full arity down to zero args: full calls yield deep links
    // (incl. optional query/anchor variants), fewer-arg calls yield the base
    // path when the omitted params are optional. addRoute() drops any result
    // where a REQUIRED param was missing (it contains "undefined").
    for (let count = sentinels.length; count >= 0; count -= 1) {
      try {
        addRoute(fn(...sentinels.slice(0, count)), out);
      } catch {
        // Skip builders that need non-string args; no linkable route does.
      }
    }
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) collectRoutes(value, out);
  }
}

export const APP_ROUTE_TEMPLATES: readonly string[] = (() => {
  const out = new Set<string>();
  collectRoutes(PAGES, out);
  return Array.from(out).sort();
})();
