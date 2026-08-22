import { TOUR_IDS } from "./tours";

/**
 * A walkthrough can be requested from anywhere — the profile menu is on every
 * page, but a tour can only run where its anchors are. The request therefore
 * travels as a query parameter: the link navigates to the surface that owns the
 * tour, and that surface starts it once its own UI is on screen.
 */
export const TOUR_QUERY_PARAM = "tour";

export function withTourParam(href: string, tourId: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${TOUR_QUERY_PARAM}=${encodeURIComponent(tourId)}`;
}

const KNOWN_TOUR_IDS = new Set<string>(Object.values(TOUR_IDS));

export function isKnownTourId(value: string | null | undefined): boolean {
  return Boolean(value) && KNOWN_TOUR_IDS.has(value as string);
}

/**
 * Drops the parameter once the request has been acted on, so a refresh or a
 * shared link doesn't replay the tour. Uses `history.replaceState` rather than
 * a router navigation: rewriting the URL through the App Router here would
 * dispatch a navigation that can cancel an in-flight link click.
 */
export function stripTourParam(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(TOUR_QUERY_PARAM)) return;
  url.searchParams.delete(TOUR_QUERY_PARAM);
  window.history.replaceState(window.history.state, "", url.toString());
}
