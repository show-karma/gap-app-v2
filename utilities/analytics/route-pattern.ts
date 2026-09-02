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
 * Every page route under `app/` that contains a dynamic segment, in FULL — not
 * just the prefix where the segment appears.
 *
 * The full route is what makes the table useful and what makes it safe.
 * `/community/:communityId/applications/:applicationId/edit` and
 * `/community/:communityId/applications/:applicationId/success` are different
 * screens, and a table that stopped at the shared prefix would report them as
 * the same one. It also has to list the STATIC screens that share a position
 * with a dynamic sibling — `/project/:projectId/funding/new`,
 * `/community/:communityId/manage/portfolio-reports/config` — because the trie
 * prefers a literal, and without one `new` would be reported as a grant uid.
 *
 * Next route groups (`(cover)`, `(whitelabel)`), parallel (`@slot`) and private
 * (`_dir`) segments are not part of the URL and so are not here. Parameter
 * names match the directory names, so a report reads
 * `/community/:communityId/programs/:programId` rather than `/community/:id/…`.
 *
 * Only routes with a `page` file are here. A `route.ts` handler — the sitemaps
 * under `app/sitemaps/`, the `.well-known` documents — answers a fetch and is
 * never rendered by the app, so `usePathname` never sees it and it can never
 * produce a page view.
 *
 * The coverage test walks `app/` from the root and requires an exact entry here
 * for every one of these routes — a new dynamic route without a template fails
 * CI rather than shipping and quietly putting whatever its segment holds into
 * Mixpanel.
 */
export const ROUTE_TEMPLATES: readonly string[] = [
  "/admin/studio/:tool*",
  "/blog/:slug",
  "/community/:communityId",
  "/community/:communityId/admin/kyc-settings",
  "/community/:communityId/applications",
  "/community/:communityId/applications/:applicationId",
  "/community/:communityId/applications/:applicationId/edit",
  "/community/:communityId/applications/:applicationId/success",
  "/community/:communityId/ask-karma",
  "/community/:communityId/browse-applications",
  "/community/:communityId/browse-applications/:referenceNumber",
  "/community/:communityId/claim-funds",
  "/community/:communityId/donate",
  "/community/:communityId/donate/:programId",
  "/community/:communityId/donate/:programId/checkout",
  "/community/:communityId/financials",
  "/community/:communityId/funding-opportunities",
  "/community/:communityId/impact",
  "/community/:communityId/impact/project-discovery",
  "/community/:communityId/manage",
  "/community/:communityId/manage/access-denied-messages",
  "/community/:communityId/manage/action-items",
  "/community/:communityId/manage/control-center",
  "/community/:communityId/manage/edit-categories",
  "/community/:communityId/manage/edit-projects",
  "/community/:communityId/manage/funding-platform",
  "/community/:communityId/manage/funding-platform/:programId",
  "/community/:communityId/manage/funding-platform/:programId/applications",
  "/community/:communityId/manage/funding-platform/:programId/applications/:applicationId",
  "/community/:communityId/manage/funding-platform/:programId/milestones",
  "/community/:communityId/manage/funding-platform/:programId/milestones/:projectId",
  "/community/:communityId/manage/funding-platform/:programId/question-builder",
  "/community/:communityId/manage/funding-platform/:programId/setup",
  "/community/:communityId/manage/impact",
  "/community/:communityId/manage/knowledge-base",
  "/community/:communityId/manage/kyc-settings",
  "/community/:communityId/manage/manage-indicators",
  "/community/:communityId/manage/milestones-report",
  "/community/:communityId/manage/notification-settings",
  "/community/:communityId/manage/payouts",
  "/community/:communityId/manage/portfolio-reports",
  "/community/:communityId/manage/portfolio-reports/:reportId",
  "/community/:communityId/manage/portfolio-reports/:reportId/preview",
  "/community/:communityId/manage/portfolio-reports/config",
  "/community/:communityId/manage/program-scores",
  "/community/:communityId/manage/send-email",
  "/community/:communityId/manage/tracks",
  "/community/:communityId/programs",
  "/community/:communityId/programs/:programId",
  "/community/:communityId/programs/:programId/apply",
  "/community/:communityId/projects",
  "/community/:communityId/reports",
  "/community/:communityId/reports/:runDate",
  "/community/:communityId/reports/:runDate/:configSlug",
  "/community/:communityId/updates",
  "/dashboard/:module",
  "/nonprofit-research/:reportId",
  "/nonprofit-research/diligence-template",
  "/nonprofit-research/new",
  "/nonprofit-research/onboarding",
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
  "/project/:projectId/about",
  "/project/:projectId/contact-info",
  "/project/:projectId/funding",
  "/project/:projectId/funding/:grantUid",
  "/project/:projectId/funding/:grantUid/complete-grant",
  "/project/:projectId/funding/:grantUid/edit",
  "/project/:projectId/funding/:grantUid/impact-criteria",
  "/project/:projectId/funding/:grantUid/milestones-and-updates",
  "/project/:projectId/funding/new",
  "/project/:projectId/impact",
  "/project/:projectId/team",
  "/project/:projectId/updates",
  "/s/:slug",
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

/** The four character classes base64url draws from. */
const TOKEN_CHARACTER_CLASSES: readonly RegExp[] = [/[a-z]/, /[A-Z]/, /\d/, /[-_]/];

/**
 * How many of base64url's character classes a segment draws from.
 *
 * Counted rather than tested for "letters and digits" because a random token
 * need not contain a digit: `AbCdEfGhIjKlMnOpQrStUvWx` is 24 characters of
 * pure base64url with no digit at all, and treating it as a word would send a
 * share token to Mixpanel verbatim.
 */
const characterClassCount = (segment: string): number =>
  TOKEN_CHARACTER_CLASSES.filter((pattern) => pattern.test(segment)).length;

const MIN_TOKEN_CHARACTER_CLASSES = 2;

/**
 * The backstop, for a route whose template has not been added yet.
 *
 * Length alone is not enough: `funding-opportunities` is 21 characters and is a
 * real, reportable slug. A segment is only treated as an identifier when it is
 * long, draws on at least two of base64url's character classes the way a
 * generated token does, and does NOT read as hyphenated lowercase words.
 */
const isOpaqueSegment = (segment: string): boolean => {
  if (OPAQUE_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment))) return true;
  if (segment.length < OPAQUE_MIN_LENGTH) return false;
  if (!TOKEN_ALPHABET.test(segment)) return false;
  // `funding-opportunities` draws on two classes (lowercase and the hyphen),
  // so the word check has to come after the length gate and before the class
  // count — it is the only thing standing between a long slug and `:id`.
  if (LOOKS_LIKE_WORDS.test(segment)) return false;
  return characterClassCount(segment) >= MIN_TOKEN_CHARACTER_CLASSES;
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
