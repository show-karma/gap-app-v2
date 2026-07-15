/**
 * Pure, framework-free (Edge-safe) helpers for project indexability. No DOM,
 * Node, or Next imports — only strings and URLSearchParams — so this can run in
 * middleware / the Edge runtime as well as in server/metadata code.
 *
 * Mirrors the backend's strict indexer route vocabulary (ADR 0001, D2/D6).
 */

type SimpleProjectRoute =
  | "root"
  | "about"
  | "roadmap"
  | "team"
  | "updates"
  | "funding"
  | "impact"
  | "contact-info";

type GrantScopedProjectRoute =
  | "grant-detail"
  | "grant-edit"
  | "grant-complete"
  | "grant-milestones-and-updates"
  | "grant-impact-criteria";

/** The closed set of indexer route literals. */
export type ProjectIndexabilityRoute = SimpleProjectRoute | GrantScopedProjectRoute | "grant-new";

/** The strict indexer query — grant-scoped routes carry a grantUid. */
export type ProjectIndexabilityQuery =
  | { route: SimpleProjectRoute }
  | { route: "grant-new" }
  | { route: GrantScopedProjectRoute; grantUid: string };

export interface ProjectIndexabilityRequest {
  identifier: string;
  query: ProjectIndexabilityQuery;
  normalizedPath: string;
}

export type ProjectQueryClassification = "clean" | "tracking-only" | "stateful";

/**
 * Rewrite legacy route segments that appear AFTER the project identifier —
 * `grants` → `funding`, and `funding/create-grant` → `funding/new` (applied in
 * sequence). Operates on path segments, never a substring replace, so a project
 * literally named `grants` (the identifier segment) is left untouched.
 */
export function normalizeLegacyProjectPath(pathname: string): string {
  const segments = pathname.split("/");
  // segments[0] is the empty string before the leading slash; segments[1] is
  // the top-level route, segments[2] the identifier, segments[3+] the route.
  if (segments[1] !== "project") {
    return pathname;
  }
  if (segments[3] === "grants") {
    segments[3] = "funding";
  }
  if (segments[3] === "funding" && segments[4] === "create-grant") {
    segments[4] = "new";
  }
  return segments.join("/");
}

/**
 * Parse a pathname into an indexability request: identifier + strict indexer
 * query + normalized path. Strips trailing slashes, applies legacy
 * normalization, matches exact segment shapes only, and fails closed (returns
 * null) for unknown tabs / non-project paths.
 */
export function parseProjectIndexabilityRequest(
  pathname: string
): ProjectIndexabilityRequest | null {
  const withoutTrailingSlash = pathname.replace(/\/+$/, "");
  const normalized = normalizeLegacyProjectPath(withoutTrailingSlash);
  // Remove only the single leading slash, then reject any internal empty
  // segment (e.g. a `//`) instead of silently collapsing it — malformed paths
  // must fail closed.
  const withoutLeadingSlash = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  const segments = withoutLeadingSlash.split("/");
  if (segments.some((segment) => segment.length === 0)) {
    return null;
  }

  if (segments[0] !== "project") {
    return null;
  }
  const identifier = segments[1];
  if (!identifier) {
    return null;
  }

  const query = parseRouteSegments(segments.slice(2));
  if (!query) {
    return null;
  }

  return {
    identifier,
    query,
    normalizedPath: `/${segments.join("/")}`,
  };
}

/**
 * Classify a query string: `clean` (no params), `tracking-only` (every param is
 * a known tracking param), else `stateful`. Key comparison is case-insensitive:
 * any `utm_*` prefix plus exact gclid / fbclid / msclkid / dclid.
 */
export function classifyProjectQuery(searchParams: URLSearchParams): ProjectQueryClassification {
  const keys = Array.from(searchParams.keys());
  if (keys.length === 0) {
    return "clean";
  }
  return keys.every(isTrackingKey) ? "tracking-only" : "stateful";
}

/**
 * Build the indexer endpoint for a parsed request: trims trailing base slashes
 * and URL-encodes both the identifier segment and the search params.
 */
export function buildProjectIndexabilityEndpoint(
  baseUrl: string,
  parsed: ProjectIndexabilityRequest
): string {
  const base = baseUrl.replace(/\/+$/, "");
  const identifier = encodeURIComponent(parsed.identifier);
  const search = new URLSearchParams({ route: parsed.query.route });
  if ("grantUid" in parsed.query) {
    search.set("grantUid", parsed.query.grantUid);
  }
  return `${base}/v2/projects/${identifier}/indexability?${search.toString()}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseRouteSegments(rest: string[]): ProjectIndexabilityQuery | null {
  if (rest.length === 0) {
    return { route: "root" };
  }

  if (rest.length === 1) {
    const route = asSingleSegmentRoute(rest[0]);
    return route ? { route } : null;
  }

  // All remaining routes live under the /funding segment.
  if (rest[0] !== "funding") {
    return null;
  }

  if (rest.length === 2) {
    const grantUid = rest[1];
    if (grantUid === "new") {
      return { route: "grant-new" };
    }
    return { route: "grant-detail", grantUid };
  }

  if (rest.length === 3) {
    const grantUid = rest[1];
    if (grantUid === "new") {
      return null;
    }
    switch (rest[2]) {
      case "edit":
        return { route: "grant-edit", grantUid };
      case "complete-grant":
        return { route: "grant-complete", grantUid };
      case "milestones-and-updates":
        return { route: "grant-milestones-and-updates", grantUid };
      case "impact-criteria":
        return { route: "grant-impact-criteria", grantUid };
      default:
        return null;
    }
  }

  return null;
}

function asSingleSegmentRoute(segment: string): SimpleProjectRoute | null {
  switch (segment) {
    case "about":
    case "roadmap":
    case "team":
    case "updates":
    case "funding":
    case "impact":
    case "contact-info":
      return segment;
    default:
      return null;
  }
}

function isTrackingKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.startsWith("utm_")) {
    return true;
  }
  return lower === "gclid" || lower === "fbclid" || lower === "msclkid" || lower === "dclid";
}
