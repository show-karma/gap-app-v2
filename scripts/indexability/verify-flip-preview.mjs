/**
 * Flip-preview verification: did the cacheComponents flip actually prerender
 * what it claims, and did it cost any crawlable route its no-JS content?
 *
 * Two questions, one run, both answered over plain HTTP against a preview.
 * Nothing here builds, starts a server, or runs a browser.
 *
 * ## 1. The generateStaticParams samples are checked, not assumed
 *
 * Every sample on the flip branch reads from live data and degrades to `[]`
 * rather than failing the build — `chosenCommunities()` for communities, the
 * explorer for projects, `getPublishedSlugs()` for blog posts. That is the
 * right design and it has one consequence: a sample that silently produced
 * nothing looks exactly like one that worked, while the layouts' top-level
 * `await params` depends on it having worked. So each sample route is fetched
 * and its prerender signals read from the response headers.
 *
 * ## 2. The no-JS numbers are re-measured with the same extractor as before
 *
 * `extractNoJsVisibleHtml` and `visibleTextLength` are imported from
 * `crawl-sitemap.mjs` rather than reimplemented, so the numbers are directly
 * comparable to the DEV-612 record and to any baseline captured with that
 * crawler. What this module adds on top is the flip-specific half: the
 * internal link graph as a no-JS reader sees it, and whether any content has
 * moved into a hidden streamed chunk.
 *
 * Everything above `probe()` is pure and unit-tested against fixtures; only
 * `probe`, `discoverSamples` and `run` touch the network.
 */

import {
  extractFirstTagText,
  extractNoJsVisibleHtml,
  mapWithConcurrency,
  visibleTextLength,
} from "./crawl-sitemap.mjs";

export const DEFAULTS = Object.freeze({
  concurrency: 4,
  timeoutMs: 15000,
  /** A route below this many no-JS visible characters is thin regardless of any baseline. */
  minContentChars: 200,
  /**
   * How far a route may drop against the baseline before it counts as a
   * regression. Text length moves a little between deploys (a count, a date,
   * a newly published item), and a gate that fires on one character is a gate
   * people learn to ignore.
   */
  textDropTolerance: 0.1,
  whitelabelBase: "https://app.opgrants.io",
});

/**
 * The whitelabel spot checks.
 *
 * The karma shell is the only tenant prerendered at build (`app/t/[tenant]/layout.tsx`
 * returns just `KARMA_TENANT_PARAM`), so a whitelabel host takes one cold
 * render per deploy and is the case most likely to differ from the karma
 * measurement. `<community>` is substituted from the discovered community
 * sample; on a whitelabel host the community is implied by the domain, so the
 * paths are the domained ones rather than `/community/<slug>/...`.
 */
export const WHITELABEL_SPOT_CHECKS = Object.freeze(["/", "/projects", "/programs"]);

// ---------------------------------------------------------------------------
// Route ids -> URL paths
// ---------------------------------------------------------------------------

/**
 * `SITEMAP_NO_LOADING` keys routes by their on-disk path below the chrome
 * group, so they carry route groups (`(with-header)`, `(landing-nav)`) that are
 * invisible in URLs. Strip those, keep dynamic segments for the resolver.
 *
 *   ""                                          -> "/"
 *   "nonprofits/find-funders/(landing-nav)"      -> "/nonprofits/find-funders"
 *   "community/[communityId]/(with-header)"      -> "/community/[communityId]"
 */
export function routeIdToPath(routeId) {
  const segments = String(routeId)
    .split("/")
    .filter((segment) => segment.length > 0 && !(segment.startsWith("(") && segment.endsWith(")")));

  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

/**
 * Read the 53 route ids out of the structural test rather than duplicating
 * them here. That test is the source of truth and it fails in both directions,
 * so a copy in this file would rot silently and start disagreeing with the
 * guard it is meant to verify.
 *
 * Throws rather than returning `[]` if the shape changes: an empty list would
 * make this whole script pass while checking nothing.
 */
export function parseSitemapNoLoading(source) {
  const block = /const SITEMAP_NO_LOADING:[^=]*=\s*new Set\(\[([\s\S]*?)\]\);/.exec(source);
  if (!block) {
    throw new Error(
      "Could not find `const SITEMAP_NO_LOADING ... = new Set([...])` in the route-structure test. " +
        "If it was renamed or reshaped, update parseSitemapNoLoading — do not copy the list here."
    );
  }

  const ids = [...block[1].matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (ids.length === 0) {
    throw new Error("SITEMAP_NO_LOADING parsed to an empty list, which cannot be right.");
  }
  return ids;
}

/** `[param]` -> a real value, or null when nothing can stand in for it. */
export function resolveDynamicPath(path, samples) {
  const segments = path.split("/");
  const missing = [];

  const resolved = segments.map((segment) => {
    if (!segment.startsWith("[") || !segment.endsWith("]")) return segment;
    const name = segment.slice(1, -1).replace(/^\.\.\./, "");
    const value = samples[name];
    if (!value) {
      missing.push(name);
      return segment;
    }
    return encodeURIComponent(value);
  });

  return missing.length > 0
    ? { path: null, missing }
    : { path: resolved.join("/") || "/", missing: [] };
}

// ---------------------------------------------------------------------------
// Prerender verdict
// ---------------------------------------------------------------------------

export const PRERENDER = Object.freeze({
  PRERENDERED: "prerendered",
  DYNAMIC: "dynamic",
  UNKNOWN: "unknown",
});

/**
 * Read the prerender signals off a response.
 *
 * No single header is authoritative across Vercel and a self-hosted Next, so
 * this reports what it saw and only calls a verdict when the signals agree:
 *
 * - `x-nextjs-prerender: 1` — Next's own marker, the strongest signal.
 * - `x-vercel-cache: HIT | STALE | REVALIDATED` — served from the edge cache.
 *   `MISS` on a first request to a prerendered route is normal, so a MISS is
 *   never on its own evidence of a dynamic route.
 * - `cache-control` carrying `s-maxage`/`stale-while-revalidate` — a cacheable
 *   document; `private`/`no-store` is a dynamic one.
 *
 * `ttfbMs` is reported but deliberately not part of the verdict: it is a useful
 * corroborating number and a terrible gate, because a cold edge and a slow
 * network look identical to a dynamic render.
 */
export function classifyPrerender(headers = {}, { ttfbMs = null } = {}) {
  const get = (name) => {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return typeof value === "string" ? value.toLowerCase() : null;
  };

  const nextPrerender = get("x-nextjs-prerender");
  const vercelCache = get("x-vercel-cache");
  const cacheControl = get("cache-control") ?? "";

  const signals = {
    xNextjsPrerender: nextPrerender,
    xVercelCache: vercelCache,
    cacheControl: cacheControl || null,
    ttfbMs,
  };

  const cacheable = /s-maxage|stale-while-revalidate/.test(cacheControl);
  const uncacheable = /no-store|private/.test(cacheControl);
  const cacheHit = vercelCache !== null && ["hit", "stale", "revalidated"].includes(vercelCache);

  if (nextPrerender === "1" || cacheHit) {
    return { verdict: PRERENDER.PRERENDERED, signals };
  }
  if (uncacheable && nextPrerender === null) {
    return { verdict: PRERENDER.DYNAMIC, signals };
  }
  if (cacheable) {
    return { verdict: PRERENDER.PRERENDERED, signals };
  }
  return { verdict: PRERENDER.UNKNOWN, signals };
}

// ---------------------------------------------------------------------------
// No-JS measurements
// ---------------------------------------------------------------------------

const ANCHOR = /<a\b((?:"[^"]*"|'[^']*'|[^"'>])*)>/gi;
const HREF = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/**
 * Internal links a no-JS reader can actually follow.
 *
 * Counted on the no-JS visible HTML, not the raw markup: a link inside a hidden
 * streamed chunk is exactly the thing DEV-612 exists to prevent, and counting
 * it here would hide the regression this script is looking for.
 */
export function extractInternalLinks(noJsHtml, { origin = null } = {}) {
  const hrefs = [];
  for (const match of String(noJsHtml).matchAll(ANCHOR)) {
    const href = HREF.exec(match[1] ?? "");
    if (!href) continue;
    const value = (href[1] ?? href[2] ?? href[3] ?? "").trim();
    if (!value || value.startsWith("#")) continue;
    if (/^(mailto:|tel:|javascript:)/i.test(value)) continue;

    if (value.startsWith("/")) {
      hrefs.push(value);
      continue;
    }
    if (origin && value.startsWith(origin)) {
      hrefs.push(value.slice(origin.length) || "/");
    }
  }
  return { count: hrefs.length, hrefs };
}

const HIDDEN_CHUNK = /<div\b[^>]*\bhidden\b[^>]*>([\s\S]*?)<\/div>/gi;

/**
 * Hidden streamed chunks that carry real text.
 *
 * React streams late content as `<div hidden id="S:n">…</div>` and reveals it
 * with JavaScript. An empty hidden div is ordinary; one holding paragraphs of
 * the page's own content on a crawlable route is the DEV-612 failure, so only
 * chunks with meaningful text are counted.
 */
export function countHiddenChunksWithContent(html, { minChars = 40 } = {}) {
  let count = 0;
  let chars = 0;
  for (const match of String(html).matchAll(HIDDEN_CHUNK)) {
    const length = visibleTextLength(match[1] ?? "");
    if (length >= minChars) {
      count += 1;
      chars += length;
    }
  }
  return { count, chars };
}

/** Everything this script records about one URL, from an already-fetched response. */
export function measure({ url, status, headers, html, ttfbMs, origin = null }) {
  const noJsHtml = extractNoJsVisibleHtml(html ?? "");
  const links = extractInternalLinks(noJsHtml, { origin });
  const hidden = countHiddenChunksWithContent(html ?? "");
  const prerender = classifyPrerender(headers ?? {}, { ttfbMs });

  return {
    url,
    status: status ?? null,
    visibleChars: visibleTextLength(noJsHtml),
    rawChars: visibleTextLength(html ?? ""),
    h1: extractFirstTagText(noJsHtml, "h1"),
    internalLinks: links.count,
    hiddenChunks: hidden.count,
    hiddenChunkChars: hidden.chars,
    prerender: prerender.verdict,
    signals: prerender.signals,
    ttfbMs,
  };
}

// ---------------------------------------------------------------------------
// Regressions
// ---------------------------------------------------------------------------

/**
 * Compare a run against a baseline captured the same way on the integration
 * branch. With no baseline the absolute floors still apply, so a first run on a
 * fresh preview is meaningful rather than vacuously green.
 */
export function findRegressions(
  current,
  baseline = null,
  {
    minContentChars = DEFAULTS.minContentChars,
    textDropTolerance = DEFAULTS.textDropTolerance,
  } = {}
) {
  const regressions = [];
  const baselineByUrl = new Map((baseline?.routes ?? []).map((row) => [stripOrigin(row.url), row]));

  for (const row of current.samples ?? []) {
    if (row.status !== 200) {
      regressions.push({ url: row.url, kind: "sample-not-200", detail: `status ${row.status}` });
      continue;
    }
    if (row.prerender === PRERENDER.DYNAMIC) {
      regressions.push({
        url: row.url,
        kind: "sample-not-prerendered",
        detail:
          "served dynamically — the generateStaticParams sample for this segment is empty or stale",
      });
    }
  }

  for (const row of current.routes ?? []) {
    if (row.status !== 200) {
      regressions.push({ url: row.url, kind: "not-200", detail: `status ${row.status}` });
      continue;
    }

    const before = baselineByUrl.get(stripOrigin(row.url)) ?? null;

    if (!row.h1) {
      regressions.push({ url: row.url, kind: "no-h1", detail: "no <h1> without JavaScript" });
    } else if (before?.h1 && before.h1 !== row.h1) {
      regressions.push({
        url: row.url,
        kind: "h1-changed",
        detail: `"${before.h1}" -> "${row.h1}"`,
      });
    }

    if (row.visibleChars < minContentChars) {
      regressions.push({
        url: row.url,
        kind: "thin",
        detail: `${row.visibleChars} visible chars without JavaScript (floor ${minContentChars})`,
      });
    }

    if (before) {
      const floor = Math.floor(before.visibleChars * (1 - textDropTolerance));
      if (row.visibleChars < floor) {
        regressions.push({
          url: row.url,
          kind: "text-dropped",
          detail: `${before.visibleChars} -> ${row.visibleChars} visible chars`,
        });
      }
      if (row.internalLinks < before.internalLinks) {
        regressions.push({
          url: row.url,
          kind: "links-dropped",
          detail: `${before.internalLinks} -> ${row.internalLinks} internal links`,
        });
      }
      if (row.hiddenChunks > before.hiddenChunks) {
        regressions.push({
          url: row.url,
          kind: "content-moved-into-hidden-chunk",
          detail: `${before.hiddenChunks} -> ${row.hiddenChunks} hidden chunks carrying text (${row.hiddenChunkChars} chars)`,
        });
      }
    } else if (row.hiddenChunks > 0) {
      regressions.push({
        url: row.url,
        kind: "content-in-hidden-chunk",
        detail: `${row.hiddenChunks} hidden chunk(s) carrying ${row.hiddenChunkChars} chars on a crawlable route`,
      });
    }
  }

  return regressions;
}

export function stripOrigin(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return String(url);
  }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export function formatTable(rows, columns) {
  const header = columns.map((column) => column.label);
  const body = rows.map((row) => columns.map((column) => String(column.value(row) ?? "")));
  const widths = header.map((label, i) =>
    Math.max(label.length, ...body.map((cells) => cells[i].length), 3)
  );
  const line = (cells) =>
    cells
      .map((cell, i) => cell.padEnd(widths[i]))
      .join("  ")
      .trimEnd();

  return [line(header), line(widths.map((width) => "-".repeat(width))), ...body.map(line)].join(
    "\n"
  );
}

export function formatReport(result) {
  const parts = [];

  parts.push("generateStaticParams samples");
  parts.push(
    formatTable(result.samples, [
      { label: "segment", value: (r) => r.segment },
      { label: "url", value: (r) => stripOrigin(r.url) },
      { label: "status", value: (r) => r.status },
      { label: "prerender", value: (r) => r.prerender },
      { label: "x-nextjs-prerender", value: (r) => r.signals?.xNextjsPrerender ?? "-" },
      { label: "x-vercel-cache", value: (r) => r.signals?.xVercelCache ?? "-" },
      { label: "ttfb", value: (r) => (r.ttfbMs == null ? "-" : `${r.ttfbMs}ms`) },
    ])
  );

  if (result.undeclaredSamples?.length) {
    parts.push(
      `\nNo generateStaticParams declared on the branch for: ${result.undeclaredSamples.join(", ")}`
    );
  }
  if (result.unresolvedRoutes?.length) {
    parts.push(
      `\nSkipped (no sample value for their dynamic segment): ${result.unresolvedRoutes
        .map((entry) => `${entry.path} [${entry.missing.join(", ")}]`)
        .join(", ")}`
    );
  }

  parts.push("\nno-JS crawlable routes");
  parts.push(
    formatTable(result.routes, [
      { label: "url", value: (r) => stripOrigin(r.url) },
      { label: "status", value: (r) => r.status },
      { label: "chars", value: (r) => r.visibleChars },
      { label: "h1", value: (r) => (r.h1 ? "yes" : "NO") },
      { label: "links", value: (r) => r.internalLinks },
      { label: "hidden", value: (r) => r.hiddenChunks },
      { label: "prerender", value: (r) => r.prerender },
    ])
  );

  if (result.regressions.length === 0) {
    parts.push("\nNo regressions.");
  } else {
    parts.push(`\n${result.regressions.length} regression(s):`);
    for (const regression of result.regressions) {
      parts.push(`  ${regression.kind}  ${stripOrigin(regression.url)}  — ${regression.detail}`);
    }
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

/** One GET, with a timeout, capturing TTFB and the headers the verdict needs. */
export async function probe(url, { timeoutMs = DEFAULTS.timeoutMs, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: "text/html", "user-agent": "KarmaFlipPreviewVerifier/1.0" },
    });
    const ttfbMs = Date.now() - startedAt;
    const headers = Object.fromEntries(response.headers ?? []);
    const contentType = headers["content-type"] ?? "";
    // XML as well as HTML: `discoverSamples` reads sitemaps through this same
    // probe, and a sitemap is served as application/xml. Anything else (an
    // image, a font) is left unread rather than pulled into memory.
    const isTextual = /html|xml/i.test(contentType);
    const html = isTextual ? await response.text() : "";
    return { url, status: response.status, headers, html, ttfbMs, error: null };
  } catch (err) {
    return {
      url,
      status: null,
      headers: {},
      html: "",
      ttfbMs: null,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

const LOC = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;

export function parseSitemapLocs(xml) {
  return [...String(xml).matchAll(LOC)].map((match) => match[1]);
}

/**
 * Pick sample values out of the deployment's own sitemap.
 *
 * The samples on the branch read from `chosenCommunities()`, the explorer and
 * `getPublishedSlugs()` — the same sources that feed these sitemaps — so
 * reading the deployed sitemap reproduces the same kind of values without this
 * script importing app code it cannot import. It is not guaranteed to pick the
 * exact three the build prerendered, and it does not need to: what is being
 * verified is that routes in each segment come back prerendered at all, which
 * is false for every value in the segment when the sample was empty.
 */
export function pickSamplesFromLocs(locs) {
  const paths = locs
    .map((loc) => {
      try {
        return new URL(loc).pathname;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const firstMatch = (pattern) => {
    for (const path of paths) {
      const match = pattern.exec(path);
      pattern.lastIndex = 0;
      if (match) return match[1];
    }
    return null;
  };

  return {
    communityId: firstMatch(/^\/community\/([^/]+)\/?$/),
    projectId: firstMatch(/^\/project\/([^/]+)\/?$/),
    slug: firstMatch(/^\/blog\/([^/]+)\/?$/),
    programId: firstMatch(/^\/community\/[^/]+\/programs\/([^/]+)\/?$/),
  };
}

export async function discoverSamples(base, { fetchImpl = fetch, timeoutMs } = {}) {
  const root = await probe(new URL("/sitemap.xml", base).href, { fetchImpl, timeoutMs });
  const childUrls = parseSitemapLocs(root.html).filter((loc) => loc.endsWith(".xml"));

  const pages = [...parseSitemapLocs(root.html).filter((loc) => !loc.endsWith(".xml"))];
  for (const childUrl of childUrls) {
    const child = await probe(childUrl, { fetchImpl, timeoutMs });
    pages.push(...parseSitemapLocs(child.html).filter((loc) => !loc.endsWith(".xml")));
  }

  return pickSamplesFromLocs(pages);
}

/**
 * The segments whose prerendering depends on a `generateStaticParams`.
 *
 * `program` and `grant` are listed with `declared: false` because the flip
 * branch has no sample for them: only `app/t/[tenant]/layout.tsx`,
 * `community/[communityId]/layout.tsx`, `project/[projectId]/layout.tsx` and
 * `blog/[slug]/page.tsx` export one. They are kept here so their absence is
 * reported rather than silently missing from the run, and so that adding a
 * sample later needs one word changed rather than a new code path.
 */
export const SAMPLE_SEGMENTS = Object.freeze([
  {
    segment: "community",
    declared: true,
    source: "chosenCommunities().slice(0, 3) — community/[communityId]/layout.tsx",
    path: "/community/[communityId]",
  },
  {
    segment: "project",
    declared: true,
    source: "getExplorerProjectsPaginatedCached({page:1,limit:3}) — project/[projectId]/layout.tsx",
    path: "/project/[projectId]",
  },
  {
    segment: "blog",
    declared: true,
    source: "getPublishedSlugs() — blog/[slug]/page.tsx",
    path: "/blog/[slug]",
  },
  {
    segment: "program",
    declared: false,
    source: "no generateStaticParams on the flip branch",
    path: "/community/[communityId]/programs/[programId]",
  },
  {
    segment: "grant",
    declared: false,
    source: "no generateStaticParams on the flip branch",
    path: "/project/[projectId]/funding/[grantUid]",
  },
]);

export async function run({
  base,
  routeIds,
  samples = null,
  whitelabelBase = DEFAULTS.whitelabelBase,
  concurrency = DEFAULTS.concurrency,
  timeoutMs = DEFAULTS.timeoutMs,
  fetchImpl = fetch,
} = {}) {
  const origin = new URL(base).origin;
  const resolvedSamples = samples ?? (await discoverSamples(base, { fetchImpl, timeoutMs }));

  const sampleTargets = [];
  const undeclaredSamples = [];
  for (const segment of SAMPLE_SEGMENTS) {
    if (!segment.declared) {
      undeclaredSamples.push(segment.segment);
      continue;
    }
    const { path } = resolveDynamicPath(segment.path, resolvedSamples);
    if (!path) {
      undeclaredSamples.push(`${segment.segment} (no value discoverable from the sitemap)`);
      continue;
    }
    sampleTargets.push({ segment: segment.segment, url: new URL(path, base).href });
  }

  const routeTargets = [];
  const unresolvedRoutes = [];
  for (const routeId of routeIds) {
    const path = routeIdToPath(routeId);
    const { path: resolved, missing } = resolveDynamicPath(path, resolvedSamples);
    if (!resolved) {
      unresolvedRoutes.push({ path, missing });
      continue;
    }
    routeTargets.push({ url: new URL(resolved, base).href });
  }
  for (const path of WHITELABEL_SPOT_CHECKS) {
    routeTargets.push({ url: new URL(path, whitelabelBase).href, whitelabel: true });
  }

  const probeAll = (targets) =>
    mapWithConcurrency(targets, concurrency, async (target) => {
      const response = await probe(target.url, { fetchImpl, timeoutMs });
      return {
        ...target,
        ...measure({ ...response, origin: target.whitelabel ? null : origin }),
        error: response.error,
      };
    });

  const [sampleRows, routeRows] = await Promise.all([
    probeAll(sampleTargets),
    probeAll(routeTargets),
  ]);

  return {
    base,
    whitelabelBase,
    recordedAt: new Date().toISOString(),
    discoveredSamples: resolvedSamples,
    undeclaredSamples,
    unresolvedRoutes,
    samples: sampleRows,
    routes: routeRows,
  };
}
