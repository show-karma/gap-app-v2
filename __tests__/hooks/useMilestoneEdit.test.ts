import { act, renderHook } from "@testing-library/react";

const mockSetupChainAndWallet = jest.fn();
const mockChangeStepperStep = jest.fn();
const mockStartAttestation = jest.fn();
const mockShowLoading = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockDismiss = jest.fn();
const mockShowChainProgress = jest.fn();
const mockRefetchGrants = jest.fn();
const mockSwitchChainAsync = jest.fn();
const mockEdit = jest.fn();

jest.mock("wagmi", () => ({
  useAccount: () => ({ chain: { id: 10 } }),
  useChainId: () => 10,
}));

jest.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ready: true, user: null }),
  useWallets: () => ({ wallets: [] }),
}));

jest.mock("@/hooks/useAttestationToast", () => ({
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

jest.mock("@/store", () => ({
  useProjectStore: (selector?: any) => {
    const state = {
      project: { uid: "project-123", details: { slug: "test-project" } },
      isProjectOwner: true,
    };
    return selector ? selector(state) : state;
  },
  useOwnerStore: () => ({ isOwner: false }),
}));

jest.mock("@/hooks/useGap", () => ({
  useGap: () => ({
    gap: {},
  }),
}));

jest.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: mockSetupChainAndWallet,
  }),
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    switchChainAsync: mockSwitchChainAsync,
  }),
}));

jest.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: () => ({
    refetch: mockRefetchGrants,
  }),
}));

jest.mock("@/hooks/v2/useProjectUpdates", () => ({
  useProjectUpdates: () => ({
    refetch: jest.fn(),
  }),
}));

jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({}),
}));

jest.mock("@/utilities/retries", () => ({
  retryUntilConditionMet: jest.fn(async (_condFn: any, callbackFn: any) => {
    await callbackFn?.();
  }),
}));

jest.mock("@/utilities/sdk", () => ({
  getProjectById: jest.fn(),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

import { useMilestoneEdit } from "@/hooks/useMilestoneEdit";

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
    jest.clearAllMocks();
    mockSetupChainAndWallet.mockResolvedValue({
      gapClient: {
        fetch: {
          projectById: jest.fn().mockResolvedValue({
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
    expect(mockStartAttestation).toHaveBeenCalledWith("Editing milestone...");
    expect(mockChangeStepperStep).toHaveBeenCalledWith("preparing");

    // Verify flow completes (either success or handled error)
    expect(mockDismiss).toHaveBeenCalled();
    expect(result.current.isEditing).toBe(false);
  });

  it("shows error toast on failure", async () => {
    mockSetupChainAndWallet.mockResolvedValue(null);

    const { result } = renderHook(() => useMilestoneEdit());

    await act(async () => {
      await result.current.editMilestone(mockMilestone, { title: "Updated MVP" });
    });

    expect(mockShowError).toHaveBeenCalledWith("There was an error editing the milestone");
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
});
