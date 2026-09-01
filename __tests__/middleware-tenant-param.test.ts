import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The proxy rewrites every PAGE request to the internal `/t/<tenant>/...` tree
 * so the tenant is a root param instead of a `headers()` read. These tests pin
 * the three things that rewrite must never break: the browser URL (it is a
 * rewrite, so `location` stays null), the ordering against the redirect rules
 * that run before it, and the set of paths that must keep their own URL.
 */

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

vi.mock("@/utilities/project-indexability-client", () => ({
  fetchProjectIndexabilityDecision: vi.fn(async () => ({ outcome: "canonical-indexable" })),
}));

import { proxy } from "@/proxy";
import { CANONICAL_HOST, CANONICAL_ORIGIN } from "@/utilities/domains";
import { KARMA_TENANT_PARAM, TENANT_ROUTE_PREFIX } from "@/utilities/tenant-param";
import { WHITELABEL_DOMAINS } from "@/utilities/whitelabel-config";

const whitelabel = WHITELABEL_DOMAINS[0];
if (!whitelabel) {
  throw new Error("No whitelabel domain configured for proxy tenant tests.");
}

function createRequest(host: string, path: string, query = ""): NextRequest {
  const requestUrl = new URL(`https://${host}${path}${query ? `?${query}` : ""}`);
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

const rewriteOf = (response: Response) => response.headers.get("x-middleware-rewrite");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GAP_INDEXER_URL", "https://indexer.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tenant rewrite on the canonical host", () => {
  it.each([
    ["/", `${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}`],
    ["/about", `${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/about`],
    ["/communities", `${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/communities`],
    ["/knowledge", `${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/knowledge`],
    ["/blog/hello-world", `${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/blog/hello-world`],
    [
      "/community/optimism/funding-opportunities",
      `${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/community/optimism/funding-opportunities`,
    ],
    ["/dashboard/projects", `${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/dashboard/projects`],
  ])("serves %s from %s", async (path, expectedPath) => {
    const response = await proxy(createRequest(CANONICAL_HOST, path));

    expect(rewriteOf(response)).toBe(`https://${CANONICAL_HOST}${expectedPath}`);
    // A rewrite, not a redirect: the browser URL is unchanged.
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("preserves the query string across the rewrite", async () => {
    const response = await proxy(createRequest(CANONICAL_HOST, "/projects", "page=2&sort=recent"));

    expect(rewriteOf(response)).toBe(
      `https://${CANONICAL_HOST}${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/projects?page=2&sort=recent`
    );
  });

  it("still marks a stateful /projects query noindex while rewriting it", async () => {
    const response = await proxy(createRequest(CANONICAL_HOST, "/projects", "page=2"));

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    expect(rewriteOf(response)).toContain(`${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/projects`);
  });

  it("rewrites a canonical /project route without disturbing its indexability", async () => {
    const response = await proxy(createRequest(CANONICAL_HOST, "/project/my-project"));

    expect(rewriteOf(response)).toBe(
      `https://${CANONICAL_HOST}${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/project/my-project`
    );
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
  });

  it("rewrites an unrecognised /project route but keeps it noindex", async () => {
    const response = await proxy(createRequest(CANONICAL_HOST, "/project/paraswap/unknown-tab"));

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    expect(rewriteOf(response)).toBe(
      `https://${CANONICAL_HOST}${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/project/paraswap/unknown-tab`
    );
  });
});

describe("tenant rewrite on a whitelabel host", () => {
  it("resolves the tenant param to the config domain, not the community slug", async () => {
    const response = await proxy(createRequest(whitelabel.domain, "/project/test-project"));

    expect(rewriteOf(response)).toBe(
      `https://${whitelabel.domain}${TENANT_ROUTE_PREFIX}/${whitelabel.domain}/project/test-project`
    );
  });

  it("composes the community rewrite inside the tenant prefix", async () => {
    const response = await proxy(createRequest(whitelabel.domain, "/programs/123"));

    expect(rewriteOf(response)).toBe(
      `https://${whitelabel.domain}${TENANT_ROUTE_PREFIX}/${whitelabel.domain}/community/${whitelabel.communitySlug}/programs/123`
    );
    expect(response.headers.get("location")).toBeNull();
  });

  it("composes the whitelabel root rewrite inside the tenant prefix", async () => {
    const response = await proxy(createRequest(whitelabel.domain, "/"));

    expect(rewriteOf(response)).toBe(
      `https://${whitelabel.domain}${TENANT_ROUTE_PREFIX}/${whitelabel.domain}/community/${whitelabel.communitySlug}/funding-opportunities`
    );
  });

  it("keeps whitelabel public assets on their own URL", async () => {
    const response = await proxy(createRequest(whitelabel.domain, "/images/hero.png"));

    expect(rewriteOf(response)).toBeNull();
    expect(response.headers.get("location")).toBeNull();
  });

  it("leaves the whitelabel URL-stripping redirect a redirect", async () => {
    const response = await proxy(
      createRequest(whitelabel.domain, `/community/${whitelabel.communitySlug}/programs/123`)
    );

    // Still a browser-visible 30x to the clean path — the tenant prefix must
    // never leak into a Location header.
    expect(response.headers.get("location")).toBe(`https://${whitelabel.domain}/programs/123`);
    expect(rewriteOf(response)).toBeNull();
  });
});

describe("the tenant prefix is not publicly addressable", () => {
  it.each([
    `${TENANT_ROUTE_PREFIX}`,
    `${TENANT_ROUTE_PREFIX}/`,
    `${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/about`,
    `${TENANT_ROUTE_PREFIX}/${whitelabel.domain}/programs/123`,
    "/T/karma/about",
  ])("404s %s on the canonical host", async (path) => {
    const response = await proxy(createRequest(CANONICAL_HOST, path));

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    expect(rewriteOf(response)).toBeNull();
    expect(response.headers.get("location")).toBeNull();
  });

  it("404s the prefix on a whitelabel host too", async () => {
    const response = await proxy(
      createRequest(whitelabel.domain, `${TENANT_ROUTE_PREFIX}/${whitelabel.domain}/`)
    );

    expect(response.status).toBe(404);
  });

  it("404s the prefix on an alias host instead of 308ing it to www", async () => {
    // The 404 runs first on purpose: hopping to www would advertise the
    // internal URL in a Location header.
    const response = await proxy(
      createRequest("karmahq.org", `${TENANT_ROUTE_PREFIX}/${KARMA_TENANT_PARAM}/about`)
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not confuse /tenants assets with the prefix", async () => {
    const response = await proxy(createRequest(CANONICAL_HOST, "/tenants/optimism/cover.jpg"));

    expect(response.status).toBe(200);
    expect(rewriteOf(response)).toBeNull();
  });
});

describe("paths that keep their own URL", () => {
  it.each([
    "/api/geo",
    "/monitoring",
    "/.well-known/mcp.json",
    "/sitemap.xml",
    "/sitemap-index.xml",
    "/sitemap_index.xml",
    "/extended-sitemap.xml",
    "/sitemaps/static/sitemap.xml",
    "/sitemaps/projects/sitemap/2",
    "/openapi.json",
    "/robots.txt",
    "/manifest.json",
    "/favicon.ico",
    "/assets/hero.png",
    "/images/logo.svg",
    "/logos/optimism.png",
    "/fonts/Inter.woff2",
    "/llms.txt",
  ])("passes %s through unrewritten", async (path) => {
    const response = await proxy(createRequest(CANONICAL_HOST, path));

    expect(rewriteOf(response)).toBeNull();
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });
});

describe("redirects still run before the rewrite", () => {
  it("308s an alias host to www with a clean, unprefixed target", async () => {
    const response = await proxy(createRequest("karmahq.org", "/about", "utm_source=x"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${CANONICAL_ORIGIN}/about?utm_source=x`);
    expect(rewriteOf(response)).toBeNull();
  });

  it.each([
    ["/my-projects", "/dashboard/projects"],
    ["/my-reviews", "/dashboard/reviews"],
  ])("301s %s to %s without the tenant prefix", async (from, to) => {
    const response = await proxy(createRequest(CANONICAL_HOST, from));

    expect(response.headers.get("location")).toBe(`https://${CANONICAL_HOST}${to}`);
    expect(rewriteOf(response)).toBeNull();
  });

  it("301s a whitelabel /blog to the main domain rather than rewriting it", async () => {
    const response = await proxy(createRequest(whitelabel.domain, "/blog"));

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).not.toContain(TENANT_ROUTE_PREFIX);
    expect(rewriteOf(response)).toBeNull();
  });
});
