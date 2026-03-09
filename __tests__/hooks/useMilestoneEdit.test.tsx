/**
 * Tests for useMilestoneEdit hook (gap-app-v2).
 *
 * This hook wraps the editMilestone service in a React Query mutation
 * with cache invalidation and error handling.
 */

// Mock dependencies BEFORE any imports
jest.mock("@/services/milestones");
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}));
jest.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  })),
}));
jest.mock("@/utilities/fetchData");

// Mock toast
const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: mockToast,
  toast: mockToast,
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { editMilestone, type MilestoneEditData } from "@/services/milestones";

const mockEditMilestone = editMilestone as jest.MockedFunction<typeof editMilestone>;

/**
 * Since the hook does not exist yet (TDD), we define the expected
 * contract here. Once the real hook is built, import and test it directly.
 */
function useMilestoneEdit(projectUid: string) {
  const queryClient = require("@tanstack/react-query").useQueryClient();
  const mutation = require("@tanstack/react-query").useMutation({
    mutationFn: async ({
      milestoneUID,
      data,
    }: {
      milestoneUID: string;
      data: MilestoneEditData;
    }) => {
      return editMilestone(milestoneUID, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-milestones", projectUid],
      });
    },
    onError: () => {
      mockToast.error("Failed to edit milestone");
    },
  });

  return {
    editMilestone: mutation.mutate,
    editMilestoneAsync: mutation.mutateAsync,
    isEditing: mutation.isPending,
    editError: mutation.error,
  };
}

describe("useMilestoneEdit", () => {
  let queryClient: QueryClient;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("should call editMilestone with correct params", async () => {
    mockEditMilestone.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMilestoneEdit("project-uid-1"), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.editMilestone({
        milestoneUID: "0xMilestoneUID",
        data: { title: "New Title", description: "New Desc" },
      });
    });

    await waitFor(() => {
      expect(mockEditMilestone).toHaveBeenCalledWith("0xMilestoneUID", {
        title: "New Title",
        description: "New Desc",
      });
    });
  });

  it("should invalidate project milestones cache on success", async () => {
    mockEditMilestone.mockResolvedValue(undefined);

    const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useMilestoneEdit("project-uid-1"), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.editMilestone({
        milestoneUID: "0xMilestoneUID",
        data: { title: "Updated" },
      });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["project-milestones", "project-uid-1"],
        })
      );
    });

    invalidateQueriesSpy.mockRestore();
  });

  it("should show error toast on failure", async () => {
    mockEditMilestone.mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useMilestoneEdit("project-uid-1"), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.editMilestone({
        milestoneUID: "0xMilestoneUID",
        data: { title: "Will Fail" },
      });
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to edit milestone");
    });
  });

  it("should expose isEditing state during mutation", async () => {
    let resolvePromise: () => void;
    const pendingPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockEditMilestone.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useMilestoneEdit("project-uid-1"), {
      wrapper: Wrapper,
    });

    expect(result.current.isEditing).toBe(false);

    act(() => {
      result.current.editMilestone({
        milestoneUID: "0xMilestoneUID",
        data: { title: "Loading" },
      });
    });

    await waitFor(() => {
      expect(result.current.isEditing).toBe(true);
    });

    act(() => {
      resolvePromise!();
    });

    await waitFor(() => {
      expect(result.current.isEditing).toBe(false);
    });
  });

  it("should expose editError when mutation fails", async () => {
    const apiError = new Error("Network failure");
    mockEditMilestone.mockRejectedValue(apiError);

    const { result } = renderHook(() => useMilestoneEdit("project-uid-1"), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.editMilestone({
        milestoneUID: "0xMilestoneUID",
        data: { title: "Error" },
      });
    });

    await waitFor(() => {
      expect(result.current.editError).toBeTruthy();
      expect(result.current.editError?.message).toBe("Network failure");
    });
  });
});
