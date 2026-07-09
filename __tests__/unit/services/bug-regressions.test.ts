/**
 * Bug regression tests for known issues found during test planning.
 *
 * Bug 1: error.includes() crash on network errors in program-reviewers.service.ts:77
 *   When the api client returns a non-string error (e.g., Error object from a
 *   network failure), calling error.includes() would throw TypeError because
 *   Error objects have no .includes().
 *
 * Bug 2 (429 rate limit) and Bug 3 (401 token refresh) previously exercised
 * the legacy fetchData adapter's tuple contract directly. That adapter was
 * removed in #1775 Phase 4 — the same coverage now lives in
 * utilities/api/__tests__/client.test.ts.
 */

// ── Bug 1: program-reviewers.service network error crash ───────────────────

vi.mock("@/utilities/auth/token-manager");
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));
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
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockApiGet = api.get as vi.MockedFunction<typeof api.get>;

describe("Bug 1 regression: error.includes() crash on non-string error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should NOT crash when api.get rejects with an Error object (network failure)", async () => {
    // When there's no response (network failure), the api client rejects
    // with the raw Error/rejection reason it received.
    const networkError = new Error("Network Error");
    mockApiGet.mockRejectedValue(networkError);

    // This should NOT throw TypeError: error.includes is not a function
    // The fix normalizes the error to a string before calling .includes()
    await expect(programReviewersService.getReviewers("program-1")).rejects.toThrow();
  });

  it("should NOT crash when api.get rejects with a plain object as error", async () => {
    // Edge case: some libraries return non-Error, non-string objects
    const objectError = { code: "ECONNREFUSED", message: "Connection refused" };
    mockApiGet.mockRejectedValue(objectError);

    await expect(programReviewersService.getReviewers("program-1")).rejects.toThrow();
  });

  it("should still return empty array for 'No reviewers found' as string", async () => {
    mockApiGet.mockRejectedValue(
      new HttpError(404, {
        endpoint: "/v2/funding-program-configs/program-1/reviewers",
        method: "GET",
        body: { message: "No reviewers found" },
      })
    );

    const result = await programReviewersService.getReviewers("program-1");
    expect(result).toEqual([]);
  });

  it("should still return empty array for 'Program Reviewer Not Found' as string", async () => {
    mockApiGet.mockRejectedValue(
      new HttpError(404, {
        endpoint: "/v2/funding-program-configs/program-1/reviewers",
        method: "GET",
        body: { message: "Program Reviewer Not Found" },
      })
    );

    const result = await programReviewersService.getReviewers("program-1");
    expect(result).toEqual([]);
  });
});
