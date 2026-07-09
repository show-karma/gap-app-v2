/**
 * @file `/api/blog/revalidate` webhook route: verifies the Sanity webhook
 * signature via `next-sanity`'s `parseBody`, then revalidates the paths
 * `mapPayloadToPaths` returns. Behavior only — never asserts the GROQ or
 * gateway internals `parseBody`/the mapper depend on.
 */
import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { parseBodyMock, revalidatePathMock, getServerEnvMock, sentryCaptureMock } = vi.hoisted(
  () => ({
    parseBodyMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    getServerEnvMock: vi.fn(),
    sentryCaptureMock: vi.fn(),
  })
);

vi.mock("next-sanity/webhook", () => ({
  parseBody: parseBodyMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/utilities/env", () => ({
  getServerEnv: getServerEnvMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentryCaptureMock,
}));

import { POST } from "@/app/api/blog/revalidate/route";

function makeRequest(): NextRequest {
  return {} as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/blog/revalidate", () => {
  it("returns 401 without calling parseBody when no webhook secret is configured", async () => {
    getServerEnvMock.mockReturnValue({ SANITY_WEBHOOK_SECRET: "" });

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(parseBodyMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the signature is invalid (wrong secret)", async () => {
    getServerEnvMock.mockReturnValue({ SANITY_WEBHOOK_SECRET: "correct-secret" });
    parseBodyMock.mockResolvedValue({ isValidSignature: false, body: { _type: "post" } });

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("revalidates every mapped path and returns 200 for a valid signature", async () => {
    getServerEnvMock.mockReturnValue({ SANITY_WEBHOOK_SECRET: "correct-secret" });
    parseBodyMock.mockResolvedValue({
      isValidSignature: true,
      body: { _type: "post", slug: { current: "hello-world" } },
    });

    const response = await POST(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.revalidated).toEqual([
      "/blog",
      "/blog/hello-world",
      "/sitemaps/static/sitemap.xml",
    ]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/blog");
    expect(revalidatePathMock).toHaveBeenCalledWith("/blog/hello-world");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sitemaps/static/sitemap.xml");
    expect(revalidatePathMock).toHaveBeenCalledTimes(3);
  });

  it("returns 200 with no revalidated paths for a valid signature on a non-post document", async () => {
    getServerEnvMock.mockReturnValue({ SANITY_WEBHOOK_SECRET: "correct-secret" });
    parseBodyMock.mockResolvedValue({
      isValidSignature: true,
      body: { _type: "author", slug: { current: "karma" } },
    });

    const response = await POST(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.revalidated).toEqual([]);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns 400 and reports to Sentry when parseBody throws (malformed payload)", async () => {
    getServerEnvMock.mockReturnValue({ SANITY_WEBHOOK_SECRET: "correct-secret" });
    parseBodyMock.mockRejectedValue(new Error("invalid JSON"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(sentryCaptureMock).toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
