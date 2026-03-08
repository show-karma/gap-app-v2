import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { useProjectUpdates } from "../useProjectUpdates";

jest.mock("@/services/project-updates.service", () => ({
  getProjectUpdates: jest.fn(),
}));

import { getProjectUpdates } from "@/services/project-updates.service";
import type { UpdatesApiResponse } from "@/types/v2/roadmap";

const mockGetProjectUpdates = getProjectUpdates as jest.MockedFunction<typeof getProjectUpdates>;

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
    jest.clearAllMocks();
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
          fundingApplicationCompletion: null,
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
          fundingApplicationCompletion: null,
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
});
