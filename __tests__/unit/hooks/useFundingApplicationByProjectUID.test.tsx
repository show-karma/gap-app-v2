/**
 * @file Tests for useFundingApplicationByProjectUID hook
 * @description Tests fetching funding applications by project UID using React Query
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFundingApplicationByProjectUID } from "@/hooks/useFundingApplicationByProjectUID";
import * as fundingApplicationsService from "@/services/funding-applications";
import { ReactNode } from "react";

// Mock the service
jest.mock("@/services/funding-applications");

const mockFetchApplicationByProjectUID = fundingApplicationsService.fetchApplicationByProjectUID as jest.MockedFunction<
  typeof fundingApplicationsService.fetchApplicationByProjectUID
>;

describe("useFundingApplicationByProjectUID", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("Data Fetching", () => {
    it("should fetch application when projectUID is provided", async () => {
      const mockApplication = {
        id: "app-1",
        projectUID: "project-1",
        programId: "program-1",
        chainID: 1,
        applicantEmail: "test@example.com",
        applicationData: { title: "Test Application" },
        status: "pending" as const,
        statusHistory: [],
        referenceNumber: "APP-00001-00001",
        submissionIP: "127.0.0.1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockFetchApplicationByProjectUID.mockResolvedValue(mockApplication as any);

      const { result } = renderHook(
        () => useFundingApplicationByProjectUID("project-1"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchApplicationByProjectUID).toHaveBeenCalledWith("project-1");
      expect(result.current.application).toEqual(mockApplication);
      expect(result.current.error).toBeNull();
    });

    it("should not fetch when projectUID is empty string", () => {
      const { result } = renderHook(
        () => useFundingApplicationByProjectUID(""),
        { wrapper }
      );

      expect(mockFetchApplicationByProjectUID).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should not fetch when projectUID is null", () => {
      const { result } = renderHook(
        () => useFundingApplicationByProjectUID(null as any),
        { wrapper }
      );

      expect(mockFetchApplicationByProjectUID).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should not fetch when projectUID is undefined", () => {
      const { result } = renderHook(
        () => useFundingApplicationByProjectUID(undefined as any),
        { wrapper }
      );

      expect(mockFetchApplicationByProjectUID).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle fetch errors", async () => {
      const error = new Error("Failed to fetch application");
      mockFetchApplicationByProjectUID.mockRejectedValue(error);

      const { result } = renderHook(
        () => useFundingApplicationByProjectUID("project-1"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.application).toBeUndefined();
    });

    it("should handle network errors", async () => {
      mockFetchApplicationByProjectUID.mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(
        () => useFundingApplicationByProjectUID("project-1"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading state during fetch", async () => {
      mockFetchApplicationByProjectUID.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ id: "app-1", projectUID: "project-1" } as any), 100)
          )
      );

      const { result } = renderHook(
        () => useFundingApplicationByProjectUID("project-1"),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Refetch Functionality", () => {
    it("should expose refetch function", async () => {
      mockFetchApplicationByProjectUID.mockResolvedValue({ id: "app-1", projectUID: "project-1" } as any);

      const { result } = renderHook(
        () => useFundingApplicationByProjectUID("project-1"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe("function");
    });

    it("should refetch data when refetch is called", async () => {
      mockFetchApplicationByProjectUID
        .mockResolvedValueOnce({ id: "app-1", applicationData: { title: "First" } } as any)
        .mockResolvedValueOnce({ id: "app-1", applicationData: { title: "Updated" } } as any);

      const { result } = renderHook(
        () => useFundingApplicationByProjectUID("project-1"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.application?.applicationData?.title).toBe("First");
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.application?.applicationData?.title).toBe("Updated");
      });

      expect(mockFetchApplicationByProjectUID).toHaveBeenCalledTimes(2);
    });
  });

  describe("Return Value Structure", () => {
    it("should return correct structure", async () => {
      mockFetchApplicationByProjectUID.mockResolvedValue({ id: "app-1", projectUID: "project-1" } as any);

      const { result } = renderHook(
        () => useFundingApplicationByProjectUID("project-1"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty("application");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refetch");
    });
  });

  describe("Query Key Management", () => {
    it("should use proper query keys", async () => {
      mockFetchApplicationByProjectUID.mockResolvedValue({ id: "app-1", projectUID: "project-1" } as any);

      const { result } = renderHook(
        () => useFundingApplicationByProjectUID("project-1"),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have fetched with the correct projectUID
      expect(mockFetchApplicationByProjectUID).toHaveBeenCalledWith("project-1");
      expect(result.current.application?.id).toBe("app-1");
    });
  });
});
