import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as warmGet } from "@/app/api/cron/warm-sitemaps/route";
import { GET as freshIndexGet } from "@/app/sitemap_index.xml/route";
import { GET as indexGet } from "@/app/sitemap-index.xml/route";
import { GET as childGet } from "@/app/sitemaps/[kind]/sitemap/[chunk]/route";
import { GET as kindGet } from "@/app/sitemaps/[kind]/sitemap.xml/route";
import { INDEXER_FETCH_PAGE_SIZE } from "@/utilities/sitemap";

const SITE = "https://www.karmahq.xyz";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("child sitemap route", () => {
  it("returns a urlset of canonicalized URLs for a valid kind/chunk", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ urls: ["https://staging.karmahq.xyz/project/a"] }))
    );

    const res = await childGet(
      new Request("https://www.karmahq.xyz/sitemaps/projects/sitemap/1.xml"),
      {
        params: Promise.resolve({ kind: "projects", chunk: "1.xml" }),
      }
    );
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    expect(body).toContain(`<loc>${SITE}/project/a</loc>`);
    expect(body).not.toContain("staging.karmahq.xyz");
  });

  it("404s an unknown kind", async () => {
    const res = await childGet(
      new Request("https://www.karmahq.xyz/sitemaps/bogus/sitemap/1.xml"),
      {
        params: Promise.resolve({ kind: "bogus", chunk: "1.xml" }),
      }
    );
    expect(res.status).toBe(404);
  });

  it("404s a malformed chunk filename", async () => {
    const res = await childGet(
      new Request("https://www.karmahq.xyz/sitemaps/grants/sitemap/0.xml"),
      {
        params: Promise.resolve({ kind: "grants", chunk: "0.xml" }),
      }
    );
    expect(res.status).toBe(404);
  });

  it("404s an out-of-range chunk number without calling the indexer", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await childGet(
      new Request("https://www.karmahq.xyz/sitemaps/projects/sitemap/99999999999999999.xml"),
      {
        params: Promise.resolve({
          kind: "projects",
          chunk: "99999999999999999.xml",
        }),
      }
    );

    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("sitemap index route", () => {
  it("serves a sitemap index with one consolidated child per kind", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          projects: 1500,
          impacts: 0,
          grants: 0,
          milestones: 0,
          fundingPrograms: 0,
        })
      )
    );

    const res = await indexGet();
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    expect(body).toContain("<sitemapindex");
    expect(body).toContain(`<loc>${SITE}/sitemaps/projects/sitemap.xml</loc>`);
    expect(body).toContain(`<loc>${SITE}/sitemaps/funding-programs/sitemap.xml</loc>`);
    expect(body).toContain(`<loc>${SITE}/sitemaps/static/sitemap.xml</loc>`);
    // Thin tab kinds are noindexed and dropped from the advertised index.
    expect(body).not.toContain(`<loc>${SITE}/sitemaps/impacts/sitemap.xml</loc>`);
    expect(body).not.toContain(`<loc>${SITE}/sitemaps/grants/sitemap.xml</loc>`);
    expect(body).not.toContain(`<loc>${SITE}/sitemaps/milestones/sitemap.xml</loc>`);
  });

  it("falls back to chunked children when a kind exceeds the per-file limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          projects: 46_000,
          impacts: 0,
          grants: 0,
          milestones: 0,
          fundingPrograms: 0,
        })
      )
    );

    const res = await indexGet();
    const body = await res.text();

    expect(body).not.toContain(`<loc>${SITE}/sitemaps/projects/sitemap.xml</loc>`);
    expect(body).toContain(`<loc>${SITE}/sitemaps/projects/sitemap/46.xml</loc>`);
    expect(body).toContain(`<loc>${SITE}/sitemaps/funding-programs/sitemap.xml</loc>`);
  });

  it("serves the identical index at the fresh /sitemap_index.xml URL", async () => {
    const counts = {
      projects: 1500,
      impacts: 0,
      grants: 0,
      milestones: 0,
      fundingPrograms: 0,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(counts))
    );
    const legacyBody = await (await indexGet()).text();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(counts))
    );
    const freshRes = await freshIndexGet();
    const freshBody = await freshRes.text();

    expect(freshRes.status).toBe(200);
    expect(freshRes.headers.get("Content-Type")).toContain("application/xml");
    expect(freshBody).toBe(legacyBody);
  });
});

describe("consolidated per-kind sitemap route", () => {
  const counts = {
    projects: 1500,
    impacts: 0,
    grants: 0,
    milestones: 0,
    fundingPrograms: 0,
  };

  function stubKindFetch(pageUrls: string[]): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("/counts") ? jsonResponse(counts) : jsonResponse({ urls: pageUrls })
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("serves the kind's complete urlset", async () => {
    stubKindFetch(["https://staging.karmahq.xyz/project/a"]);

    const res = await kindGet(new Request(`${SITE}/sitemaps/projects/sitemap.xml`), {
      params: Promise.resolve({ kind: "projects" }),
    });
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    expect(body).toContain(`<loc>${SITE}/project/a</loc>`);
    expect(body).not.toContain("staging.karmahq.xyz");
  });

  // The index no longer advertises these kinds, but Google already holds their
  // child-sitemap URLs from past submissions — the routes must keep serving 200
  // so those legacy URLs don't start 404ing.
  it.each(["impacts", "grants", "milestones"])(
    "still serves 200 for the de-advertised legacy kind %s",
    async (kind) => {
      stubKindFetch(["https://staging.karmahq.xyz/project/a"]);

      const res = await kindGet(new Request(`${SITE}/sitemaps/${kind}/sitemap.xml`), {
        params: Promise.resolve({ kind }),
      });
      const body = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("application/xml");
      expect(body).toContain(`<loc>${SITE}/project/a</loc>`);
    }
  );

  it("404s an unknown kind without calling the indexer", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await kindGet(new Request(`${SITE}/sitemaps/bogus/sitemap.xml`), {
      params: Promise.resolve({ kind: "bogus" }),
    });

    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404s a kind past the per-file limit (index lists chunks instead)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ...counts, projects: 46_000 }))
    );

    const res = await kindGet(new Request(`${SITE}/sitemaps/projects/sitemap.xml`), {
      params: Promise.resolve({ kind: "projects" }),
    });

    expect(res.status).toBe(404);
  });

  it("404s instead of serving a possibly-truncated list at the per-file cap", async () => {
    // Counts under-report (stale) but every page comes back full: the fetcher
    // stops at the cap, which means the list may be incomplete — refuse it.
    const fullPage = Array.from(
      { length: INDEXER_FETCH_PAGE_SIZE },
      (_, i) => `https://staging.karmahq.xyz/p/${i}`
    );
    stubKindFetch(fullPage);

    const res = await kindGet(new Request(`${SITE}/sitemaps/projects/sitemap.xml`), {
      params: Promise.resolve({ kind: "projects" }),
    });

    expect(res.status).toBe(404);
  });

  it("fetches pages at the indexer page size, not the legacy chunk size", async () => {
    const fetchMock = stubKindFetch(["https://staging.karmahq.xyz/project/a"]);

    await kindGet(new Request(`${SITE}/sitemaps/projects/sitemap.xml`), {
      params: Promise.resolve({ kind: "projects" }),
    });

    const urlsCall = fetchMock.mock.calls.find(([url]) => !String(url).includes("/counts"));
    expect(String(urlsCall?.[0])).toContain(`pageSize=${INDEXER_FETCH_PAGE_SIZE}`);
  });
});

describe("warm-sitemaps cron route", () => {
  function xmlResponse(body: string, status = 200): Response {
    return {
      ok: status === 200,
      status,
      text: async () => body,
    } as unknown as Response;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests without the cron secret when one is configured", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await warmGet(new Request(`${SITE}/api/cron/warm-sitemaps`));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("warms the index and every child it lists", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const index = `<?xml version="1.0"?><sitemapindex><sitemap><loc>${SITE}/sitemaps/static/sitemap.xml</loc></sitemap><sitemap><loc>${SITE}/sitemaps/projects/sitemap.xml</loc></sitemap></sitemapindex>`;
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/sitemap_index.xml") ? xmlResponse(index) : xmlResponse("<urlset/>")
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await warmGet(
      new Request(`${SITE}/api/cron/warm-sitemaps`, {
        headers: { authorization: "Bearer s3cret" },
      })
    );
    const payload = (await res.json()) as { ok: boolean; warmed: Record<string, number> };

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Object.keys(payload.warmed)).toEqual([
      `${SITE}/sitemap_index.xml`,
      `${SITE}/sitemaps/static/sitemap.xml`,
      `${SITE}/sitemaps/projects/sitemap.xml`,
    ]);
  });

  it("reports failure when the index itself cannot be fetched", async () => {
    const fetchMock = vi.fn(async () => xmlResponse("oops", 503));
    vi.stubGlobal("fetch", fetchMock);

    const res = await warmGet(new Request(`${SITE}/api/cron/warm-sitemaps`));

    expect(res.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports failure when the index returns 200 but parses to zero children", async () => {
    // A 200 whose body yields no <loc> entries means the warmer read the wrong
    // payload — it must not report ok=true after warming nothing.
    const fetchMock = vi.fn(async () => xmlResponse("<sitemapindex></sitemapindex>"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await warmGet(new Request(`${SITE}/api/cron/warm-sitemaps`));
    const payload = (await res.json()) as { ok: boolean };

    expect(res.status).toBe(502);
    expect(payload.ok).toBe(false);
    // Only the index was fetched; no child warming was attempted.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
