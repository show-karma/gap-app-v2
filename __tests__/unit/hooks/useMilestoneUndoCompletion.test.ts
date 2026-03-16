import { act, renderHook } from "@testing-library/react";

const mockPerformOffChainRevoke = jest.fn();
const mockGetProjectById = jest.fn();
const mockGetProjectObjectives = jest.fn();
const mockRetryUntilConditionMet = jest.fn();
const mockRefetchUpdates = jest.fn();
const mockRefetchGrants = jest.fn();
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockStartAttestation = jest.fn();
const mockChangeStepperStep = jest.fn();
const mockDismiss = jest.fn();
const mockShowChainProgress = jest.fn();
const mockUseAccount = jest.fn();
const mockSwitchChainAsync = jest.fn();
const mockSetupChainAndWallet = jest.fn();

jest.mock("@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone", () => ({
  ProjectMilestone: {
    from: jest.fn(() => []),
  },
}));

jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ projectId: "project-slug" })),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("wagmi", () => ({
  useAccount: (...args: unknown[]) => mockUseAccount(...args),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(() => ({ switchChainAsync: mockSwitchChainAsync })),
}));

jest.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: jest.fn(() => ({
    startAttestation: mockStartAttestation,
    showLoading: jest.fn(),
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    changeStepperStep: mockChangeStepperStep,
    dismiss: mockDismiss,
    showChainProgress: mockShowChainProgress,
  })),
}));

jest.mock("@/hooks/useOffChainRevoke", () => ({
  useOffChainRevoke: jest.fn(() => ({
    performOffChainRevoke: mockPerformOffChainRevoke,
  })),
}));

jest.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: jest.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWallet,
  })),
}));
jest.mock("hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: jest.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWallet,
  })),
}));
jest.mock("../../../hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: jest.fn(() => ({
    setupChainAndWallet: mockSetupChainAndWallet,
  })),
}));

jest.mock("@/hooks/v2/useProjectUpdates", () => ({
  useProjectUpdates: jest.fn(() => ({
    refetch: mockRefetchUpdates,
  })),
}));

jest.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: jest.fn(() => ({
    refetch: mockRefetchGrants,
  })),
}));

jest.mock("@/utilities/sdk", () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

jest.mock("@/utilities/gapIndexerApi/getProjectObjectives", () => ({
  getProjectObjectives: (...args: unknown[]) => mockGetProjectObjectives(...args),
}));

jest.mock("@/utilities/retries", () => ({
  retryUntilConditionMet: (...args: unknown[]) => mockRetryUntilConditionMet(...args),
}));

jest.mock("@/store", () => {
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
    useProjectStore: jest.fn((selector?: any) => {
      if (!selector) return state;
      return selector(state);
    }),
    useOwnerStore: jest.fn((selector?: any) => {
      const ownerState = { isOwner: state.isOwner };
      if (!selector) return ownerState;
      return selector(ownerState);
    }),
  };
});

const { useMilestone } = require("@/hooks/useMilestone");

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
    jest.clearAllMocks();

    mockUseAccount.mockReturnValue({
      chain: { id: 42220 },
      address: "0xexternalWalletUser",
    });
    mockPerformOffChainRevoke.mockResolvedValue(true);
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
});
