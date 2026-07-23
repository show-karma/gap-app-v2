import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/__tests__/utils/render";
import { HttpError } from "@/utilities/api/errors";

// reviewerInboxService.getReviewerInbox (#1775 Phase 3) now calls api.get
// instead of the legacy fetchData tuple adapter.
const mockApiGet = vi.fn();
vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

import { useReviewerInbox } from "@/hooks/useReviewerInbox";

const PAGINATION = { page: 1, limit: 25, total: 2, totalPages: 1 };
const STATS = {
  action: 1,
  waiting: 0,
  done: 0,
  overdue: 0,
  applications: 1,
  milestones: 0,
};
const EMPTY_STATS = {
  action: 0,
  waiting: 0,
  done: 0,
  overdue: 0,
  applications: 0,
  milestones: 0,
};

describe("useReviewerInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the community reviewer-inbox endpoint with the encoded filters", async () => {
    const items = [{ id: "APP-1", kind: "application", bucket: "action" }];
    mockApiGet.mockResolvedValue({ items, pagination: PAGINATION, stats: STATS });

    const { result } = renderHookWithProviders(() =>
      useReviewerInbox("octant", {
        page: 2,
        limit: 10,
        status: "pending",
        search: "infra",
        sortBy: "updatedAt",
        sortOrder: "desc",
        reviewerAddress: "0xABC",
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApiGet).toHaveBeenCalledTimes(1);
    const url = mockApiGet.mock.calls[0][0] as string;
    expect(url).toContain("/v2/funding-applications/community/octant/reviewer-inbox?");
    expect(url).toContain("status=pending");
    expect(url).toContain("search=infra");
    expect(url).toContain("sortBy=updatedAt");
    expect(url).toContain("sortOrder=desc");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=10");
    expect(url).toContain("reviewerAddress=0xABC");

    expect(result.current.items).toEqual(items);
    expect(result.current.pagination).toEqual(PAGINATION);
    expect(result.current.stats).toEqual(STATS);
  });

  it("does not fetch when disabled", async () => {
    renderHookWithProviders(() => useReviewerInbox("octant", {}, { enabled: false }));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("does not fetch without a communityId", async () => {
    renderHookWithProviders(() => useReviewerInbox("", {}));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("surfaces a fetch error and yields empty items/stats", async () => {
    mockApiGet.mockRejectedValue(
      new HttpError(500, {
        endpoint: "/v2/funding-applications/community/octant/reviewer-inbox",
        method: "GET",
        body: { message: "500 Server Error" },
      })
    );

    const { result } = renderHookWithProviders(() => useReviewerInbox("octant", {}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.items).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.stats).toEqual(EMPTY_STATS);
  });

  it("normalizes a missing items array to an empty list with default stats", async () => {
    mockApiGet.mockResolvedValue({ pagination: undefined, stats: undefined });

    const { result } = renderHookWithProviders(() => useReviewerInbox("octant", { page: 3 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.pagination).toEqual({
      page: 3,
      limit: 25,
      total: 0,
      totalPages: 0,
    });
    expect(result.current.stats).toEqual(EMPTY_STATS);
  });
});
