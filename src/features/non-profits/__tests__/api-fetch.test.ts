/**
 * Unit tests for non-profits/lib/api-fetch.ts
 *
 * Mocks:
 * - global `fetch` via vi.stubGlobal
 * - `TokenManager.getToken` via vi.spyOn
 * - `envVars.NEXT_PUBLIC_GAP_INDEXER_URL` via module mock
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";
import { TokenManager } from "@/utilities/auth/token-manager";
import { apiFetch } from "../lib/api-fetch";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.test",
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResponse(body: unknown, status = 200, ok = true): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const SimpleSchema = z.object({ id: z.string(), name: z.string() });
type Simple = z.infer<typeof SimpleSchema>;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("non-profits/lib/api-fetch — apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(TokenManager, "getToken").mockResolvedValue(null);
  });

  describe("successful responses", () => {
    it("parses and returns a valid JSON response", async () => {
      const payload: Simple = { id: "f-1", name: "Acme Foundation" };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(payload)));

      const result = await apiFetch("/v2/philanthropy/foundations/f-1", SimpleSchema);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(payload);
      }
    });

    it("constructs the full URL from BASE_URL + path", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse({ id: "x", name: "Y" }));
      vi.stubGlobal("fetch", fetchMock);

      await apiFetch("/v2/test-path", SimpleSchema);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://indexer.test/v2/test-path",
        expect.any(Object)
      );
    });

    it("handles 204 No Content without calling .json()", async () => {
      const jsonSpy = vi.fn();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
          json: jsonSpy,
          text: jsonSpy,
        } as unknown as Response)
      );

      const result = await apiFetch("/v2/some-action", z.undefined());

      expect(result.isOk()).toBe(true);
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it("sends Authorization header when TokenManager returns a token", async () => {
      vi.spyOn(TokenManager, "getToken").mockResolvedValue("privy-jwt-abc");
      const fetchMock = vi.fn().mockResolvedValue(makeResponse({ id: "x", name: "Y" }));
      vi.stubGlobal("fetch", fetchMock);

      await apiFetch("/v2/test", SimpleSchema);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer privy-jwt-abc" }),
        })
      );
    });

    it("omits Authorization header when token is null (unauthenticated)", async () => {
      vi.spyOn(TokenManager, "getToken").mockResolvedValue(null);
      const fetchMock = vi.fn().mockResolvedValue(makeResponse({ id: "x", name: "Y" }));
      vi.stubGlobal("fetch", fetchMock);

      await apiFetch("/v2/test", SimpleSchema);

      const calledWith = fetchMock.mock.calls[0][1] as RequestInit;
      expect((calledWith.headers as Record<string, string>)?.Authorization).toBeUndefined();
    });

    it("sends Content-Type and serialised body on POST", async () => {
      const fetchMock = vi.fn().mockResolvedValue(makeResponse({ id: "x", name: "Y" }));
      vi.stubGlobal("fetch", fetchMock);

      await apiFetch("/v2/query", SimpleSchema, "POST", { message: "hello" });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ message: "hello" }),
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        })
      );
    });
  });

  describe("HTTP error responses", () => {
    it("returns ApiError for non-ok response with JSON message", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(makeResponse({ message: "Not found" }, 404, false))
      );

      const result = await apiFetch("/v2/foundations/bad", SimpleSchema);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual({
          type: "ApiError",
          status: 404,
          message: "Not found",
        });
      }
    });

    it("returns ApiError for non-ok response with error field", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(makeResponse({ error: "Forbidden" }, 403, false))
      );

      const result = await apiFetch("/v2/protected", SimpleSchema);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toMatchObject({ type: "ApiError", status: 403 });
      }
    });

    it("returns ApiError with fallback message for non-ok plain-text response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Server Error"),
          json: () => Promise.reject(new SyntaxError("not json")),
        } as unknown as Response)
      );

      const result = await apiFetch("/v2/crash", SimpleSchema);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toMatchObject({
          type: "ApiError",
          status: 500,
          message: "Internal Server Error",
        });
      }
    });
  });

  describe("Zod validation errors", () => {
    it("returns ValidationError when response shape mismatches schema", async () => {
      // Response omits required 'name' field
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse({ id: "f-1" })));

      const result = await apiFetch("/v2/foundations/f-1", SimpleSchema);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("ValidationError");
        expect((result.error as { cause: unknown }).cause).toBeInstanceOf(ZodError);
      }
    });
  });

  describe("network-level errors", () => {
    it("returns NetworkError on 'Failed to fetch' TypeError", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

      const result = await apiFetch("/v2/foundations/f-1", SimpleSchema);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual({
          type: "NetworkError",
          message: "Failed to fetch",
        });
      }
    });

    it("returns NetworkError for generic Error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("DNS resolution failed")));

      const result = await apiFetch("/v2/foundations/f-1", SimpleSchema);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toMatchObject({ type: "NetworkError" });
      }
    });

    it("returns AbortError on DOMException AbortError", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new DOMException("The operation was aborted", "AbortError"))
      );

      const result = await apiFetch("/v2/foundations/f-1", SimpleSchema);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual({ type: "AbortError" });
      }
    });
  });
});
