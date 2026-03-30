/**
 * Token deduplication under extreme concurrency.
 *
 * Imports the REAL TokenManager and verifies that concurrent getToken()
 * calls are deduplicated into a single Privy getAccessToken() call,
 * that errors propagate to all waiters, and that the dedup state
 * resets correctly after completion or failure.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TokenManager } from "@/utilities/auth/token-manager";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

describe("TokenManager — extreme concurrency deduplication", () => {
  let mockGetAccessToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockGetAccessToken = vi.fn().mockResolvedValue("dedup-token");
    TokenManager.clearCache();
    TokenManager.setPrivyInstance({ getAccessToken: mockGetAccessToken });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    TokenManager.clearCache();
    TokenManager.setPrivyInstance(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 50-way concurrent deduplication
  // -------------------------------------------------------------------------

  it("should make exactly 1 Privy call for 50 simultaneous getToken() calls", async () => {
    const results = await Promise.all(Array.from({ length: 50 }, () => TokenManager.getToken()));

    expect(results).toHaveLength(50);
    for (const token of results) {
      expect(token).toBe("dedup-token");
    }
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Dedup while slow request is in-flight
  // -------------------------------------------------------------------------

  it("should deduplicate callers that arrive while a 500ms request is in-flight", async () => {
    mockGetAccessToken.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("slow-500ms"), 500))
    );

    // First batch: fire 10 calls immediately
    const batch1 = Array.from({ length: 10 }, () => TokenManager.getToken());

    // Advance 200ms — request still in-flight — fire 10 more callers
    vi.advanceTimersByTime(200);
    const batch2 = Array.from({ length: 10 }, () => TokenManager.getToken());

    // Finish the in-flight request
    vi.advanceTimersByTime(300);

    const results = await Promise.all([...batch1, ...batch2]);
    expect(results).toHaveLength(20);
    for (const token of results) {
      expect(token).toBe("slow-500ms");
    }
    // All 20 callers shared a single Privy call
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Dedup reset after successful completion
  // -------------------------------------------------------------------------

  it("should reset dedup after completion so the next batch triggers a new Privy call", async () => {
    // First batch
    const batch1 = await Promise.all(Array.from({ length: 5 }, () => TokenManager.getToken()));
    expect(batch1.every((t) => t === "dedup-token")).toBe(true);
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);

    // Expire the cache
    vi.advanceTimersByTime(21_000);

    // Second batch should trigger a fresh call
    mockGetAccessToken.mockResolvedValueOnce("second-batch-token");
    const batch2 = await Promise.all(Array.from({ length: 5 }, () => TokenManager.getToken()));
    expect(batch2.every((t) => t === "second-batch-token")).toBe(true);
    expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Error during dedup: all waiters get null, dedup resets
  // -------------------------------------------------------------------------

  it("should return null to all waiters when Privy throws, then reset for the next call", async () => {
    mockGetAccessToken.mockRejectedValueOnce(new Error("Privy down"));

    const results = await Promise.all(Array.from({ length: 15 }, () => TokenManager.getToken()));

    // All waiters should get null (the catch returns null)
    expect(results).toHaveLength(15);
    for (const token of results) {
      expect(token).toBeNull();
    }
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);

    // Dedup should have reset — next call triggers a new request
    mockGetAccessToken.mockResolvedValueOnce("recovered");
    const next = await TokenManager.getToken();
    expect(next).toBe("recovered");
    expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Mixed: some calls hit cache, some arrive after TTL expiry
  // -------------------------------------------------------------------------

  it("should serve cached tokens to early callers and refetch for callers after TTL", async () => {
    // Prime the cache
    await TokenManager.getToken();
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    mockGetAccessToken.mockClear();

    // Calls within TTL should hit cache
    const cached = await Promise.all(Array.from({ length: 5 }, () => TokenManager.getToken()));
    expect(cached.every((t) => t === "dedup-token")).toBe(true);
    expect(mockGetAccessToken).not.toHaveBeenCalled();

    // Expire the cache
    vi.advanceTimersByTime(20_000);

    // Calls after TTL should trigger exactly 1 new Privy call
    mockGetAccessToken.mockResolvedValueOnce("post-ttl-token");
    const postTtl = await Promise.all(Array.from({ length: 10 }, () => TokenManager.getToken()));
    expect(postTtl.every((t) => t === "post-ttl-token")).toBe(true);
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Interleaved batches across TTL boundary
  // -------------------------------------------------------------------------

  it("should correctly handle a batch that starts before TTL and another after", async () => {
    mockGetAccessToken.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("batch-a"), 100))
    );

    // Batch A starts, in-flight for 100ms
    const batchA = Array.from({ length: 5 }, () => TokenManager.getToken());

    // Resolve batch A
    vi.advanceTimersByTime(100);
    const resultsA = await Promise.all(batchA);
    expect(resultsA.every((t) => t === "batch-a")).toBe(true);
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);

    // Expire TTL
    vi.advanceTimersByTime(20_000);

    // Batch B after TTL
    mockGetAccessToken.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("batch-b"), 50))
    );
    const batchB = Array.from({ length: 5 }, () => TokenManager.getToken());
    vi.advanceTimersByTime(50);
    const resultsB = await Promise.all(batchB);
    expect(resultsB.every((t) => t === "batch-b")).toBe(true);
    expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // getAuthHeader dedup
  // -------------------------------------------------------------------------

  it("should deduplicate 20 concurrent getAuthHeader() calls into 1 Privy call", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => TokenManager.getAuthHeader())
    );

    expect(results).toHaveLength(20);
    for (const header of results) {
      expect(header).toEqual({ Authorization: "Bearer dedup-token" });
    }
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // isAuthenticated dedup
  // -------------------------------------------------------------------------

  it("should deduplicate 10 concurrent isAuthenticated() calls into 1 Privy call", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => TokenManager.isAuthenticated())
    );

    expect(results).toHaveLength(10);
    for (const authed of results) {
      expect(authed).toBe(true);
    }
    expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
  });
});
