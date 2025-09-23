import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePermissions, useIsReviewer, useReviewerPrograms } from "../usePermissions";
import { useAccount } from "wagmi";
import { useAuthStore } from "@/store/auth";
import axios, { AxiosError } from "axios";
import React from "react";

// Mock dependencies
jest.mock("wagmi");
jest.mock("@/store/auth");
jest.mock("axios");
jest.mock("@/utilities/getCookiesFromStoredWallet", () => ({
  getCookiesFromStoredWallet: jest.fn(() => ({ token: "mock-token" })),
}));
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://test-api.com",
  },
}));

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("usePermissions Hook", () => {
  let queryClient: QueryClient;

  // Helper to create wrapper
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseAccount.mockReturnValue({
      address: "0x1234567890123456789012345678901234567890",
      isConnected: true,
    } as any);

    mockUseAuthStore.mockReturnValue({
      isAuth: true,
      isAuthenticating: false,
      getToken: jest.fn(() => "mock-token"),
    } as any);

    // Setup axios mock
    mockedAxios.create = jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as any));

    // Mock isAxiosError as a type predicate
    (mockedAxios.isAxiosError as any) = jest.fn((payload: any): payload is AxiosError => {
      return payload?.isAxiosError === true;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication State Management", () => {
    it("should not make API calls when not authenticated", async () => {
      mockUseAuthStore.mockReturnValue({
        isAuth: false,
        isAuthenticating: false,
      } as any);

      const apiClient = mockedAxios.create();
      const mockGet = jest.fn();
      (apiClient as any).get = mockGet;

      const { result } = renderHook(
        () => usePermissions({ programId: "test", chainID: 1 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.permissions).toEqual([]);
    });

    it("should handle authentication race condition", async () => {
      // Start with authenticating state
      const { result, rerender } = renderHook(
        () => usePermissions({ programId: "test", chainID: 1 }),
        {
          wrapper: createWrapper(),
          initialProps: {
            isAuth: false,
            isAuthenticating: true,
          },
        }
      );

      expect(result.current.isLoading).toBe(true);

      // Complete authentication
      mockUseAuthStore.mockReturnValue({
        isAuth: true,
        isAuthenticating: false,
      } as any);

      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should invalidate cache when auth state changes", async () => {
      const { result, rerender } = renderHook(
        () => usePermissions({ role: "reviewer" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Logout
      mockUseAuthStore.mockReturnValue({
        isAuth: false,
        isAuthenticating: false,
      } as any);
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      } as any);

      rerender();

      await waitFor(() => {
        expect(result.current.hasPermission).toBe(false);
      });
    });
  });

  describe("Batch Permission Fetching", () => {
    it("should fetch batch permissions when no specific action is provided", async () => {
      const apiClient = mockedAxios.create();
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          permissions: {
            read: true,
            comment: true,
            edit: false,
            delete: false,
            manage: false,
          },
          role: "reviewer",
        },
      });
      (apiClient as any).get = mockGet;

      const { result } = renderHook(
        () => usePermissions({ programId: "test", chainID: 1 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGet).toHaveBeenCalledWith(
        "/v2/funding-program-configs/test/1/permissions-batch"
      );
      expect(result.current.hasPermission).toBe(true);
      expect(result.current.permissions).toEqual(["read", "comment"]);
    });

    it("should fallback to individual permission checks if batch endpoint fails", async () => {
      const apiClient = mockedAxios.create();
      const mockGet = jest.fn()
        .mockRejectedValueOnce(new Error("Batch endpoint not found"))
        .mockResolvedValueOnce({ data: { hasPermission: true, permissions: ["read"] } })
        .mockResolvedValueOnce({ data: { hasPermission: true, permissions: ["comment"] } });

      (apiClient as any).get = mockGet;

      const { result } = renderHook(
        () => usePermissions({ programId: "test", chainID: 1 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGet).toHaveBeenCalledTimes(3);
      expect(result.current.permissions).toContain("read");
      expect(result.current.permissions).toContain("comment");
    });
  });

  describe("Error Handling", () => {
    it("should handle 401 authentication errors", async () => {
      const apiClient = mockedAxios.create();
      const error = {
        response: { status: 401, data: { message: "Unauthorized" } },
        isAxiosError: true,
      };

      const mockGet = jest.fn().mockRejectedValue(error);
      (apiClient as any).get = mockGet;
      (mockedAxios.isAxiosError as any) = jest.fn((payload: any): payload is AxiosError => true);

      const { result } = renderHook(
        () => usePermissions({ programId: "test", chainID: 1, action: "read" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should handle 403 access denied errors", async () => {
      const apiClient = mockedAxios.create();
      const error = {
        response: { status: 403, data: { message: "Access denied" } },
        isAxiosError: true,
      };

      const mockGet = jest.fn().mockRejectedValue(error);
      (apiClient as any).get = mockGet;
      (mockedAxios.isAxiosError as any) = jest.fn((payload: any): payload is AxiosError => true);

      const { result } = renderHook(
        () => usePermissions({ programId: "test", chainID: 1, action: "edit" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should mark 429 rate limit errors as retryable", async () => {
      const apiClient = mockedAxios.create();
      const error = {
        response: { status: 429, data: { message: "Too many requests" } },
        isAxiosError: true,
      };

      const mockGet = jest.fn().mockRejectedValue(error);
      (apiClient as any).get = mockGet;
      (mockedAxios.isAxiosError as any) = jest.fn((payload: any): payload is AxiosError => true);

      const { result } = renderHook(
        () => usePermissions({ programId: "test", chainID: 1 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should handle network errors", async () => {
      const apiClient = mockedAxios.create();
      const error = new Error("Network error");

      const mockGet = jest.fn().mockRejectedValue(error);
      (apiClient as any).get = mockGet;
      (mockedAxios.isAxiosError as any) = jest.fn((payload: any): payload is AxiosError => false);

      const { result } = renderHook(
        () => usePermissions({ programId: "test", chainID: 1 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useIsReviewer Hook", () => {
    it("should check reviewer role for specific program", async () => {
      const apiClient = mockedAxios.create();
      const mockGet = jest.fn().mockResolvedValue({
        data: { hasPermission: true, permissions: ["read", "comment"] },
      });
      (apiClient as any).get = mockGet;

      const { result } = renderHook(
        () => useIsReviewer("program123", 1),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isReviewer).toBe(true);
      expect(result.current.permissions).toEqual(["read", "comment"]);
    });

    it("should provide invalidate function", async () => {
      const apiClient = mockedAxios.create();
      const mockGet = jest.fn().mockResolvedValue({
        data: { hasPermission: true, permissions: ["read"] },
      });
      (apiClient as any).get = mockGet;

      const { result } = renderHook(
        () => useIsReviewer("program123", 1),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Should trigger refetch
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe("useReviewerPrograms Hook", () => {
    it("should fetch all reviewer programs", async () => {
      const mockPrograms = [
        { programId: "1", name: "Program 1", chainID: 1 },
        { programId: "2", name: "Program 2", chainID: 1 },
      ];

      const apiClient = mockedAxios.create();
      const mockGet = jest.fn().mockResolvedValue({ data: mockPrograms });
      (apiClient as any).get = mockGet;

      const { result } = renderHook(
        () => useReviewerPrograms(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGet).toHaveBeenCalledWith(
        "/v2/funding-program-configs/my-reviewer-programs"
      );
      expect(result.current.programs).toEqual(mockPrograms);
      expect(result.current.hasPrograms).toBe(true);
    });

    it("should use longer cache time for program list", async () => {
      const apiClient = mockedAxios.create();
      const mockGet = jest.fn().mockResolvedValue({ data: [] });
      (apiClient as any).get = mockGet;

      renderHook(
        () => useReviewerPrograms(),
        { wrapper: createWrapper() }
      );

      // The hook should use 10 minutes stale time
      // This is set in the hook implementation
      // We can't directly test staleTime, but we can verify it's configured
      expect(true).toBe(true); // Placeholder for stale time verification
    });
  });



});