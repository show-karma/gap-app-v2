/**
 * Mutation integration tests for useDeleteMilestone hook.
 *
 * Milestone deletion is being migrated to on-chain attestations
 * (revocation via `MilestoneCanceled`) and is not available yet.
 * Until the attestation flow ships, the hook surfaces a clear
 * "not available" error rather than pretending to succeed.
 *
 * These tests lock in that honest-failure contract:
 *   - mutation rejects with the documented message
 *   - cache is rolled back so the row reappears (no false optimism)
 *   - onSuccess callback never fires
 *
 * When the on-chain delete attestation lands, replace this suite with
 * tests that exercise the real submission flow.
 */

import { act, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import {
  DELETE_MILESTONE_NOT_AVAILABLE_MESSAGE,
  useDeleteMilestone,
} from "@/hooks/useDeleteMilestone";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { installMswLifecycle } from "../../msw/server";
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

function createMilestoneWithCompletion(
  overrides?: Partial<GrantMilestoneWithCompletion>
): GrantMilestoneWithCompletion {
  return {
    uid: "milestone-uid-001",
    chainId: 10,
    title: "Audit Completion",
    description: "Complete security audit",
    dueDate: "2024-12-31T00:00:00Z",
    status: "pending",
    completionDetails: null,
    verificationDetails: null,
    ...overrides,
  };
}

describe("useDeleteMilestone (mutation integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_reject_with_not_available_error_until_on_chain_delete_lands", async () => {
    const onSuccess = vi.fn();
    const milestone = createMilestoneWithCompletion();

    const { result } = renderHookWithProviders(() =>
      useDeleteMilestone({ projectId: PROJECT_ID, programId: PROGRAM_ID, onSuccess })
    );

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(milestone)).rejects.toThrow(
        DELETE_MILESTONE_NOT_AVAILABLE_MESSAGE
      );
    });

    await waitFor(() => {
      expect(result.current.isDeleting).toBe(false);
    });

    // No success path fired.
    expect(onSuccess).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    // User-facing error surfaced via toast.
    expect(toast.error).toHaveBeenCalled();
  });

  it("should_roll_back_optimistic_removal_so_the_row_reappears_on_failure", async () => {
    const queryClient = createTestQueryClient();
    const queryKey = QUERY_KEYS.MILESTONES.PROJECT_GRANT_MILESTONES(PROJECT_ID, PROGRAM_ID);
    const milestone = createMilestoneWithCompletion();
    const originalData = { grantMilestones: [milestone] };

    queryClient.setQueryData(queryKey, originalData);

    const { result } = renderHookWithProviders(
      () => useDeleteMilestone({ projectId: PROJECT_ID, programId: PROGRAM_ID }),
      { queryClient }
    );

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(milestone)).rejects.toThrow();
    });

    // Cache restored — the user must not see the row vanish on a failure.
    expect(queryClient.getQueryData(queryKey)).toEqual(originalData);
  });
});
