/**
 * Dependency-free ESM sitemap content crawler.
 *
 * Walks the sitemap index, then every child urlset, and fetches a sample of the
 * listed pages WITHOUT executing JavaScript — exactly what a crawler that does
 * not render sees. Per URL it records HTTP status, robots directives (header and
 * meta), the declared canonical, the title, the first h1, and how much visible
 * text the no-JS HTML actually contains, then classifies the URL.
 *
 * This never runs in CI: it hits production. `scripts/crawl-sitemap.mjs` is the
 * manual CLI wrapper. Only these pure functions (with an injected `fetch`) are
 * exercised by the no-network unit tests.
 *
 * No Node-only APIs beyond the global URL / AbortController / Date, so the
 * module is safe to import without side effects.
 */

const DEFAULT_ROOT_SITEMAP_URL = "https://www.karmahq.xyz/sitemap.xml";
const DEFAULT_TIMEOUT_MS = 15000;
// Polite defaults: production is behind a WAF that will (rightly) throttle a
// hard parallel crawl, and the point of this script is a truthful sample, not
// speed.
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_DELAY_MS = 250;
// Children at or below this size are crawled in full; larger ones are sampled.
const DEFAULT_FULL_CRAWL_THRESHOLD = 200;
const DEFAULT_SAMPLE_PER_CHILD = 40;
// Visible-text floor for "this page says something without JavaScript".
const DEFAULT_MIN_CONTENT_CHARS = 200;
// A sitemap index may list further indexes. Walk them, but stop well before an
// accidental (or malicious) self-referential cycle turns into an infinite walk.
const DEFAULT_MAX_SITEMAP_DEPTH = 5;
// Sitemap protocol ceilings: 50,000 URLs and 50 MB uncompressed per document.
// Anything larger is a bug in the producer, so refuse it instead of buffering it.
const DEFAULT_MAX_SITEMAP_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_URLS_PER_SITEMAP = 50000;
const DEFAULT_USER_AGENT =
  "KarmaSitemapCrawler/1.0 (+https://www.karmahq.xyz; internal SEO audit; contact=engineering@karmahq.xyz)";

export const CLASSIFICATIONS = Object.freeze({
  OK: "ok",
  NON_200: "non-200",
  REDIRECTED: "redirected",
  NOINDEX: "noindex",
  NON_SELF_CANONICAL: "non-self-canonical",
  THIN: "thin",
  FETCH_ERROR: "fetch-error",
});

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Crawl the sitemap tree and classify every sampled URL.
 *
 * @returns {Promise<{timestamp: string, root: string, children: Array, results: Array,
 *   summary: object, knownIssues: Array, errors: string[], ok: boolean}>}
 */
export async function crawlSitemap({
  fetch,
  rootSitemapUrl = DEFAULT_ROOT_SITEMAP_URL,
  canonicalOrigin,
  samplePerChild = DEFAULT_SAMPLE_PER_CHILD,
  fullCrawlThreshold = DEFAULT_FULL_CRAWL_THRESHOLD,
  concurrency = DEFAULT_CONCURRENCY,
  delayMs = DEFAULT_DELAY_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  minContentChars = DEFAULT_MIN_CONTENT_CHARS,
  knownIssues = [],
  userAgent = DEFAULT_USER_AGENT,
  maxSitemapDepth = DEFAULT_MAX_SITEMAP_DEPTH,
  maxSitemapBytes = DEFAULT_MAX_SITEMAP_BYTES,
  maxUrlsPerSitemap = DEFAULT_MAX_URLS_PER_SITEMAP,
  sleep = defaultSleep,
  now,
} = {}) {
  if (typeof fetch !== "function") {
    throw new Error("crawlSitemap requires an injected `fetch`");
  }
  const allowlist = normalizeKnownIssues(knownIssues);
  const root = safeUrl(rootSitemapUrl);
  if (!root) {
    throw new Error(`Invalid rootSitemapUrl: "${rootSitemapUrl}"`);
  }
  const origin = canonicalOrigin ? normalizeOrigin(canonicalOrigin) : root.origin;

  const errors = [];
  const request = (url, consume) =>
    timedFetch(fetch, url, { timeoutMs, redirect: "manual", userAgent, consume });

  const children = [];
  const selected = [];

  // Breadth-first walk of the sitemap tree. The protocol lets an index list
  // further indexes, so a document is only treated as a leaf once it actually
  // parses as a urlset — never because of where it sat in the tree. `visited`
  // makes a self-referential index terminate; `maxSitemapDepth` bounds the rest.
  const visited = new Set();
  const queue = [{ url: root.href, depth: 0 }];

  while (queue.length > 0) {
    const { url: documentUrl, depth } = queue.shift();
    if (visited.has(documentUrl)) {
      continue;
    }
    visited.add(documentUrl);

    const doc = await fetchSitemapDocument(request, documentUrl, errors, { maxSitemapBytes });
    if (!doc) {
      children.push({ url: documentUrl, total: 0, sampled: 0, mode: "unavailable" });
      continue;
    }

    if (isSitemapIndex(doc)) {
      if (depth >= maxSitemapDepth) {
        errors.push(`sitemap index nesting exceeded depth ${maxSitemapDepth} at ${documentUrl}`);
        continue;
      }
      for (const loc of extractLocs(doc, { limit: maxUrlsPerSitemap, errors, documentUrl })) {
        const parsed = safeUrl(loc);
        if (!parsed) {
          errors.push(`malformed child sitemap loc in ${documentUrl}: ${loc}`);
          continue;
        }
        if (parsed.origin !== origin) {
          errors.push(`off-origin child sitemap rejected (not fetched): ${loc}`);
          continue;
        }
        queue.push({ url: parsed.href, depth: depth + 1 });
      }
      continue;
    }

    if (!isUrlSet(doc)) {
      errors.push(`sitemap ${documentUrl} is neither a sitemapindex nor a urlset`);
      continue;
    }

    const locs = dedupe(
      extractLocs(doc, { limit: maxUrlsPerSitemap, errors, documentUrl }).filter((loc) => {
        const parsed = safeUrl(loc);
        if (!parsed || parsed.origin !== origin) {
          errors.push(`off-origin or malformed leaf in ${documentUrl}: ${loc}`);
          return false;
        }
        return true;
      })
    );
    const sample = selectSample(locs, { fullCrawlThreshold, samplePerChild });
    children.push({
      url: documentUrl,
      total: locs.length,
      sampled: sample.length,
      mode: locs.length <= fullCrawlThreshold ? "full" : "sampled",
    });
    for (const leaf of sample) {
      selected.push({ url: leaf, sitemap: documentUrl });
    }
  }

  const results = await mapWithConcurrency(
    selected,
    concurrency,
    async ({ url, sitemap }) => {
      const inspected = await inspectUrl(request, url, { minContentChars });
      const classification = classify(inspected, url);
      const allowed =
        classification === CLASSIFICATIONS.OK
          ? null
          : matchKnownIssue(allowlist, url, classification, inspected);
      return {
        ...inspected,
        sitemap,
        classification,
        allowlisted: Boolean(allowed),
        allowlistReason: allowed ? allowed.reason : null,
      };
    },
    { sleep, delayMs }
  );

  const summary = summarize(results, errors);
  const timestamp = (now ? new Date(now) : new Date()).toISOString();

  return {
    timestamp,
    root: root.href,
    children,
    results,
    summary,
    knownIssues: allowlist,
    errors,
    ok: errors.length === 0 && summary.failing.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

/**
 * Deterministic, evenly-strided sample. The same input list always yields the
 * same URLs, so two runs are comparable instead of two different random walks.
 */
export function selectSample(
  urls,
  {
    fullCrawlThreshold = DEFAULT_FULL_CRAWL_THRESHOLD,
    samplePerChild = DEFAULT_SAMPLE_PER_CHILD,
  } = {}
) {
  if (urls.length <= fullCrawlThreshold) {
    return [...urls];
  }
  const size = Math.min(samplePerChild, urls.length);
  if (size <= 0) {
    return [];
  }
  const picked = [];
  for (let index = 0; index < size; index += 1) {
    picked.push(urls[Math.floor((index * urls.length) / size)]);
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Per-URL inspection
// ---------------------------------------------------------------------------

/**
 * Fetch one page and extract everything a non-rendering crawler would see.
 * Never throws: a transport failure becomes `{ error }` on the record.
 */
export async function inspectUrl(
  request,
  url,
  { minContentChars = DEFAULT_MIN_CONTENT_CHARS } = {}
) {
  let fetched;
  try {
    fetched = await request(url, async (response) => ({
      status: response?.status ?? 0,
      location: headerValue(response, "location") || null,
      xRobotsTag: headerValue(response, "x-robots-tag") || null,
      contentType: headerValue(response, "content-type") || null,
      body: isHtmlLike(headerValue(response, "content-type")) ? await response.text() : "",
    }));
  } catch (err) {
    return {
      url,
      status: null,
      error: errMsg(err),
      location: null,
      xRobotsTag: null,
      metaRobots: null,
      canonical: null,
      title: null,
      h1: null,
      textLength: 0,
      meaningful: false,
    };
  }

  const html = fetched.body ?? "";
  const canonicalHref = extractCanonical(html);
  const textLength = visibleTextLength(html);
  const h1 = extractFirstTagText(html, "h1");

  return {
    url,
    status: fetched.status,
    error: null,
    location: fetched.location,
    xRobotsTag: fetched.xRobotsTag,
    metaRobots: extractMetaRobots(html),
    canonical: canonicalHref ? (safeUrl(canonicalHref, url)?.href ?? canonicalHref) : null,
    title: extractFirstTagText(html, "title"),
    h1,
    textLength,
    meaningful: textLength >= minContentChars && Boolean(h1),
  };
}

/**
 * Single classification per URL, most severe first — a record is only `ok` when
 * it is 200, indexable, self-canonical AND meaningful without JavaScript, which
 * is exactly the acceptance criterion this crawl exists to prove.
 */
export function classify(record, expectedUrl = record.url) {
  if (record.error) {
    return CLASSIFICATIONS.FETCH_ERROR;
  }
  if (record.status >= 300 && record.status < 400) {
    return CLASSIFICATIONS.REDIRECTED;
  }
  if (record.status !== 200) {
    return CLASSIFICATIONS.NON_200;
  }
  if (hasNoindex(record.xRobotsTag) || hasNoindex(record.metaRobots)) {
    return CLASSIFICATIONS.NOINDEX;
  }
  if (!isSelfCanonical(record.canonical, expectedUrl)) {
    return CLASSIFICATIONS.NON_SELF_CANONICAL;
  }
  if (!record.meaningful) {
    return CLASSIFICATIONS.THIN;
  }
  return CLASSIFICATIONS.OK;
}

export function isSelfCanonical(canonical, expectedUrl) {
  if (!canonical) {
    return false;
  }
  const declared = safeUrl(canonical, expectedUrl);
  const expected = safeUrl(expectedUrl);
  if (!declared || !expected) {
    return false;
  }
  return canonicalKey(declared) === canonicalKey(expected);
}

// ---------------------------------------------------------------------------
// Known issues (URLs queued for removal / accepted follow-ups)
// ---------------------------------------------------------------------------

const FAILURE_CLASSIFICATIONS = new Set(
  Object.values(CLASSIFICATIONS).filter((value) => value !== CLASSIFICATIONS.OK)
);

/**
 * An allowlist entry suppresses a failing URL's contribution to `ok`, but it
 * must carry a written justification and it still shows up in the summary —
 * "explicitly queued for removal with justification", never silently ignored.
 *
 * `classifications` narrows an entry to the failure modes it actually excuses.
 * Without it an entry mutes everything for that URL, including a future 404 or
 * noindex that has nothing to do with the documented issue.
 *
 * `minTextLength` narrows it further along the axis `thin` actually measures.
 * A `thin` excuse is almost always "this page is a little under the threshold,
 * for a reason we understand" — not "this page may contain nothing at all". The
 * floor encodes the part of the page the entry claims still works, so a
 * regression that empties the page out drops below it and fails loudly instead
 * of landing under the same excuse.
 */
export function normalizeKnownIssues(entries) {
  if (!Array.isArray(entries)) {
    throw new Error("knownIssues must be an array");
  }
  return entries.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`knownIssues[${index}] must be an object`);
    }
    const reason = typeof entry.reason === "string" ? entry.reason.trim() : "";
    if (!reason) {
      throw new Error(`knownIssues[${index}] requires a non-empty "reason"`);
    }
    const { url, pathnameEndsWith, pathnameStartsWith, classifications, minTextLength } = entry;
    if (!url && !pathnameEndsWith && !pathnameStartsWith) {
      throw new Error(
        `knownIssues[${index}] requires one of "url", "pathnameEndsWith", or "pathnameStartsWith"`
      );
    }
    if (classifications !== undefined) {
      if (!Array.isArray(classifications) || classifications.length === 0) {
        throw new Error(`knownIssues[${index}].classifications must be a non-empty array`);
      }
      for (const value of classifications) {
        if (!FAILURE_CLASSIFICATIONS.has(value)) {
          throw new Error(`knownIssues[${index}] has unknown classification "${value}"`);
        }
      }
    }
    if (minTextLength !== undefined && !Number.isSafeInteger(minTextLength)) {
      throw new Error(`knownIssues[${index}].minTextLength must be an integer`);
    }
    if (minTextLength !== undefined && minTextLength < 0) {
      throw new Error(`knownIssues[${index}].minTextLength must be >= 0`);
    }
    return {
      reason,
      url: url ?? null,
      pathnameEndsWith: pathnameEndsWith ?? null,
      pathnameStartsWith: pathnameStartsWith ?? null,
      classifications: classifications ? [...classifications] : null,
      minTextLength: minTextLength ?? null,
    };
  });
}

/**
 * Find the entry that excuses this failure, if any. `record` is the inspected
 * page; entries carrying a `minTextLength` floor only apply while the page still
 * clears it, so an entry can never grow into an excuse for a worse failure than
 * the one it documents.
 */
export function matchKnownIssue(allowlist, url, classification, record) {
  const parsed = safeUrl(url);
  const pathname = parsed ? parsed.pathname : url;
  const matchesPath = (entry) => {
    if (entry.url && entry.url === url) {
      return true;
    }
    if (entry.pathnameEndsWith && pathname.endsWith(entry.pathnameEndsWith)) {
      return true;
    }
    if (entry.pathnameStartsWith && pathname.startsWith(entry.pathnameStartsWith)) {
      return true;
    }
    return false;
  };
  const clearsFloor = (entry) => {
    if (entry.minTextLength === null || entry.minTextLength === undefined) {
      return true;
    }
    return Number(record?.textLength ?? 0) >= entry.minTextLength;
  };
  return (
    allowlist.find(
      (entry) =>
        matchesPath(entry) &&
        clearsFloor(entry) &&
        (!entry.classifications ||
          classification === undefined ||
          entry.classifications.includes(classification))
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function summarize(results, errors) {
  const byClassification = {};
  for (const value of Object.values(CLASSIFICATIONS)) {
    byClassification[value] = 0;
  }
  const failing = [];
  const allowlisted = [];

  for (const record of results) {
    byClassification[record.classification] = (byClassification[record.classification] ?? 0) + 1;
    if (record.classification === CLASSIFICATIONS.OK) {
      continue;
    }
    const entry = {
      url: record.url,
      classification: record.classification,
      status: record.status,
      canonical: record.canonical,
      textLength: record.textLength,
      reason: record.allowlistReason,
    };
    if (record.allowlisted) {
      allowlisted.push(entry);
    } else {
      failing.push(entry);
    }
  }

  return {
    crawled: results.length,
    ok: byClassification[CLASSIFICATIONS.OK],
    byClassification,
    failing,
    allowlisted,
    errorCount: errors.length,
  };
}

// ---------------------------------------------------------------------------
// Concurrency
// ---------------------------------------------------------------------------

/**
 * Bounded worker pool. At most `limit` tasks are in flight, and each worker
 * waits `delayMs` between its own requests, so the crawl stays polite.
 * Results keep input order.
 */
export async function mapWithConcurrency(
  items,
  limit,
  worker,
  { sleep = defaultSleep, delayMs = 0 } = {}
) {
  const size = Math.max(1, Math.floor(limit) || 1);
  const results = new Array(items.length);
  let cursor = 0;

  const runWorker = async () => {
    let first = true;
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      if (!first && delayMs > 0) {
        await sleep(delayMs);
      }
      first = false;
      results[index] = await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(size, items.length) }, runWorker));
  return results;
}

// ---------------------------------------------------------------------------
// HTML / XML helpers
// ---------------------------------------------------------------------------

const SCRIPT_LIKE = /<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const TAG = /<[^>]*>/g;

/**
 * Length of the text a reader sees with JavaScript disabled: script, style,
 * noscript, template and JSON-LD payloads are removed first so a page whose
 * only "content" is a serialized RSC payload or structured data is not counted
 * as meaningful.
 */
export function visibleTextLength(html) {
  if (!html) {
    return 0;
  }
  const stripped = html
    .replace(HTML_COMMENT, " ")
    .replace(SCRIPT_LIKE, " ")
    .replace(TAG, " ")
    .replace(/&nbsp;/gi, " ");
  return decodeHtmlEntities(stripped).replace(/\s+/g, " ").trim().length;
}

export function extractFirstTagText(html, tagName) {
  if (!html) {
    return null;
  }
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, "i");
  const match = html.replace(HTML_COMMENT, " ").match(pattern);
  if (!match) {
    return null;
  }
  const text = decodeHtmlEntities(match[1].replace(TAG, " ")).replace(/\s+/g, " ").trim();
  return text || null;
}

// Attribute-order independent: scan every <link> tag, treat rel as a
// space-separated token list, and return the href of the first canonical link.
export function extractCanonical(html) {
  if (!html) {
    return null;
  }
  const linkPattern = /<link\b[^>]*>/gi;
  let match = linkPattern.exec(html);
  while (match !== null) {
    const rel = attributeValue(match[0], "rel");
    if (rel?.trim().split(/\s+/).includes("canonical")) {
      const href = attributeValue(match[0], "href");
      if (href) {
        return decodeHtmlEntities(href);
      }
    }
    match = linkPattern.exec(html);
  }
  return null;
}

// Both the generic `robots` directive and Google's `googlebot` override count.
export function extractMetaRobots(html) {
  if (!html) {
    return null;
  }
  const metaPattern = /<meta\b[^>]*>/gi;
  const found = [];
  let match = metaPattern.exec(html);
  while (match !== null) {
    const name = attributeValue(match[0], "name");
    if (name && /^(robots|googlebot)$/i.test(name.trim())) {
      const content = attributeValue(match[0], "content");
      if (content) {
        found.push(content.trim());
      }
    }
    match = metaPattern.exec(html);
  }
  return found.length > 0 ? found.join(", ") : null;
}

// `none` is the standard shorthand for "noindex, nofollow" and keeps a page out
// of the index just as effectively as the explicit token.
const NOINDEX_TOKENS = new Set(["noindex", "none"]);

export function hasNoindex(value) {
  if (!value) {
    return false;
  }
  return value.split(/[,\s]+/).some((token) => NOINDEX_TOKENS.has(token.trim().toLowerCase()));
}

async function fetchSitemapDocument(request, url, errors, { maxSitemapBytes } = {}) {
  const byteCap = typeof maxSitemapBytes === "number" ? maxSitemapBytes : DEFAULT_MAX_SITEMAP_BYTES;
  let fetched;
  try {
    // Read `content-length` before touching the body: an oversized document is
    // refused without ever being buffered, so a runaway sitemap cannot take the
    // process down before the report is written.
    fetched = await request(url, async (response) => {
      const status = response?.status ?? 0;
      const declared = Number(headerValue(response, "content-length"));
      const declaredBytes = Number.isFinite(declared) && declared > 0 ? declared : null;
      const oversized = declaredBytes !== null && declaredBytes > byteCap;
      return {
        status,
        contentType: headerValue(response, "content-type"),
        declaredBytes,
        oversized,
        body: status === 200 && !oversized ? await response.text() : null,
      };
    });
  } catch (err) {
    errors.push(`sitemap fetch failed for ${url}: ${errMsg(err)}`);
    return null;
  }
  if (fetched?.oversized) {
    errors.push(`sitemap ${url} declares ${fetched.declaredBytes} bytes, above the ${byteCap} cap`);
    return null;
  }
  if (!fetched || fetched.status !== 200 || !fetched.body) {
    errors.push(`sitemap ${url} returned status ${fetched?.status ?? "unknown"}`);
    return null;
  }
  if (fetched.body.length > byteCap) {
    errors.push(`sitemap ${url} body is ${fetched.body.length} bytes, above the ${byteCap} cap`);
    return null;
  }
  // A `.xml.gz` child needs inflating before any of this parses. Say so instead
  // of reporting the generic non-XML error, which reads like a server misconfig.
  if (/gzip/i.test(fetched.contentType ?? "")) {
    errors.push(
      `sitemap ${url} is gzipped ("${fetched.contentType}"); this crawler reads uncompressed XML only`
    );
    return null;
  }
  if (!/xml/i.test(fetched.contentType ?? "")) {
    errors.push(`sitemap ${url} has non-XML content-type "${fetched.contentType ?? ""}"`);
    return null;
  }
  return fetched.body;
}

function isSitemapIndex(xml) {
  return /<sitemapindex[\s>]/i.test(xml);
}

function isUrlSet(xml) {
  return /<urlset[\s>]/i.test(xml);
}

function extractLocs(xml, { limit = Number.POSITIVE_INFINITY, errors, documentUrl } = {}) {
  const locs = [];
  const pattern = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
  let match = pattern.exec(xml);
  while (match !== null) {
    if (locs.length >= limit) {
      errors?.push(`sitemap ${documentUrl} lists more than ${limit} <loc> entries; truncated`);
      break;
    }
    locs.push(decodeHtmlEntities(match[1].trim()));
    match = pattern.exec(xml);
  }
  return locs;
}

function attributeValue(tag, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  if (!match) {
    return null;
  }
  return match[1] ?? match[2] ?? match[3] ?? null;
}

function decodeHtmlEntities(value) {
  return (
    value
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => codePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => codePoint(Number(dec)))
      // Decode &amp; last so it does not double-decode the entities above.
      .replace(/&amp;/g, "&")
  );
}

function codePoint(value) {
  try {
    return String.fromCodePoint(value);
  } catch {
    return "";
  }
}

function isHtmlLike(contentType) {
  return !contentType || /html/i.test(contentType);
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

// One AbortController + one timer per request; the body is read inside
// `consume` while the timer is still armed, so a stalled body aborts under the
// same timeout instead of hanging.
async function timedFetch(fetch, url, { timeoutMs, redirect, userAgent, consume } = {}) {
  const controller = new AbortController();
  const timer =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  try {
    const options = { signal: controller.signal, headers: { "user-agent": userAgent } };
    if (redirect) {
      options.redirect = redirect;
    }
    const response = await fetch(url, options);
    return consume ? await consume(response) : response;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function normalizeOrigin(value, label = "canonicalOrigin") {
  const url = safeUrl(value);
  if (!url) {
    throw new Error(`Invalid ${label}: "${value}" is not a valid URL`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Invalid ${label}: "${value}" must use http(s)`);
  }
  if ((url.pathname && url.pathname !== "/") || url.search || url.hash) {
    throw new Error(`Invalid ${label}: "${value}" must be origin-only (no path, query, or hash)`);
  }
  return url.origin;
}

// Only a trailing slash is normalized away. The query string is part of the
// identity of a URL: `/search?page=2` declaring `/search` canonical is a real
// consolidation, not a self-canonical, and must not be reported as `ok`.
function canonicalKey(url) {
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  return `${url.origin}${pathname}${url.search}`;
}

function dedupe(values) {
  return [...new Set(values)];
}

function headerValue(response, name) {
  const getter = response?.headers?.get;
  if (typeof getter !== "function") {
    return "";
  }
  return response.headers.get(name) ?? "";
}

function safeUrl(value, base) {
  try {
    return base === undefined ? new URL(String(value)) : new URL(String(value), String(base));
  } catch {
    return null;
  }
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errMsg(err) {
  return err?.message ? err.message : String(err);
}

export const CRAWL_DEFAULTS = Object.freeze({
  rootSitemapUrl: DEFAULT_ROOT_SITEMAP_URL,
  samplePerChild: DEFAULT_SAMPLE_PER_CHILD,
  fullCrawlThreshold: DEFAULT_FULL_CRAWL_THRESHOLD,
  concurrency: DEFAULT_CONCURRENCY,
  delayMs: DEFAULT_DELAY_MS,
  timeoutMs: DEFAULT_TIMEOUT_MS,
  minContentChars: DEFAULT_MIN_CONTENT_CHARS,
  userAgent: DEFAULT_USER_AGENT,
  maxSitemapDepth: DEFAULT_MAX_SITEMAP_DEPTH,
  maxSitemapBytes: DEFAULT_MAX_SITEMAP_BYTES,
  maxUrlsPerSitemap: DEFAULT_MAX_URLS_PER_SITEMAP,
});
