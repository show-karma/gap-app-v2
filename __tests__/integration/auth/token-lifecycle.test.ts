/**
 * @file Trust tests for TokenManager lifecycle
 * @description Tests Cypress bypass, null token caching, and concurrent deduplication.
 */

// Unmock to test real implementation
vi.unmock("@/utilities/auth/token-manager");

import { TokenManager } from "@/utilities/auth/token-manager";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
const originalEnv = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;

beforeEach(() => {
  TokenManager.clearCache();
  TokenManager.setPrivyInstance(null);
  vi.clearAllMocks();
  localStorage.clear();
  delete (window as unknown as Record<string, unknown>).Cypress;
  process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = originalEnv;
});

afterAll(() => {
  process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = originalEnv;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("TokenManager — Cypress bypass", () => {
  it("returns localStorage token when E2E bypass is enabled and Cypress is present", async () => {
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "true";
    (window as unknown as Record<string, unknown>).Cypress = true;
    localStorage.setItem("privy:token", "cypress-mock-token");

    const token = await TokenManager.getToken();

    expect(token).toBe("cypress-mock-token");
  });

  it("does NOT return localStorage token when E2E bypass is disabled", async () => {
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "false";
    (window as unknown as Record<string, unknown>).Cypress = true;
    localStorage.setItem("privy:token", "cypress-mock-token");

    // Without a Privy instance, should return null
    const token = await TokenManager.getToken();

    expect(token).toBeNull();
  });

  it("does NOT return localStorage token when Cypress is not present", async () => {
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "true";
    localStorage.setItem("privy:token", "cypress-mock-token");

    const token = await TokenManager.getToken();

    expect(token).toBeNull();
  });
});

describe("TokenManager — Null token handling", () => {
  it("does NOT cache null tokens (cachedToken is falsy so cache check fails)", async () => {
    const mockGetAccessToken = vi.fn().mockResolvedValue(null);
    TokenManager.setPrivyInstance({ getAccessToken: mockGetAccessToken });

    // First call returns null
    const token1 = await TokenManager.getToken();
    expect(token1).toBeNull();
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);

    // Second call also makes a fresh request because null is falsy
    // (cache check: cachedToken && Date.now() < cacheExpiry - fails since cachedToken is null)
    const token2 = await TokenManager.getToken();
    expect(token2).toBeNull();
    expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
  });

  it("caches valid tokens within TTL", async () => {
    const mockGetAccessToken = vi.fn().mockResolvedValue("valid-jwt");
    TokenManager.setPrivyInstance({ getAccessToken: mockGetAccessToken });

    const token1 = await TokenManager.getToken();
    expect(token1).toBe("valid-jwt");

    const token2 = await TokenManager.getToken();
    expect(token2).toBe("valid-jwt");
    // Only 1 actual Privy call - second was from cache
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
  });
});

describe("TokenManager — Concurrent deduplication", () => {
  it("deduplicates concurrent getToken calls", async () => {
    let resolveToken: (v: string) => void;
    const slowGetAccessToken = vi.fn().mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveToken = resolve;
        })
    );
    TokenManager.setPrivyInstance({ getAccessToken: slowGetAccessToken });

    // Start 3 concurrent requests
    const p1 = TokenManager.getToken();
    const p2 = TokenManager.getToken();
    const p3 = TokenManager.getToken();

    // Resolve the single underlying request
    resolveToken!("deduped-token");

    const [t1, t2, t3] = await Promise.all([p1, p2, p3]);

    expect(t1).toBe("deduped-token");
    expect(t2).toBe("deduped-token");
    expect(t3).toBe("deduped-token");
    // Only one actual Privy call
    expect(slowGetAccessToken).toHaveBeenCalledTimes(1);
  });

  it("all callers get null when underlying request fails", async () => {
    const failingGetAccessToken = vi.fn().mockRejectedValue(new Error("Privy error"));
    TokenManager.setPrivyInstance({ getAccessToken: failingGetAccessToken });

    // Suppress console.error from the catch block
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const p1 = TokenManager.getToken();
    const p2 = TokenManager.getToken();

    const [t1, t2] = await Promise.all([p1, p2]);

    expect(t1).toBeNull();
    expect(t2).toBeNull();
    expect(failingGetAccessToken).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});

describe("TokenManager — clearCache", () => {
  it("forces fresh fetch after clearCache", async () => {
    const mockGetAccessToken = vi.fn().mockResolvedValue("token-1");
    TokenManager.setPrivyInstance({ getAccessToken: mockGetAccessToken });

    await TokenManager.getToken();
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);

    TokenManager.clearCache();
    mockGetAccessToken.mockResolvedValue("token-2");

    const token = await TokenManager.getToken();
    expect(token).toBe("token-2");
    expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
  });
});
