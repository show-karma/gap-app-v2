const mockRevalidateTag = vi.fn();
const mockGetServerEnv = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/utilities/env", () => ({
  getServerEnv: () => mockGetServerEnv(),
}));

import type { NextRequest } from "next/server";
import { POST } from "@/app/api/notebooks/revalidate/route";

const SECRET = "s3cret-token-value";

/**
 * FR3. An unauthenticated revalidation endpoint is a free cache-buster: anyone
 * could evict every cached payload in a loop and turn each following page view
 * into an upstream API call — an amplified DoS against gapapi using our own
 * servers. These tests pin that it refuses everything it should.
 */
function request(options: { token?: string | null; body?: unknown; raw?: string } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.token) headers.set("authorization", options.token);

  // The route only reads `headers`, `json()` and `url`, all of which a plain
  // Request provides — so a Request IS structurally enough here. Cast through
  // `unknown` rather than `any`: it names exactly one substitution instead of
  // switching type checking off for the expression.
  return new Request("https://example.org/api/notebooks/revalidate", {
    method: "POST",
    headers,
    body: options.raw ?? JSON.stringify(options.body ?? { communityId: "filecoin" }),
  }) as unknown as NextRequest;
}

describe("POST /api/notebooks/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerEnv.mockReturnValue({ NOTEBOOKS_REVALIDATE_SECRET: SECRET });
  });

  describe("authentication", () => {
    // Fail closed. An environment where the variable was never set must refuse,
    // not run open.
    it("refuses every call when no secret is configured", async () => {
      mockGetServerEnv.mockReturnValue({ NOTEBOOKS_REVALIDATE_SECRET: "" });

      const response = await POST(request({ token: `Bearer ${SECRET}` }));

      expect(response.status).toBe(401);
      expect(mockRevalidateTag).not.toHaveBeenCalled();
    });

    it.each([
      ["no authorization header", undefined],
      ["an empty bearer token", "Bearer "],
      ["the wrong token", "Bearer wrong-token-value"],
      ["a token that is a prefix of the real one", "Bearer s3cret"],
      ["the right token under the wrong scheme", `Basic ${SECRET}`],
      ["a raw token with no scheme", SECRET],
    ])("rejects %s", async (_label, token) => {
      const response = await POST(request({ token: token ?? null }));

      expect(response.status).toBe(401);
      expect(mockRevalidateTag).not.toHaveBeenCalled();
    });

    it("accepts the configured token", async () => {
      const response = await POST(request({ token: `Bearer ${SECRET}` }));

      expect(response.status).toBe(200);
    });

    it("treats the scheme case-insensitively, as RFC 7235 requires", async () => {
      const response = await POST(request({ token: `bearer ${SECRET}` }));

      expect(response.status).toBe(200);
    });
  });

  describe("payload", () => {
    it("rejects a malformed body as a bad request, not a server error", async () => {
      const response = await POST(request({ token: `Bearer ${SECRET}`, raw: "not json" }));

      expect(response.status).toBe(400);
      expect(mockRevalidateTag).not.toHaveBeenCalled();
    });

    it("rejects a body with no community", async () => {
      const response = await POST(request({ token: `Bearer ${SECRET}`, body: {} }));

      expect(response.status).toBe(400);
    });

    // A leaked token still cannot be used to churn arbitrary cache tags.
    it("rejects a community that has no notebook pages", async () => {
      const response = await POST(
        request({ token: `Bearer ${SECRET}`, body: { communityId: "not-a-community" } })
      );

      expect(response.status).toBe(404);
      expect(mockRevalidateTag).not.toHaveBeenCalled();
    });
  });

  describe("revalidation", () => {
    it("invalidates only the target community's tag", async () => {
      await POST(request({ token: `Bearer ${SECRET}`, body: { communityId: "filecoin" } }));

      expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
      expect(mockRevalidateTag).toHaveBeenCalledWith("notebook-overview:filecoin", "max");
    });

    it("reports which tag it invalidated", async () => {
      const response = await POST(request({ token: `Bearer ${SECRET}` }));

      await expect(response.json()).resolves.toEqual({
        ok: true,
        revalidated: ["notebook-overview:filecoin"],
      });
    });

    it("surfaces a revalidation failure as a server error", async () => {
      mockRevalidateTag.mockImplementation(() => {
        throw new Error("cache unavailable");
      });

      const response = await POST(request({ token: `Bearer ${SECRET}` }));

      expect(response.status).toBe(500);
    });
  });
});
