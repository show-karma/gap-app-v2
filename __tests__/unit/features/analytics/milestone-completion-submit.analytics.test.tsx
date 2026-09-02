/**
 * @file Analytics tests for `milestone_completion_failed`.
 *
 * The interesting contract here is what does NOT count as a failure. The hook
 * deliberately excludes two error classes from the event:
 *
 *   - a user closing the wallet popup, which is a decision rather than a
 *     failure — counting it would make the completion funnel unreadable, since
 *     wallet dismissals are common and say nothing about the product working;
 *   - an abort from the component unmounting mid-mutation, which is our own
 *     lifecycle, not the user's outcome.
 *
 * Both exclusions are silent by construction, so only a test can hold them in
 * place. The genuine failure path is asserted to carry a machine error code
 * rather than the wallet's own message.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { track } from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));

const chainSetup = vi.hoisted(() => ({ setupChainAndWallet: vi.fn() }));
const walletErrors = vi.hoisted(() => ({ isUserCancellationError: vi.fn(() => false) }));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({ setupChainAndWallet: chainSetup.setupChainAndWallet }),
}));
vi.mock("@/hooks/useWallet", () => ({ useWallet: () => ({ switchChainAsync: vi.fn() }) }));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca", chain: { id: 10 } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/utilities/wallet-errors", () => walletErrors);
vi.mock("@show-karma/karma-gap-sdk/core/class/types/attestations", () => ({
  MilestoneCompleted: class {
    uid = "0xcompleted";
    payloadFor = vi.fn().mockResolvedValue({});
    attest = vi.fn();
  },
}));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));
vi.mock("@/src/features/payout-disbursement/services/payout-disbursement.service", () => ({
  submitGranteeInvoice: vi.fn(),
}));
vi.mock("@/utilities/api/client", () => ({ api: { post: vi.fn(), get: vi.fn() } }));
vi.mock("@/utilities/indexer", () => ({
  INDEXER: { ATTESTATION_LISTENER: () => "/listener" },
}));

import { useSubmitMilestoneCompletion } from "@/src/features/applications/hooks/use-submit-milestone-completion";

const MILESTONE_UID = "0xmilestone";

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

const params = {
  milestoneUID: MILESTONE_UID,
  milestoneTitle: "A milestone",
  statusEntry: { chainID: 10, grantUID: "0xgrant" },
  application: { id: "app-1" },
} as never;

const submitAndSettle = async () => {
  const { result } = renderHook(() => useSubmitMilestoneCompletion(), { wrapper });
  await act(async () => {
    await result.current.submit(params).catch(() => {});
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  walletErrors.isUserCancellationError.mockReturnValue(false);
});

describe("useSubmitMilestoneCompletion analytics", () => {
  it("reports milestone_completion_failed with a machine code, never the message", async () => {
    chainSetup.setupChainAndWallet.mockRejectedValue(
      new Error("execution reverted: insufficient funds at 0xdeadbeef")
    );

    await submitAndSettle();

    await waitFor(() => expect(eventNames()).toContain("milestone_completion_failed"));
    const props = propsOf("milestone_completion_failed");
    expect(Object.keys(props ?? {}).sort()).toEqual(["error_code", "milestone_id"]);
    expect(props).toMatchObject({ milestone_id: MILESTONE_UID });
    expect(JSON.stringify(props)).not.toContain("insufficient funds");
  });

  it("does NOT report a failure when the user dismisses the wallet popup", async () => {
    walletErrors.isUserCancellationError.mockReturnValue(true);
    chainSetup.setupChainAndWallet.mockRejectedValue(new Error("User rejected the request"));

    await submitAndSettle();

    // A dismissed wallet popup is a decision, not a product failure. Counting
    // it would drown the real failure rate in ordinary user hesitation.
    expect(eventNames()).not.toContain("milestone_completion_failed");
  });

  it("reports nothing at all when there is no connected wallet", async () => {
    // The hook throws before any attestation is attempted; there is no
    // completion to have failed.
    chainSetup.setupChainAndWallet.mockResolvedValue(null);

    await submitAndSettle();

    expect(eventNames()).not.toContain("milestone_completed");
  });
});
