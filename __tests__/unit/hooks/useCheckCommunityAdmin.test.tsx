/**
 * @file Tests for useCheckCommunityAdmin hook
 * @description Tests admin status verification with proper error handling
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { useCheckCommunityAdmin } from "@/hooks/communities/useCheckCommunityAdmin";
import type { CommunityDetails } from "@/types/community";

// Mock wagmi useAccount
jest.mock("wagmi", () => ({
  useAccount: jest.fn(() => ({
    address: "0xMockWalletAddress",
  })),
}));

// Mock useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(() => ({
    authenticated: true,
  })),
}));

// Mock useSigner
jest.mock("@/utilities/eas-wagmi-utils", () => ({
  useSigner: jest.fn(() => "mockSigner"),
}));

// Mock isCommunityAdminOf
jest.mock("@/utilities/sdk/communities/isCommunityAdmin", () => ({
  isCommunityAdminOf: jest.fn(),
}));

import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSigner = useSigner as jest.MockedFunction<typeof useSigner>;
const mockIsCommunityAdminOf = isCommunityAdminOf as jest.MockedFunction<typeof isCommunityAdminOf>;

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

describe("useCheckCommunityAdmin", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

    // Reset default mock implementations
    mockUseAccount.mockReturnValue({
      address: mockAddress,
    } as ReturnType<typeof useAccount>);
    mockUseAuth.mockReturnValue({
      authenticated: true,
    } as ReturnType<typeof useAuth>);
    mockUseSigner.mockReturnValue("mockSigner" as ReturnType<typeof useSigner>);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("Admin Status Verification (Security-Critical)", () => {
    it("should return isAdmin: true when user is admin", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isError).toBe(false);
    });

    it("should return isAdmin: false when user is not admin", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it("should return isAdmin: false when isCommunityAdminOf returns undefined", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(undefined as unknown as boolean);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should normalize undefined to false
      expect(result.current.isAdmin).toBe(false);
    });

    it("should call isCommunityAdminOf with correct parameters", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(true);

      renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockIsCommunityAdminOf).toHaveBeenCalled();
      });

      expect(mockIsCommunityAdminOf).toHaveBeenCalledWith(mockCommunity, mockAddress, "mockSigner");
    });

    it("should use provided address over connected account address", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(true);
      const customAddress = "0xCustomAddress";

      renderHook(() => useCheckCommunityAdmin(mockCommunity, customAddress), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockIsCommunityAdminOf).toHaveBeenCalled();
      });

      expect(mockIsCommunityAdminOf).toHaveBeenCalledWith(
        mockCommunity,
        customAddress,
        "mockSigner"
      );
    });
  });

  describe("Loading States", () => {
    it("should show loading state while checking admin status", async () => {
      let resolvePromise: (value: boolean) => void;
      const pendingPromise = new Promise<boolean>((resolve) => {
        resolvePromise = resolve;
      });
      mockIsCommunityAdminOf.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      resolvePromise!(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
    });

    it("should not be loading when query is disabled", () => {
      const { result } = renderHook(
        () => useCheckCommunityAdmin(mockCommunity, undefined, { enabled: false }),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockIsCommunityAdminOf).not.toHaveBeenCalled();
    });
  });

  describe("Query Enablement Conditions", () => {
    it("should not fetch when community is undefined", () => {
      const { result } = renderHook(() => useCheckCommunityAdmin(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockIsCommunityAdminOf).not.toHaveBeenCalled();
    });

    it("should not fetch when community is null", () => {
      const { result } = renderHook(() => useCheckCommunityAdmin(null), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockIsCommunityAdminOf).not.toHaveBeenCalled();
    });

    it("should not fetch when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
      } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockIsCommunityAdminOf).not.toHaveBeenCalled();
    });

    it("should not fetch when no address is available", () => {
      mockUseAccount.mockReturnValue({
        address: undefined,
      } as ReturnType<typeof useAccount>);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockIsCommunityAdminOf).not.toHaveBeenCalled();
    });

    it("should not fetch when enabled option is false", () => {
      const { result } = renderHook(
        () => useCheckCommunityAdmin(mockCommunity, undefined, { enabled: false }),
        {
          wrapper: createWrapper(queryClient),
        }
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockIsCommunityAdminOf).not.toHaveBeenCalled();
    });

    it("should fetch when all conditions are met", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(true);

      renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockIsCommunityAdminOf).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should return isAdmin: false when isCommunityAdminOf returns false (internal error handling)", async () => {
      // isCommunityAdminOf catches errors internally and returns false
      // So we test that the hook properly handles this case
      mockIsCommunityAdminOf.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // isCommunityAdminOf returns false on error, not throws
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it("should gracefully handle network or RPC failures by returning false", async () => {
      // When isCommunityAdminOf encounters an error, it catches it internally
      // and returns false (with error logged via errorManager)
      // This test verifies the hook handles this gracefully
      mockIsCommunityAdminOf.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The function returns false on errors, not throws
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  describe("Refetch Functionality", () => {
    it("should provide a refetch function", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");
    });

    it("should re-fetch admin status when refetch is called", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(false);
      });

      // Change the mock to return true
      mockIsCommunityAdminOf.mockResolvedValueOnce(true);

      // Call refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true);
      });
    });
  });

  describe("Query Key Structure", () => {
    it("should use correct query key for caching", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(true);

      renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockIsCommunityAdminOf).toHaveBeenCalled();
      });

      // Verify the query is cached with the correct key components (using centralized QUERY_KEYS)
      // Note: isAuth was removed from query key to prevent refetch on auth state transitions
      const cachedData = queryClient.getQueryData([
        "isCommunityAdmin",
        mockCommunity.uid,
        mockCommunity.chainID,
        mockAddress,
        "mockSigner",
      ]);
      expect(cachedData).toBe(true);
    });
  });

  describe("Return Value Structure", () => {
    it("should return all expected properties", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty("isAdmin");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("isError");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refetch");
    });

    it("should default isAdmin to false when data is falsy", async () => {
      mockIsCommunityAdminOf.mockResolvedValueOnce(null as unknown as boolean);

      const { result } = renderHook(() => useCheckCommunityAdmin(mockCommunity), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
    });
  });
});
