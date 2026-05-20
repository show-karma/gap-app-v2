import type { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// We do NOT mock `next/server` here — we want real NextResponse so the
// Link/Vary header assertions and the JSON.json() short-circuit are
// exercised against the production helper, not a hand-rolled stub.

vi.mock("@/utilities/redirectHelpers", () => ({
  shouldRedirectToGov: vi.fn(() => false),
  redirectToGov: vi.fn(),
}));

vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: () => [],
}));

const STANDARD_HOST = "karmahq.xyz";

function createRequest(path: string, accept: string | null = null): NextRequest {
  const requestUrl = new URL(`http://${STANDARD_HOST}${path}`);
  const headers = new Headers({ host: STANDARD_HOST });
  if (accept) headers.set("accept", accept);
  return {
    nextUrl: Object.assign(requestUrl, { clone: () => new URL(requestUrl.toString()) }),
    headers,
    url: requestUrl.toString(),
  } as unknown as NextRequest;
}

describe("middleware AEO headers on /", () => {
  it("attaches RFC 8288 Link header with sitemap, alternate, and service-desc rels", async () => {
    const response = await middleware(createRequest("/"));
    const link = response?.headers.get("Link") ?? "";
    expect(link).toContain('rel="sitemap"');
    expect(link).toContain('rel="alternate"');
    expect(link).toContain('rel="service-desc"');
    expect(link).toContain("/sitemap.xml");
    expect(link).toContain("/index.md");
    expect(link).toContain("/openapi.json");
    expect(link).toContain("/llms.txt");
    expect(link).toContain("/.well-known/api-catalog");
  });

  it("sets Vary: Accept so caches differentiate the markdown variant", async () => {
    const response = await middleware(createRequest("/"));
    expect(response?.headers.get("Vary")).toContain("Accept");
  });

  it("does not attach the Link header to non-home routes", async () => {
    const response = await middleware(createRequest("/projects"));
    expect(response?.headers.get("Link")).toBeNull();
  });
});

describe("middleware Accept: text/markdown content negotiation on /", () => {
  it("rewrites to /index.md when the client asks for markdown", async () => {
    const response = await middleware(createRequest("/", "text/markdown"));
    expect(response?.headers.get("x-middleware-rewrite")).toContain("/index.md");
  });

  it("does not rewrite when Accept does not include text/markdown", async () => {
    const response = await middleware(createRequest("/", "text/html"));
    expect(response?.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("still emits the Link discovery header on a markdown rewrite", async () => {
    const response = await middleware(createRequest("/", "text/markdown"));
    expect(response?.headers.get("Link")).toContain("rel=\"sitemap\"");
  });
});

describe("middleware ?mode=agent JSON view on /", () => {
  function createAgentModeRequest(): NextRequest {
    const requestUrl = new URL(`http://${STANDARD_HOST}/?mode=agent`);
    return {
      nextUrl: Object.assign(requestUrl, { clone: () => new URL(requestUrl.toString()) }),
      headers: new Headers({ host: STANDARD_HOST }),
      url: requestUrl.toString(),
    } as unknown as NextRequest;
  }

  it("returns 200 JSON with the canonical Karma metadata envelope", async () => {
    const response = await middleware(createAgentModeRequest());
    expect(response?.status).toBe(200);
    expect(response?.headers.get("Content-Type")).toContain("application/json");
    const json = await response?.json();
    expect(json.name).toBe("Karma");
    expect(json.endpoints.openapi).toBe("https://www.karmahq.xyz/openapi.json");
    expect(json.endpoints.mcp).toBe("https://gapapi.karmahq.xyz/v2/mcp");
    expect(json.auth.apiKey.header).toBe("x-api-key");
    expect(json.capabilities).toEqual(
      expect.arrayContaining(["discover programs", "submit applications"])
    );
    expect(json.documentation).toBe("https://www.karmahq.xyz/for-agents");
  });

  it("does not short-circuit when no mode query param is present", async () => {
    const response = await middleware(createRequest("/"));
    // Standard pass-through — body shouldn't be JSON
    const contentType = response?.headers.get("Content-Type") ?? "";
    expect(contentType).not.toContain("application/json");
  });
});
