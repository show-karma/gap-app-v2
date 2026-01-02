/**
 * @file Tests for useCommunityDetails hook
 * @description Tests community data fetching with proper error handling and Sentry reporting
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import type { CommunityDetails } from "@/types/community";

// Mock getCommunityDetails utility
jest.mock("@/utilities/queries/v2/community", () => ({
  getCommunityDetails: jest.fn(),
}));

import { getCommunityDetails } from "@/utilities/queries/v2/community";

const mockGetCommunityDetails = getCommunityDetails as jest.MockedFunction<
  typeof getCommunityDetails
>;

// Test data
const mockCommunity: CommunityDetails = {
  uid: "0x1234567890123456789012345678901234567890",
  chainID: 10,
  details: {
    name: "Test Community",
    description: "A test community",
    slug: "test-community",
    logoUrl: "https://example.com/logo.png",
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

// Helper to create test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

// Helper to render with providers
const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe("useCommunityDetails", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("getCommunityDetails integration", () => {
    it("should fetch community details successfully", async () => {
      mockGetCommunityDetails.mockResolvedValueOnce(mockCommunity);

      const { result } = renderHook(() => useCommunityDetails("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCommunity);
      expect(mockGetCommunityDetails).toHaveBeenCalledWith("test-community");
    });

    it("should return null when fetch fails", async () => {
      mockGetCommunityDetails.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useCommunityDetails("failing-community"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
      expect(mockGetCommunityDetails).toHaveBeenCalledWith("failing-community");
    });

    it("should return null when community not found", async () => {
      mockGetCommunityDetails.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useCommunityDetails("not-found-community"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("useCommunityDetails hook behavior", () => {
    it("should not fetch when communityUIDorSlug is undefined", async () => {
      const { result } = renderHook(() => useCommunityDetails(undefined), {
        wrapper: createWrapper(queryClient),
      });

      // Query should not be enabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockGetCommunityDetails).not.toHaveBeenCalled();
    });

    it("should not fetch when communityUIDorSlug is empty string", async () => {
      const { result } = renderHook(() => useCommunityDetails(""), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockGetCommunityDetails).not.toHaveBeenCalled();
    });

    it("should not fetch when enabled option is false", async () => {
      const { result } = renderHook(
        () => useCommunityDetails("test-community", { enabled: false }),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockGetCommunityDetails).not.toHaveBeenCalled();
    });

    it("should fetch when enabled option is true", async () => {
      mockGetCommunityDetails.mockResolvedValueOnce(mockCommunity);

      const { result } = renderHook(
        () => useCommunityDetails("test-community", { enabled: true }),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetCommunityDetails).toHaveBeenCalled();
    });

    it("should return correct loading state while fetching", async () => {
      // Create a promise that we can resolve manually
      let resolvePromise: (value: CommunityDetails) => void;
      const pendingPromise = new Promise<CommunityDetails>((resolve) => {
        resolvePromise = resolve;
      });

      mockGetCommunityDetails.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => useCommunityDetails("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!(mockCommunity);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCommunity);
    });

    it("should use correct query key", async () => {
      mockGetCommunityDetails.mockResolvedValueOnce(mockCommunity);

      renderHook(() => useCommunityDetails("unique-slug"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockGetCommunityDetails).toHaveBeenCalled();
      });

      // Verify the query is cached with the correct key (using centralized QUERY_KEYS)
      const cachedData = queryClient.getQueryData(["communityDetails", "unique-slug"]);
      expect(cachedData).toEqual(mockCommunity);
    });

    it("should fetch by UID as well as slug", async () => {
      const communityUID = "0xabcdef1234567890abcdef1234567890abcdef12";
      mockGetCommunityDetails.mockResolvedValueOnce({ ...mockCommunity, uid: communityUID });

      const { result } = renderHook(() => useCommunityDetails(communityUID), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetCommunityDetails).toHaveBeenCalledWith(communityUID);
    });
  });

  describe("error scenarios coverage", () => {
    it("should handle null response gracefully", async () => {
      mockGetCommunityDetails.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useCommunityDetails("malformed-response"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it("should handle errors from getCommunityDetails", async () => {
      mockGetCommunityDetails.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useCommunityDetails("error-community"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });
  });
});
