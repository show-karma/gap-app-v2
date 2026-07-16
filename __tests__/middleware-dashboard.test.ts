import type { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { WHITELABEL_DOMAINS } from "@/utilities/whitelabel-config";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    NextResponse: {
      redirect: (url: URL, status?: number) => {
        const headers = new Headers();
        headers.set("location", url.toString());
        return { headers, status };
      },
      rewrite: (url: URL, _opts?: unknown) => {
        const headers = new Headers();
        headers.set("x-middleware-rewrite", url.toString());
        return { headers, status: 200 };
      },
      next: (_opts?: unknown) => ({ headers: new Headers(), status: 200 }),
    },
  };
});

vi.mock("@/utilities/redirectHelpers", () => ({
  shouldRedirectToGov: vi.fn(() => false),
  redirectToGov: vi.fn(),
}));

vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: () => [],
}));

// Use the canonical serving host for standard middleware tests. The apex
// (karmahq.xyz) and gap.karmahq.xyz are now alias hosts that 308 to www under
// the ADR 0001 canonical-host policy, so exercising the dashboard/whitelabel
// behavior requires a request that is already on the canonical host.
const STANDARD_HOST = "www.karmahq.xyz";

const createRequest = (path: string) => createRequestWithHost(path, STANDARD_HOST);
const primaryWhitelabel = WHITELABEL_DOMAINS[0];

const createRequestWithHost = (path: string, host: string) => {
  const requestUrl = new URL(`http://${host}${path}`);

  return {
    nextUrl: {
      pathname: path,
      clone: () => new URL(requestUrl.toString()),
    },
    headers: new Headers({ host }),
    url: requestUrl.toString(),
  } as NextRequest;
};

describe("middleware dashboard redirects", () => {
  it("redirects /my-projects to /dashboard/projects", async () => {
    const response = await middleware(createRequest("/my-projects"));

    expect(response?.headers.get("location")).toBe(`http://${STANDARD_HOST}/dashboard/projects`);
  });

  it("redirects /my-reviews to /dashboard/reviews", async () => {
    const response = await middleware(createRequest("/my-reviews"));

    expect(response?.headers.get("location")).toBe(`http://${STANDARD_HOST}/dashboard/reviews`);
  });

  it("does not redirect /my-projects/:slug", async () => {
    const response = await middleware(createRequest("/my-projects/project-1"));

    expect(response?.headers.get("location")).toBeNull();
  });

  it("does not redirect /admin routes", async () => {
    const response = await middleware(createRequest("/admin/settings"));

    expect(response?.headers.get("location")).toBeNull();
  });

  it("passes through whitelabel /project routes without rewrite", async () => {
    if (!primaryWhitelabel) {
      throw new Error("No whitelabel domain configured for middleware tests.");
    }

    const response = await middleware(
      createRequestWithHost("/project/test-project", primaryWhitelabel.domain)
    );

    // /project is a top-level route, not a community sub-route — no rewrite needed
    expect(response?.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response?.headers.get("location")).toBeNull();
  });

  it("rewrites other whitelabel paths instead of redirecting", async () => {
    if (!primaryWhitelabel) {
      throw new Error("No whitelabel domain configured for middleware tests.");
    }

    const response = await middleware(
      createRequestWithHost("/admin/settings", primaryWhitelabel.domain)
    );

    expect(response?.headers.get("x-middleware-rewrite")).toBe(
      `http://${primaryWhitelabel.domain}/community/${primaryWhitelabel.communitySlug}/admin/settings`
    );
    expect(response?.headers.get("location")).toBeNull();
  });
});

// Legacy /project URL-structure normalization (grants → funding,
// create-grant → new, roadmap collapse) is now driven by the authoritative
// indexer decision and lives in middleware-indexability.test.ts, which stubs the
// indexer fetch. The old standalone redirect block was removed so it can no
// longer create redirect chains.
