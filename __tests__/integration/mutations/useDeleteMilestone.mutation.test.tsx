import { act, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import toast from "react-hot-toast";
import { useDeleteMilestone } from "@/hooks/useDeleteMilestone";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { envVars } from "@/utilities/enviromentVars";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { installMswLifecycle, server } from "../../msw/server";
import { createTestQueryClient, renderHookWithProviders } from "../../utils/render";

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

vi.mock("react-hot-toast", async () => {
  const actual = await vi.importActual<typeof import("react-hot-toast")>("react-hot-toast");
  return {
    ...actual,
    default: {
      ...actual.default,
      success: vi.fn(),
      error: vi.fn(),
      loading: vi.fn().mockReturnValue("toast-id"),
      dismiss: vi.fn(),
    },
  };
});

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

installMswLifecycle();

const PROJECT_ID = "project-001";
const PROGRAM_ID = "program-001";
const MILESTONE_UID = "milestone-uid-001";
const INDEXER_BASE = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

function createMilestone(
  overrides?: Partial<GrantMilestoneWithCompletion>
): GrantMilestoneWithCompletion {
  return {
    uid: MILESTONE_UID,
    chainId: 10,
    programId: PROGRAM_ID,
    title: "Audit Completion",
    description: "Complete security audit",
    dueDate: "2024-12-31T00:00:00Z",
    status: "pending",
    completionDetails: null,
    verificationDetails: null,
    fundingApplicationCompletion: null,
    ...overrides,
  };
}

describe("useDeleteMilestone (mutation integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_resolve_and_invoke_onSuccess_when_backend_revokes_milestone", async () => {
    const onSuccess = vi.fn();
    const milestone = createMilestone();

    server.use(
      http.delete(`${INDEXER_BASE}/v2/milestones/:milestoneUID/on-chain-delete`, ({ params }) =>
        HttpResponse.json({
          milestoneUID: params.milestoneUID as string,
          revocationSuccess: true,
          revocationTxHash: "0xtx",
        })
      )
    );

    const { result } = renderHookWithProviders(() =>
      useDeleteMilestone({ projectId: PROJECT_ID, programId: PROGRAM_ID, onSuccess })
    );

    await act(async () => {
      await result.current.deleteMilestoneAsync(milestone);
    });

    await waitFor(() => {
      expect(result.current.isDeleting).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("should_roll_back_optimistic_removal_when_backend_rejects", async () => {
    const queryClient = createTestQueryClient();
    const queryKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(PROJECT_ID, PROGRAM_ID);
    const milestone = createMilestone();
    const originalData = { grantMilestones: [milestone] };

    queryClient.setQueryData(queryKey, originalData);

    server.use(
      http.delete(`${INDEXER_BASE}/v2/milestones/:milestoneUID/on-chain-delete`, () =>
        HttpResponse.json({ message: "Access denied" }, { status: 403 })
      )
    );

    const { result } = renderHookWithProviders(
      () => useDeleteMilestone({ projectId: PROJECT_ID, programId: PROGRAM_ID }),
      { queryClient }
    );

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(milestone)).rejects.toThrow();
    });

    expect(queryClient.getQueryData(queryKey)).toEqual(originalData);
    expect(toast.error).toHaveBeenCalled();
  });

  it("should_reject_without_calling_backend_when_chainId_is_missing", async () => {
    const requestSpy = vi.fn();
    server.use(
      http.delete(`${INDEXER_BASE}/v2/milestones/:milestoneUID/on-chain-delete`, () => {
        requestSpy();
        return HttpResponse.json({}, { status: 200 });
      })
    );

    const milestone = createMilestone({ chainId: 0 as unknown as number });

    const { result } = renderHookWithProviders(() =>
      useDeleteMilestone({ projectId: PROJECT_ID, programId: PROGRAM_ID })
    );

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(milestone)).rejects.toThrow(
        /missing chainId/
      );
    });

    expect(requestSpy).not.toHaveBeenCalled();
  });
});
