/**
 * Mutation tests for useMilestoneCancellation (DEV-523).
 *
 * The hook orchestrates FE-signed on-chain attestation/revocation via the SDK,
 * so we mock the SDK contract + chain setup and assert the hook builds the
 * right cancellation attestation, revokes the surfaced cancellation UID for
 * un-cancel, notifies the indexer, and guards completed/verified milestones.
 */
import { act, waitFor } from "@testing-library/react";
import { useMilestoneCancellation } from "@/hooks/useMilestoneCancellation";
import type {
  GrantMilestoneWithCompletion,
  ProjectGrantMilestonesResponse,
} from "@/services/milestones";
import { renderHookWithProviders } from "../../utils/render";

const MILESTONE_UID = "0x" + "a".repeat(64);
const CANCEL_ATTESTATION_UID = "0x" + "c".repeat(64);
const SCHEMA_UID = "0x" + "d".repeat(64);
const RECIPIENT = "0x1111111111111111111111111111111111111111";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xadmin", chain: { id: 42161 } }),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ switchChainAsync: vi.fn().mockResolvedValue(true) }),
}));

const { mockProjectById } = vi.hoisted(() => ({
  mockProjectById: vi.fn(),
}));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: vi.fn().mockResolvedValue({
      gapClient: {
        fetch: { projectById: mockProjectById },
        findSchema: () => ({ uid: SCHEMA_UID }),
      },
      walletSigner: { address: "0xadmin" },
    }),
  }),
}));

const { mockMultiAttest, mockMultiRevoke } = vi.hoisted(() => ({
  mockMultiAttest: vi.fn().mockResolvedValue({ tx: [{ hash: "0xattesttx" }] }),
  mockMultiRevoke: vi.fn().mockResolvedValue({ tx: [{ hash: "0xrevoketx" }] }),
}));

vi.mock("@show-karma/karma-gap-sdk/core/class/contract/GapContract", () => ({
  GapContract: { multiAttest: mockMultiAttest, multiRevoke: mockMultiRevoke },
}));

const { mockPayloadFor } = vi.hoisted(() => ({
  mockPayloadFor: vi.fn().mockResolvedValue({ payload: "cancelled-payload" }),
}));

vi.mock("@show-karma/karma-gap-sdk/core/class/types/attestations", () => ({
  MilestoneCompleted: class {
    data: unknown;
    constructor(args: { data: unknown }) {
      this.data = args.data;
    }
    payloadFor = mockPayloadFor;
  },
}));

const { mockFetchData } = vi.hoisted(() => ({
  mockFetchData: vi.fn().mockResolvedValue([null, null]),
}));

vi.mock("@/utilities/fetchData", () => ({ default: mockFetchData }));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    showLoading: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMixpanel", () => ({
  useMixpanel: () => ({ mixpanel: { reportEvent: vi.fn() } }),
}));

vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));

const baseMilestone = (
  overrides: Partial<GrantMilestoneWithCompletion> = {}
): GrantMilestoneWithCompletion => ({
  uid: MILESTONE_UID,
  chainId: 42161,
  title: "Milestone",
  description: "desc",
  dueDate: "2025-01-01",
  status: "pending",
  completionDetails: null,
  verificationDetails: null,
  fundingApplicationCompletion: null,
  ...overrides,
});

const data = {
  project: { uid: "0xproject" },
  grantMilestones: [],
} as unknown as ProjectGrantMilestonesResponse;

beforeEach(() => {
  vi.clearAllMocks();
  mockProjectById.mockResolvedValue({
    grants: [
      {
        details: { programId: "1013" },
        milestones: [{ uid: MILESTONE_UID, recipient: RECIPIENT }],
      },
    ],
  });
});

const renderCancellationHook = () =>
  renderHookWithProviders(() => useMilestoneCancellation({ projectId: "proj", programId: "1013" }));

describe("useMilestoneCancellation", () => {
  it("attests a cancelled milestone and notifies the indexer", async () => {
    const { result } = renderCancellationHook();

    await act(async () => {
      await result.current.cancelMilestone({
        milestone: baseMilestone(),
        data,
        reason: "superseded",
      });
    });

    await waitFor(() => expect(mockMultiAttest).toHaveBeenCalledTimes(1));
    expect(mockPayloadFor).toHaveBeenCalledWith(0);
    // Indexer notified with the attestation tx hash.
    expect(mockFetchData).toHaveBeenCalledWith(expect.stringContaining("0xattesttx"), "POST", {});
  });

  it("blocks cancelling a completed milestone", async () => {
    const { result } = renderCancellationHook();

    await expect(
      act(async () => {
        await result.current.cancelMilestone({
          milestone: baseMilestone({
            completionDetails: {
              description: "done",
              completedAt: "2025-01-02",
              completedBy: "0xgrantee",
            },
          }),
          data,
        });
      })
    ).rejects.toThrow(/already been completed or verified/);
    expect(mockMultiAttest).not.toHaveBeenCalled();
  });

  it("revokes the surfaced cancellation attestation for un-cancel", async () => {
    const { result } = renderCancellationHook();

    await act(async () => {
      await result.current.uncancelMilestone({
        milestone: baseMilestone({
          status: "cancelled",
          cancellation: {
            uid: CANCEL_ATTESTATION_UID,
            cancelledBy: "0xadmin",
            cancelledAt: null,
            reason: null,
          },
        }),
      });
    });

    await waitFor(() => expect(mockMultiRevoke).toHaveBeenCalledTimes(1));
    const revokeArg = mockMultiRevoke.mock.calls[0][1];
    expect(revokeArg[0].data[0].uid).toBe(CANCEL_ATTESTATION_UID);
  });

  it("errors on un-cancel when no cancellation uid is present", async () => {
    const { result } = renderCancellationHook();

    await expect(
      act(async () => {
        await result.current.uncancelMilestone({
          milestone: baseMilestone({ status: "cancelled" }),
        });
      })
    ).rejects.toThrow(/No active cancellation/);
    expect(mockMultiRevoke).not.toHaveBeenCalled();
  });
});
