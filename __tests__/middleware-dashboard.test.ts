import type { NextRequest } from "next/server";
import { middleware } from "@/middleware";

jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return {
    ...actual,
    NextResponse: {
      redirect: (url: URL, status?: number) => {
        const headers = new Headers();
        headers.set("location", url.toString());
        return { headers, status };
      },
      next: () => ({ headers: new Headers(), status: 200 }),
    },
  };
});

jest.mock("@/utilities/redirectHelpers", () => ({
  shouldRedirectToGov: jest.fn(() => false),
  redirectToGov: jest.fn(),
}));

jest.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: () => [],
}));

const createRequest = (path: string) =>
  ({
    nextUrl: { pathname: path },
    url: `http://localhost${path}`,
  }) as NextRequest;

describe("middleware dashboard redirects", () => {
  it("redirects /my-projects to /dashboard#projects", async () => {
    const response = await middleware(createRequest("/my-projects"));

    expect(response?.headers.get("location")).toBe("http://localhost/dashboard#projects");
  });

  it("redirects /my-reviews to /dashboard#reviews", async () => {
    const response = await middleware(createRequest("/my-reviews"));

    expect(response?.headers.get("location")).toBe("http://localhost/dashboard#reviews");
  });

  it("does not redirect /my-projects/:slug", async () => {
    const response = await middleware(createRequest("/my-projects/project-1"));

    expect(response?.headers.get("location")).toBeNull();
  });

  it("does not redirect /admin routes", async () => {
    const response = await middleware(createRequest("/admin/settings"));

    expect(response?.headers.get("location")).toBeNull();
  });
});
