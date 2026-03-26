import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => {
  const mockRequest = vi.fn();
  return {
    default: { request: mockRequest },
    __mockRequest: mockRequest,
  };
});

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn(),
  },
}));

vi.mock("@/utilities/sanitize", () => ({
  sanitizeObject: vi.fn((obj: unknown) => obj),
}));

import axios from "axios";
import { TokenManager } from "@/utilities/auth/token-manager";
import fetchData from "@/utilities/fetchData";
import { sanitizeObject } from "@/utilities/sanitize";

const mockRequest = (axios as unknown as { request: ReturnType<typeof vi.fn> }).request;

function makeAxiosResponse<T>(data: T, status: number): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

function makeAxiosError(status: number, message: string, hasResponse = true): AxiosError {
  if (!hasResponse) {
    const err = new Error("Network Error") as Error & {
      response?: unknown;
      isAxiosError?: boolean;
    };
    err.response = undefined;
    err.isAxiosError = true;
    return err as unknown as AxiosError;
  }
  const err = new Error(message) as Error & {
    response?: Record<string, unknown>;
    isAxiosError?: boolean;
  };
  err.response = {
    data: { message },
    status,
    statusText: "Error",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
  err.isAxiosError = true;
  return err as unknown as AxiosError;
}

describe("fetchData trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (TokenManager.getToken as ReturnType<typeof vi.fn>).mockResolvedValue("mock-token");
  });

  // --- Successful requests ---

  describe("successful requests", () => {
    it("GET returns [data, null, pageInfo, status] for 200", async () => {
      const responseData = { items: [1, 2, 3], pageInfo: { next: 2 } };
      mockRequest.mockResolvedValue(makeAxiosResponse(responseData, 200));

      const [data, error, pageInfo, status] = await fetchData("/test");

      expect(data).toEqual(responseData);
      expect(error).toBeNull();
      expect(pageInfo).toEqual({ next: 2 });
      expect(status).toBe(200);
    });

    it("POST returns [data, null, null, 201] for created", async () => {
      const responseData = { id: "new-item" };
      mockRequest.mockResolvedValue(makeAxiosResponse(responseData, 201));

      const [data, error, pageInfo, status] = await fetchData("/test", "POST", { name: "item" });

      expect(data).toEqual({ id: "new-item" });
      expect(error).toBeNull();
      expect(pageInfo).toBeNull();
      expect(status).toBe(201);
    });

    it("PUT returns [data, null, null, 200] for updated", async () => {
      const responseData = { id: "item", updated: true };
      mockRequest.mockResolvedValue(makeAxiosResponse(responseData, 200));

      const [data, error, pageInfo, status] = await fetchData("/test/1", "PUT", {
        name: "updated",
      });

      expect(data).toEqual(responseData);
      expect(error).toBeNull();
      expect(pageInfo).toBeNull();
      expect(status).toBe(200);
    });

    it("DELETE returns [data, null, null, 200]", async () => {
      const responseData = { deleted: true };
      mockRequest.mockResolvedValue(makeAxiosResponse(responseData, 200));

      const [data, error, pageInfo, status] = await fetchData("/test/1", "DELETE");

      expect(data).toEqual(responseData);
      expect(error).toBeNull();
      expect(pageInfo).toBeNull();
      expect(status).toBe(200);
    });

    it("returns pageInfo from response when present", async () => {
      const responseData = {
        results: [],
        pageInfo: { page: 1, total: 50, hasMore: true },
      };
      mockRequest.mockResolvedValue(makeAxiosResponse(responseData, 200));

      const [, , pageInfo] = await fetchData("/test");

      expect(pageInfo).toEqual({ page: 1, total: 50, hasMore: true });
    });

    it("returns null pageInfo when response has no pageInfo", async () => {
      const responseData = { items: [] };
      mockRequest.mockResolvedValue(makeAxiosResponse(responseData, 200));

      const [, , pageInfo] = await fetchData("/test");

      expect(pageInfo).toBeNull();
    });
  });

  // --- Error responses ---

  describe("error responses (tuple pattern)", () => {
    it("400 returns [null, error message, null, 400]", async () => {
      mockRequest.mockRejectedValue(makeAxiosError(400, "Validation failed"));

      const [data, error, pageInfo, status] = await fetchData("/test");

      expect(data).toBeNull();
      expect(error).toBe("Validation failed");
      expect(pageInfo).toBeNull();
      expect(status).toBe(400);
    });

    it("401 returns [null, error message, null, 401]", async () => {
      mockRequest.mockRejectedValue(makeAxiosError(401, "Unauthorized"));

      const [data, error, pageInfo, status] = await fetchData("/test");

      expect(data).toBeNull();
      expect(error).toBe("Unauthorized");
      expect(pageInfo).toBeNull();
      expect(status).toBe(401);
    });

    it("403 returns [null, error message, null, 403]", async () => {
      mockRequest.mockRejectedValue(makeAxiosError(403, "Insufficient permissions"));

      const [data, error, pageInfo, status] = await fetchData("/test");

      expect(data).toBeNull();
      expect(error).toBe("Insufficient permissions");
      expect(pageInfo).toBeNull();
      expect(status).toBe(403);
    });

    it("404 returns [null, error message, null, 404]", async () => {
      mockRequest.mockRejectedValue(makeAxiosError(404, "Not Found"));

      const [data, error, pageInfo, status] = await fetchData("/test");

      expect(data).toBeNull();
      expect(error).toBe("Not Found");
      expect(pageInfo).toBeNull();
      expect(status).toBe(404);
    });

    it("429 returns [null, error message, null, 429]", async () => {
      mockRequest.mockRejectedValue(makeAxiosError(429, "Rate limit exceeded"));

      const [data, error, pageInfo, status] = await fetchData("/test");

      expect(data).toBeNull();
      expect(error).toBe("Rate limit exceeded");
      expect(pageInfo).toBeNull();
      expect(status).toBe(429);
    });

    it("500 returns [null, error message, null, 500]", async () => {
      mockRequest.mockRejectedValue(makeAxiosError(500, "Internal server error"));

      const [data, error, pageInfo, status] = await fetchData("/test");

      expect(data).toBeNull();
      expect(error).toBe("Internal server error");
      expect(pageInfo).toBeNull();
      expect(status).toBe(500);
    });

    it("network error (no response) returns [null, Error object, null, 500]", async () => {
      mockRequest.mockRejectedValue(makeAxiosError(0, "", false));

      const [data, error, pageInfo, status] = await fetchData("/test");

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(Error);
      expect(pageInfo).toBeNull();
      expect(status).toBe(500);
    });

    it("falls back to err.message when response.data.message is missing", async () => {
      const err = new Error("Timeout") as Error & {
        response?: Record<string, unknown>;
        isAxiosError?: boolean;
      };
      err.response = {
        data: {},
        status: 504,
        statusText: "Gateway Timeout",
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };
      err.isAxiosError = true;
      mockRequest.mockRejectedValue(err);

      const [data, error, , status] = await fetchData("/test");

      expect(data).toBeNull();
      expect(error).toBe("Timeout");
      expect(status).toBe(504);
    });
  });

  // --- Auth header ---

  describe("auth header", () => {
    it("attaches Bearer token when isAuthorized=true and indexer URL", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, {}, true);

      const config = mockRequest.mock.calls[0][0];
      expect(config.headers.Authorization).toBe("Bearer mock-token");
    });

    it("does NOT attach token when isAuthorized=false", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, {}, false);

      const config = mockRequest.mock.calls[0][0];
      expect(config.headers.Authorization).toBeUndefined();
    });

    it("does NOT attach token when baseUrl is not indexer", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, {}, true, false, "https://other-api.example.com");

      const config = mockRequest.mock.calls[0][0];
      expect(config.headers.Authorization).toBeUndefined();
    });

    it("does not attach Authorization header when token is null", async () => {
      (TokenManager.getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, {}, true);

      const config = mockRequest.mock.calls[0][0];
      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  // --- Request sanitization ---

  describe("request sanitization", () => {
    it("calls sanitizeObject on request body", async () => {
      const body = { name: "  test  ", nested: { value: " inner " } };
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "POST", body);

      expect(sanitizeObject).toHaveBeenCalledWith(body);
    });

    it("passes sanitized data to axios request", async () => {
      const sanitized = { name: "clean" };
      (sanitizeObject as ReturnType<typeof vi.fn>).mockReturnValue(sanitized);
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "POST", { name: "  dirty  " });

      const config = mockRequest.mock.calls[0][0];
      expect(config.data).toEqual(sanitized);
    });
  });

  // --- Cache parameter ---

  describe("cache parameter", () => {
    it("appends ?cache=true when cache=true and no existing params", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, {}, true, true);

      const config = mockRequest.mock.calls[0][0];
      expect(config.url).toContain("?cache=true");
    });

    it("appends &cache=true when URL has existing params", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test?page=1", "GET", {}, {}, {}, true, true);

      const config = mockRequest.mock.calls[0][0];
      expect(config.url).toContain("&cache=true");
    });

    it("does not append cache parameter when cache=false", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, {}, true, false);

      const config = mockRequest.mock.calls[0][0];
      expect(config.url).not.toContain("cache=");
    });

    it("does not append cache param when baseUrl is not indexer", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, {}, true, true, "https://other-api.example.com");

      const config = mockRequest.mock.calls[0][0];
      expect(config.url).not.toContain("cache=");
    });
  });

  // --- Timeout ---

  describe("timeout", () => {
    it("sets 360s timeout for authorized indexer requests", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, {}, true);

      const config = mockRequest.mock.calls[0][0];
      expect(config.timeout).toBe(360000);
    });

    it("does not set timeout for non-authorized requests", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, {}, false);

      const config = mockRequest.mock.calls[0][0];
      expect(config.timeout).toBeUndefined();
    });

    it("does not set timeout for non-indexer requests", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, {}, true, false, "https://other.com");

      const config = mockRequest.mock.calls[0][0];
      expect(config.timeout).toBeUndefined();
    });
  });

  // --- Request config ---

  describe("request configuration", () => {
    it("passes params to axios config", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, { page: 1, limit: 10 });

      const config = mockRequest.mock.calls[0][0];
      expect(config.params).toEqual({ page: 1, limit: 10 });
    });

    it("passes custom headers to axios config", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test", "GET", {}, {}, { "X-Custom": "value" });

      const config = mockRequest.mock.calls[0][0];
      expect(config.headers["X-Custom"]).toBe("value");
    });

    it("uses GET as default method", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/test");

      const config = mockRequest.mock.calls[0][0];
      expect(config.method).toBe("GET");
    });

    it("constructs URL with baseUrl + endpoint", async () => {
      mockRequest.mockResolvedValue(makeAxiosResponse({}, 200));

      await fetchData("/v2/projects");

      const config = mockRequest.mock.calls[0][0];
      expect(config.url).toMatch(/\/v2\/projects$/);
    });
  });
});
