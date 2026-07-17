import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * RED (middleware indexability, ADR 0001, D1/D2/D6). Pins the intended behavior:
 * apex/gap hosts single-hop 308 to www; project routes on www consult the
 * indexer and apply the decision (X-Robots-Tag / gone status / redirect);
 * stateful queries force noindex while tracking-only do not; failures fail
 * closed. The current middleware has none of this, so these are behavioral REDs.
 */

// Deterministic next/server mock: returns real Response objects so the suite can
// assert status + headers uniformly. NextResponse is a constructable subclass of
// Response (so `new NextResponse(null, { status: 410 })` works for gone) carrying
// the static redirect/next/rewrite helpers the middleware uses. The class is
// declared inside the factory because vi.mock is hoisted above the module body.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  class MockNextResponse extends Response {}
  return {
    ...actual,
    NextResponse: Object.assign(MockNextResponse, {
      redirect: (url: URL | string, status?: number) => {
        const response = new Response(null, { status: status ?? 307 });
        response.headers.set("location", url.toString());
        return response;
      },
      next: (_opts?: unknown) => new Response(null, { status: 200 }),
      rewrite: (url: URL, _opts?: unknown) => {
        const response = new Response(null, { status: 200 });
        response.headers.set("x-middleware-rewrite", url.toString());
        return response;
      },
    }),
  };
});

vi.mock("@/utilities/redirectHelpers", () => ({
  shouldRedirectToGov: vi.fn(() => false),
  redirectToGov: vi.fn(),
}));

vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: () => [],
}));

import { middleware } from "@/middleware";

const INDEXER_BASE = "https://indexer.test";

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
const fetchMock = vi.fn<Fetcher>();

function createRequest(host: string, path: string, query = "", scheme = "https"): NextRequest {
  const requestUrl = new URL(`${scheme}://${host}${path}${query ? `?${query}` : ""}`);
  return {
    nextUrl: {
      pathname: requestUrl.pathname,
      search: requestUrl.search,
      searchParams: requestUrl.searchParams,
      protocol: requestUrl.protocol,
      host: requestUrl.host,
      href: requestUrl.href,
      clone: () => new URL(requestUrl.toString()),
      toString: () => requestUrl.toString(),
    },
    headers: new Headers({ host }),
    url: requestUrl.toString(),
  } as unknown as NextRequest;
}

function decisionResponse(decision: unknown, status = 200): Response {
  return new Response(JSON.stringify(decision), { status });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_GAP_INDEXER_URL", INDEXER_BASE);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("middleware indexability", () => {
  it("308s an apex non-project request to www once, preserving path and query, without fetching", async () => {
    const response = await middleware(createRequest("karmahq.xyz", "/about", "utm_source=x"));

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://www.karmahq.xyz/about?utm_source=x");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("308s a gap.karmahq.xyz non-project request to www, preserving the path", async () => {
    const response = await middleware(createRequest("gap.karmahq.xyz", "/funding-map"));

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://www.karmahq.xyz/funding-map");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a fully-qualified apex host with a trailing DNS dot (karmahq.xyz.) as an alias", async () => {
    const response = await middleware(createRequest("karmahq.xyz.", "/about", "utm_source=x"));

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://www.karmahq.xyz/about?utm_source=x");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a trailing-dot gap host (gap.karmahq.xyz.) as an alias", async () => {
    const response = await middleware(createRequest("gap.karmahq.xyz.", "/funding-map"));

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://www.karmahq.xyz/funding-map");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes a www canonical-indexable project through without an X-Robots-Tag", async () => {
    fetchMock.mockResolvedValue(
      decisionResponse({ outcome: "canonical-indexable", url: "/project/paraswap" })
    );

    const response = await middleware(createRequest("www.karmahq.xyz", "/project/paraswap"));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("X-Robots-Tag")).toBeNull();
    // Consulted the indexer exactly once at the canonical-root endpoint, via GET
    // with an application/json Accept header. objectContaining tolerates the
    // AbortController signal the client also passes.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://indexer.test/v2/projects/paraswap/indexability?route=root",
      expect.objectContaining({
        method: "GET",
        headers: { Accept: "application/json" },
      })
    );
  });

  it("sets X-Robots-Tag noindex, follow for a noindex-follow decision", async () => {
    fetchMock.mockResolvedValue(
      decisionResponse({ outcome: "noindex-follow", url: "/project/paraswap/team" })
    );

    const response = await middleware(createRequest("www.karmahq.xyz", "/project/paraswap/team"));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("X-Robots-Tag")).toBe("noindex, follow");
  });

  it("forces X-Robots-Tag for a stateful query even when the decision is canonical-indexable", async () => {
    fetchMock.mockResolvedValue(
      decisionResponse({ outcome: "canonical-indexable", url: "/project/paraswap" })
    );

    const response = await middleware(
      createRequest("www.karmahq.xyz", "/project/paraswap", "programId=531")
    );

    expect(response?.headers.get("X-Robots-Tag")).toBe("noindex, follow");
  });

  it("does not set X-Robots-Tag for a tracking-only query on a canonical-indexable decision", async () => {
    fetchMock.mockResolvedValue(
      decisionResponse({ outcome: "canonical-indexable", url: "/project/paraswap" })
    );

    const response = await middleware(
      createRequest("www.karmahq.xyz", "/project/paraswap", "utm_source=x")
    );

    expect(response?.headers.get("X-Robots-Tag")).toBeNull();
  });

  it.each([404, 410])(
    "returns HTTP %s with a noindex X-Robots-Tag for a gone decision",
    async (status) => {
      fetchMock.mockResolvedValue(new Response("gone", { status }));

      const response = await middleware(createRequest("www.karmahq.xyz", "/project/paraswap"));

      expect(response?.status).toBe(status);
      expect(response?.headers.get("X-Robots-Tag")).toBe("noindex, follow");
      // The route is answered before the app router runs, so it must carry a
      // usable HTML body — an empty body leaves the browser on its native
      // error interstitial with no way back into the app.
      expect(response?.headers.get("content-type")).toContain("text/html");
      const body = await response?.text();
      expect(body).toContain("<html");
      expect(body).toContain('href="/projects"');
    }
  );

  it.each([404, 410])(
    "308s an apex-alias gone route (%s) to www instead of returning the status directly",
    async (status) => {
      // Every alias request owes exactly one hop to the canonical host — even a
      // gone route. The canonical host re-evaluates and returns the 404/410; the
      // alias host must not answer it directly (that would strand the response on
      // a duplicate host).
      fetchMock.mockResolvedValue(new Response("gone", { status }));

      const response = await middleware(createRequest("karmahq.xyz", "/project/paraswap"));

      expect(response?.status).toBe(308);
      expect(response?.headers.get("location")).toBe("https://www.karmahq.xyz/project/paraswap");
    }
  );

  it("308s a gap-alias gone route to www, preserving the path and query", async () => {
    fetchMock.mockResolvedValue(new Response("gone", { status: 410 }));

    const response = await middleware(
      createRequest("gap.karmahq.xyz", "/project/paraswap/team", "utm_source=x")
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://www.karmahq.xyz/project/paraswap/team?utm_source=x"
    );
  });

  it("issues a 308 preserving the query for a redirect decision on www", async () => {
    fetchMock.mockResolvedValue(
      decisionResponse({
        outcome: "redirect",
        from: "/project/old-paraswap",
        to: "/project/paraswap",
      })
    );

    const response = await middleware(
      createRequest("www.karmahq.xyz", "/project/old-paraswap", "utm_source=x")
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://www.karmahq.xyz/project/paraswap?utm_source=x"
    );
  });

  it("collapses an apex old-identifier roadmap request into one 308 to the final www canonical root", async () => {
    fetchMock.mockResolvedValue(
      decisionResponse({
        outcome: "redirect",
        from: "/project/old-paraswap/roadmap",
        to: "/project/paraswap",
      })
    );

    const response = await middleware(
      createRequest("karmahq.xyz", "/project/old-paraswap/roadmap")
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://www.karmahq.xyz/project/paraswap");
  });

  it("collapses a gap old-identifier legacy grants request into one 308 to the final www canonical funding path", async () => {
    fetchMock.mockResolvedValue(
      decisionResponse({
        outcome: "redirect",
        from: "/project/old-paraswap/funding",
        to: "/project/paraswap/funding",
      })
    );

    const response = await middleware(
      createRequest("gap.karmahq.xyz", "/project/old-paraswap/grants")
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://www.karmahq.xyz/project/paraswap/funding"
    );
  });

  it("normalizes a canonical-host legacy funding/create-grant with a single 308 to www", async () => {
    fetchMock.mockResolvedValue(
      decisionResponse({
        outcome: "noindex-follow",
        url: "/project/paraswap/funding/new",
      })
    );

    const response = await middleware(
      createRequest("www.karmahq.xyz", "/project/paraswap/funding/create-grant")
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://www.karmahq.xyz/project/paraswap/funding/new"
    );
  });

  it("keeps a duplicate-alias route usable without a noindex header", async () => {
    fetchMock.mockResolvedValue(
      decisionResponse({
        outcome: "duplicate-alias",
        url: "/project/paraswap/about",
        canonicalUrl: "/project/paraswap",
      })
    );

    const response = await middleware(createRequest("www.karmahq.xyz", "/project/paraswap/about"));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("X-Robots-Tag")).toBeNull();
  });

  it("treats a project literally named 'grants' as the identifier, not a legacy tab", async () => {
    fetchMock.mockResolvedValue(
      decisionResponse({ outcome: "canonical-indexable", url: "/project/grants" })
    );

    const response = await middleware(createRequest("www.karmahq.xyz", "/project/grants"));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("location")).toBeNull();
    // The identifier segment is queried as-is — no grants→funding rewrite.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://indexer.test/v2/projects/grants/indexability?route=root",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("fails closed with a noindex header when the indexer returns 5xx", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));

    const response = await middleware(createRequest("www.karmahq.xyz", "/project/paraswap/team"));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("X-Robots-Tag")).toBe("noindex, follow");
  });

  it("marks the canonical /projects listing noindex, follow for a stateful query without fetching", async () => {
    const response = await middleware(createRequest("www.karmahq.xyz", "/projects", "page=2"));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the canonical /projects listing indexable for a tracking-only query without fetching", async () => {
    const response = await middleware(
      createRequest("www.karmahq.xyz", "/projects", "utm_source=x")
    );

    expect(response?.status).toBe(200);
    expect(response?.headers.get("X-Robots-Tag")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves the clean canonical /projects listing indexable without fetching", async () => {
    const response = await middleware(createRequest("www.karmahq.xyz", "/projects"));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("X-Robots-Tag")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed without fetching for an unknown project route", async () => {
    const response = await middleware(
      createRequest("www.karmahq.xyz", "/project/paraswap/unknown-tab")
    );

    expect(response?.status).toBe(200);
    expect(response?.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("collapses an unknown project route on an alias host into one 308 to www without fetching", async () => {
    const response = await middleware(
      createRequest("gap.karmahq.xyz", "/project/paraswap/unknown-tab", "utm_source=x")
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://www.karmahq.xyz/project/paraswap/unknown-tab?utm_source=x"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/**
 * Canonical-host origin policy (ADR 0001). A normalized/relocated project path
 * must be redirected on the *right* origin: only the real production alias hosts
 * (karmahq.xyz / gap.karmahq.xyz) collapse onto https://www.karmahq.xyz; every
 * other host — Vercel preview, staging, localhost, and the canonical www itself
 * — keeps the redirect on its own origin so a preview normalization never leaks
 * a link to production. The roadmap tab is a valid route, so its collapse to the
 * canonical root comes from an indexer `redirect` decision.
 */
describe("middleware canonical-host origin policy", () => {
  const roadmapCollapse = {
    outcome: "redirect",
    from: "/project/abc123-1/roadmap",
    to: "/project/abc123-1",
  };

  it("redirects a Vercel-preview roadmap collapse on the request's own origin, not production www", async () => {
    fetchMock.mockResolvedValue(decisionResponse(roadmapCollapse));

    const response = await middleware(
      createRequest("gap-app-v2-git-preview.vercel.app", "/project/abc123-1/roadmap")
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://gap-app-v2-git-preview.vercel.app/project/abc123-1"
    );
  });

  it("redirects a staging roadmap collapse on the staging origin, preserving the query", async () => {
    fetchMock.mockResolvedValue(decisionResponse(roadmapCollapse));

    const response = await middleware(
      createRequest("staging.karmahq.xyz", "/project/abc123-1/roadmap", "utm_source=x")
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "https://staging.karmahq.xyz/project/abc123-1?utm_source=x"
    );
  });

  it("collapses an alias-host roadmap normalization into one hop to production www", async () => {
    fetchMock.mockResolvedValue(decisionResponse(roadmapCollapse));

    const response = await middleware(createRequest("karmahq.xyz", "/project/abc123-1/roadmap"));

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://www.karmahq.xyz/project/abc123-1");
  });

  it("keeps a canonical-www roadmap normalization on www", async () => {
    fetchMock.mockResolvedValue(decisionResponse(roadmapCollapse));

    const response = await middleware(
      createRequest("www.karmahq.xyz", "/project/abc123-1/roadmap")
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://www.karmahq.xyz/project/abc123-1");
  });

  it("normalizes a localhost:port roadmap collapse on its own origin, preserving scheme, host, and port", async () => {
    fetchMock.mockResolvedValue(decisionResponse(roadmapCollapse));

    const response = await middleware(
      createRequest("localhost:3000", "/project/abc123-1/roadmap", "utm_source=x", "http")
    );

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(
      "http://localhost:3000/project/abc123-1?utm_source=x"
    );
  });
});
