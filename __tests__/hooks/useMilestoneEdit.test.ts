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

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue({}),
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
    expect(mockStartAttestation).toHaveBeenCalledWith("Step 1/2: Creating updated milestone...");

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
});
