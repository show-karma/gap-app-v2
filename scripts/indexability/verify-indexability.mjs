/**
 * Dependency-free ESM verifier for the Karma canonical-indexability policy.
 * Two entry points, both taking an injected `fetch`:
 *
 *  - auditSitemaps: bounded recursive traversal of sitemapindex → urlset,
 *    validating canonical origin before any child fetch, distinguishing
 *    harmless repeated references (dedupe) from true recursion-stack cycles,
 *    and rejecting off-origin/query/hash/duplicate/malformed/banned leaves.
 *  - verifyIndexability: auto-discovers a representative /project/<slug> from
 *    the sitemap and runs an independent, named check matrix (all requests use
 *    redirect: "manual" with a per-request AbortController timeout), always
 *    accumulating failures and continuing.
 *
 * No Node-only APIs beyond the global URL / Response / AbortController and
 * Date; safe to import without side effects.
 */

const CANONICAL_DEFAULT = "https://www.karmahq.xyz";
const APEX_DEFAULT = "https://karmahq.xyz";
const GAP_DEFAULT = "https://gap.karmahq.xyz";
const INDEXER_DEFAULT = "https://gapapi.karmahq.xyz";

const BANNED_PROJECT_SLUGS = Object.freeze(["-1", "---", "-nan", "test"]);
const INVALID_PROBE_SLUG = "this-project-does-not-exist";
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_SITEMAP_DEPTH = 12;
// 301 and 308 are treated as equivalent permanent redirects.
const PERMANENT_REDIRECT_STATUSES = new Set([301, 308]);

// ---------------------------------------------------------------------------
// auditSitemaps
// ---------------------------------------------------------------------------

export async function auditSitemaps({
  fetch,
  rootSitemapUrl,
  minLeafCount = 0,
  canonicalOrigin = safeUrl(rootSitemapUrl)?.origin ?? CANONICAL_DEFAULT,
  bannedSlugs = BANNED_PROJECT_SLUGS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const errors = [];
  const visited = new Set(); // globally fetched sitemap URLs (dedupe)
  const leafKeys = new Set(); // canonicalized leaf keys (duplicate detection)
  const leaves = [];
  let sitemapCount = 0;

  const collectLeaf = (loc) => {
    const parsed = safeUrl(loc);
    if (!parsed) {
      errors.push(`malformed leaf loc: ${loc}`);
      return;
    }
    if (parsed.origin !== canonicalOrigin) {
      errors.push(`off-origin leaf rejected: ${loc}`);
      return;
    }
    if (parsed.search || parsed.hash) {
      errors.push(`leaf has query or hash: ${loc}`);
      return;
    }
    const banned = bannedProjectSlug(parsed.pathname, bannedSlugs);
    if (banned) {
      errors.push(`banned project slug rejected: /project/${banned}`);
      return;
    }
    const key = `${parsed.origin}${parsed.pathname}`;
    if (leafKeys.has(key)) {
      errors.push(`duplicate leaf rejected: ${key}`);
      return;
    }
    leafKeys.add(key);
    leaves.push(key);
  };

  const traverse = async (url, stack) => {
    if (stack.has(url)) {
      errors.push(`cycle detected in sitemap graph at ${url}`);
      return;
    }
    if (visited.has(url)) {
      return; // harmless repeated reference — already processed
    }
    if (stack.size >= MAX_SITEMAP_DEPTH) {
      errors.push(`maximum sitemap depth exceeded at ${url}`);
      return;
    }

    visited.add(url);
    stack.add(url);
    try {
      let response;
      try {
        // Timeout + redirect: manual apply to root and child sitemap fetches.
        response = await timedFetch(fetch, url, { timeoutMs, redirect: "manual" });
      } catch (err) {
        errors.push(`sitemap fetch failed for ${url}: ${errMsg(err)}`);
        return;
      }

      if (!response || response.status !== 200) {
        errors.push(`sitemap ${url} returned status ${response?.status ?? "unknown"}`);
        return;
      }
      const contentType = headerValue(response, "content-type");
      if (!/xml/i.test(contentType)) {
        errors.push(`sitemap ${url} has non-XML content-type "${contentType}"`);
        return;
      }

      const body = await response.text();
      sitemapCount += 1;
      const locs = extractLocs(body);

      if (isSitemapIndex(body)) {
        for (const loc of locs) {
          const parsed = safeUrl(loc);
          if (!parsed) {
            errors.push(`malformed child sitemap loc: ${loc}`);
            continue;
          }
          // Canonical-origin validation BEFORE fetching the child.
          if (parsed.origin !== canonicalOrigin) {
            errors.push(`off-origin child sitemap rejected (not fetched): ${loc}`);
            continue;
          }
          await traverse(parsed.href, stack);
        }
      } else if (isUrlSet(body)) {
        for (const loc of locs) {
          collectLeaf(loc);
        }
      } else {
        // Never treat arbitrary XML <loc> tags as leaves.
        errors.push(
          `sitemap ${url} has an unrecognized root element (neither sitemapindex nor urlset)`
        );
      }
    } finally {
      stack.delete(url);
    }
  };

  const start = safeUrl(rootSitemapUrl)?.href ?? String(rootSitemapUrl);
  await traverse(start, new Set());

  if (leaves.length < minLeafCount) {
    errors.push(`leaf count ${leaves.length} below minimum ${minLeafCount}`);
  }

  return {
    ok: errors.length === 0,
    sitemapCount,
    leafCount: leaves.length,
    leaves,
    errors,
  };
}

// ---------------------------------------------------------------------------
// verifyIndexability
// ---------------------------------------------------------------------------

export async function verifyIndexability({
  fetch,
  canonicalOrigin = CANONICAL_DEFAULT,
  apexOrigin = APEX_DEFAULT,
  gapOrigin = GAP_DEFAULT,
  indexerBaseUrl = INDEXER_DEFAULT,
  // Default to the sitemap INDEX — the sole GSC-submitted entry point.
  rootSitemapUrl = `${canonicalOrigin}/sitemap_index.xml`,
  minLeafCount = 0,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now,
} = {}) {
  const errors = [];
  const checks = [];

  // Pass the timeout into the audit so a hung root/child sitemap cannot hang
  // the whole report.
  const audit = await auditSitemaps({
    fetch,
    rootSitemapUrl,
    minLeafCount,
    canonicalOrigin,
    timeoutMs,
  });
  for (const auditError of audit.errors) {
    errors.push(`sitemap: ${auditError}`);
  }

  const representativeProject = firstProjectPath(audit.leaves);
  const slug = representativeProject ? representativeProject.split("/")[2] : null;

  const probe = async (url) => {
    let response;
    try {
      response = await timedFetch(fetch, url, { timeoutMs, redirect: "manual" });
    } catch (err) {
      return { status: 0, robots: null, location: null, body: "", error: errMsg(err) };
    }
    const status = response.status;
    let body = "";
    if (status >= 200 && status < 300) {
      try {
        body = await response.text();
      } catch {
        body = "";
      }
    }
    return {
      status,
      robots: headerValue(response, "x-robots-tag") || null,
      location: headerValue(response, "location") || null,
      body,
      error: null,
    };
  };

  const addCheck = async (name, url, evaluate, extra = {}) => {
    const result = await probe(url);
    let ok = false;
    let fields = {};
    if (result.error) {
      fields = { status: 0, error: result.error };
    } else {
      const evaluation = evaluate(result);
      ok = Boolean(evaluation.ok);
      fields = evaluation.fields ?? {};
    }
    const check = { name, url, ok, ...extra, ...fields };
    checks.push(check);
    if (!ok) {
      errors.push(`${name}: ${result.error ?? "check failed"}`);
    }
    return check;
  };

  const projectRootUrl = slug ? `${canonicalOrigin}/project/${slug}` : `${canonicalOrigin}/project/`;

  // --- Listing routes ---
  await addCheck("root", `${canonicalOrigin}/`, (r) => ({
    ok: r.status === 200,
    fields: { status: r.status },
  }));
  await addCheck("projects-listing", `${canonicalOrigin}/projects`, (r) => ({
    ok: r.status === 200,
    fields: { status: r.status },
  }));
  await addCheck("projects-paginated", `${canonicalOrigin}/projects?page=2`, (r) => ({
    ok: r.status === 200 && r.robots === "noindex, follow",
    fields: { status: r.status, robots: r.robots },
  }));
  await addCheck("projects-tracking-only", `${canonicalOrigin}/projects?utm_source=x`, (r) => ({
    ok: r.status === 200 && !r.robots,
    fields: { status: r.status, robots: r.robots },
  }));

  // --- Alias hosts: one permanent hop (301/308) to www preserving path + query.
  // The Location is resolved against the request URL before comparison. ---
  const apexUrl = `${apexOrigin}/funding-map?ref=1`;
  const apexExpected = `${canonicalOrigin}${pathAndQuery(apexUrl)}`;
  await addCheck("apex-alias", apexUrl, (r) => {
    const match = permanentRedirectMatch(r.status, r.location, apexUrl, apexExpected);
    return {
      ok: match.ok,
      fields: {
        status: r.status,
        location: r.location,
        resolved: match.resolved,
        expected: apexExpected,
      },
    };
  });
  const gapUrl = `${gapOrigin}/funding-map`;
  const gapExpected = `${canonicalOrigin}${pathAndQuery(gapUrl)}`;
  await addCheck("gap-alias", gapUrl, (r) => {
    const match = permanentRedirectMatch(r.status, r.location, gapUrl, gapExpected);
    return {
      ok: match.ok,
      fields: {
        status: r.status,
        location: r.location,
        resolved: match.resolved,
        expected: gapExpected,
      },
    };
  });

  // --- Canonical project routes ---
  await addCheck("project-root-canonical", projectRootUrl, (r) => {
    const canonical = extractCanonical(r.body);
    return {
      ok: r.status === 200 && canonical === projectRootUrl,
      fields: { status: r.status, canonical },
    };
  });
  await addCheck("project-about-canonical", `${projectRootUrl}/about`, (r) => {
    const canonical = extractCanonical(r.body);
    return {
      ok: r.status === 200 && canonical === projectRootUrl,
      fields: { status: r.status, canonical },
    };
  });
  const roadmapUrl = `${projectRootUrl}/roadmap`;
  await addCheck("project-roadmap-redirect", roadmapUrl, (r) => {
    const match = permanentRedirectMatch(r.status, r.location, roadmapUrl, projectRootUrl);
    return {
      ok: match.ok,
      fields: { status: r.status, location: r.location, resolved: match.resolved },
    };
  });
  await addCheck("project-impact-noindex", `${projectRootUrl}/impact`, (r) => ({
    ok: r.status === 200 && r.robots === "noindex, follow",
    fields: { status: r.status, robots: r.robots },
  }));

  // --- Compound gap legacy grants → ONE permanent hop to the FINAL www funding
  // target. Deliberately strict about the one-hop final target: a live 2-hop
  // chain (gap → www/.../grants, then a second hop to funding) fails here. ---
  const legacyUrl = slug
    ? `${gapOrigin}/project/${slug}/grants`
    : `${gapOrigin}/project//grants`;
  const legacyExpected = `${projectRootUrl}/funding`;
  await addCheck("gap-legacy-grants-redirect", legacyUrl, (r) => {
    const match = permanentRedirectMatch(r.status, r.location, legacyUrl, legacyExpected);
    return {
      ok: match.ok,
      fields: {
        status: r.status,
        location: r.location,
        resolved: match.resolved,
        expected: legacyExpected,
      },
    };
  });

  // --- Invalid slug → gone (404/410) with noindex ---
  await addCheck("invalid-slug-gone", `${canonicalOrigin}/project/${INVALID_PROBE_SLUG}`, (r) => ({
    ok: (r.status === 404 || r.status === 410) && Boolean(r.robots) && /noindex/i.test(r.robots),
    fields: { status: r.status, robots: r.robots },
  }));

  // --- Each exact banned slug: gone (404/410) + noindex, follow ---
  for (const banned of BANNED_PROJECT_SLUGS) {
    await addCheck(
      `banned-slug:${banned}`,
      `${canonicalOrigin}/project/${banned}`,
      (r) => ({
        ok: (r.status === 404 || r.status === 410) && r.robots === "noindex, follow",
        fields: { status: r.status, robots: r.robots },
      }),
      { slug: banned }
    );
  }

  // --- Indexer decision endpoint: strict canonical-indexable root ---
  const indexerUrl = slug
    ? `${indexerBaseUrl}/v2/projects/${slug}/indexability?route=root`
    : `${indexerBaseUrl}/v2/projects//indexability?route=root`;
  await addCheck("indexer-decision", indexerUrl, (r) => {
    const decision = parseJson(r.body);
    const valid = isStrictCanonicalIndexableRoot(decision, `/project/${slug}`);
    return { ok: r.status === 200 && valid, fields: { status: r.status } };
  });

  const ok = audit.ok && checks.every((check) => check.ok);

  return {
    timestamp: now ?? new Date().toISOString(),
    origins: {
      canonical: canonicalOrigin,
      apex: apexOrigin,
      gap: gapOrigin,
      indexer: indexerBaseUrl,
    },
    sitemap: { sitemapCount: audit.sitemapCount, leafCount: audit.leafCount },
    representativeProject,
    checks,
    errors,
    ok,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Single timed fetch: one AbortController + one timer per request (no double
// timers). Timeout aborts the signal; redirect is passed through when given.
async function timedFetch(fetch, url, { timeoutMs, redirect } = {}) {
  const controller = new AbortController();
  const timer =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  try {
    const options = { signal: controller.signal };
    if (redirect) {
      options.redirect = redirect;
    }
    return await fetch(url, options);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function safeUrl(value, base) {
  try {
    return base === undefined ? new URL(String(value)) : new URL(String(value), String(base));
  } catch {
    return null;
  }
}

/**
 * A permanent redirect is 301 OR 308, and its Location may be absolute
 * or root-relative. Resolve the Location against the request URL, then compare to
 * the expected absolute target. Returns the resolved href (or null) so checks can
 * report it. A relative same-origin hop resolves to the canonical URL; an
 * absolute Location resolves to itself; a cross-origin relative Location cannot
 * match a different-origin target — correct, since alias hops must be absolute.
 */
function permanentRedirectMatch(status, location, requestUrl, expectedUrl) {
  if (!PERMANENT_REDIRECT_STATUSES.has(status) || !location) {
    return { ok: false, resolved: null };
  }
  const resolved = safeUrl(location, requestUrl)?.href ?? null;
  return { ok: resolved === expectedUrl, resolved };
}

function headerValue(response, name) {
  const getter = response?.headers?.get;
  if (typeof getter !== "function") {
    return "";
  }
  return response.headers.get(name) ?? "";
}

function isSitemapIndex(xml) {
  return /<sitemapindex[\s>]/i.test(xml);
}

function isUrlSet(xml) {
  return /<urlset[\s>]/i.test(xml);
}

function extractLocs(xml) {
  const locs = [];
  const pattern = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
  let match = pattern.exec(xml);
  while (match !== null) {
    locs.push(decodeXmlEntities(match[1].trim()));
    match = pattern.exec(xml);
  }
  return locs;
}

function decodeXmlEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => codePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => codePoint(Number(dec)))
    // Decode &amp; last so it does not double-decode the entities above.
    .replace(/&amp;/g, "&");
}

function codePoint(value) {
  try {
    return String.fromCodePoint(value);
  } catch {
    return "";
  }
}

function bannedProjectSlug(pathname, bannedSlugs) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "project" && bannedSlugs.includes(parts[1])) {
    return parts[1];
  }
  return null;
}

function firstProjectPath(leaves) {
  for (const leaf of leaves) {
    const parsed = safeUrl(leaf);
    if (!parsed) {
      continue;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 2 && parts[0] === "project") {
      return parsed.pathname;
    }
  }
  return null;
}

function pathAndQuery(url) {
  const parsed = safeUrl(url);
  return parsed ? `${parsed.pathname}${parsed.search}` : "";
}

// Attribute-order independent: scan every <link> tag, treat rel as a
// space-separated token list, and return the href of the first tag whose rel
// tokens include an exact "canonical" token.
function extractCanonical(html) {
  if (!html) {
    return null;
  }
  const linkPattern = /<link\b[^>]*>/gi;
  let match = linkPattern.exec(html);
  while (match !== null) {
    const tag = match[0];
    const rel = attributeValue(tag, "rel");
    if (rel && rel.trim().split(/\s+/).includes("canonical")) {
      const href = attributeValue(tag, "href");
      if (href) {
        return href;
      }
    }
    match = linkPattern.exec(html);
  }
  return null;
}

function attributeValue(tag, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  if (!match) {
    return null;
  }
  return match[1] ?? match[2] ?? match[3] ?? null;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isStrictCanonicalIndexableRoot(value, expectedUrl) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("outcome") || !keys.includes("url")) {
    return false;
  }
  return value.outcome === "canonical-indexable" && value.url === expectedUrl;
}

function errMsg(err) {
  return err && err.message ? err.message : String(err);
}
