/**
 * @file `/api/blog/preview` and `/api/blog/preview/exit` routes: secret
 * gate + draft mode enable/disable + redirect. Behavior only.
 */
import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { draftModeMock, enableMock, disableMock, getServerEnvMock } = vi.hoisted(() => ({
  draftModeMock: vi.fn(),
  enableMock: vi.fn(),
  disableMock: vi.fn(),
  getServerEnvMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  draftMode: draftModeMock,
}));

vi.mock("@/utilities/env", () => ({
  getServerEnv: getServerEnvMock,
}));

function makeRequest(url: string): NextRequest {
  return {
    url,
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  draftModeMock.mockResolvedValue({ isEnabled: false, enable: enableMock, disable: disableMock });
});

describe("GET /api/blog/preview", () => {
  it("returns 401 and never enables draft mode when the secret is missing", async () => {
    getServerEnvMock.mockReturnValue({ SANITY_PREVIEW_SECRET: "correct-secret" });
    const { GET } = await import("@/app/api/blog/preview/route");

    const response = await GET(makeRequest("http://localhost/api/blog/preview?slug=hello-world"));

    expect(response.status).toBe(401);
    expect(enableMock).not.toHaveBeenCalled();
  });

  it("returns 401 and never enables draft mode when the secret is wrong", async () => {
    getServerEnvMock.mockReturnValue({ SANITY_PREVIEW_SECRET: "correct-secret" });
    const { GET } = await import("@/app/api/blog/preview/route");

    const response = await GET(
      makeRequest("http://localhost/api/blog/preview?secret=wrong&slug=hello-world")
    );

    expect(response.status).toBe(401);
    expect(enableMock).not.toHaveBeenCalled();
  });

  it("returns 401 when no preview secret is configured at all", async () => {
    getServerEnvMock.mockReturnValue({ SANITY_PREVIEW_SECRET: "" });
    const { GET } = await import("@/app/api/blog/preview/route");

    const response = await GET(
      makeRequest("http://localhost/api/blog/preview?secret=anything&slug=hello-world")
    );

    expect(response.status).toBe(401);
    expect(enableMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the secret is valid but slug is missing", async () => {
    getServerEnvMock.mockReturnValue({ SANITY_PREVIEW_SECRET: "correct-secret" });
    const { GET } = await import("@/app/api/blog/preview/route");

    const response = await GET(
      makeRequest("http://localhost/api/blog/preview?secret=correct-secret")
    );

    expect(response.status).toBe(400);
    expect(enableMock).not.toHaveBeenCalled();
  });

  it("enables draft mode and redirects to the post for a valid secret + slug", async () => {
    getServerEnvMock.mockReturnValue({ SANITY_PREVIEW_SECRET: "correct-secret" });
    const { GET } = await import("@/app/api/blog/preview/route");

    const response = await GET(
      makeRequest("http://localhost/api/blog/preview?secret=correct-secret&slug=hello-world")
    );

    expect(enableMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/blog/hello-world");
  });
});

describe("GET /api/blog/preview/exit", () => {
  it("disables draft mode and redirects to the post slug when given", async () => {
    const { GET } = await import("@/app/api/blog/preview/exit/route");

    const response = await GET(
      makeRequest("http://localhost/api/blog/preview/exit?slug=hello-world")
    );

    expect(disableMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/blog/hello-world");
  });

  it("disables draft mode and redirects to the blog index when no slug is given", async () => {
    const { GET } = await import("@/app/api/blog/preview/exit/route");

    const response = await GET(makeRequest("http://localhost/api/blog/preview/exit"));

    expect(disableMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/blog");
  });
});
