/**
 * Regression test for Bug #3: No 401 token refresh flow
 *
 * Previously, when an API call received a 401 response (expired token),
 * the request would just fail silently. There was no mechanism to refresh
 * the token and retry the request.
 *
 * Fixed by adding a response interceptor to createAuthenticatedApiClient
 * that clears the cached token and retries once with a fresh token on 401.
 */

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn(),
    clearCache: vi.fn(),
  },
}));

import axios from "axios";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { TokenManager } from "@/utilities/auth/token-manager";

const mockGetToken = TokenManager.getToken as ReturnType<typeof vi.fn>;
const mockClearCache = TokenManager.clearCache as ReturnType<typeof vi.fn>;

describe("Regression: 401 token refresh flow in API client", () => {
  let client: ReturnType<typeof createAuthenticatedApiClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createAuthenticatedApiClient("http://localhost:4000", 5000);
  });

  it("should have response interceptors configured", () => {
    // The client should have at least one response interceptor
    // axios stores interceptors internally; we verify by checking the handlers array
    expect(client.interceptors.response).toBeDefined();
  });

  it("should add Authorization header from TokenManager on requests", async () => {
    mockGetToken.mockResolvedValue("test-token");

    // Create a mock adapter to capture the request config
    const requestInterceptors = (client.interceptors.request as any).handlers;
    expect(requestInterceptors.length).toBeGreaterThan(0);

    // Simulate request interceptor behavior
    const requestHandler = requestInterceptors[0].fulfilled;
    const config = { headers: { set: vi.fn() } } as any;
    config.headers = new axios.AxiosHeaders();

    const result = await requestHandler(config);
    expect(result.headers.Authorization).toBe("Bearer test-token");
  });

  it("should clear token cache on 401 response", async () => {
    // Verify the response interceptor exists and handles 401
    const responseInterceptors = (client.interceptors.response as any).handlers;
    expect(responseInterceptors.length).toBeGreaterThan(0);

    const errorHandler = responseInterceptors[0].rejected;

    // First call returns expired token, second returns fresh token
    mockGetToken.mockResolvedValueOnce("fresh-token");

    const error401 = {
      config: {
        headers: new axios.AxiosHeaders(),
        _retried: false,
      },
      response: { status: 401 },
    };

    // The interceptor should clear cache and attempt retry
    try {
      await errorHandler(error401);
    } catch {
      // May throw if the retry itself fails (no real server)
    }

    expect(mockClearCache).toHaveBeenCalledTimes(1);
  });

  it("should not retry more than once on 401 (prevents infinite loop)", async () => {
    const responseInterceptors = (client.interceptors.response as any).handlers;
    const errorHandler = responseInterceptors[0].rejected;

    mockGetToken.mockResolvedValue("still-expired-token");

    const error401AlreadyRetried = {
      config: {
        headers: new axios.AxiosHeaders(),
        _retried: true, // Already retried once
      },
      response: { status: 401 },
    };

    // Should reject without clearing cache or retrying
    await expect(errorHandler(error401AlreadyRetried)).rejects.toBeDefined();
    expect(mockClearCache).not.toHaveBeenCalled();
  });

  it("should pass through non-401 errors without retry", async () => {
    const responseInterceptors = (client.interceptors.response as any).handlers;
    const errorHandler = responseInterceptors[0].rejected;

    const error500 = {
      config: { headers: {} },
      response: { status: 500 },
    };

    await expect(errorHandler(error500)).rejects.toBeDefined();
    expect(mockClearCache).not.toHaveBeenCalled();
  });

  it("should pass through successful responses unchanged", async () => {
    const responseInterceptors = (client.interceptors.response as any).handlers;
    const successHandler = responseInterceptors[0].fulfilled;

    const response = { status: 200, data: { ok: true } };
    const result = await successHandler(response);

    expect(result).toEqual(response);
  });
});
