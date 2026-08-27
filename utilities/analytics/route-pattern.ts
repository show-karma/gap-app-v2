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
 * The templates below mirror `app/` one for one, and a test walks that tree to
 * prove it: a new dynamic route without a template here fails CI rather than
 * quietly leaking its id. The shape heuristic underneath is a backstop for the
 * window between a route being added and its template landing — it is not the
 * mechanism, and it is deliberately conservative so that a real slug like
 * `funding-opportunities` survives.
 */

/**
 * Every dynamic route under `app/`, as it appears in a URL — Next route groups
 * (`(cover)`, `(whitelabel)`) are not part of the path and so are not here.
 * Parameter names match the directory names, so a report reads
 * `/community/:communityId/programs/:programId` rather than `/community/:id/…`.
 */
export const ROUTE_TEMPLATES: readonly string[] = [
  "/admin/studio/:tool*",
  "/blog/:slug",
  "/community/:communityId",
  "/community/:communityId/applications/:applicationId",
  "/community/:communityId/browse-applications/:referenceNumber",
  "/community/:communityId/donate/:programId",
  "/community/:communityId/manage/funding-platform/:programId",
  "/community/:communityId/manage/funding-platform/:programId/applications/:applicationId",
  "/community/:communityId/manage/funding-platform/:programId/milestones/:projectId",
  "/community/:communityId/manage/portfolio-reports/:reportId",
  "/community/:communityId/programs/:programId",
  "/community/:communityId/reports/:runDate",
  "/community/:communityId/reports/:runDate/:configSlug",
  "/dashboard/:module",
  "/nonprofit-research/:reportId",
  "/nonprofit-research/diligence/:token",
  "/nonprofit-research/personas/:handleId",
  "/nonprofit-research/shared/:token",
  "/nonprofits/find-funders/foundations/:id",
  "/nonprofits/find-funders/grants/:id",
  "/nonprofits/find-funders/nonprofits/:id",
  "/nonprofits/find-funders/search/:id",
  "/nonprofits/is-ai-ready/:site",
  "/nonprofits/is-ai-ready/scans/:id",
  "/project/:projectId",
  "/project/:projectId/funding/:grantUid",
  "/s/:slug",
  "/sitemaps/:kind",
  "/sitemaps/:kind/sitemap/:chunk",
];

interface TemplateNode {
  literals: Map<string, TemplateNode>;
  /** The single dynamic child, if this position has one. */
  dynamic?: { placeholder: string; node: TemplateNode; catchAll: boolean };
}

const newNode = (): TemplateNode => ({ literals: new Map() });

/**
 * A trie rather than a list of regexes, so matching can prefer a literal over a
 * dynamic segment at the same position — which is what keeps
 * `/nonprofits/is-ai-ready/scans/:id` from being swallowed by
 * `/nonprofits/is-ai-ready/:site`.
 */
const buildTrie = (templates: readonly string[]): TemplateNode => {
  const root = newNode();

  for (const template of templates) {
    let node = root;
    for (const segment of template.split("/").filter(Boolean)) {
      if (segment.startsWith(":")) {
        const catchAll = segment.endsWith("*");
        if (!node.dynamic) {
          node.dynamic = { placeholder: segment, node: newNode(), catchAll };
        }
        node = node.dynamic.node;
        continue;
      }
      let next = node.literals.get(segment);
      if (!next) {
        next = newNode();
        node.literals.set(segment, next);
      }
      node = next;
    }
  }

  return root;
};

const TEMPLATE_TRIE = buildTrie(ROUTE_TEMPLATES);

/** Shapes that are an identifier wherever they appear. */
const OPAQUE_SEGMENT_PATTERNS: readonly RegExp[] = [
  /^0x[0-9a-fA-F]{6,}$/, // EVM address, attestation uid, transaction hash
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, // UUID
  /^[0-9a-fA-F]{24}$/, // Mongo ObjectId
];

const TOKEN_ALPHABET = /^[A-Za-z0-9_-]+$/;
/** Lowercase hyphen- or underscore-separated words: a slug, not an identifier. */
const LOOKS_LIKE_WORDS = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)+$/;
const OPAQUE_MIN_LENGTH = 20;

/**
 * The backstop, for a route whose template has not been added yet.
 *
 * Length alone is not enough: `funding-opportunities` is 21 characters and is a
 * real, reportable slug. A segment is only treated as an identifier when it also
 * mixes character classes the way a generated token does and does NOT read as
 * hyphenated words.
 */
const isOpaqueSegment = (segment: string): boolean => {
  if (OPAQUE_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment))) return true;
  if (segment.length < OPAQUE_MIN_LENGTH) return false;
  if (!TOKEN_ALPHABET.test(segment)) return false;
  if (LOOKS_LIKE_WORDS.test(segment)) return false;
  return /\d/.test(segment) && /[a-zA-Z]/.test(segment);
};

const ID_PLACEHOLDER = ":id";

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

/**
 * `/project/0xabc…/funding/0xdef…` -> `/project/:projectId/funding/:grantUid`.
 *
 * Templates are applied first and win outright. Only a segment no template
 * claims is put to the shape heuristic, so a static route word can never be
 * redacted out of a route the table knows about.
 */
export const toRoutePattern = (pathname: string): string => {
  const trailingSlash = pathname.length > 1 && pathname.endsWith("/");
  const segments = pathname.split("/").filter(Boolean);
  const templated: string[] = [];
  let node: TemplateNode | null = TEMPLATE_TRIE;

  for (const segment of segments) {
    const literal: TemplateNode | undefined = node?.literals.get(segment);
    if (literal) {
      templated.push(segment);
      node = literal;
      continue;
    }

    const dynamic: TemplateNode["dynamic"] = node?.dynamic;
    if (dynamic) {
      templated.push(dynamic.placeholder);
      // A catch-all consumes the rest of the path; nothing after it is a
      // distinct screen.
      node = dynamic.catchAll ? null : dynamic.node;
      if (dynamic.catchAll) break;
      continue;
    }

    // Past the end of every template: fall back to the shape heuristic.
    node = null;
    templated.push(isOpaqueSegment(segment) ? ID_PLACEHOLDER : segment);
  }

  if (templated.length === 0) return "/";
  return `/${templated.join("/")}${trailingSlash ? "/" : ""}`;
};
