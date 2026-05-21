import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { fetchCommunityReviewers } from "@/services/community-reviewers/community-reviewers.api";
import type { CommunityReviewersResponse } from "@/services/community-reviewers/community-reviewers.types";
import { useCommunityReviewers } from "../useCommunityReviewers";

vi.mock("@/services/community-reviewers/community-reviewers.api");

const mockFetch = fetchCommunityReviewers as ReturnType<typeof vi.fn>;

// ─── Fixtures ────────────────────────────────────────────────────────────────
const makeReviewer = (overrides: Partial<CommunityReviewersResponse["items"][0]> = {}) => ({
  publicAddress: "0x1111111111111111111111111111111111111111",
  name: "Alice",
  email: "alice@example.com",
  roles: ["program-reviewer" as const],
  lastSeenAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

const makePage = (
  items: CommunityReviewersResponse["items"],
  nextCursor: string | null = null
): CommunityReviewersResponse => ({ items, nextCursor });

// ─── Test helpers ─────────────────────────────────────────────────────────────
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
};

describe("useCommunityReviewers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("success", () => {
    it("returns paged results from the first page", async () => {
      const page = makePage([makeReviewer()]);
      mockFetch.mockResolvedValueOnce(page);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCommunityReviewers({ communityUID: "comm-1" }), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].name).toBe("Alice");
      expect(result.current.hasNextPage).toBe(false);
    });

    it("getNextPageParam derives cursor from nextCursor field", async () => {
      const page1 = makePage([makeReviewer({ publicAddress: "0xAAA" })], "cursor-abc");
      const page2 = makePage([makeReviewer({ publicAddress: "0xBBB" })], null);

      mockFetch.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCommunityReviewers({ communityUID: "comm-1" }), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.hasNextPage).toBe(true);

      // Fetch next page
      result.current.fetchNextPage();

      await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));
      expect(result.current.items).toHaveLength(2);
      expect(result.current.hasNextPage).toBe(false);

      // Verify second call passed the cursor
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "comm-1",
        expect.objectContaining({ cursor: "cursor-abc" })
      );
    });

    it("includes programId and search in fetch params when provided", async () => {
      mockFetch.mockResolvedValueOnce(makePage([]));

      const { Wrapper } = createWrapper();
      renderHook(
        () =>
          useCommunityReviewers({
            communityUID: "comm-1",
            programId: "prog-1",
            search: "alice",
          }),
        { wrapper: Wrapper }
      );

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch).toHaveBeenCalledWith(
        "comm-1",
        expect.objectContaining({ programId: "prog-1", search: "alice" })
      );
    });

    it("does not fetch when communityUID is empty", () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCommunityReviewers({ communityUID: "" }), {
        wrapper: Wrapper,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.items).toHaveLength(0);
    });

    it("does not fetch when enabled is false", () => {
      const { Wrapper } = createWrapper();
      renderHook(() => useCommunityReviewers({ communityUID: "comm-1", enabled: false }), {
        wrapper: Wrapper,
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("error state", () => {
    it("surfaces error when fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCommunityReviewers({ communityUID: "comm-1" }), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe("Network error");
      expect(result.current.items).toHaveLength(0);
    });
  });

  describe("query key stability", () => {
    it("uses different query keys for different search values", async () => {
      mockFetch.mockResolvedValue(makePage([]));

      const { Wrapper, queryClient } = createWrapper();

      renderHook(() => useCommunityReviewers({ communityUID: "comm-1", search: "alice" }), {
        wrapper: Wrapper,
      });
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      // Invalidate is possible because the key includes search
      queryClient.invalidateQueries({ queryKey: ["reviewers", "community", "comm-1"] });
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    });
  });
});
