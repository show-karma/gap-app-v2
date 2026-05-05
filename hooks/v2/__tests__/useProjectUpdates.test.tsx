import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { useProjectUpdates } from "../useProjectUpdates";

vi.mock("@/services/project-updates.service", () => ({
  getProjectUpdates: vi.fn(),
}));

import { getProjectUpdates } from "@/services/project-updates.service";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";

const mockGetProjectUpdates = getProjectUpdates as vi.MockedFunction<typeof getProjectUpdates>;

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

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe("useProjectUpdates", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("parses hex chain IDs from grant milestones and grant updates", async () => {
    const response: UpdatesApiResponse = {
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [
        {
          uid: "grant-milestone-hex",
          programId: "program-1",
          chainId: "0xa",
          title: "Milestone",
          description: "Milestone description",
          dueDate: null,
          createdAt: "2025-01-01T00:00:00.000Z",
          recipient: "0x123",
          status: "completed",
          grant: {
            uid: "grant-1",
            title: "Grant 1",
            communityName: "Community",
          },
          completionDetails: {
            description: "Done",
            completedAt: "2025-01-02T00:00:00.000Z",
            completedBy: "0x123",
          },
          verificationDetails: null,
        },
      ],
      grantUpdates: [
        {
          uid: "grant-update-hex",
          refUID: "grant-1",
          chainId: "0xa",
          recipient: "0x123",
          title: "Update",
          text: "Update text",
          proofOfWork: "",
          completionPercentage: "",
          currentStatus: "pending",
          statusUpdatedAt: null,
          verified: false,
          createdAt: "2025-01-03T00:00:00.000Z",
          grant: {
            uid: "grant-1",
            title: "Grant 1",
            communityName: "Community",
          },
        } as any,
      ],
    };

    mockGetProjectUpdates.mockResolvedValueOnce(response);

    const { result } = renderHook(() => useProjectUpdates("test-project"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const grantMilestone = result.current.milestones.find(
      (item) => item.uid === "grant-milestone-hex"
    );
    const grantUpdate = result.current.milestones.find((item) => item.uid === "grant-update-hex");

    expect(grantMilestone?.chainID).toBe(10);
    expect(grantUpdate?.chainID).toBe(10);
  });

  it("falls back to grant chainID when chainId is malformed", async () => {
    const response: UpdatesApiResponse = {
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [
        {
          uid: "grant-milestone-fallback",
          programId: "program-1",
          chainId: "bad-value",
          title: "Milestone",
          description: "Milestone description",
          dueDate: null,
          createdAt: "2025-01-01T00:00:00.000Z",
          recipient: "0x123",
          status: "completed",
          grant: {
            uid: "grant-2",
            title: "Grant 2",
            communityName: "Community",
            chainID: "0xa4b1",
          } as any,
          completionDetails: {
            description: "Done",
            completedAt: "2025-01-02T00:00:00.000Z",
            completedBy: "0x123",
          },
          verificationDetails: null,
        },
      ],
      grantUpdates: [],
    };

    mockGetProjectUpdates.mockResolvedValueOnce(response);

    const { result } = renderHook(() => useProjectUpdates("test-project"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const grantMilestone = result.current.milestones.find(
      (item) => item.uid === "grant-milestone-fallback"
    );

    expect(grantMilestone?.chainID).toBe(42161);
  });

  it("passes milestoneStatus to getProjectUpdates when provided", async () => {
    mockGetProjectUpdates.mockResolvedValueOnce({
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [],
      grantUpdates: [],
    });

    renderHook(() => useProjectUpdates("test-project", "completed"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(mockGetProjectUpdates).toHaveBeenCalledWith("test-project", "completed", undefined);
    });
  });

  it("does not pass milestoneStatus to getProjectUpdates when not provided", async () => {
    mockGetProjectUpdates.mockResolvedValueOnce({
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [],
      grantUpdates: [],
    });

    renderHook(() => useProjectUpdates("test-project"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(mockGetProjectUpdates).toHaveBeenCalledWith("test-project", undefined, undefined);
    });
  });

  it("passes extra filters to getProjectUpdates when provided", async () => {
    mockGetProjectUpdates.mockResolvedValueOnce({
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [],
      grantUpdates: [],
    });

    const filters = {
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      hasAIEvaluation: true,
      aiScoreMin: 5,
    };

    renderHook(() => useProjectUpdates("test-project", undefined, filters), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(mockGetProjectUpdates).toHaveBeenCalledWith("test-project", undefined, filters);
    });
  });

  it("uses distinct query keys for different filter combinations", async () => {
    mockGetProjectUpdates.mockResolvedValue({
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [],
      grantUpdates: [],
    });

    const { rerender } = renderHook(
      ({ scoreMin }: { scoreMin?: number }) =>
        useProjectUpdates(
          "test-project",
          undefined,
          scoreMin !== undefined ? { aiScoreMin: scoreMin } : undefined
        ),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { scoreMin: undefined },
      }
    );

    await waitFor(() => {
      expect(mockGetProjectUpdates).toHaveBeenCalledTimes(1);
    });

    rerender({ scoreMin: 7 });

    await waitFor(() => {
      expect(mockGetProjectUpdates).toHaveBeenCalledTimes(2);
    });
  });

  it("uses server-provided grantMilestoneIndex/Total for the per-grant ordinal", async () => {
    // Server stamps the per-grant ordinal BEFORE applying status/date/AI filters,
    // so a single milestone returned under `?milestoneStatus=verified` still
    // reports its true position within the FULL grant (e.g. "2 of 4"), not
    // "1 of 1" as a client-side recompute on the filtered subset would yield.
    const response: UpdatesApiResponse = {
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [
        {
          uid: "verified-only-milestone",
          programId: "program-1",
          chainId: "0xa",
          title: "Virtual appliance",
          description: "Verified milestone",
          dueDate: null,
          createdAt: "2025-01-01T00:00:00.000Z",
          recipient: "0x123",
          status: "verified",
          grant: {
            uid: "grant-1",
            title: "Grant 1",
            communityName: "Community",
          },
          completionDetails: {
            description: "Done",
            completedAt: "2025-01-02T00:00:00.000Z",
            completedBy: "0x123",
          },
          verificationDetails: null,
          grantMilestoneIndex: 2,
          grantMilestoneTotal: 4,
        },
      ],
      grantUpdates: [],
    };

    mockGetProjectUpdates.mockResolvedValueOnce(response);

    const { result } = renderHook(() => useProjectUpdates("test-project", "verified"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const milestone = result.current.milestones.find(
      (item) => item.uid === "verified-only-milestone"
    );

    expect(milestone?.grantMilestoneOrder).toEqual({ index: 2, total: 4 });
  });

  it("falls back to client-computed ordinal when server omits grantMilestoneIndex/Total", async () => {
    // Backwards compatibility: if the indexer hasn't shipped the new fields yet,
    // the frontend still computes a per-grant ordinal locally.
    const response: UpdatesApiResponse = {
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [
        {
          uid: "legacy-milestone",
          programId: "program-1",
          chainId: "0xa",
          title: "Legacy milestone",
          description: "No server ordinal",
          dueDate: "2025-06-01T00:00:00.000Z",
          createdAt: "2025-01-01T00:00:00.000Z",
          recipient: "0x123",
          status: "completed",
          grant: {
            uid: "grant-legacy",
            title: "Legacy Grant",
            communityName: "Community",
          },
          completionDetails: null,
          verificationDetails: null,
        },
      ],
      grantUpdates: [],
    };

    mockGetProjectUpdates.mockResolvedValueOnce(response);

    const { result } = renderHook(() => useProjectUpdates("test-project"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const milestone = result.current.milestones.find((item) => item.uid === "legacy-milestone");

    expect(milestone?.grantMilestoneOrder).toEqual({ index: 1, total: 1 });
  });

  it("exposes isFetching as true during a filter transition and retains previous milestones", async () => {
    const firstResponse: UpdatesApiResponse = {
      projectUpdates: [],
      projectMilestones: [
        {
          uid: "milestone-pending",
          title: "Pending Milestone",
          description: "A pending milestone",
          status: "pending",
          dueDate: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          recipient: "0x123",
          completionDetails: null,
          verificationDetails: null,
        } as any,
      ],
      grantMilestones: [],
      grantUpdates: [],
    };

    let resolveSecondFetch: (value: UpdatesApiResponse) => void;
    const secondFetchPromise = new Promise<UpdatesApiResponse>((resolve) => {
      resolveSecondFetch = resolve;
    });

    mockGetProjectUpdates.mockResolvedValueOnce(firstResponse);
    mockGetProjectUpdates.mockReturnValueOnce(secondFetchPromise);

    const { result, rerender } = renderHook(
      ({ status }: { status?: "pending" | "completed" | "verified" }) =>
        useProjectUpdates("test-project", status),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { status: undefined },
      }
    );

    // Wait for first fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.milestones).toHaveLength(1);

    // Change filter — triggers new query key → second fetch begins
    rerender({ status: "completed" });

    // While second fetch is in-flight, isFetching should be true
    await waitFor(() => {
      expect(result.current.isFetching).toBe(true);
    });

    // Previous milestones are retained (not empty) while fetching
    expect(result.current.milestones).toHaveLength(1);

    // Resolve second fetch
    resolveSecondFetch!({
      projectUpdates: [],
      projectMilestones: [],
      grantMilestones: [],
      grantUpdates: [],
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.milestones).toHaveLength(0);
  });
});
