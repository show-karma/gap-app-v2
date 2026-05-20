import { QueryClient } from "@tanstack/react-query";
import { act, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import { useDeleteMilestone } from "@/hooks/useDeleteMilestone";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { envVars } from "@/utilities/enviromentVars";
import { installMswLifecycle, server } from "../../msw/server";
import { renderHookWithProviders } from "../../utils/render";

function createPersistentQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "0xrequester", ready: true }),
}));

vi.mock("@/hooks/useMixpanel", () => ({
  useMixpanel: () => ({ mixpanel: { reportEvent: vi.fn() } }),
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
const MILESTONE_TITLE = "Audit Completion";
const INDEXER_BASE = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

function createMilestone(
  overrides?: Partial<GrantMilestoneWithCompletion>
): GrantMilestoneWithCompletion {
  return {
    uid: MILESTONE_UID,
    chainId: 10,
    programId: PROGRAM_ID,
    title: MILESTONE_TITLE,
    description: "Complete security audit",
    dueDate: "2024-12-31T00:00:00Z",
    status: "pending",
    completionDetails: null,
    verificationDetails: null,
    fundingApplicationCompletion: null,
    ...overrides,
  };
}

function mockDeleteResponse(body: unknown, status: number) {
  server.use(
    http.delete(`${INDEXER_BASE}/v2/milestones/:milestoneUID/on-chain-delete`, () =>
      HttpResponse.json(body, { status })
    )
  );
}

function renderHook() {
  const queryClient = createPersistentQueryClient();
  return renderHookWithProviders(
    () => useDeleteMilestone({ projectId: PROJECT_ID, programId: PROGRAM_ID }),
    { queryClient }
  );
}

function lastToastErrorMessage(): string | undefined {
  const calls = (toast.error as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  const last = calls.at(-1);
  return last?.[0] as string | undefined;
}

async function expectToastErrorEventually(expected: string): Promise<void> {
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalled();
  });
  expect(lastToastErrorMessage()).toBe(expected);
}

describe("useDeleteMilestone (error mapping)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_show_already_completed_copy_when_backend_returns_409_completed", async () => {
    mockDeleteResponse(
      {
        error: "Conflict",
        message: `Cannot delete milestone that is already completed: ${MILESTONE_UID}`,
      },
      409
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await expectToastErrorEventually(
      `"${MILESTONE_TITLE}" already has a completion and can't be deleted. Reject the completion first.`
    );
  });

  it("should_show_already_revoked_copy_when_backend_returns_409_already_revoked", async () => {
    mockDeleteResponse(
      { error: "Conflict", message: `Milestone is already revoked: ${MILESTONE_UID}` },
      409
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await expectToastErrorEventually(
      `"${MILESTONE_TITLE}" is already deleted on-chain. Refresh the page to update the list.`
    );
  });

  it("should_show_not_found_copy_when_backend_returns_409_not_found", async () => {
    mockDeleteResponse(
      { error: "Conflict", message: `Milestone not found: ${MILESTONE_UID}` },
      409
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await expectToastErrorEventually(
      `"${MILESTONE_TITLE}" was not found on-chain. It may have been removed already — refresh the page.`
    );
  });

  it("should_show_permission_copy_when_backend_returns_403", async () => {
    mockDeleteResponse(
      { error: "Forbidden", message: "User 0xabc is not authorized to delete milestones" },
      403
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await expectToastErrorEventually("You don't have permission to delete this milestone.");
  });

  it("should_show_indexer_unavailable_copy_when_backend_returns_503", async () => {
    mockDeleteResponse(
      { error: "Service Unavailable", message: "Failed to fetch milestone attestation" },
      503
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await expectToastErrorEventually(
      "The indexer couldn't read the milestone right now. Try again in a moment."
    );
  });

  it("should_show_admin_gas_copy_when_backend_returns_500_insufficient_funds", async () => {
    mockDeleteResponse(
      {
        error: "Internal Server Error",
        message: "Admin wallet has insufficient funds on chain 10",
      },
      500
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await expectToastErrorEventually(
      "Karma admin wallet is out of gas on this chain. We've been alerted."
    );
  });

  it("should_fall_back_to_backend_message_when_409_message_unmapped", async () => {
    mockDeleteResponse(
      { error: "Conflict", message: "Invalid milestone data: missing recipient" },
      409
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await expectToastErrorEventually("Invalid milestone data: missing recipient");
  });

  it("should_fall_back_to_generic_copy_when_response_body_missing", async () => {
    server.use(
      http.delete(`${INDEXER_BASE}/v2/milestones/:milestoneUID/on-chain-delete`, () =>
        HttpResponse.json(null, { status: 500 })
      )
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    const message = lastToastErrorMessage();
    expect(typeof message).toBe("string");
    expect((message ?? "").length).toBeGreaterThan(0);
  });

  it("should_not_call_errorManager_when_status_is_409", async () => {
    mockDeleteResponse(
      {
        error: "Conflict",
        message: `Cannot delete milestone that is already completed: ${MILESTONE_UID}`,
      },
      409
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(errorManager).not.toHaveBeenCalled();
  });

  it("should_not_call_errorManager_when_status_is_403", async () => {
    mockDeleteResponse({ error: "Forbidden", message: "User not authorized" }, 403);

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(errorManager).not.toHaveBeenCalled();
  });

  it("should_call_errorManager_when_status_is_500_other", async () => {
    mockDeleteResponse(
      {
        error: "Internal Server Error",
        message: "Failed to revoke milestone on chain 10: RPC down",
      },
      500
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await waitFor(() => {
      expect(errorManager).toHaveBeenCalled();
    });
    const call = (errorManager as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1);
    const extras = call?.[2] as { backendStatus?: number; backendMessage?: string } | undefined;
    expect(extras?.backendStatus).toBe(500);
    expect(extras?.backendMessage).toContain("Failed to revoke milestone");
  });

  it("should_show_stable_copy_and_call_errorManager_when_revocationSuccess_false", async () => {
    server.use(
      http.delete(`${INDEXER_BASE}/v2/milestones/:milestoneUID/on-chain-delete`, ({ params }) =>
        HttpResponse.json({
          milestoneUID: params.milestoneUID as string,
          revocationSuccess: false,
        })
      )
    );

    const { result } = renderHook();

    await act(async () => {
      await expect(result.current.deleteMilestoneAsync(createMilestone())).rejects.toThrow();
    });

    await expectToastErrorEventually(
      "On-chain milestone revocation failed. Please retry; if it persists, contact support."
    );
    expect(errorManager).toHaveBeenCalled();
  });
});
