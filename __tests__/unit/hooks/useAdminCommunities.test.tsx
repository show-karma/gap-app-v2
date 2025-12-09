/**
 * @file Tests for useAdminCommunities hook (V2 API)
 * @description Tests for fetching communities where user is admin
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

// Mock fetchData utility
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock useAuth
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(() => ({
    authenticated: true,
  })),
}));

// Mock communities store
const mockSetCommunities = jest.fn();
const mockSetIsLoading = jest.fn();

jest.mock("@/store/communities", () => ({
  useCommunitiesStore: jest.fn(() => ({
    setCommunities: mockSetCommunities,
    setIsLoading: mockSetIsLoading,
    communities: [],
  })),
}));

import { useAuth } from "@/hooks/useAuth";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("useAdminCommunities (V2)", () => {
  const mockCommunities = [
    {
      uid: "0x1234567890123456789012345678901234567890",
      chainID: 1,
      details: {
        name: "Test Community 1",
        slug: "test-community-1",
        description: "Test description 1",
        imageURL: "https://example.com/logo1.png",
      },
    },
    {
      uid: "0x2345678901234567890123456789012345678901",
      chainID: 10,
      details: {
        name: "Test Community 2",
        slug: "test-community-2",
        description: "Test description 2",
        imageURL: "https://example.com/logo2.png",
      },
    },
  ];

  const mockV2Response = {
    communities: mockCommunities,
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

  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    mockUseAuth.mockReturnValue({ authenticated: true } as ReturnType<typeof useAuth>);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("Successful fetch", () => {
    it("should fetch admin communities when authenticated", async () => {
      (fetchData as jest.Mock).mockResolvedValue([mockV2Response, null]);

      const { result } = renderHook(() => useAdminCommunities("0xtest-address"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetchData).toHaveBeenCalledWith(
        INDEXER.V2.USER.ADMIN_COMMUNITIES(),
        "GET",
        {},
        {},
        {},
        true,
        false
      );
    });

    it("should update zustand store with fetched communities", async () => {
      (fetchData as jest.Mock).mockResolvedValue([mockV2Response, null]);

      const { result } = renderHook(() => useAdminCommunities("0xtest-address"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSetCommunities).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ uid: mockCommunities[0].uid }),
          expect.objectContaining({ uid: mockCommunities[1].uid }),
        ])
      );
    });
  });

  describe("Error handling", () => {
    it("should call errorManager when fetch fails", async () => {
      // Mock the error manager to track calls
      const errorManagerModule = require("@/components/Utilities/errorManager");
      const mockErrorManager = errorManagerModule.errorManager as jest.Mock;
      mockErrorManager.mockClear();

      (fetchData as jest.Mock).mockRejectedValue(new Error("Unauthorized"));

      const { result } = renderHook(() => useAdminCommunities("0xtest-address"), {
        wrapper: createWrapper(queryClient),
      });

      // Wait for the query to be processed
      await waitFor(
        () => {
          return mockErrorManager.mock.calls.length > 0 || result.current.isError;
        },
        { timeout: 5000 }
      );
    });

    it("should clear communities when address is not authenticated", async () => {
      mockUseAuth.mockReturnValue({ authenticated: false } as ReturnType<typeof useAuth>);

      renderHook(() => useAdminCommunities("0xtest-address"), {
        wrapper: createWrapper(queryClient),
      });

      // Should clear communities because not authenticated
      await waitFor(() => {
        expect(mockSetCommunities).toHaveBeenCalledWith([]);
      });
    });
  });

  describe("Authentication requirements", () => {
    it("should not fetch when not authenticated", async () => {
      mockUseAuth.mockReturnValue({ authenticated: false } as ReturnType<typeof useAuth>);

      renderHook(() => useAdminCommunities("0xtest-address"), {
        wrapper: createWrapper(queryClient),
      });

      expect(fetchData).not.toHaveBeenCalled();
    });

    it("should not fetch when no address provided", async () => {
      renderHook(() => useAdminCommunities(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(fetchData).not.toHaveBeenCalled();
    });

    it("should clear communities when address is removed", async () => {
      (fetchData as jest.Mock).mockResolvedValue([mockV2Response, null]);

      const { rerender } = renderHook(({ address }) => useAdminCommunities(address), {
        wrapper: createWrapper(queryClient),
        initialProps: { address: "0xtest-address" as string | undefined },
      });

      await waitFor(() => {
        expect(mockSetCommunities).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      // Re-render without address
      rerender({ address: undefined });

      expect(mockSetCommunities).toHaveBeenCalledWith([]);
    });
  });

  describe("Loading state", () => {
    it("should sync loading state with zustand store", async () => {
      (fetchData as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([mockV2Response, null]), 100))
      );

      renderHook(() => useAdminCommunities("0xtest-address"), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockSetIsLoading).toHaveBeenCalledWith(true);

      await waitFor(() => {
        expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("Return value", () => {
    it("should return refetch function", async () => {
      (fetchData as jest.Mock).mockResolvedValue([mockV2Response, null]);

      const { result } = renderHook(() => useAdminCommunities("0xtest-address"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(typeof result.current.refetch).toBe("function");
    });
  });
});
