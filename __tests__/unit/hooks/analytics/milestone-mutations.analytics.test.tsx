/**
 * @file Analytics tests for the milestone mutation hooks.
 *
 * Sibling of `mutation-hooks.analytics.test.tsx` rather than an addition to it:
 * these hooks need module-level mocks (the indexer API client, the GAP
 * contract, the chain/wallet setup) that would leak into the suites already
 * living there.
 *
 * The shape worth pinning across all four hooks is the same: every milestone
 * event carries a `milestone_id` and nothing else that could identify a person.
 * The edit triad additionally carries `fields_changed`, which must be field
 * NAMES only — the values are the grantee's own content.
 *
 * `milestone_delete_requested` is emitted *before* the network call on purpose,
 * so an abandoned or failing delete still records the intent. That ordering is
 * what makes "requested but never completed" measurable, so it is asserted
 * explicitly rather than left to the happy path.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const apiClient = vi.hoisted(() => ({
  deleteFn: vi.fn(),
  putFn: vi.fn(),
}));
vi.mock("@/utilities/auth/api-client", () => ({
  createAuthenticatedApiClient: () => ({ delete: apiClient.deleteFn, put: apiClient.putFn }),
}));

const chainSetup = vi.hoisted(() => ({ setupChainAndWallet: vi.fn() }));
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({ setupChainAndWallet: chainSetup.setupChainAndWallet }),
}));
vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ switchChainAsync: vi.fn() }) }));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca", chain: { id: 10 } }),
  // The edit hook transitively imports the wagmi config module.
  createConfig: vi.fn(() => ({})),
  http: vi.fn(),
  createStorage: vi.fn(() => ({})),
  cookieStorage: {},
  useChainId: () => 10,
  useConfig: () => ({}),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
  useWalletClient: () => ({ data: undefined }),
  usePublicClient: () => undefined,
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showLoading: vi.fn(),
    dismiss: vi.fn(),
    startAttestation: vi.fn(),
    changeStepperStep: vi.fn(),
    setIsStepper: vi.fn(),
  }),
}));

const gapContract = vi.hoisted(() => ({
  multiAttest: vi.fn(),
  multiRevoke: vi.fn(),
  attest: vi.fn(),
}));
vi.mock("@show-karma/karma-gap-sdk/core/class/contract/GapContract", () => ({
  GapContract: gapContract,
}));
vi.mock("@show-karma/karma-gap-sdk/core/class/types/attestations", () => ({
  MilestoneCompleted: class {
    uid = "0xcompleted";
    // The cancel path builds an attestation and asks it for a payload before
    // handing that to GapContract.multiAttest.
    payloadFor = vi.fn().mockResolvedValue({});
  },
}));

vi.mock("@/utilities/indexer-notification", () => ({ notifyIndexer: vi.fn() }));
vi.mock("@/utilities/milestones/attestationIdentity", () => ({
  requireMilestoneRecipient: () => "0xrecipient",
}));
vi.mock("@/utilities/milestones/cancellation", () => ({ isMilestoneCancelled: () => false }));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));
// `RPC` is read at module load by the rpc/gap client chain that the edit hook
// pulls in transitively; a partial envVars mock turns that into an import-time
// TypeError rather than a test failure.
vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.test",
    RPC: {
      MAINNET: "https://rpc.test/mainnet",
      OPTIMISM: "https://rpc.test/optimism",
      ARBITRUM: "https://rpc.test/arbitrum",
      BASE: "https://rpc.test/base",
      CELO: "https://rpc.test/celo",
      SEPOLIA: "https://rpc.test/sepolia",
      OPT_SEPOLIA: "https://rpc.test/opt-sepolia",
      BASE_SEPOLIA: "https://rpc.test/base-sepolia",
    },
  },
}));
vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    MILESTONE: {
      ON_CHAIN_DELETE: (uid: string) => `/milestone/${uid}`,
      ON_CHAIN_EDIT: (uid: string) => `/milestone/${uid}/edit`,
    },
  },
}));
vi.mock("@/utilities/queryKeys", () => ({
  QUERY_KEYS: {
    MILESTONES: { PROJECT_GRANT_MILESTONES: () => ["milestones"] },
    // The edit hook reads [0] off each of these to build invalidation keys.
    COMMUNITY: {
      REPORT_MILESTONES: () => ["reportMilestones"],
      PENDING_VERIFICATION: () => ["pendingVerificationMilestones"],
    },
  },
  createProjectQueryPredicate: () => () => false,
}));
vi.mock("@/utilities/query-client", () => ({
  queryClient: { invalidateQueries: vi.fn(), refetchQueries: vi.fn(), setQueryData: vi.fn() },
}));
// Resolve immediately: the edit hook polls for the new milestone, and the
// analytics assertions are about what the terminal legs carry, not the poll.
vi.mock("@/utilities/retries", () => ({ retryUntilConditionMet: vi.fn().mockResolvedValue(true) }));
vi.mock("@/utilities/sdk", () => ({ getProjectById: vi.fn().mockResolvedValue(null) }));
vi.mock("@/utilities/chainNameDictionary", () => ({ chainNameDictionary: () => "Optimism" }));
vi.mock("@/utilities/api/client", () => ({ api: { post: vi.fn(), put: vi.fn(), get: vi.fn() } }));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/store", () => ({
  useProjectStore: (selector: (s: unknown) => unknown) =>
    selector({ project: { uid: "0xproject", details: { slug: "proj" } } }),
}));
vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: () => ({ refetch: vi.fn().mockResolvedValue({ data: [] }) }),
}));
vi.mock("@/utilities/sanitize", () => ({ sanitizeObject: (o: unknown) => o }));

import { useDeleteMilestone } from "@/hooks/useDeleteMilestone";
import { useMilestoneCancellation } from "@/hooks/useMilestoneCancellation";
import { useMilestoneEdit } from "@/hooks/useMilestoneEdit";

const MILESTONE_UID = "0xmilestone";
const WALLET = "0xabcabcabcabcabcabcabcabcabcabcabcabcabca";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const eventNames = () => vi.mocked(track).mock.calls.map(([name]) => name);
const propsOf = (name: string) =>
  vi.mocked(track).mock.calls.find(([eventName]) => eventName === name)?.[1] as
    | Record<string, unknown>
    | undefined;

const milestone = {
  uid: MILESTONE_UID,
  chainId: 10,
  chainID: 10,
  refUID: "0xgrant",
  title: "Sensitive milestone title",
  // A cancellable milestone must be neither completed nor verified; the
  // uncancel path needs an existing cancellation attestation to revoke.
  completionDetails: undefined,
  verificationDetails: undefined,
  cancellation: { uid: "0xcancellation" },
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  chainSetup.setupChainAndWallet.mockResolvedValue({
    walletSigner: {},
    gapClient: { findSchema: vi.fn(() => ({ uid: "schema" })) },
    chainId: 10,
  });
  gapContract.multiAttest.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
  gapContract.multiRevoke.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
  gapContract.attest.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
});

describe("useDeleteMilestone", () => {
  const renderDeleteHook = () =>
    renderHook(
      () => useDeleteMilestone({ projectId: "0xproject", programId: "prog-1", onSuccess: vi.fn() }),
      { wrapper }
    );

  it("reports the request and the completion of a successful delete", async () => {
    apiClient.deleteFn.mockResolvedValue({ data: { revocationSuccess: true } });

    const { result } = renderDeleteHook();
    await act(async () => {
      result.current.deleteMilestone(milestone);
    });

    await waitFor(() => expect(eventNames()).toContain("milestone_delete_completed"));
    expect(propsOf("milestone_delete_requested")).toEqual({ milestone_id: MILESTONE_UID });
    expect(propsOf("milestone_delete_completed")).toEqual({ milestone_id: MILESTONE_UID });
  });

  it("reports the request BEFORE the network call, so an abandoned delete still counts", async () => {
    apiClient.deleteFn.mockRejectedValue(new Error("network down"));

    const { result } = renderDeleteHook();
    await act(async () => {
      result.current.deleteMilestone(milestone);
    });

    await waitFor(() => expect(eventNames()).toContain("milestone_delete_failed"));
    // The request leg must survive a failed delete — otherwise
    // "requested but never completed" is unmeasurable.
    expect(eventNames()).toContain("milestone_delete_requested");
    expect(eventNames()).not.toContain("milestone_delete_completed");
  });

  it("reports a machine error_code on failure, never the error message", async () => {
    apiClient.deleteFn.mockRejectedValue(new Error("boom: wallet 0xdeadbeef rejected"));

    const { result } = renderDeleteHook();
    await act(async () => {
      result.current.deleteMilestone(milestone);
    });

    await waitFor(() => expect(eventNames()).toContain("milestone_delete_failed"));
    const props = propsOf("milestone_delete_failed");
    expect(Object.keys(props ?? {}).sort()).toEqual(["error_code", "milestone_id"]);
    expect(JSON.stringify(props)).not.toContain("boom: wallet 0xdeadbeef rejected");
  });

  it("never puts the milestone title or a wallet address on a delete event", async () => {
    apiClient.deleteFn.mockResolvedValue({ data: { revocationSuccess: true } });

    const { result } = renderDeleteHook();
    await act(async () => {
      result.current.deleteMilestone(milestone);
    });

    await waitFor(() => expect(eventNames()).toContain("milestone_delete_completed"));
    const serialised = JSON.stringify(vi.mocked(track).mock.calls);
    expect(serialised).not.toContain("Sensitive milestone title");
    expect(serialised).not.toContain(WALLET);
  });
});

describe("useMilestoneCancellation", () => {
  const renderCancelHook = () =>
    renderHook(
      () =>
        useMilestoneCancellation({
          projectId: "0xproject",
          programId: "prog-1",
          onSuccess: vi.fn(),
        }),
      { wrapper }
    );

  it("reports milestone_cancel_completed with only the milestone id", async () => {
    const { result } = renderCancelHook();
    await act(async () => {
      await result.current
        .cancelMilestone({ milestone, reason: "no longer needed" })
        .catch(() => {});
    });

    await waitFor(() => expect(eventNames()).toContain("milestone_cancel_completed"));
    expect(propsOf("milestone_cancel_completed")).toEqual({ milestone_id: MILESTONE_UID });
  });

  it("reports milestone_uncancel_completed as a distinct event, not a cancel", async () => {
    const { result } = renderCancelHook();
    await act(async () => {
      await result.current.uncancelMilestone({ milestone }).catch(() => {});
    });

    await waitFor(() => expect(eventNames()).toContain("milestone_uncancel_completed"));
    expect(propsOf("milestone_uncancel_completed")).toEqual({ milestone_id: MILESTONE_UID });
    // Restoring a milestone must not also count as cancelling one, or the two
    // net out to zero in any funnel that subtracts them.
    expect(eventNames()).not.toContain("milestone_cancel_completed");
  });

  it("reports nothing when the wallet cannot be prepared", async () => {
    chainSetup.setupChainAndWallet.mockResolvedValue(null);

    const { result } = renderCancelHook();
    await act(async () => {
      await result.current
        .cancelMilestone({ milestone, reason: "no longer needed" })
        .catch(() => {});
    });

    await waitFor(() => expect(chainSetup.setupChainAndWallet).toHaveBeenCalled());
    expect(eventNames()).not.toContain("milestone_cancel_completed");
  });
});

describe("useMilestoneEdit", () => {
  // `programId` routes the hook down the backend on-chain edit API, which is
  // the path both admin screens use.
  const renderEditHook = () =>
    renderHook(() => useMilestoneEdit({ projectUid: "0xproject", programId: "prog-1" }), {
      wrapper,
    });

  const editData = {
    title: "A new title",
    description: "A new description",
    endsAt: undefined,
  } as never;

  it("reports the requested and completed legs of a successful edit", async () => {
    apiClient.putFn.mockResolvedValue({
      data: { txHash: "0xtx", newMilestoneUID: "0xnew", revocationSuccess: true },
    });

    const { result } = renderEditHook();
    await act(async () => {
      await result.current.editMilestone(milestone, editData).catch(() => {});
    });

    await waitFor(() => expect(eventNames()).toContain("milestone_edit_completed"));
    expect(eventNames()).toContain("milestone_edit_requested");
  });

  it("sends fields_changed as field NAMES only, never the new values", async () => {
    apiClient.putFn.mockResolvedValue({
      data: { txHash: "0xtx", newMilestoneUID: "0xnew", revocationSuccess: true },
    });

    const { result } = renderEditHook();
    await act(async () => {
      await result.current.editMilestone(milestone, editData).catch(() => {});
    });

    await waitFor(() => expect(eventNames()).toContain("milestone_edit_requested"));
    const props = propsOf("milestone_edit_requested");
    expect(Object.keys(props ?? {}).sort()).toEqual(["fields_changed", "milestone_id"]);
    const fields = (props as { fields_changed: string[] }).fields_changed;
    expect(fields).toContain("title");
    expect(fields).toContain("description");
    // Undefined entries are not "changed" — including them would report every
    // field on every edit and make the property meaningless.
    expect(fields).not.toContain("endsAt");
    // The grantee's new copy is content, not telemetry.
    expect(JSON.stringify(props)).not.toContain("A new description");
  });

  it("reports the requested leg even when the edit fails, and a machine code with it", async () => {
    apiClient.putFn.mockRejectedValue(new Error("indexer exploded at 0xdeadbeef"));

    const { result } = renderEditHook();
    await act(async () => {
      await result.current.editMilestone(milestone, editData).catch(() => {});
    });

    await waitFor(() => expect(eventNames()).toContain("milestone_edit_failed"));
    expect(eventNames()).toContain("milestone_edit_requested");
    expect(eventNames()).not.toContain("milestone_edit_completed");

    const props = propsOf("milestone_edit_failed");
    expect(Object.keys(props ?? {}).sort()).toEqual(["error_code", "milestone_id"]);
    expect(JSON.stringify(props)).not.toContain("indexer exploded at 0xdeadbeef");
  });
});
