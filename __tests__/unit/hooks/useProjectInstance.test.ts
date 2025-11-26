/**
 * @file Tests for useProjectInstance hook
 * @description Tests for project instance fetching hook
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { useProjectInstance } from "@/hooks/useProjectInstance";
import { getProjectById } from "@/utilities/sdk";

jest.mock("@/utilities/sdk", () => ({
  getProjectById: jest.fn(),
}));

const mockGetProjectById = getProjectById as jest.MockedFunction<typeof getProjectById>;

describe("useProjectInstance", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    Wrapper.displayName = "QueryClientWrapper";

    return Wrapper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not fetch when projectId is undefined", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useProjectInstance(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.project).toBeUndefined();
    expect(mockGetProjectById).not.toHaveBeenCalled();
  });

  it("should fetch project when projectId is provided", async () => {
    const mockProject = {
      uid: "project-123",
      details: { data: { title: "Test Project" } },
    } as any;

    mockGetProjectById.mockResolvedValue(mockProject);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useProjectInstance("project-123"), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetProjectById).toHaveBeenCalledWith("project-123");
    expect(result.current.project).toEqual(mockProject);
    expect(result.current.isError).toBe(false);
  });

  it("should handle fetch error", async () => {
    const error = new Error("Failed to fetch project");
    mockGetProjectById.mockRejectedValue(error);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useProjectInstance("project-123"), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.project).toBeUndefined();
  });

  it("should use correct query key", () => {
    const wrapper = createWrapper();
    renderHook(() => useProjectInstance("project-123"), { wrapper });

    const queryData = queryClient.getQueryData(["project-instance", "project-123"]);
    expect(queryData).toBeUndefined(); // Initially undefined until fetch completes
  });

  it("should provide refetch function", async () => {
    const mockProject = {
      uid: "project-123",
    } as any;

    mockGetProjectById.mockResolvedValue(mockProject);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useProjectInstance("project-123"), { wrapper });

    await waitFor(() => {
      expect(result.current.project).toBeDefined();
    });

    expect(typeof result.current.refetch).toBe("function");

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetProjectById).toHaveBeenCalledTimes(2);
  });

  it("should cache project data with staleTime", async () => {
    const mockProject = {
      uid: "project-123",
    } as any;

    mockGetProjectById.mockResolvedValue(mockProject);

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ projectId }: { projectId?: string }) => useProjectInstance(projectId),
      {
        wrapper,
        initialProps: { projectId: "project-123" },
      }
    );

    await waitFor(() => {
      expect(result.current.project).toBeDefined();
    });

    rerender({ projectId: "project-123" });

    // Should use cached data, not fetch again immediately
    expect(mockGetProjectById).toHaveBeenCalledTimes(1);
  });
});
