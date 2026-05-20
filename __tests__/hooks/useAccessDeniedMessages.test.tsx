import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@/__tests__/utils/render";

const mockFetchData = vi.fn();
vi.mock("@/utilities/fetchData", () => ({
  default: (...args: unknown[]) => mockFetchData(...args),
}));

import { useAccessDeniedMessages } from "@/hooks/useAccessDeniedMessages";
import { INDEXER } from "@/utilities/indexer";

describe("useAccessDeniedMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hits the public endpoint without auth", async () => {
    mockFetchData.mockResolvedValue([
      { unauthenticatedMessage: "hi", forbiddenMessage: "bye" },
      null,
    ]);

    const { result } = renderHookWithProviders(() => useAccessDeniedMessages("octant"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchData).toHaveBeenCalledWith(
      INDEXER.COMMUNITY.CONFIG.ACCESS_DENIED_MESSAGES("octant"),
      "GET",
      {},
      {},
      {},
      false // authenticated flag MUST be false — endpoint is public
    );
    expect(result.current.data).toEqual({
      unauthenticatedMessage: "hi",
      forbiddenMessage: "bye",
    });
  });

  it("returns nulls when fetch errors (caller falls back to default body)", async () => {
    mockFetchData.mockResolvedValue([null, "404"]);

    const { result } = renderHookWithProviders(() => useAccessDeniedMessages("nope"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual({
      unauthenticatedMessage: null,
      forbiddenMessage: null,
    });
  });

  it("returns nulls without fetching when slug is empty", async () => {
    const { result } = renderHookWithProviders(() => useAccessDeniedMessages(""));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchData).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({
      unauthenticatedMessage: null,
      forbiddenMessage: null,
    });
  });

  it("does not fetch when explicitly disabled", async () => {
    renderHookWithProviders(() => useAccessDeniedMessages("octant", false));
    // give React Query a tick — would have called fetchData by now if enabled
    await new Promise((r) => setTimeout(r, 0));
    expect(mockFetchData).not.toHaveBeenCalled();
  });
});
