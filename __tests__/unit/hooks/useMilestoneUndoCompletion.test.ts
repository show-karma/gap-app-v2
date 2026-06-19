import { act, renderHook } from "@testing-library/react";

const mockPerformOffChainRevoke = vi.fn();
const mockGetProjectById = vi.fn();
const mockGetProjectObjectives = vi.fn();
const mockRetryUntilConditionMet = vi.fn();
const mockRefetchUpdates = vi.fn();
const mockRefetchGrants = vi.fn();
const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();
const mockStartAttestation = vi.fn();
const mockChangeStepperStep = vi.fn();
const mockDismiss = vi.fn();
const mockShowChainProgress = vi.fn();
const mockUseAccount = vi.fn();
const mockSwitchChainAsync = vi.fn();
const mockSetupChainAndWallet = vi.fn();

vi.mock("@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone", () => ({
  ProjectMilestone: {
    from: vi.fn(() => []),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ projectId: "project-slug" })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("wagmi", () => ({
  useAccount: (...args: unknown[]) => mockUseAccount(...args),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: vi.fn(() => ({ switchChainAsync: mockSwitchChainAsync })),
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: vi.fn(() => ({
    startAttestation: mockStartAttestation,
    showLoading: vi.fn(),
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    changeStepperStep: mockChangeStepperStep,
    dismiss: mockDismiss,
    showChainProgress: mockShowChainProgress,
  })),
}));

vi.mock("@/hooks/useOffChainRevoke", () => ({
  useOffChainRevoke: vi.fn(() => ({
    performOffChainRevoke: mockPerformOffChainRevoke,
  })),
}));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWallet,
  })),
}));
vi.mock("hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWallet,
  })),
}));
vi.mock("../../../hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWallet,
  })),
}));

vi.mock("@/hooks/v2/useProjectUpdates", () => ({
  useProjectUpdates: vi.fn(() => ({
    refetch: mockRefetchUpdates,
  })),
}));

vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: vi.fn(() => ({
    refetch: mockRefetchGrants,
  })),
}));

vi.mock("@/utilities/sdk", () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

vi.mock("@/utilities/gapIndexerApi/getProjectObjectives", () => ({
  getProjectObjectives: (...args: unknown[]) => mockGetProjectObjectives(...args),
}));

vi.mock("@/utilities/retries", async () => {
  const actual = await vi.importActual<typeof import("@/utilities/retries")>("@/utilities/retries");
  return {
    ...actual,
    retryUntilConditionMet: (...args: unknown[]) => mockRetryUntilConditionMet(...args),
  };
});

vi.mock("@/store", () => {
  const state = {
    project: {
      uid: "0xproject",
      details: { slug: "project-slug" },
    },
    isProjectOwner: false,
    isOwner: false,
  };

  return {
    __mockState: state,
    useProjectStore: vi.fn((selector?: any) => {
      if (!selector) return state;
      return selector(state);
    }),
    useOwnerStore: vi.fn((selector?: any) => {
      const ownerState = { isOwner: state.isOwner };
      if (!selector) return ownerState;
      return selector(ownerState);
    }),
  };
});

import { useMilestone } from "@/hooks/useMilestone";
import { IndexingTimeoutError, isSurfacedError } from "@/utilities/errors";
import { INTERACTIVE_INDEXING_POLL, RetryConditionNotMetError } from "@/utilities/retries";

const baseMilestone = {
  uid: "0xmilestone",
  type: "grant",
  chainID: 42220,
  refUID: "0xgrant",
  mergedGrants: undefined,
  source: {},
};

describe("useMilestone - undo completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAccount.mockReturnValue({
      chain: { id: 42220 },
      address: "0xexternalWalletUser",
    });
    // The revoke primitive now resolves to void on success (throws on failure).
    mockPerformOffChainRevoke.mockResolvedValue(undefined);
    mockRefetchUpdates.mockResolvedValue(undefined);

    mockRetryUntilConditionMet.mockImplementation(
      async (condition: () => Promise<boolean>, onSuccess: () => Promise<void>) => {
        let conditionMet = await condition();
        if (!conditionMet) {
          conditionMet = await condition();
        }
        if (conditionMet) {
          await onSuccess();
        }
      }
    );
  });

  it("revokes project milestone completion without requiring a grant", async () => {
    mockGetProjectById.mockResolvedValue({
      uid: "0xproject",
      chainID: 42220,
      recipient: "0xrecipient",
      grants: [],
    });

    mockGetProjectObjectives
      .mockResolvedValueOnce([
        {
          uid: "0xprojectMilestone",
          chainID: 42220,
          completed: { uid: "0xprojectMilestoneCompleted" },
        },
      ])
      .mockResolvedValueOnce([
        {
          uid: "0xprojectMilestone",
          chainID: 42220,
          completed: undefined,
        },
      ]);

    const { result } = renderHook(() => useMilestone());

    await act(async () => {
      await result.current.multiGrantUndoCompletion({
        ...baseMilestone,
        uid: "0xprojectMilestone",
        type: "milestone",
        refUID: "",
        source: {
          projectMilestone: {
            uid: "0xprojectMilestone",
          },
        },
      } as any);
    });

    expect(mockPerformOffChainRevoke).toHaveBeenCalledWith({
      uid: "0xprojectMilestoneCompleted",
      chainID: 42220,
    });
    expect(mockShowSuccess).toHaveBeenCalled();
    expect(mockShowError).not.toHaveBeenCalledWith("Grant not found");
    expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    expect(mockSwitchChainAsync).not.toHaveBeenCalled();
  });

  it("revokes a single grant milestone completion for wallet users", async () => {
    mockGetProjectById.mockResolvedValue({
      uid: "0xproject",
      chainID: 42220,
      recipient: "0xrecipient",
      grants: [
        {
          uid: "0xgrant",
          milestones: [
            {
              uid: "0xgrantMilestone",
              chainID: 42220,
              completed: { uid: "0xgrantMilestoneCompleted" },
            },
          ],
        },
      ],
    });

    mockRefetchGrants
      .mockResolvedValueOnce({
        data: [
          {
            uid: "0xgrant",
            milestones: [
              { uid: "0xgrantMilestone", completed: { uid: "0xgrantMilestoneCompleted" } },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            uid: "0xgrant",
            milestones: [{ uid: "0xgrantMilestone", completed: undefined }],
          },
        ],
      });

    const { result } = renderHook(() => useMilestone());

    await act(async () => {
      await result.current.multiGrantUndoCompletion({
        ...baseMilestone,
        uid: "0xgrantMilestone",
      } as any);
    });

    expect(mockPerformOffChainRevoke).toHaveBeenCalledWith({
      uid: "0xgrantMilestoneCompleted",
      chainID: 42220,
    });
    expect(mockShowSuccess).toHaveBeenCalled();
    expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    expect(mockSwitchChainAsync).not.toHaveBeenCalled();
  });

  it("revokes merged grant milestone completions across chains", async () => {
    mockGetProjectById.mockResolvedValue({
      uid: "0xproject",
      chainID: 42220,
      recipient: "0xrecipient",
      grants: [
        {
          uid: "0xgrantA",
          milestones: [{ uid: "0xm1", chainID: 42220, completed: { uid: "0xc1" } }],
        },
        {
          uid: "0xgrantB",
          milestones: [{ uid: "0xm2", chainID: 10, completed: { uid: "0xc2" } }],
        },
      ],
    });

    mockRefetchGrants.mockResolvedValue({
      data: [
        { uid: "0xgrantA", milestones: [{ uid: "0xm1", completed: undefined }] },
        { uid: "0xgrantB", milestones: [{ uid: "0xm2", completed: undefined }] },
      ],
    });

    const { result } = renderHook(() => useMilestone());

    await act(async () => {
      await result.current.multiGrantUndoCompletion({
        ...baseMilestone,
        uid: "0xmerged",
        mergedGrants: [
          { grantUID: "0xgrantA", milestoneUID: "0xm1", chainID: 42220 },
          { grantUID: "0xgrantB", milestoneUID: "0xm2", chainID: 10 },
        ],
      } as any);
    });

    expect(mockPerformOffChainRevoke).toHaveBeenCalledTimes(2);
    expect(mockPerformOffChainRevoke).toHaveBeenCalledWith({
      uid: "0xc1",
      chainID: 42220,
    });
    expect(mockPerformOffChainRevoke).toHaveBeenCalledWith({
      uid: "0xc2",
      chainID: 10,
    });
    expect(mockShowChainProgress).toHaveBeenCalledTimes(2);
    expect(mockShowSuccess).toHaveBeenCalled();
    expect(mockSetupChainAndWallet).not.toHaveBeenCalled();
    expect(mockSwitchChainAsync).not.toHaveBeenCalled();
  });

  describe("revoke rejection fails fast", () => {
    const projectMilestone = {
      ...baseMilestone,
      uid: "0xprojectMilestone",
      type: "milestone",
      refUID: "",
      source: { projectMilestone: { uid: "0xprojectMilestone" } },
    } as any;

    const singleGrantMilestone = { ...baseMilestone, uid: "0xgrantMilestone" } as any;

    const mergedMilestone = {
      ...baseMilestone,
      uid: "0xmerged",
      mergedGrants: [
        { grantUID: "0xgrantA", milestoneUID: "0xm1", chainID: 42220 },
        { grantUID: "0xgrantB", milestoneUID: "0xm2", chainID: 10 },
      ],
    } as any;

    const setupProjectMilestone = () => {
      mockGetProjectById.mockResolvedValue({
        uid: "0xproject",
        chainID: 42220,
        recipient: "0xrecipient",
        grants: [],
      });
      mockGetProjectObjectives.mockResolvedValue([
        { uid: "0xprojectMilestone", chainID: 42220, completed: { uid: "0xcompleted" } },
      ]);
    };

    const setupSingleGrant = () => {
      mockGetProjectById.mockResolvedValue({
        uid: "0xproject",
        chainID: 42220,
        recipient: "0xrecipient",
        grants: [
          {
            uid: "0xgrant",
            milestones: [
              { uid: "0xgrantMilestone", chainID: 42220, completed: { uid: "0xcompleted" } },
            ],
          },
        ],
      });
    };

    const setupMerged = () => {
      mockGetProjectById.mockResolvedValue({
        uid: "0xproject",
        chainID: 42220,
        recipient: "0xrecipient",
        grants: [
          {
            uid: "0xgrantA",
            milestones: [{ uid: "0xm1", chainID: 42220, completed: { uid: "0xc1" } }],
          },
          {
            uid: "0xgrantB",
            milestones: [{ uid: "0xm2", chainID: 10, completed: { uid: "0xc2" } }],
          },
        ],
      });
    };

    it.each([
      ["project milestone", projectMilestone, setupProjectMilestone],
      ["single grant milestone", singleGrantMilestone, setupSingleGrant],
      ["merged grant milestones", mergedMilestone, setupMerged],
    ])(
      "rejects without ever polling when the revoke is rejected (%s)",
      async (_label, milestone, prepare) => {
        prepare();
        mockPerformOffChainRevoke.mockRejectedValue(
          Object.assign(new Error("Forbidden"), { surfaced: true })
        );

        const { result } = renderHook(() => useMilestone());

        await expect(
          act(async () => {
            await result.current.multiGrantUndoCompletion(milestone);
          })
        ).rejects.toBeTruthy();

        // The poll must never start when the revoke was rejected.
        expect(mockRetryUntilConditionMet).not.toHaveBeenCalled();
        expect(mockShowSuccess).not.toHaveBeenCalled();
      }
    );

    it("skips the generic toast for surfaced revoke errors but still reports telemetry", async () => {
      setupSingleGrant();
      mockPerformOffChainRevoke.mockRejectedValue(
        Object.assign(new Error("Forbidden"), { surfaced: true })
      );

      const { result } = renderHook(() => useMilestone());

      await expect(
        act(async () => {
          await result.current.multiGrantUndoCompletion(singleGrantMilestone);
        })
      ).rejects.toBeTruthy();

      expect(mockShowError).not.toHaveBeenCalled();
    });
  });

  describe("interactive indexing poll", () => {
    const singleGrantMilestone = { ...baseMilestone, uid: "0xgrantMilestone" } as any;

    beforeEach(() => {
      mockGetProjectById.mockResolvedValue({
        uid: "0xproject",
        chainID: 42220,
        recipient: "0xrecipient",
        grants: [
          {
            uid: "0xgrant",
            milestones: [
              { uid: "0xgrantMilestone", chainID: 42220, completed: { uid: "0xcompleted" } },
            ],
          },
        ],
      });
    });

    it("passes the bounded INTERACTIVE_INDEXING_POLL budget to the poll site", async () => {
      const { result } = renderHook(() => useMilestone());

      await act(async () => {
        await result.current.multiGrantUndoCompletion(singleGrantMilestone);
      });

      expect(mockRetryUntilConditionMet).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        INTERACTIVE_INDEXING_POLL.maxRetries,
        INTERACTIVE_INDEXING_POLL.delay
      );
    });

    it("surfaces an indexing-timeout message and rejects when the poll exhausts its budget", async () => {
      mockRetryUntilConditionMet.mockRejectedValue(new RetryConditionNotMetError());

      const { result } = renderHook(() => useMilestone());

      let caught: unknown;
      await act(async () => {
        await result.current.multiGrantUndoCompletion(singleGrantMilestone).catch((e) => {
          caught = e;
        });
      });

      expect(caught).toBeInstanceOf(IndexingTimeoutError);
      expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining("indexed"));
      // The rethrown error must carry the surfaced flag so outer catches
      // (e.g. DeleteDialog) skip their generic "Operation failed" toast
      // instead of stacking it on top of the timeout toast shown above.
      expect(isSurfacedError(caught)).toBe(true);
    });

    it("marks generic non-surfaced errors as surfaced after showing the specific toast", async () => {
      mockGetProjectById.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMilestone());

      let caught: unknown;
      await act(async () => {
        await result.current.multiGrantUndoCompletion(singleGrantMilestone).catch((e) => {
          caught = e;
        });
      });

      expect(mockShowError).toHaveBeenCalledTimes(1);
      expect(isSurfacedError(caught)).toBe(true);
    });
  });
});
