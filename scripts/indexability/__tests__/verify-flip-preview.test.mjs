import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { main, parseArgs, resolveConfig } from "../../verify-flip-preview.mjs";
import {
  classifyPrerender,
  countHiddenChunksWithContent,
  extractInternalLinks,
  findRegressions,
  formatTable,
  PRERENDER,
  parseSitemapLocs,
  parseSitemapNoLoading,
  pickSamplesFromLocs,
  probe,
  resolveDynamicPath,
  routeIdToPath,
  run,
  SAMPLE_SEGMENTS,
  stripOrigin,
} from "../verify-flip-preview.mjs";

// ---------------------------------------------------------------------------
// Fixtures only. Nothing in this file touches the network: every test that
// needs one injects a fake `fetchImpl`.
// ---------------------------------------------------------------------------

const BASE = "https://preview.example.com";

const htmlPage = ({ h1 = "A heading", body = "x".repeat(400), links = [], hidden = "" } = {}) => `
<!doctype html><html><head><title>t</title></head><body>
  <h1>${h1}</h1>
  <p>${body}</p>
  ${links.map((href) => `<a href="${href}">link</a>`).join("")}
  ${hidden}
</body></html>`;

const okResponse = (html, headers = {}) => ({
  status: 200,
  headers: new Map(Object.entries({ "content-type": "text/html; charset=utf-8", ...headers })),
  text: async () => html,
});

describe("routeIdToPath", () => {
  it("maps the empty id to the site root", () => {
    assert.equal(routeIdToPath(""), "/");
  });

  it("drops route groups, which are invisible in URLs", () => {
    assert.equal(
      routeIdToPath("nonprofits/find-funders/(landing-nav)"),
      "/nonprofits/find-funders"
    );
    assert.equal(
      routeIdToPath("nonprofits/find-funders/(workbench-nav)/connect/claude"),
      "/nonprofits/find-funders/connect/claude"
    );
    assert.equal(
      routeIdToPath("community/[communityId]/(with-header)"),
      "/community/[communityId]"
    );
  });

  it("keeps dynamic segments for the resolver", () => {
    assert.equal(routeIdToPath("project/[projectId]/(profile)"), "/project/[projectId]");
  });
});

describe("parseSitemapNoLoading", () => {
  const source = `
    const OTHER: ReadonlySet<string> = new Set(["ignored"]);
    const SITEMAP_NO_LOADING: ReadonlySet<string> = new Set([
      "",
      "about",
      "community/[communityId]/(with-header)",
    ]);
    const AFTER: ReadonlySet<string> = new Set(["also-ignored"]);
  `;

  it("reads exactly the SITEMAP_NO_LOADING set", () => {
    assert.deepEqual(parseSitemapNoLoading(source), [
      "",
      "about",
      "community/[communityId]/(with-header)",
    ]);
  });

  it("throws rather than returning nothing when the shape changes", () => {
    assert.throws(() => parseSitemapNoLoading("const SOMETHING_ELSE = [];"), /Could not find/);
  });

  it("throws on an empty set, which would make the whole run vacuous", () => {
    assert.throws(
      () => parseSitemapNoLoading("const SITEMAP_NO_LOADING: ReadonlySet<string> = new Set([]);"),
      /empty list/
    );
  });
});

describe("resolveDynamicPath", () => {
  it("substitutes and encodes sample values", () => {
    const { path, missing } = resolveDynamicPath("/community/[communityId]", {
      communityId: "git coin",
    });
    assert.equal(path, "/community/git%20coin");
    assert.deepEqual(missing, []);
  });

  it("reports what it could not resolve instead of guessing", () => {
    const { path, missing } = resolveDynamicPath("/community/[communityId]/programs/[programId]", {
      communityId: "gitcoin",
    });
    assert.equal(path, null);
    assert.deepEqual(missing, ["programId"]);
  });

  it("leaves a static path alone", () => {
    assert.equal(resolveDynamicPath("/about", {}).path, "/about");
  });
});

describe("classifyPrerender", () => {
  it("trusts Next's own marker", () => {
    const { verdict } = classifyPrerender({ "x-nextjs-prerender": "1" });
    assert.equal(verdict, PRERENDER.PRERENDERED);
  });

  it("treats an edge cache hit as prerendered", () => {
    for (const value of ["HIT", "STALE", "REVALIDATED"]) {
      assert.equal(classifyPrerender({ "x-vercel-cache": value }).verdict, PRERENDER.PRERENDERED);
    }
  });

  it("does not call a MISS dynamic — a first request to a prerendered route misses", () => {
    assert.equal(classifyPrerender({ "x-vercel-cache": "MISS" }).verdict, PRERENDER.UNKNOWN);
  });

  it("calls no-store dynamic", () => {
    assert.equal(
      classifyPrerender({ "cache-control": "private, no-store" }).verdict,
      PRERENDER.DYNAMIC
    );
  });

  it("reads a cacheable cache-control as prerendered", () => {
    assert.equal(
      classifyPrerender({ "cache-control": "s-maxage=60, stale-while-revalidate" }).verdict,
      PRERENDER.PRERENDERED
    );
  });

  it("reports ttfb but never lets it decide the verdict", () => {
    const slow = classifyPrerender({ "x-nextjs-prerender": "1" }, { ttfbMs: 5000 });
    assert.equal(slow.verdict, PRERENDER.PRERENDERED);
    assert.equal(slow.signals.ttfbMs, 5000);
  });
});

describe("extractInternalLinks", () => {
  it("counts relative links and skips anchors, mailto and tel", () => {
    const { count, hrefs } = extractInternalLinks(
      '<a href="/a">a</a><a href="#top">t</a><a href="mailto:x@y.z">m</a><a href="/b">b</a>'
    );
    assert.equal(count, 2);
    assert.deepEqual(hrefs, ["/a", "/b"]);
  });

  it("counts absolute links on the same origin only", () => {
    const html = '<a href="https://in.example.com/x">in</a><a href="https://other.test/y">out</a>';
    const { hrefs } = extractInternalLinks(html, { origin: "https://in.example.com" });
    assert.deepEqual(hrefs, ["/x"]);
  });
});

describe("countHiddenChunksWithContent", () => {
  it("ignores empty hidden divs", () => {
    assert.deepEqual(countHiddenChunksWithContent('<div hidden id="S:0"></div>'), {
      count: 0,
      chars: 0,
    });
  });

  it("counts a hidden chunk carrying real text", () => {
    const html = `<div hidden id="S:1"><p>${"y".repeat(80)}</p></div>`;
    const result = countHiddenChunksWithContent(html);
    assert.equal(result.count, 1);
    assert.ok(result.chars >= 80);
  });
});

describe("findRegressions", () => {
  const route = (over = {}) => ({
    url: `${BASE}/about`,
    status: 200,
    visibleChars: 1000,
    h1: "About",
    internalLinks: 20,
    hiddenChunks: 0,
    hiddenChunkChars: 0,
    prerender: PRERENDER.PRERENDERED,
    ...over,
  });

  it("is quiet when nothing moved", () => {
    const current = { samples: [], routes: [route()] };
    const baseline = { routes: [route()] };
    assert.deepEqual(findRegressions(current, baseline), []);
  });

  it("flags a sample served dynamically — the empty-sample case", () => {
    const current = {
      samples: [{ url: `${BASE}/community/gitcoin`, status: 200, prerender: PRERENDER.DYNAMIC }],
      routes: [],
    };
    const [first] = findRegressions(current, null);
    assert.equal(first.kind, "sample-not-prerendered");
  });

  it("does not flag a sample whose verdict is merely unknown", () => {
    const current = {
      samples: [{ url: `${BASE}/blog/x`, status: 200, prerender: PRERENDER.UNKNOWN }],
      routes: [],
    };
    assert.deepEqual(findRegressions(current, null), []);
  });

  it("flags a lost h1 and a thin page with no baseline at all", () => {
    const current = { samples: [], routes: [route({ h1: null, visibleChars: 12 })] };
    const kinds = findRegressions(current, null).map((r) => r.kind);
    assert.deepEqual(kinds.sort(), ["no-h1", "thin"]);
  });

  it("tolerates small text movement but flags a real drop", () => {
    const baseline = { routes: [route({ visibleChars: 1000 })] };
    assert.deepEqual(
      findRegressions({ samples: [], routes: [route({ visibleChars: 950 })] }, baseline),
      []
    );
    const [dropped] = findRegressions(
      { samples: [], routes: [route({ visibleChars: 500 })] },
      baseline
    );
    assert.equal(dropped.kind, "text-dropped");
  });

  it("flags links disappearing from the no-JS link graph", () => {
    const baseline = { routes: [route({ internalLinks: 20 })] };
    const [first] = findRegressions(
      { samples: [], routes: [route({ internalLinks: 3 })] },
      baseline
    );
    assert.equal(first.kind, "links-dropped");
  });

  it("flags content that moved into a hidden streamed chunk", () => {
    const baseline = { routes: [route({ hiddenChunks: 0 })] };
    const [first] = findRegressions(
      { samples: [], routes: [route({ hiddenChunks: 2, hiddenChunkChars: 900 })] },
      baseline
    );
    assert.equal(first.kind, "content-moved-into-hidden-chunk");
  });

  it("matches baseline rows by path, so a different preview host still compares", () => {
    const baseline = { routes: [route({ url: "https://old-preview.test/about" })] };
    assert.deepEqual(findRegressions({ samples: [], routes: [route()] }, baseline), []);
  });

  it("flags a non-200 once and does not then also call it thin", () => {
    const found = findRegressions(
      { samples: [], routes: [route({ status: 500, h1: null, visibleChars: 0 })] },
      null
    );
    assert.equal(found.length, 1);
    assert.equal(found[0].kind, "not-200");
  });
});

describe("sitemap parsing and sample discovery", () => {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://x.test/community/gitcoin</loc></url>
    <url><loc>https://x.test/community/gitcoin/programs/prog-1</loc></url>
    <url><loc>https://x.test/project/my-project</loc></url>
    <url><loc>https://x.test/blog/a-post</loc></url>
    <url><loc>https://x.test/about</loc></url>
  </urlset>`;

  it("reads every <loc>", () => {
    assert.equal(parseSitemapLocs(xml).length, 5);
  });

  it("picks one value per dynamic segment", () => {
    assert.deepEqual(pickSamplesFromLocs(parseSitemapLocs(xml)), {
      communityId: "gitcoin",
      projectId: "my-project",
      slug: "a-post",
      programId: "prog-1",
    });
  });

  it("returns nulls rather than guesses when the sitemap has none", () => {
    assert.deepEqual(pickSamplesFromLocs(["https://x.test/about"]), {
      communityId: null,
      projectId: null,
      slug: null,
      programId: null,
    });
  });
});

describe("SAMPLE_SEGMENTS", () => {
  it("declares the four samples the flip branch actually has", () => {
    const declared = SAMPLE_SEGMENTS.filter((s) => s.declared).map((s) => s.segment);
    assert.deepEqual(declared, ["community", "project", "blog"]);
  });

  it("keeps program and grant listed so their absence is reported, not silent", () => {
    const undeclared = SAMPLE_SEGMENTS.filter((s) => !s.declared).map((s) => s.segment);
    assert.deepEqual(undeclared, ["program", "grant"]);
  });
});

describe("probe", () => {
  it("records status, headers and a ttfb", async () => {
    const result = await probe(`${BASE}/about`, {
      fetchImpl: async () => okResponse(htmlPage(), { "x-nextjs-prerender": "1" }),
    });
    assert.equal(result.status, 200);
    assert.equal(result.headers["x-nextjs-prerender"], "1");
    assert.equal(typeof result.ttfbMs, "number");
    assert.equal(result.error, null);
  });

  it("turns a transport failure into a record rather than throwing", async () => {
    const result = await probe(`${BASE}/about`, {
      fetchImpl: async () => {
        throw new Error("boom");
      },
    });
    assert.equal(result.status, null);
    assert.equal(result.error, "boom");
  });

  it("does not read a body that is not HTML", async () => {
    const result = await probe(`${BASE}/x.png`, {
      fetchImpl: async () => ({
        status: 200,
        headers: new Map([["content-type", "image/png"]]),
        text: async () => {
          throw new Error("should not be read");
        },
      }),
    });
    assert.equal(result.html, "");
  });
});

describe("run", () => {
  it("probes the samples and the routes, and skips what it cannot resolve", async () => {
    const seen = [];
    const fetchImpl = async (url) => {
      seen.push(url);
      if (url.endsWith("/sitemap.xml")) {
        return okResponse(
          `<urlset><url><loc>${BASE}/community/gitcoin</loc></url>
           <url><loc>${BASE}/project/p1</loc></url>
           <url><loc>${BASE}/blog/b1</loc></url></urlset>`,
          { "content-type": "application/xml" }
        );
      }
      return okResponse(htmlPage({ links: ["/a", "/b"] }), { "x-nextjs-prerender": "1" });
    };

    const result = await run({
      base: BASE,
      routeIds: ["", "about", "community/[communityId]/(whitelabel)/programs/[programId]"],
      fetchImpl,
      concurrency: 2,
    });

    assert.deepEqual(
      result.samples.map((s) => s.segment),
      ["community", "project", "blog"]
    );
    assert.ok(result.samples.every((s) => s.prerender === PRERENDER.PRERENDERED));
    // The programs route has no programId in this sitemap, so it is reported as
    // skipped rather than silently dropped or fetched with a literal "[programId]".
    assert.deepEqual(result.unresolvedRoutes, [
      { path: "/community/[communityId]/programs/[programId]", missing: ["programId"] },
    ]);
    assert.ok(result.undeclaredSamples.includes("program"));
    assert.ok(result.undeclaredSamples.includes("grant"));
    assert.ok(seen.some((url) => url.startsWith("https://app.opgrants.io")));
  });

  it("uses explicit samples without touching the sitemap", async () => {
    let sitemapFetched = false;
    const fetchImpl = async (url) => {
      if (url.endsWith("/sitemap.xml")) sitemapFetched = true;
      return okResponse(htmlPage());
    };

    await run({
      base: BASE,
      routeIds: ["about"],
      samples: { communityId: "c", projectId: "p", slug: "s" },
      fetchImpl,
    });

    assert.equal(sitemapFetched, false);
  });
});

describe("formatTable", () => {
  it("pads columns and keeps the header aligned", () => {
    const table = formatTable(
      [{ a: "x", b: "yy" }],
      [
        { label: "alpha", value: (r) => r.a },
        { label: "b", value: (r) => r.b },
      ]
    );
    const [header, rule, row] = table.split("\n");
    assert.equal(header, "alpha  b");
    assert.ok(/^-+ +-+$/.test(rule.replace(/\s+$/, "")));
    assert.ok(row.startsWith("x"));
  });
});

describe("stripOrigin", () => {
  it("keeps path and query, drops the host", () => {
    assert.equal(stripOrigin("https://a.test/x/y?z=1"), "/x/y?z=1");
  });

  it("passes a non-URL straight through", () => {
    assert.equal(stripOrigin("/already/a/path"), "/already/a/path");
  });
});

describe("CLI", () => {
  const readFile = async (path) => {
    if (String(path).includes("route-file-structure")) {
      return 'const SITEMAP_NO_LOADING: ReadonlySet<string> = new Set(["", "about"]);';
    }
    throw new Error(`unexpected read: ${path}`);
  };
  const sink = () => {
    const chunks = [];
    return { write: (chunk) => chunks.push(chunk), text: () => chunks.join("") };
  };

  it("parses flags and rejects a flag with no value", () => {
    assert.deepEqual(parseArgs(["--base", "https://x.test"]), { base: "https://x.test" });
    assert.throws(() => parseArgs(["--base", "--output"]), /--base needs a value/);
  });

  it("takes env as a fallback and flags as the winner", () => {
    const fromEnv = resolveConfig({}, { FLIP_VERIFY_BASE: "https://env.test" });
    assert.equal(fromEnv.base, "https://env.test/");
    const fromFlag = resolveConfig(
      { base: "https://flag.test" },
      { FLIP_VERIFY_BASE: "https://env.test" }
    );
    assert.equal(fromFlag.base, "https://flag.test/");
  });

  it("exits 2 with a usage error when --base is missing", async () => {
    const stderr = sink();
    const code = await main({ argv: [], env: {}, readFile, stderr, stdout: sink() });
    assert.equal(code, 2);
    assert.match(stderr.text(), /--base/);
  });

  it("exits 0 and says the floors were the only gate when no baseline is given", async () => {
    const stdout = sink();
    const code = await main({
      argv: ["--base", BASE],
      env: {},
      readFile,
      stdout,
      stderr: sink(),
      fetchImpl: async (url) =>
        url.endsWith("/sitemap.xml")
          ? okResponse("<urlset></urlset>", { "content-type": "application/xml" })
          : okResponse(htmlPage({ links: ["/a"] }), { "x-nextjs-prerender": "1" }),
    });

    assert.equal(code, 0);
    assert.match(stdout.text(), /No --baseline given/);
  });

  it("exits 1 when a route comes back thin", async () => {
    const code = await main({
      argv: ["--base", BASE],
      env: {},
      readFile,
      stdout: sink(),
      stderr: sink(),
      fetchImpl: async (url) =>
        url.endsWith("/sitemap.xml")
          ? okResponse("<urlset></urlset>", { "content-type": "application/xml" })
          : okResponse("<html><body><h1>h</h1><p>tiny</p></body></html>"),
    });

    assert.equal(code, 1);
  });
});
