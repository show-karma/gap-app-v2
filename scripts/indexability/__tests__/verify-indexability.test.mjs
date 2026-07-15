import assert from "node:assert/strict";
import { describe, it } from "node:test";
// RED: the production module does not exist yet — this import fails until the
// dependency-free ESM verifier is implemented. Pins the verifyIndexability
// contract (verification matrix + resilient report).
import { verifyIndexability } from "../verify-indexability.mjs";

// ---------------------------------------------------------------------------
// Origins + representative fixtures.
// ---------------------------------------------------------------------------

const CANONICAL = "https://www.karmahq.xyz";
const APEX = "https://karmahq.xyz";
const GAP = "https://gap.karmahq.xyz";
const INDEXER = "https://indexer.test";
const SITEMAP = `${CANONICAL}/sitemap.xml`;
const SLUG = "paraswap";
const NOW = "2026-07-14T00:00:00.000Z";
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

// ---------------------------------------------------------------------------
// Small dependency-free response helpers (no real network).
// ---------------------------------------------------------------------------

function xml(body) {
  return new Response(body, { status: 200, headers: { "content-type": "application/xml" } });
}

function htmlPage({ status = 200, robots, canonical } = {}) {
  const headers = { "content-type": "text/html" };
  if (robots) headers["x-robots-tag"] = robots;
  const body = canonical
    ? `<!doctype html><html><head><link rel="canonical" href="${canonical}"/></head><body></body></html>`
    : "<!doctype html><html><head></head><body></body></html>";
  return new Response(body, { status, headers });
}

function redirectTo(location, status = 308) {
  return new Response(null, { status, headers: { location } });
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const urlSet = (locs) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset ${NS}>${locs
    .map((loc) => `<url><loc>${loc}</loc></url>`)
    .join("")}</urlset>`;

function healthyRoutes() {
  return {
    // Sitemap for auto-discovery of a representative /project/<slug> leaf.
    [SITEMAP]: () => xml(urlSet([`${CANONICAL}/project/${SLUG}`, `${CANONICAL}/projects`])),

    // Listing + home.
    [`${CANONICAL}/`]: () => htmlPage({ status: 200, canonical: `${CANONICAL}/` }),
    [`${CANONICAL}/projects`]: () => htmlPage({ status: 200, canonical: `${CANONICAL}/projects` }),
    [`${CANONICAL}/projects?page=2`]: () => htmlPage({ status: 200, robots: "noindex, follow" }),
    [`${CANONICAL}/projects?utm_source=x`]: () => htmlPage({ status: 200 }),

    // Alias hosts: exact one-hop 308 to www, preserving path + query.
    [`${APEX}/funding-map?ref=1`]: () => redirectTo(`${CANONICAL}/funding-map?ref=1`),
    [`${GAP}/funding-map`]: () => redirectTo(`${CANONICAL}/funding-map`),

    // Canonical project routes.
    [`${CANONICAL}/project/${SLUG}`]: () =>
      htmlPage({ status: 200, canonical: `${CANONICAL}/project/${SLUG}` }),
    [`${CANONICAL}/project/${SLUG}/about`]: () =>
      htmlPage({ status: 200, canonical: `${CANONICAL}/project/${SLUG}` }),
    [`${CANONICAL}/project/${SLUG}/roadmap`]: () => redirectTo(`${CANONICAL}/project/${SLUG}`),
    [`${CANONICAL}/project/${SLUG}/impact`]: () =>
      htmlPage({ status: 200, robots: "noindex, follow" }),

    // Compound gap legacy grants route → one 308 to final www funding.
    [`${GAP}/project/${SLUG}/grants`]: () => redirectTo(`${CANONICAL}/project/${SLUG}/funding`),

    // Invalid slug → gone with noindex.
    [`${CANONICAL}/project/this-project-does-not-exist`]: () =>
      htmlPage({ status: 404, robots: "noindex, follow" }),

    // Each exact banned slug must be gone (404/410) + noindex at the canonical
    // project path (mix of 404 and 410 to prove either is accepted).
    [`${CANONICAL}/project/-1`]: () => htmlPage({ status: 404, robots: "noindex, follow" }),
    [`${CANONICAL}/project/---`]: () => htmlPage({ status: 410, robots: "noindex, follow" }),
    [`${CANONICAL}/project/-nan`]: () => htmlPage({ status: 404, robots: "noindex, follow" }),
    [`${CANONICAL}/project/test`]: () => htmlPage({ status: 410, robots: "noindex, follow" }),
    [`${CANONICAL}/project/delete_test`]: () =>
      htmlPage({ status: 404, robots: "noindex, follow" }),
    [`${CANONICAL}/project/qa-bug-sweep-project-1752`]: () =>
      htmlPage({ status: 410, robots: "noindex, follow" }),

    // Indexer decision endpoint → strict canonical-indexable root decision.
    [`${INDEXER}/v2/projects/${SLUG}/indexability?route=root`]: () =>
      jsonResponse({ outcome: "canonical-indexable", url: `/project/${SLUG}` }),
  };
}

function makeFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const key = String(url);
    calls.push({ url: key, options });
    const entry = routes[key];
    if (typeof entry === "function") {
      // Pass options through so route handlers can react to the abort signal.
      return entry(options);
    }
    return new Response("missing", { status: 404, headers: { "content-type": "text/plain" } });
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

function runVerify(fetchImpl, extra = {}) {
  return verifyIndexability({
    fetch: fetchImpl,
    canonicalOrigin: CANONICAL,
    apexOrigin: APEX,
    gapOrigin: GAP,
    indexerBaseUrl: INDEXER,
    rootSitemapUrl: SITEMAP,
    minLeafCount: 1,
    now: NOW,
    ...extra,
  });
}

const byName = (report, name) => report.checks.find((check) => check.name === name);

describe("verifyIndexability", () => {
  it("passes the full matrix and produces a complete report", async () => {
    const report = await runVerify(makeFetch(healthyRoutes()));

    assert.equal(report.ok, true);
    assert.equal(report.timestamp, NOW);
    assert.deepEqual(report.origins, {
      canonical: CANONICAL,
      apex: APEX,
      gap: GAP,
      indexer: INDEXER,
    });
    assert.ok(report.sitemap.sitemapCount >= 1);
    assert.ok(report.sitemap.leafCount >= 1);
    assert.equal(report.representativeProject, `/project/${SLUG}`);
    assert.deepEqual(report.errors, []);

    // Listing behaviors.
    assert.equal(byName(report, "root").ok, true);
    assert.equal(byName(report, "projects-listing").ok, true);
    const paginated = byName(report, "projects-paginated");
    assert.equal(paginated.ok, true);
    assert.equal(paginated.robots, "noindex, follow");
    const tracking = byName(report, "projects-tracking-only");
    assert.equal(tracking.ok, true);
    assert.ok(!tracking.robots, "tracking-only listing must not carry a robots header");

    // Alias one-hop 308 preserving path + query.
    const apex = byName(report, "apex-alias");
    assert.equal(apex.ok, true);
    assert.equal(apex.status, 308);
    assert.equal(apex.location, `${CANONICAL}/funding-map?ref=1`);
    assert.equal(byName(report, "gap-alias").ok, true);

    // Project routes.
    const projectRoot = byName(report, "project-root-canonical");
    assert.equal(projectRoot.ok, true);
    assert.equal(projectRoot.canonical, `${CANONICAL}/project/${SLUG}`);
    const about = byName(report, "project-about-canonical");
    assert.equal(about.ok, true);
    assert.equal(about.canonical, `${CANONICAL}/project/${SLUG}`);
    const roadmap = byName(report, "project-roadmap-redirect");
    assert.equal(roadmap.ok, true);
    assert.equal(roadmap.status, 308);
    assert.equal(roadmap.location, `${CANONICAL}/project/${SLUG}`);
    assert.equal(byName(report, "project-impact-noindex").ok, true);

    // Compound gap legacy grants → one 308 to final www funding.
    const legacy = byName(report, "gap-legacy-grants-redirect");
    assert.equal(legacy.ok, true);
    assert.equal(legacy.location, `${CANONICAL}/project/${SLUG}/funding`);

    // Invalid slug → 404/410 with noindex.
    const invalid = byName(report, "invalid-slug-gone");
    assert.equal(invalid.ok, true);
    assert.ok(invalid.status === 404 || invalid.status === 410);

    // Indexer strict canonical-indexable root decision.
    assert.equal(byName(report, "indexer-decision").ok, true);
  });

  it("does not hang the report when the root sitemap is pending; non-project checks still run", async () => {
    const routes = healthyRoutes();
    // Root sitemap never resolves until the audit's timeout aborts it.
    routes[SITEMAP] = (options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted.", "AbortError"))
        );
      });

    const report = await runVerify(makeFetch(routes), { timeoutMs: 20 });

    assert.equal(report.ok, false);
    assert.equal(report.representativeProject, null);
    // Independent, non-project checks still executed.
    assert.equal(byName(report, "root").ok, true);
    assert.equal(byName(report, "projects-listing").ok, true);
    assert.equal(byName(report, "apex-alias").ok, true);
    assert.equal(byName(report, "gap-alias").ok, true);
  });

  it("extracts canonical when href precedes rel and rel carries multiple tokens", async () => {
    const routes = healthyRoutes();
    routes[`${CANONICAL}/project/${SLUG}`] = () =>
      new Response(
        `<!doctype html><html><head><link href="${CANONICAL}/project/${SLUG}" rel="canonical alternate"/></head><body></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } }
      );

    const report = await runVerify(makeFetch(routes));

    const check = byName(report, "project-root-canonical");
    assert.equal(check.ok, true);
    assert.equal(check.canonical, `${CANONICAL}/project/${SLUG}`);
  });

  it("requests redirecting checks with redirect: manual", async () => {
    const fetchImpl = makeFetch(healthyRoutes());
    await runVerify(fetchImpl);

    const roadmapCall = fetchImpl.calls.find(
      (call) => call.url === `${CANONICAL}/project/${SLUG}/roadmap`
    );
    assert.ok(roadmapCall, "roadmap URL must be fetched");
    assert.equal(roadmapCall.options?.redirect, "manual");
  });

  it("marks ok false on a 5xx but still runs the remaining independent checks", async () => {
    const routes = healthyRoutes();
    routes[`${CANONICAL}/project/${SLUG}`] = () => htmlPage({ status: 500 });

    const report = await runVerify(makeFetch(routes));

    assert.equal(report.ok, false);
    assert.equal(byName(report, "project-root-canonical").ok, false);
    // An independent check still executed and passed.
    assert.equal(byName(report, "root").ok, true);
    assert.equal(byName(report, "indexer-decision").ok, true);
    assert.ok(report.errors.length >= 1);
  });

  it("catches a network throw on one check without aborting the rest", async () => {
    const routes = healthyRoutes();
    routes[`${CANONICAL}/project/${SLUG}/impact`] = () => {
      throw new Error("ECONNRESET");
    };

    const report = await runVerify(makeFetch(routes));

    assert.equal(report.ok, false);
    assert.equal(byName(report, "project-impact-noindex").ok, false);
    // Checks after the failing one still ran.
    assert.equal(byName(report, "indexer-decision").ok, true);
    assert.equal(report.checks.length, byName(report, "root") ? report.checks.length : 0);
    assert.ok(report.checks.length >= 12);
  });

  it("probes each exact banned slug at canonical /project/{slug}, requiring 404/410 + noindex", async () => {
    const report = await runVerify(makeFetch(healthyRoutes()));

    for (const slug of ["-1", "---", "-nan", "test", "delete_test", "qa-bug-sweep-project-1752"]) {
      const check = byName(report, `banned-slug:${slug}`);
      assert.ok(check, `expected a per-slug check for banned slug ${slug}`);
      assert.equal(check.slug, slug);
      assert.equal(check.ok, true);
      assert.ok(
        check.status === 404 || check.status === 410,
        `banned slug ${slug} must be 404 or 410`
      );
      assert.equal(check.robots, "noindex, follow");
    }
  });

  it("fails the per-slug banned check when a banned slug is unexpectedly indexable", async () => {
    const routes = healthyRoutes();
    routes[`${CANONICAL}/project/test`] = () =>
      htmlPage({ status: 200, canonical: `${CANONICAL}/project/test` });

    const report = await runVerify(makeFetch(routes));

    assert.equal(report.ok, false);
    assert.equal(byName(report, "banned-slug:test").ok, false);
    // A sibling banned slug is unaffected.
    assert.equal(byName(report, "banned-slug:-1").ok, true);
  });

  it("times out a pending check via options.signal and still runs later independent checks", async () => {
    const routes = healthyRoutes();
    // Stays pending until the verifier's timeout aborts the request signal.
    routes[`${CANONICAL}/project/${SLUG}/impact`] = (options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted.", "AbortError"))
        );
      });

    const report = await runVerify(makeFetch(routes), { timeoutMs: 20 });

    assert.equal(report.ok, false);
    assert.equal(byName(report, "project-impact-noindex").ok, false);
    // A check sequenced after the timed-out one still executed.
    assert.equal(byName(report, "indexer-decision").ok, true);
  });

  it("fails only the indexer check when the decision is not a strict canonical-indexable root", async () => {
    const routes = healthyRoutes();
    routes[`${INDEXER}/v2/projects/${SLUG}/indexability?route=root`] = () =>
      jsonResponse({ outcome: "noindex-follow", url: `/project/${SLUG}` });

    const report = await runVerify(makeFetch(routes));

    assert.equal(report.ok, false);
    assert.equal(byName(report, "indexer-decision").ok, false);
    assert.equal(byName(report, "project-root-canonical").ok, true);
  });
});

// A permanent redirect is 301 OR 308, and the Location header may be
// absolute or root-relative (resolve it against the request URL before
// comparing). Production serves the apex/gap alias hop as a 301 (a Vercel
// platform redirect) and the same-origin roadmap hop as a 308 with a relative
// Location — both are compliant and must PASS. The gap-legacy-grants check stays
// strict about the one-hop FINAL target, so the real 2-hop live chain still
// fails.
describe("verifyIndexability permanent-redirect handling", () => {
  it("accepts a 301 (not only 308) permanent redirect for apex/gap alias hosts", async () => {
    const routes = healthyRoutes();
    routes[`${APEX}/funding-map?ref=1`] = () => redirectTo(`${CANONICAL}/funding-map?ref=1`, 301);
    routes[`${GAP}/funding-map`] = () => redirectTo(`${CANONICAL}/funding-map`, 301);

    const report = await runVerify(makeFetch(routes));

    const apex = byName(report, "apex-alias");
    assert.equal(apex.ok, true);
    assert.equal(apex.status, 301);
    assert.equal(apex.resolved, `${CANONICAL}/funding-map?ref=1`);
    assert.equal(byName(report, "gap-alias").ok, true);
  });

  it("accepts a relative Location on a permanent roadmap redirect (resolved against the request URL)", async () => {
    const routes = healthyRoutes();
    // Same-origin hop with a root-relative Location, as Next/Vercel may emit.
    routes[`${CANONICAL}/project/${SLUG}/roadmap`] = () => redirectTo(`/project/${SLUG}`, 308);

    const report = await runVerify(makeFetch(routes));

    const roadmap = byName(report, "project-roadmap-redirect");
    assert.equal(roadmap.ok, true);
    assert.equal(roadmap.status, 308);
    assert.equal(roadmap.location, `/project/${SLUG}`);
    assert.equal(roadmap.resolved, `${CANONICAL}/project/${SLUG}`);
  });

  it("accepts a 301 one-hop gap-legacy-grants redirect to the final www funding target", async () => {
    const routes = healthyRoutes();
    routes[`${GAP}/project/${SLUG}/grants`] = () =>
      redirectTo(`${CANONICAL}/project/${SLUG}/funding`, 301);

    const report = await runVerify(makeFetch(routes));

    assert.equal(byName(report, "gap-legacy-grants-redirect").ok, true);
  });

  it("keeps gap-legacy-grants strict: a one-hop redirect to www /grants (real 2-hop chain) fails", async () => {
    const routes = healthyRoutes();
    // The live chain: gap → www/.../grants (alias hop only), NOT the final
    // funding target in a single hop. redirect: "manual" sees just this first hop.
    routes[`${GAP}/project/${SLUG}/grants`] = () =>
      redirectTo(`${CANONICAL}/project/${SLUG}/grants`, 301);

    const report = await runVerify(makeFetch(routes));

    const legacy = byName(report, "gap-legacy-grants-redirect");
    assert.equal(legacy.ok, false);
    assert.equal(legacy.resolved, `${CANONICAL}/project/${SLUG}/grants`);
  });
});

describe("origin normalization and validation", () => {
  it("normalizes a trailing-slash canonical origin so same-origin leaves are accepted", async () => {
    const CANON2 = "https://c.example";
    const root2 = `${CANON2}/sitemap_index.xml`;
    const fetchImpl = makeFetch({
      [root2]: () => xml(urlSet([`${CANON2}/project/foo`])),
    });
    const report = await verifyIndexability({
      fetch: fetchImpl,
      canonicalOrigin: "https://c.example/",
      apexOrigin: APEX,
      gapOrigin: GAP,
      indexerBaseUrl: INDEXER,
      rootSitemapUrl: root2,
      minLeafCount: 1,
      now: NOW,
    });
    assert.equal(report.origins.canonical, CANON2);
    assert.equal(report.sitemap.leafCount, 1);
  });

  it("rejects a path-bearing canonical origin by throwing", async () => {
    await assert.rejects(
      () =>
        verifyIndexability({
          fetch: makeFetch({}),
          canonicalOrigin: "https://c.example/path",
          apexOrigin: APEX,
          gapOrigin: GAP,
          indexerBaseUrl: INDEXER,
          now: NOW,
        }),
      /origin/i
    );
  });
});

describe("body-read timeout (page probes)", () => {
  it(
    "aborts a stalled page body read via the timeout and still runs later checks",
    { timeout: 3000 },
    async () => {
      const routes = healthyRoutes();
      routes[`${CANONICAL}/`] = (options) => ({
        status: 200,
        headers: { get: () => null },
        text: () =>
          new Promise((_, reject) => {
            options.signal.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      });
      const report = await runVerify(makeFetch(routes), { timeoutMs: 20 });
      assert.equal(byName(report, "root").ok, false);
      assert.equal(byName(report, "projects-listing").ok, true);
    }
  );
});
