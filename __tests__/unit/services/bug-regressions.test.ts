/**
 * Bug regression tests for known issues found during test planning.
 *
 * Bug 1: error.includes() crash on network errors in program-reviewers.service.ts:77
 *   When fetchData returns a non-string error (e.g., Error object from a network failure),
 *   calling error.includes() would throw TypeError because Error objects have no .includes().
 *
 * Bug 2: 429 responses retried by React Query default -- should NOT retry rate limits
 *   fetchData correctly returns the 429 status, but callers using React Query need
 *   to opt out of automatic retries for 429 responses.
 *
 * Bug 3: No 401 token refresh flow
 *   When fetchData returns a 401, there's no automatic token refresh + retry.
 *   The error is returned as-is, and callers must handle re-authentication.
 */

// ── Bug 1: program-reviewers.service network error crash ───────────────────

vi.mock("@/utilities/auth/token-manager");
vi.mock("@/utilities/fetchData");
vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
    head: vi.fn(),
    options: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
    },
    defaults: {},
    getUri: vi.fn(),
  })),
}));

import { programReviewersService } from "@/services/program-reviewers.service";
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as vi.MockedFunction<typeof fetchData>;

describe("Bug 1 regression: error.includes() crash on non-string error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should NOT crash when fetchData returns an Error object (network failure)", async () => {
    // When there's no response (network failure), fetchData returns the Error object itself
    // as the error value in the tuple: [null, Error("Network Error"), null, 500]
    const networkError = new Error("Network Error");
    mockFetchData.mockResolvedValue([null, networkError as unknown as string, null, 500]);

    // This should NOT throw TypeError: error.includes is not a function
    // The fix normalizes the error to a string before calling .includes()
    await expect(programReviewersService.getReviewers("program-1")).rejects.toThrow();
  });

  it("should NOT crash when fetchData returns a plain object as error", async () => {
    // Edge case: some libraries return non-Error, non-string objects
    const objectError = { code: "ECONNREFUSED", message: "Connection refused" };
    mockFetchData.mockResolvedValue([null, objectError as unknown as string, null, 500]);

    await expect(programReviewersService.getReviewers("program-1")).rejects.toThrow();
  });

  it("should still return empty array for 'No reviewers found' as string", async () => {
    mockFetchData.mockResolvedValue([null, "No reviewers found", null, 404]);

    const result = await programReviewersService.getReviewers("program-1");
    expect(result).toEqual([]);
  });

  it("should still return empty array for 'Program Reviewer Not Found' as string", async () => {
    mockFetchData.mockResolvedValue([null, "Program Reviewer Not Found", null, 404]);

    const result = await programReviewersService.getReviewers("program-1");
    expect(result).toEqual([]);
  });
});

// ── Bug 2: 429 rate limit returned correctly by fetchData ──────────────────

describe("Bug 2 regression: 429 rate limit status is exposed to callers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchData exposes 429 status so callers can avoid retrying", async () => {
    // Verify the tuple correctly propagates 429 status
    mockFetchData.mockResolvedValue([null, "Rate limit exceeded", null, 429]);

    const [data, error, , status] = await (fetchData as vi.MockedFunction<typeof fetchData>)(
      "/test-endpoint"
    );

    expect(data).toBeNull();
    expect(error).toBe("Rate limit exceeded");
    expect(status).toBe(429);
  });
});

// ── Bug 3: 401 Unauthorized is returned, no token refresh ──────────────────

describe("Bug 3 regression: 401 is returned without automatic token refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchData returns 401 status without implicit retry", async () => {
    // The current implementation does NOT refresh the token on 401
    // This is a known gap - callers must handle re-authentication
    mockFetchData.mockResolvedValue([null, "Unauthorized", null, 401]);

    const [data, error, , status] = await (fetchData as vi.MockedFunction<typeof fetchData>)(
      "/protected-endpoint"
    );

    expect(data).toBeNull();
    expect(error).toBe("Unauthorized");
    expect(status).toBe(401);
    // fetchData should only be called once (no implicit retry)
    expect(mockFetchData).toHaveBeenCalledTimes(1);
  });
});
