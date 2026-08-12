import { act, renderHook } from "@testing-library/react";

const mockSetupChainAndWallet = vi.fn();
const mockChangeStepperStep = vi.fn();
const mockStartAttestation = vi.fn();
const mockShowLoading = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockDismiss = vi.fn();
const mockShowChainProgress = vi.fn();
const mockRefetchGrants = vi.fn();
const mockSwitchChainAsync = vi.fn();
const mockEdit = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => ({ chain: { id: 10 } }),
  useChainId: () => 10,
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ready: true, user: null }),
  useWallets: () => ({ wallets: [] }),
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: mockStartAttestation,
    showLoading: mockShowLoading,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    changeStepperStep: mockChangeStepperStep,
    dismiss: mockDismiss,
    showChainProgress: mockShowChainProgress,
  }),
}));

vi.mock("@/store", () => ({
  useProjectStore: (selector?: any) => {
    const state = {
      project: { uid: "project-123", details: { slug: "test-project" } },
      isProjectOwner: true,
    };
    return selector ? selector(state) : state;
  },
  useOwnerStore: () => ({ isOwner: false }),
}));

vi.mock("@/hooks/useGap", () => ({
  useGap: () => ({
    gap: {},
  }),
}));

vi.mock("../../hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: mockSetupChainAndWallet,
  }),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    switchChainAsync: mockSwitchChainAsync,
  }),
}));

vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: () => ({
    refetch: mockRefetchGrants,
  }),
}));

vi.mock("@/hooks/v2/useProjectUpdates", () => ({
  useProjectUpdates: () => ({
    refetch: vi.fn(),
  }),
}));

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    request: vi.fn().mockResolvedValue({}),
    getPaginated: vi.fn().mockResolvedValue({ data: [], pageInfo: null }),
  },
}));

vi.mock("@/utilities/retries", () => ({
  retryUntilConditionMet: vi.fn(async (_condFn: any, callbackFn: any) => {
    await callbackFn?.();
  }),
}));

vi.mock("@/utilities/sdk", () => ({
  getProjectById: vi.fn(),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { errorManager } from "@/components/Utilities/errorManager";
import { useMilestoneEdit } from "@/hooks/useMilestoneEdit";
import { api } from "@/utilities/api/client";
import { getProjectById } from "@/utilities/sdk";
import { sentryIgnoreErrors } from "@/utilities/sentry/ignoreErrors";

/** Mirrors how Sentry's InboundFilters matches an event message. */
const matchesIgnoreList = (message: string) =>
  sentryIgnoreErrors.some((pattern) =>
    typeof pattern === "string" ? message.includes(pattern) : pattern.test(message)
  );

describe("useMilestoneEdit", () => {
  const mockMilestone = {
    uid: "milestone-001",
    type: "grant",
    title: "Build MVP",
    chainID: 10,
    refUID: "grant-001",
    source: {
      grantMilestone: {
        milestone: { uid: "milestone-001", title: "Build MVP" },
        grant: { uid: "grant-001", chainID: 10 },
      },
    },
  } as any;

  const mockWalletSigner = { address: "0xabc" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetupChainAndWallet.mockResolvedValue({
      gapClient: {
        fetch: {
          projectById: vi.fn().mockResolvedValue({
            grants: [
              {
                uid: "grant-001",
                milestones: [
                  {
                    uid: "milestone-001",
                    title: "Build MVP",
                    edit: mockEdit,
                    chainID: 10,
                  },
                ],
              },
            ],
          }),
        },
      },
      walletSigner: mockWalletSigner,
    });
    mockEdit.mockResolvedValue({ tx: [{ hash: "0xtxhash" }], uids: ["0xnewuid"] });
    mockRefetchGrants.mockResolvedValue({
      data: [
        {
          uid: "grant-001",
          milestones: [{ uid: "milestone-001", title: "Updated MVP" }],
        },
      ],
    });
  });

  it("initializes with isEditing false", () => {
    const { result } = renderHook(() => useMilestoneEdit());
    expect(result.current.isEditing).toBe(false);
  });

  it("calls setupChainAndWallet and processes edit flow", async () => {
    const { result } = renderHook(() => useMilestoneEdit());

    await act(async () => {
      await result.current.editMilestone(mockMilestone, {
        title: "Updated MVP",
        description: "New description",
      });
    });

    // Verify the attestation flow was initiated
    expect(mockStartAttestation).toHaveBeenCalledWith("Step 1/2: Revoking old milestone...");

    // Verify flow completes (either success or handled error)
    expect(mockDismiss).toHaveBeenCalled();
    expect(result.current.isEditing).toBe(false);
  });

  it("shows error toast on failure and re-throws", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    const { result } = renderHook(() => useMilestoneEdit());

    await expect(
      act(async () => {
        await result.current.editMilestone(mockMilestone, { title: "Updated MVP" });
      })
    ).rejects.toThrow();

    expect(mockShowError).toHaveBeenCalledWith("There was an error editing the milestone");
  });

  it("throws when milestone instance lacks edit method", async () => {
    // Override to return milestone without edit method
    mockSetupChainAndWallet.mockResolvedValue({
      gapClient: {
        fetch: {
          projectById: vi.fn().mockResolvedValue({
            grants: [
              {
                uid: "grant-001",
                milestones: [
                  {
                    uid: "milestone-001",
                    title: "Build MVP",
                    chainID: 10,
                  },
                ],
              },
            ],
          }),
        },
      },
      walletSigner: { address: "0xabc" },
    });

    const { result } = renderHook(() => useMilestoneEdit());

    await expect(
      act(async () => {
        await result.current.editMilestone(mockMilestone, { title: "Updated MVP" });
      })
    ).rejects.toThrow();
  });

  it("sets isEditing to false after completion", async () => {
    const { result } = renderHook(() => useMilestoneEdit());

    expect(result.current.isEditing).toBe(false);

    await act(async () => {
      await result.current.editMilestone(mockMilestone, {
        title: "Updated",
      });
    });

    expect(result.current.isEditing).toBe(false);
  });

  it("calls dismiss after edit completes", async () => {
    const { result } = renderHook(() => useMilestoneEdit());

    await act(async () => {
      await result.current.editMilestone(mockMilestone, { title: "Updated" });
    });

    expect(mockDismiss).toHaveBeenCalled();
  });

  it("labels the revocation as step 1 and the re-attestation as step 2", async () => {
    mockEdit.mockImplementation(async (_signer: any, _data: any, callback: any) => {
      callback("preparing");
      callback("confirmed");
      callback("preparing");
      callback("confirmed");
      return { tx: [{ hash: "0xtxhash" }], uids: ["0xnewuid"] };
    });

    const { result } = renderHook(() => useMilestoneEdit());

    await act(async () => {
      await result.current.editMilestone(mockMilestone, { title: "Updated MVP" });
    });

    const stepMessages = mockChangeStepperStep.mock.calls.map((call) => call[0]);
    expect(stepMessages[0]).toBe("Step 1/2: Revoking old milestone...");
    expect(stepMessages[1]).toBe("Step 1/2: Old milestone revocation submitted...");
    expect(stepMessages[2]).toBe("Step 2/2: Saving updated milestone...");
  });

  it("reports to Sentry directly when the re-attestation fails after the revocation", async () => {
    const rejection = new Error("User rejected the request");
    mockEdit.mockImplementation(async (_signer: any, _data: any, callback: any) => {
      callback("preparing");
      callback("confirmed");
      callback("preparing");
      throw rejection;
    });

    const { result } = renderHook(() => useMilestoneEdit());

    await expect(
      act(async () => {
        await result.current.editMilestone(mockMilestone, { title: "Updated MVP" });
      })
    ).rejects.toThrow(rejection);

    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining("did not complete"));
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: expect.objectContaining({
          originalErrorMessage: "User rejected the request",
          originalErrorString: expect.stringContaining("User rejected the request"),
          revokedMilestoneUID: "milestone-001",
          grantUID: "grant-001",
          chainID: 10,
          newMilestoneData: { title: "Updated MVP" },
        }),
      })
    );

    // A sentinel is captured, not the wallet rejection: `sentryIgnoreErrors`
    // filters manual captures too, so the raw message would never arrive.
    const captured = vi.mocked(Sentry.captureException).mock.calls[0][0] as Error;
    expect(captured).not.toBe(rejection);
    expect(captured.message).not.toBe(rejection.message);
    expect(captured.message).toBe(
      "Milestone edit may be half-applied: revoke submitted, re-attest failed"
    );
    expect(matchesIgnoreList(rejection.message)).toBe(true);
    expect(matchesIgnoreList(captured.message)).toBe(false);

    // errorManager would have dropped this rejection to a breadcrumb.
    expect(errorManager).not.toHaveBeenCalled();
  });

  it("still routes pre-revocation failures through errorManager", async () => {
    const failure = new Error("boom");
    mockEdit.mockImplementation(async (_signer: any, _data: any, callback: any) => {
      callback("preparing");
      throw failure;
    });

    const { result } = renderHook(() => useMilestoneEdit());

    await expect(
      act(async () => {
        await result.current.editMilestone(mockMilestone, { title: "Updated MVP" });
      })
    ).rejects.toThrow(failure);

    expect(mockShowError).toHaveBeenCalledWith("There was an error editing the milestone");
    expect(errorManager).toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("does not claim data loss when a step after the SDK edit fails", async () => {
    mockEdit.mockImplementation(async (_signer: any, _data: any, callback: any) => {
      callback("preparing");
      callback("confirmed");
      callback("preparing");
      callback("confirmed");
      return { tx: [{ hash: "0xtxhash" }], uids: ["0xnewuid"] };
    });
    const indexingFailure = new Error("attestation listener unavailable");
    vi.mocked(api.post).mockRejectedValueOnce(indexingFailure);

    const { result } = renderHook(() => useMilestoneEdit());

    await expect(
      act(async () => {
        await result.current.editMilestone(mockMilestone, { title: "Updated MVP" });
      })
    ).rejects.toThrow(indexingFailure);

    // Both transactions landed, so the user must not be told to re-create it.
    expect(mockShowError).toHaveBeenCalledWith("There was an error editing the milestone");
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(errorManager).toHaveBeenCalled();
  });

  const mergedMilestone = {
    ...mockMilestone,
    mergedGrants: [
      { grantUID: "grant-001", milestoneUID: "milestone-001", chainID: 10 },
      { grantUID: "grant-002", milestoneUID: "milestone-002", chainID: 10 },
    ],
  } as any;

  it("aborts a merged edit before any transaction when a sibling is not editable", async () => {
    vi.mocked(getProjectById).mockResolvedValue({
      grants: [
        { uid: "grant-001", milestones: [{ uid: "milestone-001", refUID: "grant-001" }] },
        {
          uid: "grant-002",
          milestones: [
            { uid: "milestone-002", refUID: "grant-002", completed: { uid: "completion-1" } },
          ],
        },
      ],
    } as any);

    const { result } = renderHook(() => useMilestoneEdit());

    await act(async () => {
      await result.current.editMilestone(mergedMilestone, { title: "Updated MVP" });
    });

    expect(mockShowError).toHaveBeenCalledWith(
      expect.stringContaining("already completed or verified")
    );
    expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    expect(mockEdit).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(errorManager).not.toHaveBeenCalled();
  });

  it("proceeds with a merged edit when every sibling is still editable", async () => {
    vi.mocked(getProjectById).mockResolvedValue({
      grants: [
        {
          uid: "grant-001",
          milestones: [{ uid: "milestone-001", refUID: "grant-001", edit: mockEdit }],
        },
        {
          uid: "grant-002",
          milestones: [{ uid: "milestone-002", refUID: "grant-002", edit: mockEdit }],
        },
      ],
    } as any);

    const { result } = renderHook(() => useMilestoneEdit());

    await act(async () => {
      await result.current.editMilestone(mergedMilestone, { title: "Updated MVP" });
    });

    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockSetupChainAndWallet).toHaveBeenCalled();
    expect(mockEdit).toHaveBeenCalledTimes(2);
  });

  it("warns without reporting when the milestone is gone from the fetched project", async () => {
    mockSetupChainAndWallet.mockResolvedValue({
      gapClient: {
        fetch: {
          projectById: vi.fn().mockResolvedValue({
            grants: [{ uid: "grant-001", milestones: [] }],
          }),
        },
      },
      walletSigner: mockWalletSigner,
    });

    const { result } = renderHook(() => useMilestoneEdit());

    await act(async () => {
      await result.current.editMilestone(mockMilestone, { title: "Updated MVP" });
    });

    expect(mockShowError).toHaveBeenCalledWith(
      "This milestone no longer exists. Refresh the page to see the latest data."
    );
    expect(errorManager).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(mockEdit).not.toHaveBeenCalled();
  });
});
