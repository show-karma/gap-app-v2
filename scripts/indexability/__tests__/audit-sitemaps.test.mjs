import assert from "node:assert/strict";
import { describe, it } from "node:test";
// RED: the production module does not exist yet — this import fails until the
// dependency-free ESM verifier is implemented. Pins the auditSitemaps contract.
import { auditSitemaps } from "../verify-indexability.mjs";

// ---------------------------------------------------------------------------
// Small dependency-free response helpers (no real network).
// ---------------------------------------------------------------------------

const CANONICAL = "https://www.karmahq.xyz";
const ROOT = `${CANONICAL}/sitemap.xml`;
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

function xml(body, { status = 200, contentType = "application/xml" } = {}) {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

const sitemapIndex = (locs) =>
  `<?xml version="1.0" encoding="UTF-8"?><sitemapindex ${NS}>${locs
    .map((loc) => `<sitemap><loc>${loc}</loc></sitemap>`)
    .join("")}</sitemapindex>`;

const urlSet = (locs) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset ${NS}>${locs
    .map((loc) => `<url><loc>${loc}</loc></url>`)
    .join("")}</urlset>`;

function makeFetch(routes) {
  const calls = [];
  const callDetails = [];
  const fetchImpl = async (url, options) => {
    const key = String(url);
    calls.push(key);
    callDetails.push({ url: key, options });
    const entry = routes[key];
    if (entry === undefined) {
      return new Response("missing", { status: 404, headers: { "content-type": "text/plain" } });
    }
    // Pass options through so handlers can observe redirect + abort signal.
    return typeof entry === "function" ? entry(options) : entry;
  };
  fetchImpl.calls = calls;
  fetchImpl.callDetails = callDetails;
  return fetchImpl;
}

describe("auditSitemaps", () => {
  it("recursively traverses to urlset leaves and reports counts", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: () =>
        xml(
          sitemapIndex([
            `${CANONICAL}/sitemap-projects.xml`,
            `${CANONICAL}/sitemap-pages.xml`,
          ])
        ),
      [`${CANONICAL}/sitemap-projects.xml`]: () =>
        xml(urlSet([`${CANONICAL}/project/paraswap`, `${CANONICAL}/project/gitcoin`])),
      [`${CANONICAL}/sitemap-pages.xml`]: () =>
        xml(urlSet([`${CANONICAL}/projects`, `${CANONICAL}/about`])),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 3 });

    assert.equal(report.ok, true);
    assert.equal(report.sitemapCount, 3); // index + 2 children
    assert.equal(report.leafCount, 4);
    assert.ok(report.leaves.includes(`${CANONICAL}/project/paraswap`));
    assert.deepEqual(report.errors, []);
  });

  it("dedupes repeated child sitemap references and fetches each once", async () => {
    const child = `${CANONICAL}/sitemap-projects.xml`;
    const fetchImpl = makeFetch({
      [ROOT]: () => xml(sitemapIndex([child, child])),
      [child]: () => xml(urlSet([`${CANONICAL}/project/paraswap`])),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 1 });

    assert.equal(report.ok, true);
    assert.equal(report.sitemapCount, 2); // index + one unique child
    assert.equal(report.leafCount, 1);
    assert.equal(
      fetchImpl.calls.filter((u) => u === child).length,
      1,
      "duplicate child sitemap must be fetched only once"
    );
  });

  it("rejects leaves whose origin is not the canonical host", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: () => xml(urlSet([`${CANONICAL}/project/ok`, "https://evil.example.com/project/x"])),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 1 });

    assert.equal(report.ok, false);
    assert.equal(report.leafCount, 1);
    assert.ok(report.errors.some((e) => e.includes("evil.example.com")));
  });

  it("rejects leaves that carry a query or hash", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: () =>
        xml(urlSet([`${CANONICAL}/project/a?tab=1`, `${CANONICAL}/project/b#frag`])),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 0 });

    assert.equal(report.ok, false);
    assert.equal(report.leafCount, 0);
    assert.ok(report.errors.length >= 2);
  });

  it("rejects duplicate leaves across sitemaps", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: () => xml(sitemapIndex([`${CANONICAL}/a.xml`, `${CANONICAL}/b.xml`])),
      [`${CANONICAL}/a.xml`]: () => xml(urlSet([`${CANONICAL}/project/dup`])),
      [`${CANONICAL}/b.xml`]: () => xml(urlSet([`${CANONICAL}/project/dup`])),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 1 });

    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => /duplicate/i.test(e)));
  });

  it("rejects malformed loc URLs", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: () => xml(urlSet(["https:// not a url", "::::"])),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 0 });

    assert.equal(report.ok, false);
    assert.equal(report.leafCount, 0);
  });

  it("rejects an off-origin child sitemap and never fetches it, even with canonical leaves", async () => {
    const offOrigin = "https://evil.example.com/sitemap-projects.xml";
    const fetchImpl = makeFetch({
      [ROOT]: () => xml(sitemapIndex([offOrigin])),
      // Its leaves would be canonical, but the child itself must never be loaded.
      [offOrigin]: () => xml(urlSet([`${CANONICAL}/project/canonical-but-unreachable`])),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 0 });

    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => e.includes("evil.example.com")));
    assert.ok(
      !fetchImpl.calls.includes(offOrigin),
      "off-origin child sitemap must never be fetched"
    );
    assert.equal(report.leafCount, 0);
  });

  it("detects cycles between sitemapindex files without looping forever", async () => {
    const a = `${CANONICAL}/a.xml`;
    const b = `${CANONICAL}/b.xml`;
    const fetchImpl = makeFetch({
      [a]: () => xml(sitemapIndex([b])),
      [b]: () => xml(sitemapIndex([a])),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: a, minLeafCount: 0 });

    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => /cycle/i.test(e)));
  });

  it("rejects a non-200 sitemap response", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: () => xml(sitemapIndex([`${CANONICAL}/child.xml`])),
      [`${CANONICAL}/child.xml`]: () => xml("", { status: 500 }),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 0 });

    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => /500|status/i.test(e)));
  });

  it("rejects a non-XML content type", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: () =>
        new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } }),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 0 });

    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => /xml|content-type/i.test(e)));
  });

  it("rejects banned exact project slugs (-1, ---, -nan, test)", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: () =>
        xml(
          urlSet([
            `${CANONICAL}/project/-1`,
            `${CANONICAL}/project/---`,
            `${CANONICAL}/project/-nan`,
            `${CANONICAL}/project/test`,
            `${CANONICAL}/project/valid`,
          ])
        ),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 1 });

    assert.equal(report.ok, false);
    assert.equal(report.leafCount, 1); // only /project/valid survives
    for (const banned of ["-1", "---", "-nan", "test"]) {
      assert.ok(
        report.errors.some((e) => e.includes(`/project/${banned}`)),
        `banned slug ${banned} must be reported`
      );
    }
  });

  it("fetches root and child sitemaps with redirect: manual", async () => {
    const child = `${CANONICAL}/child.xml`;
    const fetchImpl = makeFetch({
      [ROOT]: () => xml(sitemapIndex([child])),
      [child]: () => xml(urlSet([`${CANONICAL}/project/ok`])),
    });

    await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 0 });

    for (const url of [ROOT, child]) {
      const call = fetchImpl.callDetails.find((c) => c.url === url);
      assert.ok(call, `expected a fetch for ${url}`);
      assert.equal(call.options?.redirect, "manual");
    }
  });

  it("applies the configurable timeout to a pending sitemap fetch via options.signal", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: (options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError"))
          );
        }),
    });

    const report = await auditSitemaps({
      fetch: fetchImpl,
      rootSitemapUrl: ROOT,
      minLeafCount: 0,
      timeoutMs: 20,
    });

    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => /fetch failed|abort/i.test(e)));
  });

  it("rejects XML whose root is neither sitemapindex nor urlset", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: () =>
        xml(`<?xml version="1.0" encoding="UTF-8"?><foo><loc>${CANONICAL}/project/x</loc></foo>`),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 0 });

    assert.equal(report.ok, false);
    assert.equal(report.leafCount, 0);
    assert.ok(report.errors.some((e) => /unrecognized|sitemapindex|urlset|root/i.test(e)));
  });

  it("enforces the configurable minimum leaf count", async () => {
    const fetchImpl = makeFetch({
      [ROOT]: () => xml(urlSet([`${CANONICAL}/project/a`, `${CANONICAL}/project/b`])),
    });

    const report = await auditSitemaps({ fetch: fetchImpl, rootSitemapUrl: ROOT, minLeafCount: 5 });

    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => /minimum|min leaf|too few/i.test(e)));
  });
});
