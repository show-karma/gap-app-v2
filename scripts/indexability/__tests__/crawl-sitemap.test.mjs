import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_KNOWN_ISSUES, main, parseArgs, resolveConfig } from "../../crawl-sitemap.mjs";
import {
  CLASSIFICATIONS,
  classify,
  crawlSitemap,
  extractCanonical,
  extractFirstTagText,
  extractMetaRobots,
  hasNoindex,
  inspectUrl,
  isSelfCanonical,
  mapWithConcurrency,
  matchKnownIssue,
  normalizeKnownIssues,
  selectSample,
  visibleTextLength,
} from "../crawl-sitemap.mjs";

// ---------------------------------------------------------------------------
// Dependency-free fixtures (no real network).
// ---------------------------------------------------------------------------

const CANONICAL = "https://www.karmahq.xyz";
const ROOT = `${CANONICAL}/sitemap.xml`;
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

function xml(body, { status = 200, contentType = "application/xml" } = {}) {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

function html(body, { status = 200, headers = {} } = {}) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });
}

const sitemapIndex = (locs) =>
  `<?xml version="1.0" encoding="UTF-8"?><sitemapindex ${NS}>${locs
    .map((loc) => `<sitemap><loc>${loc}</loc></sitemap>`)
    .join("")}</sitemapindex>`;

const urlSet = (locs) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset ${NS}>${locs
    .map((loc) => `<url><loc>${loc}</loc></url>`)
    .join("")}</urlset>`;

const PARAGRAPH =
  "Karma tracks grant milestones, disbursements and impact for funded projects across every ecosystem it supports, so funders can see what actually shipped. ".repeat(
    3
  );

function page({
  url,
  canonical = url,
  title = "A page title",
  h1 = "A page heading",
  body = PARAGRAPH,
} = {}) {
  return (
    `<!doctype html><html><head><title>${title}</title>` +
    (canonical ? `<link rel="canonical" href="${canonical}"/>` : "") +
    `</head><body><h1>${h1}</h1><p>${body}</p></body></html>`
  );
}

// A JS-only shell: everything meaningful lives inside a script payload.
const SHELL_HTML =
  `<!doctype html><html><head><title>Loading</title>` +
  `<link rel="canonical" href="${CANONICAL}/shell"/></head>` +
  `<body><div id="root"></div><script>window.__DATA__=${JSON.stringify({ text: PARAGRAPH })}</script></body></html>`;

function makeFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const key = String(url);
    calls.push({ url: key, options });
    const entry = routes[key];
    if (entry === undefined) {
      return new Response("missing", { status: 404, headers: { "content-type": "text/html" } });
    }
    return typeof entry === "function" ? entry(options) : entry;
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

const noSleep = async () => {};

// ---------------------------------------------------------------------------
// HTML extraction
// ---------------------------------------------------------------------------

describe("HTML extraction", () => {
  it("reads canonical, title, h1 and meta robots independent of attribute order", () => {
    const doc =
      `<html><head><title>Celo Funded Projects | Karma</title>` +
      `<meta content="noindex, follow" name="robots">` +
      `<link href="${CANONICAL}/community/celo/projects" rel="alternate canonical"></head>` +
      `<body><h1>Celo <span>Funded</span> Projects</h1></body></html>`;

    assert.equal(extractCanonical(doc), `${CANONICAL}/community/celo/projects`);
    assert.equal(extractFirstTagText(doc, "title"), "Celo Funded Projects | Karma");
    assert.equal(extractFirstTagText(doc, "h1"), "Celo Funded Projects");
    assert.equal(extractMetaRobots(doc), "noindex, follow");
  });

  it("returns null for absent tags rather than throwing", () => {
    assert.equal(extractCanonical("<html><head></head></html>"), null);
    assert.equal(extractFirstTagText("<html></html>", "h1"), null);
    assert.equal(extractMetaRobots("<html></html>", "robots"), null);
    assert.equal(extractCanonical(""), null);
  });

  it("treats robots directives as a token list", () => {
    assert.equal(hasNoindex("noindex, nofollow"), true);
    assert.equal(hasNoindex("max-image-preview:large"), false);
    assert.equal(hasNoindex("index, follow"), false);
    assert.equal(hasNoindex(null), false);
  });

  it("excludes script, style, noscript and JSON-LD from the visible text length", () => {
    const withPayload =
      `<html><body><p>Visible words here.</p>` +
      `<script type="application/ld+json">${JSON.stringify({ description: PARAGRAPH })}</script>` +
      `<style>.a{color:red}</style><noscript>Enable JavaScript</noscript></body></html>`;

    assert.equal(visibleTextLength(withPayload), "Visible words here.".length);
    assert.ok(visibleTextLength(`<html><body><p>${PARAGRAPH}</p></body></html>`) > 200);
    assert.equal(visibleTextLength(""), 0);
  });

  it("decodes entities in extracted text", () => {
    assert.equal(
      extractFirstTagText(
        "<html><head><title>Impact &amp; Outcomes</title></head></html>",
        "title"
      ),
      "Impact & Outcomes"
    );
  });
});

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

describe("selectSample", () => {
  const urls = Array.from({ length: 1000 }, (_, index) => `${CANONICAL}/project/p${index}`);

  it("crawls small children in full", () => {
    const small = urls.slice(0, 77);
    assert.deepEqual(selectSample(small, { fullCrawlThreshold: 200, samplePerChild: 40 }), small);
  });

  it("samples large children down to the requested size", () => {
    const sample = selectSample(urls, { fullCrawlThreshold: 200, samplePerChild: 40 });
    assert.equal(sample.length, 40);
    assert.equal(new Set(sample).size, 40);
    for (const url of sample) {
      assert.ok(urls.includes(url));
    }
  });

  it("is deterministic and evenly strided across the list", () => {
    const first = selectSample(urls, { fullCrawlThreshold: 200, samplePerChild: 40 });
    const second = selectSample(urls, { fullCrawlThreshold: 200, samplePerChild: 40 });
    assert.deepEqual(first, second);
    assert.equal(first[0], urls[0]);
    assert.equal(first[1], urls[25]);
    // Coverage reaches the tail of the list, not just the head.
    assert.equal(first.at(-1), urls[975]);
  });

  it("never asks for more URLs than the child has", () => {
    const sample = selectSample(urls.slice(0, 5), { fullCrawlThreshold: 2, samplePerChild: 40 });
    assert.equal(sample.length, 5);
  });
});

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

describe("classify", () => {
  const base = {
    url: `${CANONICAL}/community/celo/projects`,
    status: 200,
    error: null,
    xRobotsTag: null,
    metaRobots: null,
    canonical: `${CANONICAL}/community/celo/projects`,
    meaningful: true,
  };

  it("accepts a 200, indexable, self-canonical, meaningful page", () => {
    assert.equal(classify(base), CLASSIFICATIONS.OK);
  });

  it("flags redirects separately from other non-200 responses", () => {
    assert.equal(classify({ ...base, status: 308 }), CLASSIFICATIONS.REDIRECTED);
    assert.equal(classify({ ...base, status: 404 }), CLASSIFICATIONS.NON_200);
    assert.equal(classify({ ...base, status: 500 }), CLASSIFICATIONS.NON_200);
  });

  it("flags noindex from the header AND from the meta tag", () => {
    assert.equal(classify({ ...base, xRobotsTag: "noindex" }), CLASSIFICATIONS.NOINDEX);
    assert.equal(classify({ ...base, metaRobots: "noindex, follow" }), CLASSIFICATIONS.NOINDEX);
  });

  it("flags a canonical pointing anywhere but the URL itself", () => {
    assert.equal(
      classify({ ...base, canonical: `${CANONICAL}/community/celo` }),
      CLASSIFICATIONS.NON_SELF_CANONICAL
    );
    assert.equal(classify({ ...base, canonical: null }), CLASSIFICATIONS.NON_SELF_CANONICAL);
  });

  it("flags a page with no meaningful no-JS content", () => {
    assert.equal(classify({ ...base, meaningful: false }), CLASSIFICATIONS.THIN);
  });

  it("flags a transport failure ahead of everything else", () => {
    assert.equal(
      classify({ ...base, status: null, error: "The operation was aborted" }),
      CLASSIFICATIONS.FETCH_ERROR
    );
  });

  it("tolerates a trailing slash when comparing canonicals", () => {
    assert.equal(isSelfCanonical(`${CANONICAL}/projects/`, `${CANONICAL}/projects`), true);
    assert.equal(isSelfCanonical("/projects", `${CANONICAL}/projects`), true);
    assert.equal(isSelfCanonical(`${CANONICAL}/other`, `${CANONICAL}/projects`), false);
  });
});

// ---------------------------------------------------------------------------
// inspectUrl
// ---------------------------------------------------------------------------

describe("inspectUrl", () => {
  const request = (routes) => {
    const fetchImpl = makeFetch(routes);
    return async (url, consume) => {
      const response = await fetchImpl(url, {});
      return consume(response);
    };
  };

  it("extracts every crawler-visible signal from an article page", async () => {
    const url = `${CANONICAL}/knowledge/grant-accountability`;
    const record = await inspectUrl(
      request({
        [url]: () => html(page({ url, title: "Grant Accountability", h1: "Grant Accountability" })),
      }),
      url
    );

    assert.equal(record.status, 200);
    assert.equal(record.canonical, url);
    assert.equal(record.title, "Grant Accountability");
    assert.equal(record.h1, "Grant Accountability");
    assert.ok(record.textLength > 200);
    assert.equal(record.meaningful, true);
    assert.equal(record.error, null);
  });

  it("classifies a hydration-only shell as not meaningful", async () => {
    const url = `${CANONICAL}/shell`;
    const record = await inspectUrl(request({ [url]: () => html(SHELL_HTML) }), url);

    assert.equal(record.status, 200);
    assert.equal(record.meaningful, false);
    assert.ok(record.textLength < 200);
    assert.equal(classify(record), CLASSIFICATIONS.THIN);
  });

  it("records the x-robots-tag header and the Location of a redirect", async () => {
    const url = `${CANONICAL}/community/celo/projects?page=2`;
    const record = await inspectUrl(
      request({
        [url]: () =>
          new Response("", {
            status: 308,
            headers: {
              location: `${CANONICAL}/community/celo/projects`,
              "x-robots-tag": "noindex",
            },
          }),
      }),
      url
    );

    assert.equal(record.status, 308);
    assert.equal(record.xRobotsTag, "noindex");
    assert.equal(record.location, `${CANONICAL}/community/celo/projects`);
    assert.equal(classify(record), CLASSIFICATIONS.REDIRECTED);
  });

  it("turns a transport failure into a fetch-error record instead of throwing", async () => {
    const url = `${CANONICAL}/timeout`;
    const record = await inspectUrl(async () => {
      throw new Error("The operation was aborted");
    }, url);

    assert.equal(record.status, null);
    assert.equal(record.error, "The operation was aborted");
    assert.equal(classify(record), CLASSIFICATIONS.FETCH_ERROR);
  });

  it("respects a custom meaningful-content threshold", async () => {
    const url = `${CANONICAL}/short`;
    const shortPage = `<html><head><link rel="canonical" href="${url}"/></head><body><h1>Hi</h1><p>Short.</p></body></html>`;
    const strict = await inspectUrl(request({ [url]: () => html(shortPage) }), url, {
      minContentChars: 200,
    });
    const lenient = await inspectUrl(request({ [url]: () => html(shortPage) }), url, {
      minContentChars: 5,
    });

    assert.equal(strict.meaningful, false);
    assert.equal(lenient.meaningful, true);
  });
});

// ---------------------------------------------------------------------------
// Concurrency + politeness
// ---------------------------------------------------------------------------

describe("mapWithConcurrency", () => {
  it("never exceeds the in-flight limit and preserves input order", async () => {
    let inFlight = 0;
    let peak = 0;
    const items = Array.from({ length: 20 }, (_, index) => index);

    const results = await mapWithConcurrency(
      items,
      3,
      async (item) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
        return item * 2;
      },
      { sleep: noSleep, delayMs: 0 }
    );

    assert.equal(peak, 3);
    assert.deepEqual(
      results,
      items.map((item) => item * 2)
    );
  });

  it("applies the inter-request delay between requests", async () => {
    const slept = [];
    const sleep = async (ms) => {
      slept.push(ms);
    };

    await mapWithConcurrency(["a", "b", "c", "d"], 2, async (item) => item, {
      sleep,
      delayMs: 250,
    });

    // 4 items, 2 workers: each worker's first request is immediate, the rest wait.
    assert.equal(slept.length, 2);
    assert.deepEqual(new Set(slept), new Set([250]));
  });

  it("does not sleep when the delay is zero", async () => {
    let calls = 0;
    await mapWithConcurrency([1, 2, 3], 1, async (item) => item, {
      sleep: async () => {
        calls += 1;
      },
      delayMs: 0,
    });
    assert.equal(calls, 0);
  });
});

// ---------------------------------------------------------------------------
// Known issues allowlist
// ---------------------------------------------------------------------------

describe("normalizeKnownIssues", () => {
  it("requires a written justification for every entry", () => {
    assert.throws(() => normalizeKnownIssues([{ url: `${CANONICAL}/x` }]), /reason/);
    assert.throws(() => normalizeKnownIssues([{ url: `${CANONICAL}/x`, reason: "   " }]), /reason/);
  });

  it("requires a matcher", () => {
    assert.throws(() => normalizeKnownIssues([{ reason: "because" }]), /pathnameEndsWith/);
  });

  it("rejects a non-array input", () => {
    assert.throws(() => normalizeKnownIssues("nope"), /must be an array/);
  });

  it("rejects an unknown or empty classification scope", () => {
    assert.throws(
      () => normalizeKnownIssues([{ pathnameEndsWith: "/x", reason: "why", classifications: [] }]),
      /non-empty array/
    );
    assert.throws(
      () =>
        normalizeKnownIssues([
          { pathnameEndsWith: "/x", reason: "why", classifications: ["nonsense"] },
        ]),
      /unknown classification/
    );
    assert.throws(
      () =>
        normalizeKnownIssues([{ pathnameEndsWith: "/x", reason: "why", classifications: ["ok"] }]),
      /unknown classification/
    );
  });

  it("only matches the failure modes an entry is scoped to", () => {
    const allowlist = normalizeKnownIssues([
      { pathnameEndsWith: "/x", reason: "client-rendered list", classifications: ["thin"] },
    ]);

    assert.ok(matchKnownIssue(allowlist, `${CANONICAL}/x`, CLASSIFICATIONS.THIN));
    assert.equal(matchKnownIssue(allowlist, `${CANONICAL}/x`, CLASSIFICATIONS.NON_200), null);
    assert.equal(matchKnownIssue(allowlist, `${CANONICAL}/y`, CLASSIFICATIONS.THIN), null);
  });

  it("ships a scoped, justified default allowlist", () => {
    const normalized = normalizeKnownIssues(DEFAULT_KNOWN_ISSUES);
    assert.ok(normalized.length > 0);
    for (const entry of normalized) {
      assert.ok(entry.reason.length > 20, `weak justification: ${entry.reason}`);
      assert.ok(Array.isArray(entry.classifications), `unscoped allowlist entry: ${entry.reason}`);
    }
  });
});

// ---------------------------------------------------------------------------
// crawlSitemap end to end (injected fetch)
// ---------------------------------------------------------------------------

describe("crawlSitemap", () => {
  const staticChild = `${CANONICAL}/sitemaps/static/sitemap.xml`;
  const projectsChild = `${CANONICAL}/sitemaps/projects/sitemap.xml`;

  const projectUrls = Array.from({ length: 500 }, (_, index) => `${CANONICAL}/project/p${index}`);

  function buildRoutes(overrides = {}) {
    const routes = {
      [ROOT]: () => xml(sitemapIndex([staticChild, projectsChild])),
      [staticChild]: () => xml(urlSet([`${CANONICAL}/projects`, `${CANONICAL}/communities`])),
      [projectsChild]: () => xml(urlSet(projectUrls)),
      [`${CANONICAL}/projects`]: () => html(page({ url: `${CANONICAL}/projects` })),
      [`${CANONICAL}/communities`]: () => html(page({ url: `${CANONICAL}/communities` })),
    };
    for (const url of projectUrls) {
      routes[url] = () => html(page({ url }));
    }
    return { ...routes, ...overrides };
  }

  const run = (routes, options = {}) =>
    crawlSitemap({
      fetch: makeFetch(routes),
      rootSitemapUrl: ROOT,
      samplePerChild: 10,
      fullCrawlThreshold: 200,
      concurrency: 2,
      delayMs: 0,
      sleep: noSleep,
      now: "2026-07-31T00:00:00.000Z",
      ...options,
    });

  it("walks index -> children -> leaves and passes when everything is indexable", async () => {
    const report = await run(buildRoutes());

    assert.equal(report.ok, true);
    assert.equal(report.root, ROOT);
    assert.deepEqual(report.errors, []);

    const staticStats = report.children.find((child) => child.url === staticChild);
    assert.deepEqual(staticStats, { url: staticChild, total: 2, sampled: 2, mode: "full" });

    const projectStats = report.children.find((child) => child.url === projectsChild);
    assert.deepEqual(projectStats, {
      url: projectsChild,
      total: 500,
      sampled: 10,
      mode: "sampled",
    });

    assert.equal(report.summary.crawled, 12);
    assert.equal(report.summary.ok, 12);
    assert.deepEqual(report.summary.failing, []);
    assert.equal(report.timestamp, "2026-07-31T00:00:00.000Z");
  });

  it("records status, canonical, robots, title and content per URL", async () => {
    const report = await run(buildRoutes());
    const record = report.results.find((entry) => entry.url === `${CANONICAL}/projects`);

    assert.equal(record.status, 200);
    assert.equal(record.canonical, `${CANONICAL}/projects`);
    assert.equal(record.title, "A page title");
    assert.equal(record.h1, "A page heading");
    assert.equal(record.metaRobots, null);
    assert.ok(record.textLength > 200);
    assert.equal(record.sitemap, staticChild);
    assert.equal(record.classification, CLASSIFICATIONS.OK);
  });

  it("sends a descriptive user agent and never follows redirects", async () => {
    const fetchImpl = makeFetch(buildRoutes());
    await crawlSitemap({
      fetch: fetchImpl,
      rootSitemapUrl: ROOT,
      samplePerChild: 2,
      fullCrawlThreshold: 200,
      concurrency: 1,
      delayMs: 0,
      sleep: noSleep,
    });

    for (const call of fetchImpl.calls) {
      assert.equal(call.options.redirect, "manual");
      assert.match(call.options.headers["user-agent"], /karmahq\.xyz/);
      assert.ok(call.options.signal instanceof AbortSignal);
    }
  });

  it("fails the run when a sitemap URL is not self-canonical", async () => {
    const report = await run(
      buildRoutes({
        [`${CANONICAL}/communities`]: () =>
          html(page({ url: `${CANONICAL}/communities`, canonical: `${CANONICAL}/` })),
      })
    );

    assert.equal(report.ok, false);
    assert.equal(report.summary.failing.length, 1);
    assert.equal(report.summary.failing[0].url, `${CANONICAL}/communities`);
    assert.equal(report.summary.failing[0].classification, CLASSIFICATIONS.NON_SELF_CANONICAL);
  });

  it("fails the run on a non-200, a noindex and a thin page", async () => {
    const report = await run(
      buildRoutes({
        [`${CANONICAL}/projects`]: () => html("gone", { status: 410 }),
        [`${CANONICAL}/communities`]: () =>
          html(SHELL_HTML.replace(`${CANONICAL}/shell`, `${CANONICAL}/communities`)),
        [`${CANONICAL}/project/p0`]: () =>
          html(page({ url: `${CANONICAL}/project/p0` }), {
            headers: { "x-robots-tag": "noindex" },
          }),
      })
    );

    assert.equal(report.ok, false);
    const byUrl = new Map(report.summary.failing.map((entry) => [entry.url, entry.classification]));
    assert.equal(byUrl.get(`${CANONICAL}/projects`), CLASSIFICATIONS.NON_200);
    assert.equal(byUrl.get(`${CANONICAL}/communities`), CLASSIFICATIONS.THIN);
    assert.equal(byUrl.get(`${CANONICAL}/project/p0`), CLASSIFICATIONS.NOINDEX);
  });

  it("suppresses an allowlisted failure but still reports it with its justification", async () => {
    const report = await run(
      buildRoutes({
        [`${CANONICAL}/communities`]: () =>
          html(SHELL_HTML.replace(`${CANONICAL}/shell`, `${CANONICAL}/communities`)),
      }),
      {
        knownIssues: [
          {
            pathnameEndsWith: "/communities",
            classifications: ["thin"],
            reason: "Client-rendered directory; SSR seeding queued.",
          },
        ],
      }
    );

    assert.equal(report.ok, true);
    assert.deepEqual(report.summary.failing, []);
    assert.equal(report.summary.allowlisted.length, 1);
    assert.equal(report.summary.allowlisted[0].url, `${CANONICAL}/communities`);
    assert.match(report.summary.allowlisted[0].reason, /SSR seeding queued/);
    assert.equal(report.summary.byClassification[CLASSIFICATIONS.THIN], 1);
  });

  it("still fails a scoped-allowlisted URL that breaks in a different way", async () => {
    const report = await run(
      buildRoutes({ [`${CANONICAL}/communities`]: () => html("gone", { status: 410 }) }),
      {
        knownIssues: [
          {
            pathnameEndsWith: "/communities",
            classifications: ["thin"],
            reason: "Client-rendered directory; SSR seeding queued.",
          },
        ],
      }
    );

    assert.equal(report.ok, false);
    assert.equal(report.summary.failing.length, 1);
    assert.equal(report.summary.failing[0].classification, CLASSIFICATIONS.NON_200);
    assert.deepEqual(report.summary.allowlisted, []);
  });

  it("reports an unreachable child sitemap without aborting the rest of the crawl", async () => {
    const routes = buildRoutes();
    routes[projectsChild] = () => xml("nope", { status: 503 });
    const report = await run(routes);

    assert.equal(report.ok, false);
    assert.equal(report.errors.length, 1);
    assert.match(report.errors[0], /returned status 503/);
    // The healthy child was still crawled.
    assert.equal(report.summary.crawled, 2);
  });

  it("rejects an off-origin child sitemap before fetching it", async () => {
    const routes = buildRoutes();
    routes[ROOT] = () => xml(sitemapIndex([staticChild, "https://evil.example/sitemap.xml"]));
    const fetchImpl = makeFetch(routes);
    const report = await crawlSitemap({
      fetch: fetchImpl,
      rootSitemapUrl: ROOT,
      concurrency: 1,
      delayMs: 0,
      sleep: noSleep,
    });

    assert.match(report.errors.join("\n"), /off-origin child sitemap rejected/);
    assert.ok(!fetchImpl.calls.some((call) => call.url.includes("evil.example")));
  });

  it("requires an injected fetch", async () => {
    await assert.rejects(() => crawlSitemap({ rootSitemapUrl: ROOT }), /injected `fetch`/);
  });
});

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

describe("crawl-sitemap CLI", () => {
  const collector = () => {
    const lines = [];
    return { write: (line) => lines.push(line), lines };
  };

  it("parses both --flag value and --flag=value forms", () => {
    assert.deepEqual(parseArgs(["--concurrency", "4", "--delay-ms=500"]), {
      concurrency: "4",
      delayMs: "500",
    });
  });

  it("rejects unknown flags and missing values", () => {
    assert.throws(() => parseArgs(["--nope", "1"]), /Unknown argument/);
    assert.throws(() => parseArgs(["--output"]), /Missing value/);
    assert.throws(() => parseArgs(["--output", "--concurrency"]), /Missing value/);
  });

  it("gives flags precedence over env, and env over defaults", () => {
    const fromEnv = resolveConfig({}, { CRAWL_CONCURRENCY: "7", CRAWL_DELAY_MS: "900" });
    assert.equal(fromEnv.concurrency, 7);
    assert.equal(fromEnv.delayMs, 900);

    const fromFlags = resolveConfig({ concurrency: "2" }, { CRAWL_CONCURRENCY: "7" });
    assert.equal(fromFlags.concurrency, 2);

    const fromDefaults = resolveConfig({}, {});
    assert.equal(fromDefaults.concurrency, 3);
    assert.equal(fromDefaults.delayMs, 250);
    assert.equal(fromDefaults.rootSitemapUrl, `${CANONICAL}/sitemap.xml`);
  });

  it("rejects non-numeric numeric flags", () => {
    assert.throws(() => resolveConfig({ concurrency: "many" }, {}), /Invalid numeric value/);
    assert.throws(() => resolveConfig({ timeoutMs: "-1" }, {}), /Invalid numeric value/);
  });

  it("writes the report to --output and exits 0 on a passing crawl", async () => {
    const stdout = collector();
    const writes = [];
    const code = await main({
      argv: ["--output", "artifacts/sitemap-crawl-report.json"],
      env: {},
      fetch: async () => new Response("", { status: 200 }),
      crawl: async () => ({
        timestamp: "2026-07-31T00:00:00.000Z",
        root: ROOT,
        children: [{ url: ROOT, total: 1, sampled: 1, mode: "full" }],
        results: [],
        summary: {
          crawled: 1,
          ok: 1,
          byClassification: { ok: 1 },
          failing: [],
          allowlisted: [],
          errorCount: 0,
        },
        knownIssues: [],
        errors: [],
        ok: true,
      }),
      stdout,
      stderr: collector(),
      writeFile: async (path, contents) => writes.push({ path, contents }),
      mkdir: async () => {},
    });

    assert.equal(code, 0);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, "artifacts/sitemap-crawl-report.json");
    assert.equal(JSON.parse(writes[0].contents).ok, true);
    assert.match(stdout.lines.join(""), /Overall: PASS/);
  });

  it("exits 1 and prints each failure when the crawl fails", async () => {
    const stdout = collector();
    const code = await main({
      argv: [],
      env: {},
      crawl: async () => ({
        timestamp: "2026-07-31T00:00:00.000Z",
        root: ROOT,
        children: [],
        results: [],
        summary: {
          crawled: 1,
          ok: 0,
          byClassification: { "non-self-canonical": 1 },
          failing: [
            {
              url: `${CANONICAL}/community/celo/projects`,
              classification: "non-self-canonical",
              status: 200,
              canonical: `${CANONICAL}/community/celo`,
              textLength: 900,
              reason: null,
            },
          ],
          allowlisted: [],
          errorCount: 0,
        },
        knownIssues: [],
        errors: [],
        ok: false,
      }),
      stdout,
      stderr: collector(),
    });

    assert.equal(code, 1);
    const output = stdout.lines.join("");
    assert.match(output, /non-self-canonical/);
    assert.match(output, /Overall: FAIL/);
  });

  it("passes the default known-issues allowlist to the crawler", async () => {
    let received;
    await main({
      argv: [],
      env: {},
      crawl: async (options) => {
        received = options.knownIssues;
        return emptyReport();
      },
      stdout: collector(),
      stderr: collector(),
    });
    assert.deepEqual(received, DEFAULT_KNOWN_ISSUES);
  });

  it("loads a known-issues override file", async () => {
    let received;
    const override = [{ pathnameEndsWith: "/x", reason: "documented elsewhere" }];
    await main({
      argv: ["--known-issues", "known.json"],
      env: {},
      crawl: async (options) => {
        received = options.knownIssues;
        return emptyReport();
      },
      readFile: async () => JSON.stringify(override),
      stdout: collector(),
      stderr: collector(),
    });
    assert.deepEqual(received, override);
  });

  it("reports a bad known-issues file instead of crawling", async () => {
    const stderr = collector();
    let crawled = false;
    const code = await main({
      argv: ["--known-issues", "known.json"],
      env: {},
      crawl: async () => {
        crawled = true;
        return emptyReport();
      },
      readFile: async () => "{ not json",
      stdout: collector(),
      stderr,
    });

    assert.equal(code, 1);
    assert.equal(crawled, false);
    assert.match(stderr.lines.join(""), /Invalid JSON in known-issues file/);
  });

  it("returns 1 when writing the report fails", async () => {
    const stderr = collector();
    const code = await main({
      argv: ["--output", "artifacts/report.json"],
      env: {},
      crawl: async () => emptyReport(),
      stdout: collector(),
      stderr,
      writeFile: async () => {
        throw new Error("disk full");
      },
      mkdir: async () => {},
    });

    assert.equal(code, 1);
    assert.match(stderr.lines.join(""), /Failed to write report/);
  });
});

function emptyReport() {
  return {
    timestamp: "2026-07-31T00:00:00.000Z",
    root: ROOT,
    children: [],
    results: [],
    summary: {
      crawled: 0,
      ok: 0,
      byClassification: {},
      failing: [],
      allowlisted: [],
      errorCount: 0,
    },
    knownIssues: [],
    errors: [],
    ok: true,
  };
}
