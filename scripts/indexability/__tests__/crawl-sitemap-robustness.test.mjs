/**
 * Hostile-input coverage for the sitemap crawler (DEV-586 review follow-up).
 *
 * The happy path and the classification matrix live in crawl-sitemap.test.mjs.
 * This file covers the ways a real sitemap tree misbehaves — nested indexes,
 * cycles, gzip, oversized documents, `none` robots directives, query-bearing
 * canonicals — plus the floor that stops a known-issue entry from silently
 * growing into an excuse for a worse failure than the one it documents.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_KNOWN_ISSUES } from "../../crawl-sitemap.mjs";
import {
  CLASSIFICATIONS,
  crawlSitemap,
  hasNoindex,
  isSelfCanonical,
  matchKnownIssue,
  normalizeKnownIssues,
} from "../crawl-sitemap.mjs";

const CANONICAL = "https://www.karmahq.xyz";
const ROOT = `${CANONICAL}/sitemap.xml`;
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

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

function page({ url, canonical = url, robotsMeta = "", body = PARAGRAPH } = {}) {
  return (
    `<!doctype html><html><head><title>A page title</title>` +
    (robotsMeta ? `<meta name="robots" content="${robotsMeta}">` : "") +
    (canonical ? `<link rel="canonical" href="${canonical}"/>` : "") +
    `</head><body><h1>A page heading</h1><p>${body}</p></body></html>`
  );
}

const xml = (body, { status = 200, contentType = "application/xml", headers = {} } = {}) =>
  new Response(body, { status, headers: { "content-type": contentType, ...headers } });

const html = (body) =>
  new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });

function makeFetch(routes) {
  const calls = [];
  const fetchImpl = async (url) => {
    const key = String(url);
    calls.push(key);
    const entry = routes[key];
    if (entry === undefined) {
      return new Response("missing", { status: 404, headers: { "content-type": "text/html" } });
    }
    return typeof entry === "function" ? entry() : entry;
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

const noSleep = async () => {};

const crawl = (fetchImpl, overrides = {}) =>
  crawlSitemap({
    fetch: fetchImpl,
    rootSitemapUrl: ROOT,
    concurrency: 1,
    delayMs: 0,
    sleep: noSleep,
    now: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });

// ---------------------------------------------------------------------------
// Nested sitemap indexes
// ---------------------------------------------------------------------------

describe("nested sitemap indexes", () => {
  it("recurses through an index of indexes instead of treating it as a urlset", async () => {
    const nested = `${CANONICAL}/sitemaps/nested.xml`;
    const leaf = `${CANONICAL}/sitemaps/entities.xml`;
    const target = `${CANONICAL}/projects/karma`;
    const report = await crawl(
      makeFetch({
        [ROOT]: () => xml(sitemapIndex([nested])),
        [nested]: () => xml(sitemapIndex([leaf])),
        [leaf]: () => xml(urlSet([target])),
        [target]: () => html(page({ url: target })),
      })
    );

    // The entity URL is inspected — not the nested index mistaken for a page.
    assert.deepEqual(
      report.children.map((child) => child.url),
      [leaf]
    );
    assert.deepEqual(
      report.results.map((record) => record.url),
      [target]
    );
    assert.equal(report.results[0].classification, CLASSIFICATIONS.OK);
    assert.deepEqual(report.errors, []);
    assert.equal(report.ok, true);
  });

  it("terminates on a self-referential index rather than looping forever", async () => {
    const leaf = `${CANONICAL}/sitemaps/entities.xml`;
    const target = `${CANONICAL}/projects/karma`;
    const fetchImpl = makeFetch({
      [ROOT]: () => xml(sitemapIndex([ROOT, leaf])),
      [leaf]: () => xml(urlSet([target])),
      [target]: () => html(page({ url: target })),
    });

    const report = await crawl(fetchImpl);

    assert.equal(fetchImpl.calls.filter((call) => call === ROOT).length, 1);
    assert.equal(report.ok, true);
  });

  it("stops and reports once index nesting passes the depth ceiling", async () => {
    const one = `${CANONICAL}/sitemaps/one.xml`;
    const two = `${CANONICAL}/sitemaps/two.xml`;
    const report = await crawl(
      makeFetch({
        [ROOT]: () => xml(sitemapIndex([one])),
        [one]: () => xml(sitemapIndex([two])),
        [two]: () => xml(urlSet([`${CANONICAL}/projects/karma`])),
      }),
      { maxSitemapDepth: 1 }
    );

    assert.equal(report.results.length, 0);
    assert.ok(report.errors.some((error) => error.includes("nesting exceeded depth 1")));
    assert.equal(report.ok, false);
  });
});

// ---------------------------------------------------------------------------
// Malformed / oversized sitemap documents
// ---------------------------------------------------------------------------

describe("sitemap document defences", () => {
  it("names gzip explicitly instead of reporting a generic non-XML content type", async () => {
    const report = await crawl(
      makeFetch({
        [ROOT]: () => xml(sitemapIndex([]), { contentType: "application/x-gzip" }),
      })
    );

    assert.ok(report.errors.some((error) => error.includes("gzipped")));
    assert.equal(report.ok, false);
  });

  it("refuses an oversized sitemap on content-length without reading the body", async () => {
    let bodyReads = 0;
    const fetchImpl = async () => ({
      status: 200,
      headers: {
        get: (name) =>
          name === "content-length"
            ? "999999999"
            : name === "content-type"
              ? "application/xml"
              : null,
      },
      text: async () => {
        bodyReads += 1;
        return urlSet([]);
      },
    });

    const report = await crawl(fetchImpl, { maxSitemapBytes: 1024 });

    assert.equal(bodyReads, 0);
    assert.ok(report.errors.some((error) => error.includes("above the 1024 cap")));
    assert.equal(report.ok, false);
  });

  it("refuses a body that overruns the cap even with no content-length header", async () => {
    const report = await crawl(
      makeFetch({ [ROOT]: () => xml(urlSet([`${CANONICAL}/projects/karma`])) }),
      { maxSitemapBytes: 10 }
    );

    assert.ok(report.errors.some((error) => error.includes("above the 10 cap")));
    assert.equal(report.ok, false);
  });

  it("truncates and reports a urlset that lists more URLs than the protocol allows", async () => {
    const locs = Array.from({ length: 5 }, (_, index) => `${CANONICAL}/projects/p${index}`);
    const report = await crawl(
      makeFetch({
        [ROOT]: () => xml(urlSet(locs)),
        ...Object.fromEntries(locs.map((loc) => [loc, () => html(page({ url: loc }))])),
      }),
      { maxUrlsPerSitemap: 2 }
    );

    assert.equal(report.children[0].total, 2);
    assert.ok(report.errors.some((error) => error.includes("more than 2 <loc> entries")));
  });
});

// ---------------------------------------------------------------------------
// Robots + canonical comparison
// ---------------------------------------------------------------------------

describe("robots directives", () => {
  it("treats `none` as noindex — it is the shorthand for noindex, nofollow", () => {
    assert.equal(hasNoindex("none"), true);
    assert.equal(hasNoindex("None"), true);
    assert.equal(hasNoindex("max-snippet:-1, none"), true);
    assert.equal(hasNoindex("index, follow"), false);
    assert.equal(hasNoindex("noneofyourbusiness"), false);
  });

  it('fails a sitemap URL that ships `<meta name="robots" content="none">`', async () => {
    const target = `${CANONICAL}/projects/karma`;
    const report = await crawl(
      makeFetch({
        [ROOT]: () => xml(urlSet([target])),
        [target]: () => html(page({ url: target, robotsMeta: "none" })),
      })
    );

    assert.equal(report.results[0].classification, CLASSIFICATIONS.NOINDEX);
    assert.equal(report.ok, false);
  });
});

describe("canonical comparison", () => {
  it("does not call a query URL self-canonical because the paths match", () => {
    assert.equal(isSelfCanonical(`${CANONICAL}/search`, `${CANONICAL}/search?page=2`), false);
    assert.equal(isSelfCanonical(`${CANONICAL}/search?page=2`, `${CANONICAL}/search?page=2`), true);
    assert.equal(
      isSelfCanonical(`${CANONICAL}/search?page=3`, `${CANONICAL}/search?page=2`),
      false
    );
  });

  it("still tolerates a trailing slash on the path", () => {
    assert.equal(
      isSelfCanonical(`${CANONICAL}/search/?page=2`, `${CANONICAL}/search?page=2`),
      true
    );
  });

  it("flags a query-bearing sitemap URL that consolidates onto its bare path", async () => {
    const target = `${CANONICAL}/search?page=2`;
    const report = await crawl(
      makeFetch({
        [ROOT]: () => xml(urlSet([target])),
        [target]: () => html(page({ url: target, canonical: `${CANONICAL}/search` })),
      })
    );

    assert.equal(report.results[0].classification, CLASSIFICATIONS.NON_SELF_CANONICAL);
    assert.equal(report.ok, false);
  });
});

// ---------------------------------------------------------------------------
// Known-issue floor
// ---------------------------------------------------------------------------

describe("known-issue content floor", () => {
  it("rejects a floor that is not a non-negative integer", () => {
    const base = { pathnameEndsWith: "/x", reason: "documented" };

    assert.throws(() => normalizeKnownIssues([{ ...base, minTextLength: -1 }]), /must be >= 0/);
    assert.throws(
      () => normalizeKnownIssues([{ ...base, minTextLength: 1.5 }]),
      /must be an integer/
    );
    assert.equal(normalizeKnownIssues([{ ...base, minTextLength: 0 }])[0].minTextLength, 0);
    assert.equal(normalizeKnownIssues([base])[0].minTextLength, null);
  });

  it("only excuses a page that still clears the floor", () => {
    const allowlist = normalizeKnownIssues([
      {
        pathnameEndsWith: "/funding-opportunities",
        classifications: ["thin"],
        minTextLength: 120,
        reason: "Header prose renders; the program cards need hydration.",
      },
    ]);
    const url = `${CANONICAL}/community/celo/funding-opportunities`;

    assert.ok(matchKnownIssue(allowlist, url, CLASSIFICATIONS.THIN, { textLength: 150 }));
    assert.equal(matchKnownIssue(allowlist, url, CLASSIFICATIONS.THIN, { textLength: 119 }), null);
  });

  it("fails an emptied funding-opportunities page instead of allowlisting it", async () => {
    const target = `${CANONICAL}/community/celo/funding-opportunities`;
    const emptied =
      `<!doctype html><html><head><title>Funding</title>` +
      `<link rel="canonical" href="${target}"/></head><body><h1>Funding</h1></body></html>`;
    const report = await crawl(
      makeFetch({
        [ROOT]: () => xml(urlSet([target])),
        [target]: () => html(emptied),
      }),
      { knownIssues: DEFAULT_KNOWN_ISSUES }
    );

    assert.equal(report.results[0].classification, CLASSIFICATIONS.THIN);
    assert.equal(report.results[0].allowlisted, false);
    assert.equal(report.summary.allowlisted.length, 0);
    assert.equal(report.summary.failing.length, 1);
    assert.equal(report.ok, false);
  });

  it("still excuses the documented near-threshold case", async () => {
    const target = `${CANONICAL}/community/celo/funding-opportunities`;
    const header =
      "Celo Community Grants funds public goods across the Celo ecosystem, and this directory lists every open program.";
    const report = await crawl(
      makeFetch({
        [ROOT]: () => xml(urlSet([target])),
        [target]: () => html(page({ url: target, body: header })),
      }),
      { knownIssues: DEFAULT_KNOWN_ISSUES }
    );

    assert.equal(report.results[0].classification, CLASSIFICATIONS.THIN);
    assert.equal(report.results[0].allowlisted, true);
    assert.equal(report.summary.failing.length, 0);
    assert.equal(report.ok, true);
  });

  it("ships a floor on every default thin excuse", () => {
    const allowlist = normalizeKnownIssues(DEFAULT_KNOWN_ISSUES);

    for (const entry of allowlist) {
      if (entry.classifications?.includes(CLASSIFICATIONS.THIN)) {
        assert.ok(
          typeof entry.minTextLength === "number" && entry.minTextLength > 0,
          `${entry.pathnameEndsWith ?? entry.url} excuses "thin" with no content floor`
        );
      }
    }
  });
});
