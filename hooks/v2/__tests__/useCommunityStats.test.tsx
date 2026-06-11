import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";

vi.mock("@/utilities/queries/v2/getCommunityData", () => ({
  getCommunityStats: vi.fn(),
}));

import type { CommunityStats } from "@/types/v2/community";
import { getCommunityStats } from "@/utilities/queries/v2/getCommunityData";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { useCommunityStats } from "../useCommunityStats";

const mockGetCommunityStats = getCommunityStats as unknown as ReturnType<typeof vi.fn>;

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

const wrap = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

const makeStats = (overrides: Partial<CommunityStats> = {}): CommunityStats => ({
  totalProjects: 12,
  totalGrants: 5,
  totalMilestones: 30,
  projectUpdates: 8,
  projectUpdatesBreakdown: {
    projectMilestones: 10,
    projectCompletedMilestones: 6,
    projectUpdates: 4,
    grantMilestones: 20,
    grantCompletedMilestones: 12,
    grantUpdates: 4,
  },
  totalTransactions: 2,
  averageCompletion: 60,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCommunityStats", () => {
  it("uses the canonical COMMUNITY.STATS query key", () => {
    expect(QUERY_KEYS.COMMUNITY.STATS("optimism")).toEqual(["community-stats", "optimism"]);
  });

  describe("loading", () => {
    it("is loading while the fetch is in flight", () => {
      mockGetCommunityStats.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useCommunityStats("optimism"), {
        wrapper: wrap(createTestQueryClient()),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stats).toBeNull();
      expect(result.current.isError).toBe(false);
    });

    it("does not fetch when no community id is provided", () => {
      const { result } = renderHook(() => useCommunityStats(undefined), {
        wrapper: wrap(createTestQueryClient()),
      });

      expect(mockGetCommunityStats).not.toHaveBeenCalled();
      expect(result.current.stats).toBeNull();
    });
  });

  describe("success", () => {
    it("returns the fetched stats", async () => {
      const stats = makeStats();
      mockGetCommunityStats.mockResolvedValue(stats);

      const { result } = renderHook(() => useCommunityStats("optimism"), {
        wrapper: wrap(createTestQueryClient()),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.stats).toEqual(stats);
      expect(result.current.isError).toBe(false);
      expect(mockGetCommunityStats).toHaveBeenCalledWith("optimism");
    });
  });

  describe("empty (genuine zero)", () => {
    it("surfaces a real zero honestly without erroring", async () => {
      const zeroStats = makeStats({
        totalProjects: 0,
        totalGrants: 0,
        totalMilestones: 0,
        projectUpdates: 0,
      });
      mockGetCommunityStats.mockResolvedValue(zeroStats);

      const { result } = renderHook(() => useCommunityStats("optimism"), {
        wrapper: wrap(createTestQueryClient()),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isError).toBe(false);
      expect(result.current.stats?.totalProjects).toBe(0);
    });
  });

  describe("error", () => {
    it("propagates a rejection from getCommunityStats as isError", async () => {
      mockGetCommunityStats.mockRejectedValue(new Error("indexer down"));

      const { result } = renderHook(() => useCommunityStats("optimism"), {
        wrapper: wrap(createTestQueryClient()),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.stats).toBeNull();
      expect(result.current.error?.message).toBe("indexer down");
    });

    it("refetch retries the fetcher (the Retry UI path)", async () => {
      mockGetCommunityStats.mockRejectedValueOnce(new Error("indexer down"));
      mockGetCommunityStats.mockResolvedValueOnce(makeStats());

      const { result } = renderHook(() => useCommunityStats("optimism"), {
        wrapper: wrap(createTestQueryClient()),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      await result.current.refetch();

      await waitFor(() => expect(result.current.isError).toBe(false));
      expect(result.current.stats?.totalProjects).toBe(12);
      expect(mockGetCommunityStats).toHaveBeenCalledTimes(2);
    });
  });
});
