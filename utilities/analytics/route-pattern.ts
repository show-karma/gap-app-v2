/**
 * Turns a concrete pathname into a low-cardinality route template.
 *
 * Two reasons this exists rather than sending `window.location.pathname`:
 *
 *   1. Privacy. Raw paths carry identifiers — a wallet address on a profile
 *      route, a share token on `/nonprofit-research/shared/<token>` — and an
 *      analytics vendor is the last place a bearer token should land.
 *   2. Usefulness. `/project/a/updates` and `/project/b/updates` are the same
 *      screen; a report grouped by raw path cannot see that.
 *
 * The redaction is belt and braces: a table of known dynamic parents handles
 * the route families the app actually has, and a shape heuristic catches
 * anything the table has not been taught about yet — so a new route leaks a
 * generic `:id`, never the id itself.
 */

/**
 * Segments whose *next* segment is an identifier. Written as a table rather
 * than a per-route regex so adding a route family is a one-line change.
 */
const DYNAMIC_PARENTS = new Set([
  "application",
  "applications",
  "communities",
  "community",
  "funders",
  "grants",
  "milestones",
  "profile",
  "program",
  "programs",
  "project",
  "projects",
  "s",
  "scans",
  // `/nonprofit-research/shared/<token>` — a bearer token, never reportable.
  "shared",
]);

/** Shapes that are an identifier wherever they appear. */
const OPAQUE_SEGMENT_PATTERNS: readonly RegExp[] = [
  /^0x[0-9a-fA-F]{40}$/, // EVM address
  /^0x[0-9a-fA-F]{64}$/, // attestation uid / transaction hash
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, // UUID
  /^[0-9a-fA-F]{24}$/, // Mongo ObjectId
];

/**
 * Long segments are opaque by assumption. Real route words in this app are far
 * shorter, so the threshold trades an occasional over-redaction for never
 * leaking a token the table has not enumerated.
 */
const OPAQUE_SEGMENT_LENGTH = 20;

const ID_PLACEHOLDER = ":id";

const isOpaqueSegment = (segment: string): boolean =>
  segment.length >= OPAQUE_SEGMENT_LENGTH ||
  OPAQUE_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment));

/** First path segment — the route family (`project`, `community`, …). */
export const toPageGroup = (pathname: string): string => pathname.split("/")[1] || "home";

/**
 * The community id on `/community/[communityId]/...`, and only there. Community
 * slugs are public, stable and low-cardinality, which is what makes them usable
 * as a Mixpanel group key.
 */
export const toCommunityId = (pathname: string): string | null => {
  const [, first, second] = pathname.split("/");
  return first === "community" && second ? decodeURIComponent(second) : null;
};

/** `/project/0xabc…/updates` -> `/project/:id/updates`. */
export const toRoutePattern = (pathname: string): string => {
  const segments = pathname.split("/");
  const templated = segments.map((segment, index) => {
    if (!segment) return segment;
    if (DYNAMIC_PARENTS.has(segments[index - 1])) return ID_PLACEHOLDER;
    return isOpaqueSegment(segment) ? ID_PLACEHOLDER : segment;
  });
  return templated.join("/") || "/";
};
