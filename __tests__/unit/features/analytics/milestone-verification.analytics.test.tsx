/**
 * @file Analytics tests for `milestone_verified`.
 *
 * The event is emitted only after the on-chain attestation is *confirmed* —
 * not when the transaction is submitted, and not when the component unmounts
 * mid-poll. Both of those are silent early returns in the hook, so a
 * verification that never landed on chain would otherwise be indistinguishable
 * from one that did.
 *
 * The catalog carries `milestone_id` alone: `verifier_role` was dropped
 * because the verification hook is shared by the admin review screen and the
 * inbox and neither passes a role down, so the verifier's role lives on their
 * Mixpanel profile instead.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const chainSetup = vi.hoisted(() => ({ setupChainAndWallet: vi.fn() }));
const contract = vi.hoisted(() => ({ multiAttest: vi.fn(), multiRevoke: vi.fn() }));
const retries = vi.hoisted(() => ({
  retryUntilConditionMet: vi.fn(),
  // Also exported from this module and used by the hook's catch blocks.
  isAbortError: vi.fn(() => false),
}));
const cancellation = vi.hoisted(() => ({ rejectCancelledMilestone: vi.fn(() => false) }));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    setupChainAndWallet: chainSetup.setupChainAndWallet,
    smartWalletAddress: "0xsmart",
  }),
}));
vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ switchChainAsync: vi.fn() }) }));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca", chain: { id: 10 } }),
}));
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => ({ user: { id: "did:privy:1", linkedAccounts: [] } }),
}));
vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    startAttestation: vi.fn(),
    showLoading: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    changeStepperStep: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@show-karma/karma-gap-sdk/core/class/contract/GapContract", () => ({
  GapContract: contract,
}));
vi.mock("@show-karma/karma-gap-sdk/core/class/types/attestations", () => ({
  MilestoneCompleted: class {
    uid = "0xattestation";
    payloadFor = vi.fn().mockResolvedValue({});
  },
}));

vi.mock("@/services/milestones", () => ({
  attestMilestoneCompletionAsReviewer: vi.fn(),
  fetchGrantMilestonesForProgram: vi.fn().mockResolvedValue({ grantMilestones: [] }),
}));
vi.mock("@/utilities/auth/compare-all-wallets", () => ({
  getLinkedWalletAddresses: () => ["0xabcabcabcabcabcabcabcabcabcabcabcabcabca"],
}));
vi.mock("@/utilities/indexer-notification", () => ({ notifyIndexer: vi.fn() }));
// These utility modules export several helpers the hook uses in its guards and
// catch blocks. Spread the real module and override only what the test drives,
// so a helper added later does not silently become undefined here.
vi.mock("@/utilities/milestones/cancellation", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  rejectCancelledMilestone: cancellation.rejectCancelledMilestone,
}));
vi.mock("@/utilities/milestones/attestationIdentity", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  requireMilestoneRecipient: () => "0xrecipient",
}));
// The poll resolving is what "confirmed on chain" means to the hook.
vi.mock("@/utilities/retries", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  retryUntilConditionMet: retries.retryUntilConditionMet,
}));
vi.mock("@/utilities/query-client", () => ({
  queryClient: { invalidateQueries: vi.fn(), refetchQueries: vi.fn(), setQueryData: vi.fn() },
}));
vi.mock("@/utilities/queryKeys", () => ({
  QUERY_KEYS: {
    MILESTONES: { PROJECT_GRANT_MILESTONES: () => ["milestones"] },
    COMMUNITY: {
      REPORT_MILESTONES: () => ["reportMilestones"],
      PENDING_VERIFICATION: () => ["pendingVerification"],
    },
  },
  createProjectQueryPredicate: () => () => false,
}));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));

import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";

const MILESTONE_UID = "0xmilestone";
const PROJECT_UID = "0xproject";

const milestone = {
  uid: MILESTONE_UID,
  chainId: 10,
  chainID: 10,
  refUID: "0xgrant",
  title: "Sensitive milestone title",
  completionDetails: { description: "done" },
  verificationDetails: undefined,
} as never;

const data = { project: { uid: PROJECT_UID } } as never;

const eventNames = () => vi.mocked(track).mock.calls.map(([name]) => name);
const propsOf = (name: string) =>
  vi.mocked(track).mock.calls.find(([eventName]) => eventName === name)?.[1] as
    | Record<string, unknown>
    | undefined;

const verify = async () => {
  const { result } = renderHook(() =>
    useMilestoneCompletionVerification({
      projectId: PROJECT_UID,
      programId: "prog-1",
      onSuccess: vi.fn(),
    })
  );
  await act(async () => {
    await result.current.verifyMilestone(milestone, false, data, "Looks good").catch(() => {});
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  cancellation.rejectCancelledMilestone.mockReturnValue(false);
  retries.retryUntilConditionMet.mockResolvedValue(true);
  contract.multiAttest.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
  chainSetup.setupChainAndWallet.mockResolvedValue({
    // `getAddress` is required: the hook resolves the signer address to build
    // its attester-candidate list before it will attest at all.
    walletSigner: {
      getAddress: vi.fn().mockResolvedValue("0xabcabcabcabcabcabcabcabcabcabcabcabcabca"),
    },
    gapClient: { findSchema: vi.fn(() => ({ uid: "schema" })) },
    chainId: 10,
  });
});

describe("useMilestoneCompletionVerification analytics", () => {
  it("emits milestone_verified with only the milestone id", async () => {
    await verify();

    await waitFor(() => expect(eventNames()).toContain("milestone_verified"));
    expect(propsOf("milestone_verified")).toEqual({ milestone_id: MILESTONE_UID });
  });

  it("carries no verifier role or wallet — those live on the profile", async () => {
    await verify();

    await waitFor(() => expect(eventNames()).toContain("milestone_verified"));
    const props = propsOf("milestone_verified");
    expect(props).not.toHaveProperty("verifier_role");
    const serialised = JSON.stringify(vi.mocked(track).mock.calls);
    expect(serialised).not.toContain("0xabcabcabcabcabcabcabcabcabcabcabcabcabca");
    expect(serialised).not.toContain("Sensitive milestone title");
  });

  it("emits nothing when the wallet cannot be prepared", async () => {
    chainSetup.setupChainAndWallet.mockResolvedValue(null);

    await verify();

    expect(contract.multiAttest).not.toHaveBeenCalled();
    expect(eventNames()).not.toContain("milestone_verified");
  });

  it("emits nothing for a cancelled milestone", async () => {
    cancellation.rejectCancelledMilestone.mockReturnValue(true);

    await verify();

    expect(eventNames()).not.toContain("milestone_verified");
  });

  it("does not report a verification whose attestation never confirms", async () => {
    // The poll never satisfies its condition, so the hook treats the
    // attestation as unconfirmed and throws rather than reporting success.
    retries.retryUntilConditionMet.mockRejectedValue(new Error("never indexed"));

    await verify();

    await waitFor(() => expect(contract.multiAttest).toHaveBeenCalled());
    // Submitted is not verified: reporting here would count attestations that
    // never landed on chain.
    expect(eventNames()).not.toContain("milestone_verified");
  });
});
