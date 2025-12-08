/**
 * @file Tests for useCommunityDetails hook
 * @description Tests community data fetching with proper error handling and Sentry reporting
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { useCommunityDetails } from "@/hooks/communities/useCommunityDetails";
import type { CommunityDetailsV2 } from "@/types/community";

// Mock fetchData utility
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock errorManager to verify Sentry reporting
jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

import { errorManager } from "@/components/Utilities/errorManager";
// Import mocked modules
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;
const mockErrorManager = errorManager as jest.MockedFunction<typeof errorManager>;

// Test data
const mockCommunity: CommunityDetailsV2 = {
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

  describe("fetchCommunityDetails function", () => {
    it("should fetch community details successfully", async () => {
      mockFetchData.mockResolvedValueOnce([mockCommunity, null, null]);

      const { result } = renderHook(() => useCommunityDetails("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCommunity);
      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/communities/test-community",
        "GET",
        {},
        {},
        {},
        false
      );
      expect(mockErrorManager).not.toHaveBeenCalled();
    });

    it("should send error to Sentry when fetch fails with error", async () => {
      const networkError = "Network error";
      mockFetchData.mockResolvedValueOnce([null, networkError, null]);

      const { result } = renderHook(() => useCommunityDetails("failing-community"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The hook returns null on error, and errorManager should be called
      expect(result.current.data).toBeNull();
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Error fetching community failing-community",
        networkError,
        { communityUIDorSlug: "failing-community" }
      );
    });

    it("should send error to Sentry when data is null without error", async () => {
      // This simulates a case where fetchData returns no error but also no data
      mockFetchData.mockResolvedValueOnce([null, null, null]);

      const { result } = renderHook(() => useCommunityDetails("empty-response"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The hook returns null and calls errorManager
      expect(result.current.data).toBeNull();
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Error fetching community empty-response",
        null,
        { communityUIDorSlug: "empty-response" }
      );
    });

    it("should handle API error responses and report to Sentry", async () => {
      const apiError = { message: "Community not found", status: 404 };
      mockFetchData.mockResolvedValueOnce([null, apiError, null]);

      const { result } = renderHook(() => useCommunityDetails("not-found-community"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Error fetching community not-found-community",
        apiError,
        { communityUIDorSlug: "not-found-community" }
      );
    });

    it("should handle server error (500) and report to Sentry", async () => {
      const serverError = { message: "Internal server error", status: 500 };
      mockFetchData.mockResolvedValueOnce([null, serverError, null]);

      const { result } = renderHook(() => useCommunityDetails("server-error-community"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Error fetching community server-error-community",
        serverError,
        { communityUIDorSlug: "server-error-community" }
      );
    });

    it("should handle timeout error and report to Sentry", async () => {
      const timeoutError = { message: "Request timeout", code: "ECONNABORTED" };
      mockFetchData.mockResolvedValueOnce([null, timeoutError, null]);

      const { result } = renderHook(() => useCommunityDetails("timeout-community"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Error fetching community timeout-community",
        timeoutError,
        { communityUIDorSlug: "timeout-community" }
      );
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
      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it("should not fetch when communityUIDorSlug is empty string", async () => {
      const { result } = renderHook(() => useCommunityDetails(""), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockFetchData).not.toHaveBeenCalled();
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
      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it("should fetch when enabled option is true", async () => {
      mockFetchData.mockResolvedValueOnce([mockCommunity, null, null]);

      const { result } = renderHook(
        () => useCommunityDetails("test-community", { enabled: true }),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetchData).toHaveBeenCalled();
    });

    it("should return correct loading state while fetching", async () => {
      // Create a promise that we can resolve manually
      let resolvePromise: (value: [CommunityDetailsV2, null, null]) => void;
      const pendingPromise = new Promise<[CommunityDetailsV2, null, null]>((resolve) => {
        resolvePromise = resolve;
      });

      mockFetchData.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => useCommunityDetails("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!([mockCommunity, null, null]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCommunity);
    });

    it("should use correct query key", async () => {
      mockFetchData.mockResolvedValueOnce([mockCommunity, null, null]);

      renderHook(() => useCommunityDetails("unique-slug"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalled();
      });

      // Verify the query is cached with the correct key
      const cachedData = queryClient.getQueryData(["communityDetails", "unique-slug"]);
      expect(cachedData).toEqual(mockCommunity);
    });

    it("should fetch by UID as well as slug", async () => {
      const communityUID = "0xabcdef1234567890abcdef1234567890abcdef12";
      mockFetchData.mockResolvedValueOnce([{ ...mockCommunity, uid: communityUID }, null, null]);

      const { result } = renderHook(() => useCommunityDetails(communityUID), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetchData).toHaveBeenCalledWith(
        `/v2/communities/${communityUID}`,
        "GET",
        {},
        {},
        {},
        false
      );
    });
  });

  describe("error scenarios coverage", () => {
    it("should report malformed response to Sentry", async () => {
      // Simulate a malformed response (not a valid CommunityDetailsV2)
      mockFetchData.mockResolvedValueOnce([undefined, null, null]);

      const { result } = renderHook(() => useCommunityDetails("malformed-response"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // undefined is falsy, so it should trigger error handling
      expect(result.current.data).toBeNull();
      expect(mockErrorManager).toHaveBeenCalledWith(
        "Error fetching community malformed-response",
        null,
        { communityUIDorSlug: "malformed-response" }
      );
    });

    it("should handle rate limiting error and report to Sentry", async () => {
      const rateLimitError = { message: "Too many requests", status: 429 };
      mockFetchData.mockResolvedValueOnce([null, rateLimitError, null]);

      const { result } = renderHook(() => useCommunityDetails("rate-limited"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockErrorManager).toHaveBeenCalledWith(
        "Error fetching community rate-limited",
        rateLimitError,
        { communityUIDorSlug: "rate-limited" }
      );
    });

    it("should handle unauthorized error and report to Sentry", async () => {
      const unauthorizedError = { message: "Unauthorized", status: 401 };
      mockFetchData.mockResolvedValueOnce([null, unauthorizedError, null]);

      const { result } = renderHook(() => useCommunityDetails("unauthorized"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockErrorManager).toHaveBeenCalledWith(
        "Error fetching community unauthorized",
        unauthorizedError,
        { communityUIDorSlug: "unauthorized" }
      );
    });
  });
});
