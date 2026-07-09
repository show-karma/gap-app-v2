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

// Use a non-whitelabel host for standard middleware tests.
// "localhost" is a whitelabel domain, so it would be caught by whitelabel logic.
const STANDARD_HOST = "karmahq.xyz";

const createRequest = (path: string) => createRequestWithHost(path, STANDARD_HOST);
const primaryWhitelabel = WHITELABEL_DOMAINS[0];

const createRequestWithHost = (path: string, host: string) => {
  const requestUrl = new URL(`http://${host}${path}`);

  return {
    nextUrl: {
      pathname: path,
      protocol: requestUrl.protocol,
      search: requestUrl.search,
      clone: () => new URL(requestUrl.toString()),
    },
    headers: new Headers({ host }),
    url: requestUrl.toString(),
  } as NextRequest;
};

describe("middleware dashboard redirects", () => {
  it("redirects /my-projects to /dashboard#projects", async () => {
    const response = await middleware(createRequest("/my-projects"));

    expect(response?.headers.get("location")).toBe(`http://${STANDARD_HOST}/dashboard#projects`);
  });

  it("redirects /my-reviews to /dashboard#reviews", async () => {
    const response = await middleware(createRequest("/my-reviews"));

    expect(response?.headers.get("location")).toBe(`http://${STANDARD_HOST}/dashboard#reviews`);
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

  it("passes through the Sanity Studio route on a whitelabel domain without rewrite", async () => {
    if (!primaryWhitelabel) {
      throw new Error("No whitelabel domain configured for middleware tests.");
    }

    const response = await middleware(
      createRequestWithHost("/admin/studio/structure", primaryWhitelabel.domain)
    );

    // /admin/studio must stay top-level even though "admin" is otherwise a
    // community sub-route segment (see the /admin/settings rewrite test below).
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

describe("middleware blog whitelabel redirect", () => {
  it("301s a whitelabel tenant's /blog to the main domain", async () => {
    if (!primaryWhitelabel) {
      throw new Error("No whitelabel domain configured for middleware tests.");
    }

    const response = await middleware(createRequestWithHost("/blog", primaryWhitelabel.domain));

    expect(response?.headers.get("location")).toBe("http://karmahq.xyz/blog");
    expect(response?.status).toBe(301);
  });

  it("301s a whitelabel tenant's /blog/<slug> to the main domain, preserving the slug", async () => {
    if (!primaryWhitelabel) {
      throw new Error("No whitelabel domain configured for middleware tests.");
    }

    const response = await middleware(
      createRequestWithHost("/blog/hello-world", primaryWhitelabel.domain)
    );

    expect(response?.headers.get("location")).toBe("http://karmahq.xyz/blog/hello-world");
    expect(response?.status).toBe(301);
  });

  it("passes /blog through untouched on the main domain", async () => {
    const response = await middleware(createRequest("/blog"));

    expect(response?.headers.get("location")).toBeNull();
  });

  it("does not redirect unrelated whitelabel routes", async () => {
    if (!primaryWhitelabel) {
      throw new Error("No whitelabel domain configured for middleware tests.");
    }

    const response = await middleware(
      createRequestWithHost("/project/test-project", primaryWhitelabel.domain)
    );

    expect(response?.headers.get("location")).toBeNull();
  });
});

describe("middleware project URL-structure redirects", () => {
  const uid = `0x${"a".repeat(64)}`;

  it("permanently (308) redirects legacy /grants/:uid to /funding/:uid", async () => {
    const response = await middleware(createRequest(`/project/karma/grants/${uid}`));

    expect(response?.headers.get("location")).toBe(
      `http://${STANDARD_HOST}/project/karma/funding/${uid}`
    );
    expect(response?.status).toBe(308);
  });

  it("permanently (308) redirects /funding/create-grant to /funding/new", async () => {
    const response = await middleware(createRequest("/project/karma/funding/create-grant"));

    expect(response?.headers.get("location")).toBe(
      `http://${STANDARD_HOST}/project/karma/funding/new`
    );
    expect(response?.status).toBe(308);
  });

  it("redirects legacy /roadmap straight to the project overview (no chain) with 308", async () => {
    const response = await middleware(createRequest("/project/karma/roadmap"));

    expect(response?.headers.get("location")).toBe(`http://${STANDARD_HOST}/project/karma`);
    expect(response?.status).toBe(308);
  });

  it("does not redirect a project literally named 'grants'", async () => {
    const response = await middleware(createRequest("/project/grants"));

    expect(response?.headers.get("location")).toBeNull();
  });
});
