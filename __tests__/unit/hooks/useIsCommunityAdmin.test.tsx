/**
 * @file Tests for useIsCommunityAdmin hook
 * @description Tests composed admin status hook with loading state composition and Zustand sync
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import * as useCheckCommunityAdminModule from "@/hooks/communities/useCheckCommunityAdmin";
// Import modules for spyOn
// NOTE: Do NOT use jest.mock() as it pollutes global mock state
import * as useCommunityDetailsModule from "@/hooks/communities/useCommunityDetails";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import type { CommunityDetails } from "@/types/community";

// Use spyOn instead of jest.mock to avoid polluting global mock state
let mockUseCommunityDetails: ReturnType<typeof spyOn>;
let mockUseCheckCommunityAdmin: ReturnType<typeof spyOn>;

// Store original functions for restoration after all tests
let originalUseCommunityDetails: typeof useCommunityDetailsModule.useCommunityDetails;
let originalUseCheckCommunityAdmin: typeof useCheckCommunityAdminModule.useCheckCommunityAdmin;

// Access wagmi mock state via globalThis.__wagmiMockState__
// NOTE: Do NOT use jest.mock("wagmi", ...) as it pollutes global mock state
const getWagmiState = () => (globalThis as any).__wagmiMockState__;

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

const mockAddress = "0xMockWalletAddress";

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

// Default mock return values
const defaultCommunityQueryResult = {
  data: mockCommunity,
  isLoading: false,
  isError: false,
  error: null,
};

const mockRefetch = jest.fn();
const defaultAdminQueryResult = {
  isAdmin: true,
  isLoading: false,
  isError: false,
  error: null,
  refetch: mockRefetch,
};

describe("useIsCommunityAdmin", () => {
  let queryClient: QueryClient;
  let wagmiState: any;

  // Save original functions before any tests run
  beforeAll(() => {
    originalUseCommunityDetails = useCommunityDetailsModule.useCommunityDetails;
    originalUseCheckCommunityAdmin = useCheckCommunityAdminModule.useCheckCommunityAdmin;
  });

  // Restore original functions after all tests complete to prevent pollution
  afterAll(() => {
    // Restore the original functions by reassigning them to the module exports
    // This prevents the spies from persisting and affecting other test files
    if (mockUseCommunityDetails) {
      mockUseCommunityDetails.mockRestore();
    }
    if (mockUseCheckCommunityAdmin) {
      mockUseCheckCommunityAdmin.mockRestore();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

    // Get wagmi state from global mock
    wagmiState = getWagmiState();

    // Configure wagmi mock state
    wagmiState.account = {
      address: mockAddress,
      isConnected: true,
      connector: null,
    };

    // Set up spies for hooks
    mockUseCommunityDetails = spyOn(
      useCommunityDetailsModule,
      "useCommunityDetails"
    ).mockReturnValue(defaultCommunityQueryResult as any);

    mockUseCheckCommunityAdmin = spyOn(
      useCheckCommunityAdminModule,
      "useCheckCommunityAdmin"
    ).mockReturnValue(defaultAdminQueryResult as any);

    // Clear mock call history
    mockUseCommunityDetails.mockClear();
    mockUseCheckCommunityAdmin.mockClear();
    mockRefetch.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("Admin Status Verification", () => {
    it("should return isCommunityAdmin: true when user is admin", () => {
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isAdmin: true,
      });

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isCommunityAdmin).toBe(true);
    });

    it("should return isCommunityAdmin: false when user is not admin", () => {
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isAdmin: false,
      });

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isCommunityAdmin).toBe(false);
    });

    it("should pass correct parameters to useCommunityDetails", () => {
      renderHook(() => useIsCommunityAdmin("test-community-slug"), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockUseCommunityDetails).toHaveBeenCalledWith("test-community-slug");
    });

    it("should pass community data to useCheckCommunityAdmin", () => {
      renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockUseCheckCommunityAdmin).toHaveBeenCalledWith(mockCommunity, mockAddress, {
        enabled: undefined,
      });
    });

    it("should use provided address over connected account", () => {
      const customAddress = "0xCustomAddress";

      renderHook(() => useIsCommunityAdmin("test-community", customAddress), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockUseCheckCommunityAdmin).toHaveBeenCalledWith(mockCommunity, customAddress, {
        enabled: undefined,
      });
    });
  });

  describe("Loading State Composition", () => {
    it("should be loading when community query is loading", () => {
      mockUseCommunityDetails.mockReturnValue({
        ...defaultCommunityQueryResult,
        isLoading: true,
      } as ReturnType<typeof useCommunityDetails>);

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should be loading when admin query is loading and community data exists", () => {
      mockUseCommunityDetails.mockReturnValue({
        ...defaultCommunityQueryResult,
        isLoading: false,
        data: mockCommunity,
      } as ReturnType<typeof useCommunityDetails>);
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isLoading: true,
      });

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should not be loading when community fetch fails (no data)", () => {
      mockUseCommunityDetails.mockReturnValue({
        ...defaultCommunityQueryResult,
        isLoading: false,
        data: null,
      } as unknown as ReturnType<typeof useCommunityDetails>);
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isLoading: true,
      });

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      // Should NOT be loading because community data is null
      expect(result.current.isLoading).toBe(false);
    });

    it("should not be loading when both queries are complete", () => {
      mockUseCommunityDetails.mockReturnValue({
        ...defaultCommunityQueryResult,
        isLoading: false,
      } as ReturnType<typeof useCommunityDetails>);
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isLoading: false,
      });

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Zustand Sync Behavior", () => {
    it("should call setIsCommunityAdmin when admin query completes", async () => {
      const setIsCommunityAdmin = jest.fn();
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isAdmin: true,
        isLoading: false,
      });

      renderHook(
        () =>
          useIsCommunityAdmin("test-community", undefined, {
            zustandSync: { setIsCommunityAdmin },
          }),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      await waitFor(() => {
        expect(setIsCommunityAdmin).toHaveBeenCalledWith(true);
      });
    });

    it("should not call setIsCommunityAdmin while loading", () => {
      const setIsCommunityAdmin = jest.fn();
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isLoading: true,
      });

      renderHook(
        () =>
          useIsCommunityAdmin("test-community", undefined, {
            zustandSync: { setIsCommunityAdmin },
          }),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      expect(setIsCommunityAdmin).not.toHaveBeenCalled();
    });

    it("should update Zustand with false when user is not admin", async () => {
      const setIsCommunityAdmin = jest.fn();
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isAdmin: false,
        isLoading: false,
      });

      renderHook(
        () =>
          useIsCommunityAdmin("test-community", undefined, {
            zustandSync: { setIsCommunityAdmin },
          }),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      await waitFor(() => {
        expect(setIsCommunityAdmin).toHaveBeenCalledWith(false);
      });
    });

    it("should not throw when zustandSync is not provided", () => {
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isLoading: false,
      });

      expect(() => {
        renderHook(() => useIsCommunityAdmin("test-community"), {
          wrapper: createWrapper(queryClient),
        });
      }).not.toThrow();
    });

    it("should not throw when setIsCommunityAdmin is undefined", () => {
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isLoading: false,
      });

      expect(() => {
        renderHook(
          () =>
            useIsCommunityAdmin("test-community", undefined, {
              zustandSync: {},
            }),
          {
            wrapper: createWrapper(queryClient),
          }
        );
      }).not.toThrow();
    });
  });

  describe("Error Propagation", () => {
    it("should propagate community query errors", () => {
      const communityError = new Error("Community not found");
      mockUseCommunityDetails.mockReturnValue({
        ...defaultCommunityQueryResult,
        isError: true,
        error: communityError,
      } as ReturnType<typeof useCommunityDetails>);

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(communityError);
    });

    it("should propagate admin query errors", () => {
      const adminError = new Error("RPC error");
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isError: true,
        error: adminError,
      });

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(adminError);
    });

    it("should prioritize community error over admin error", () => {
      const communityError = new Error("Community error");
      const adminError = new Error("Admin error");
      mockUseCommunityDetails.mockReturnValue({
        ...defaultCommunityQueryResult,
        isError: true,
        error: communityError,
      } as ReturnType<typeof useCommunityDetails>);
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isError: true,
        error: adminError,
      });

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(communityError);
    });

    it("should not be in error state when neither query has errors", () => {
      mockUseCommunityDetails.mockReturnValue({
        ...defaultCommunityQueryResult,
        isError: false,
        error: null,
      } as ReturnType<typeof useCommunityDetails>);
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Refetch Functionality", () => {
    it("should expose refetch from admin query", () => {
      const mockRefetch = jest.fn();
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.refetch).toBe(mockRefetch);
    });
  });

  describe("Hook Options", () => {
    it("should pass enabled option to useCheckCommunityAdmin", () => {
      renderHook(() => useIsCommunityAdmin("test-community", undefined, { enabled: false }), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockUseCheckCommunityAdmin).toHaveBeenCalledWith(mockCommunity, mockAddress, {
        enabled: false,
      });
    });

    it("should work without options parameter", () => {
      renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockUseCheckCommunityAdmin).toHaveBeenCalledWith(mockCommunity, mockAddress, {
        enabled: undefined,
      });
    });
  });

  describe("Return Value Structure", () => {
    it("should return all expected properties", () => {
      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current).toHaveProperty("isCommunityAdmin");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("isError");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refetch");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined communityUIDorSlug", () => {
      mockUseCommunityDetails.mockReturnValue({
        ...defaultCommunityQueryResult,
        data: undefined,
        isLoading: false,
      } as unknown as ReturnType<typeof useCommunityDetails>);
      // When community data is undefined, admin check should return false
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isAdmin: false,
      });

      const { result } = renderHook(() => useIsCommunityAdmin(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockUseCommunityDetails).toHaveBeenCalledWith(undefined);
      expect(result.current.isCommunityAdmin).toBe(false);
    });

    it("should handle no connected wallet", () => {
      // Configure wagmi state with no address
      wagmiState.account = {
        address: undefined,
        isConnected: false,
        connector: null,
      };
      // When no wallet is connected, admin check should return false
      mockUseCheckCommunityAdmin.mockReturnValue({
        ...defaultAdminQueryResult,
        isAdmin: false,
      });

      const { result } = renderHook(() => useIsCommunityAdmin("test-community"), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockUseCheckCommunityAdmin).toHaveBeenCalledWith(mockCommunity, undefined, {
        enabled: undefined,
      });
      expect(result.current.isCommunityAdmin).toBe(false);
    });
  });
});
