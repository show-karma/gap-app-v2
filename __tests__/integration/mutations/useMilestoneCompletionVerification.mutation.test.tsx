/**
 * Flow tests for useMilestoneCompletionVerification (super-gap #63/#64/#66/#67).
 *
 * These cover the four defects behind GAP-FRONTEND-261:
 *  - #63 no V1 `GET /projects/:uid` anywhere in a verify/complete run; the
 *    attested recipient comes from the V2 milestone payload and a missing one
 *    blocks BEFORE any transaction;
 *  - #64 failures name their cause and carry a step marker into Sentry;
 *  - #66 the indexing poll matches the Privy-resolved signer, not wagmi;
 *  - #67 a null wagmi address after the tx can no longer fail the run.
 */

import type { User } from "@privy-io/react-auth";
import { act, waitFor } from "@testing-library/react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useMilestoneCompletionVerification } from "@/hooks/useMilestoneCompletionVerification";
import type {
  GrantMilestoneWithCompletion,
  ProjectGrantMilestonesResponse,
} from "@/services/milestones";
import { HttpError } from "@/utilities/api/errors";
import {
  CANCELLED_MILESTONE_COMPLETE_MESSAGE,
  CANCELLED_MILESTONE_VERIFY_MESSAGE,
} from "@/utilities/milestones/cancellation";
import { renderHookWithProviders } from "../../utils/render";

// Hoisted so the `vi.mock` factories below (which run before the module body)
// can read them. wagmi's account is deliberately a DIFFERENT wallet from the
// signer in every test — the hybrid Privy account shape that made the old poll
// unmatchable (#66).
const {
  PROJECT_UID,
  MILESTONE_UID,
  RECIPIENT,
  SIGNER_ADDRESS,
  WAGMI_ADDRESS,
  PROGRAM_ID,
  wagmiAccount,
} = vi.hoisted(() => ({
  PROJECT_UID: "0xproject",
  MILESTONE_UID: `0x${"a".repeat(64)}`,
  RECIPIENT: "0x1111111111111111111111111111111111111111",
  SIGNER_ADDRESS: "0x2222222222222222222222222222222222222222",
  WAGMI_ADDRESS: "0x3333333333333333333333333333333333333333",
  PROGRAM_ID: "1013",
  wagmiAccount: {
    current: { address: undefined as string | undefined, chain: { id: 42161 } },
  },
}));

vi.mock("wagmi", () => ({
  useAccount: () => wagmiAccount.current,
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ switchChainAsync: vi.fn().mockResolvedValue(true) }),
}));

const { mockProjectById, mockGetAddress } = vi.hoisted(() => ({
  mockProjectById: vi.fn(),
  mockGetAddress: vi.fn(),
}));

vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: () => ({
    smartWalletAddress: SIGNER_ADDRESS,
    setupChainAndWallet: vi.fn().mockResolvedValue({
      gapClient: {
        fetch: { projectById: mockProjectById },
        findSchema: () => ({ uid: `0x${"d".repeat(64)}` }),
      },
      walletSigner: { getAddress: mockGetAddress },
      chainId: 42161,
      isGasless: true,
    }),
  }),
}));

const { mockMultiAttest } = vi.hoisted(() => ({
  mockMultiAttest: vi.fn(),
}));

vi.mock("@show-karma/karma-gap-sdk/core/class/contract/GapContract", () => ({
  GapContract: { multiAttest: mockMultiAttest },
}));

const { mockPayloadFor, attestationArgs } = vi.hoisted(() => ({
  mockPayloadFor: vi.fn(),
  attestationArgs: [] as Array<{ recipient: string; data: { type: string } }>,
}));

vi.mock("@show-karma/karma-gap-sdk/core/class/types/attestations", () => ({
  MilestoneCompleted: class {
    constructor(args: { recipient: string; data: { type: string } }) {
      attestationArgs.push(args);
    }
    payloadFor = mockPayloadFor;
  },
}));

const { mockApiGet, mockApiPost } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
}));

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

const { mockAttestAsReviewer } = vi.hoisted(() => ({
  mockAttestAsReviewer: vi.fn(),
}));

vi.mock("@/services/milestones", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/milestones")>();
  return { ...actual, attestMilestoneCompletionAsReviewer: mockAttestAsReviewer };
});

// Keep the real polling semantics but collapse the 200 × 1.5s budget so a
// never-satisfied condition surfaces its timeout inside the test timeout.
vi.mock("@/utilities/retries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utilities/retries")>();
  return {
    ...actual,
    retryUntilConditionMet: (
      conditionFn: () => Promise<boolean>,
      callbackFn?: () => void,
      _maxRetries?: number,
      _delay?: number,
      signal?: AbortSignal
    ) => actual.retryUntilConditionMet(conditionFn, callbackFn, 3, 0, signal),
  };
});

const { toastSpies } = vi.hoisted(() => ({
  toastSpies: {
    startAttestation: vi.fn(),
    showLoading: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    changeStepperStep: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("@/hooks/useAttestationToast", () => ({
  useAttestationToast: () => toastSpies,
}));

vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));

const milestone = (
  overrides: Partial<GrantMilestoneWithCompletion> = {}
): GrantMilestoneWithCompletion => ({
  uid: MILESTONE_UID,
  chainId: 42161,
  title: "Milestone",
  description: "desc",
  dueDate: "2025-01-01",
  status: "pending",
  recipient: RECIPIENT,
  completionDetails: null,
  verificationDetails: null,
  ...overrides,
});

const projectData = {
  project: { uid: PROJECT_UID },
  grantMilestones: [],
} as unknown as ProjectGrantMilestonesResponse;

/** The V2 project-updates payload the poll re-reads. */
const indexedResponse = (grantMilestone: Record<string, unknown>) => ({
  projectUpdates: [],
  projectMilestones: [],
  grantMilestones: [grantMilestone],
});

const verifiedBySigner = () =>
  indexedResponse({
    uid: MILESTONE_UID,
    chainId: 42161,
    title: "Milestone",
    description: "desc",
    dueDate: "2025-01-01",
    status: "verified",
    recipient: RECIPIENT,
    completionDetails: { description: "done", completedAt: "", completedBy: SIGNER_ADDRESS },
    verificationDetails: {
      description: "ok",
      verifiedAt: "",
      verifiedBy: SIGNER_ADDRESS,
      attestationUID: `0x${"f".repeat(64)}`,
    },
  });

const privyUser = {
  linkedAccounts: [{ type: "email", address: "user@example.com" }],
} as unknown as User;

const renderVerificationHook = () =>
  renderHookWithProviders(
    () => useMilestoneCompletionVerification({ projectId: PROJECT_UID, programId: PROGRAM_ID }),
    { authState: { user: privyUser } }
  );

/** V1 project reads are `GET /projects/:uid`; the V2 reads are `/v2/...`. */
const v1ProjectCalls = () =>
  mockApiGet.mock.calls.filter(([url]) => typeof url === "string" && /^\/projects\//.test(url));

beforeEach(() => {
  vi.clearAllMocks();
  attestationArgs.length = 0;
  wagmiAccount.current = { address: WAGMI_ADDRESS, chain: { id: 42161 } };
  mockGetAddress.mockResolvedValue(SIGNER_ADDRESS);
  mockPayloadFor.mockResolvedValue({ payload: "attestation-payload" });
  mockMultiAttest.mockResolvedValue({ tx: [{ hash: "0xattesttx" }] });
  mockApiPost.mockResolvedValue({});
  mockApiGet.mockResolvedValue(verifiedBySigner());
  mockAttestAsReviewer.mockResolvedValue({ txHash: "0xbackendtx", attestationUID: "0xuid" });
});

describe("useMilestoneCompletionVerification — verify", () => {
  it("completes without a single V1 project fetch (#63)", async () => {
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(milestone(), false, projectData, "looks good");
    });

    await waitFor(() => expect(toastSpies.showSuccess).toHaveBeenCalled());
    expect(mockProjectById).not.toHaveBeenCalled();
    expect(v1ProjectCalls()).toHaveLength(0);
    expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("/v2/projects/"));
  });

  it("attests with the recipient from the V2 milestone payload (#63)", async () => {
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(milestone(), false, projectData, "looks good");
    });

    await waitFor(() => expect(mockMultiAttest).toHaveBeenCalledTimes(1));
    expect(attestationArgs).toHaveLength(2);
    for (const args of attestationArgs) {
      expect(args.recipient).toBe(RECIPIENT);
    }
    expect(attestationArgs.map((a) => a.data.type)).toEqual(["completed", "verified"]);
  });

  it("blocks a milestone with no recipient before any transaction (#63)", async () => {
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(
        milestone({ recipient: undefined }),
        false,
        projectData,
        "looks good"
      );
    });

    expect(mockMultiAttest).not.toHaveBeenCalled();
    expect(toastSpies.showError).toHaveBeenCalledWith(
      expect.stringContaining("missing its on-chain recipient")
    );
  });

  it("skips the completion attestation when the milestone is already completed", async () => {
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(
        milestone({
          completionDetails: { description: "done", completedAt: "", completedBy: RECIPIENT },
        }),
        false,
        projectData,
        "looks good"
      );
    });

    await waitFor(() => expect(mockMultiAttest).toHaveBeenCalledTimes(1));
    expect(attestationArgs.map((a) => a.data.type)).toEqual(["verified"]);
  });

  it("matches the poll on the Privy signer, not the wagmi account (#66)", async () => {
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(milestone(), false, projectData, "looks good");
    });

    // The indexed attester is the signer; wagmi reports an unrelated wallet.
    await waitFor(() =>
      expect(toastSpies.showSuccess).toHaveBeenCalledWith(
        "Milestone completed and verified successfully!"
      )
    );
    expect(wagmiAccount.current.address).toBe(WAGMI_ADDRESS);
    expect(toastSpies.showError).not.toHaveBeenCalled();
  });

  it("succeeds with a null wagmi address after the transaction (#67)", async () => {
    wagmiAccount.current = { address: undefined, chain: { id: 42161 } };
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(milestone(), false, projectData, "looks good");
    });

    await waitFor(() => expect(toastSpies.showSuccess).toHaveBeenCalled());
    expect(toastSpies.showError).not.toHaveBeenCalled();
    expect(errorManager).not.toHaveBeenCalled();
  });

  it.each([
    ["Base", 8453, "0x7177AdC0f924b695C0294A40C4C5FEFf5EE1E141"],
    ["Arbitrum", 42161, "0x6dC1D6b864e8BEf815806f9e4677123496e12026"],
  ])(
    "matches the poll on the %s MultiAttester contract EAS records as attester",
    async (_network, chainId, multiAttester) => {
      // `GapContract.multiAttest` routes through the MultiAttester, so it is
      // `msg.sender` at EAS and the indexer stores IT as `verifiedBy` — never
      // the signer. Without it in the candidate set every verification polls to
      // timeout on a transaction that already succeeded.
      //
      // `attestationUID` is deliberately absent (it is optional on the indexer
      // row): it forces the poll through the attester-candidate path, so this
      // asserts the MultiAttester wiring rather than the UID-change fallback.
      mockApiGet.mockResolvedValue(
        indexedResponse({
          uid: MILESTONE_UID,
          chainId,
          title: "Milestone",
          description: "desc",
          dueDate: "2025-01-01",
          status: "verified",
          recipient: RECIPIENT,
          completionDetails: { description: "done", completedAt: "", completedBy: RECIPIENT },
          verificationDetails: {
            description: "ok",
            verifiedAt: "",
            verifiedBy: multiAttester,
          },
        })
      );
      const { result } = renderVerificationHook();

      await act(async () => {
        await result.current.verifyMilestone(milestone({ chainId }), false, projectData, "ok");
      });

      await waitFor(() =>
        expect(toastSpies.showSuccess).toHaveBeenCalledWith(
          "Milestone completed and verified successfully!"
        )
      );
      expect(toastSpies.showError).not.toHaveBeenCalled();
      expect(errorManager).not.toHaveBeenCalled();
    }
  );

  it("does not accept a pre-existing verification by an unrecognised attester", async () => {
    // Same attestation UID as before signing: nothing landed under OUR
    // transaction, so the snapshot guard must keep the poll unsatisfied even
    // though the milestone already carries a verification.
    const preExisting = {
      description: "someone else",
      verifiedAt: "",
      verifiedBy: WAGMI_ADDRESS,
      attestationUID: `0x${"e".repeat(64)}`,
    };
    mockApiGet.mockResolvedValue(
      indexedResponse({
        uid: MILESTONE_UID,
        chainId: 42161,
        title: "Milestone",
        description: "desc",
        dueDate: "2025-01-01",
        status: "verified",
        recipient: RECIPIENT,
        completionDetails: { description: "done", completedAt: "", completedBy: RECIPIENT },
        verificationDetails: preExisting,
      })
    );
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(
        milestone({ verificationDetails: preExisting }),
        false,
        projectData,
        "looks good"
      );
    });

    expect(toastSpies.showSuccess).not.toHaveBeenCalled();
    expect(toastSpies.showError).toHaveBeenCalledWith(
      expect.stringContaining("still being indexed")
    );
  });

  it("reports poll exhaustion after a submitted transaction instead of promising success (#66)", async () => {
    // Indexer never surfaces the verification within the retry budget.
    mockApiGet.mockResolvedValue(
      indexedResponse({
        uid: MILESTONE_UID,
        chainId: 42161,
        title: "Milestone",
        description: "desc",
        dueDate: "2025-01-01",
        status: "pending",
        recipient: RECIPIENT,
        completionDetails: null,
        verificationDetails: null,
      })
    );
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(milestone(), false, projectData, "looks good");
    });

    const [message] = toastSpies.showError.mock.calls.at(-1) ?? [];
    expect(message).toContain("still being indexed");
    // The copy must not promise the write will land: the same symptom covers
    // an attestation the indexer admitted and then skipped, which never
    // appears at all.
    expect(message).not.toMatch(/no need to/i);
    // ...and that state must not be invisible to telemetry.
    expect(errorManager).toHaveBeenCalledWith(
      "Error verifying milestone",
      expect.anything(),
      expect.objectContaining({ step: "poll", failureKind: "indexing-timeout" })
    );
  });

  it("refuses to sign for a cancelled milestone (belt-and-braces for stale data)", async () => {
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(
        milestone({
          status: "cancelled",
          completionDetails: { description: "done", completedAt: "", completedBy: RECIPIENT },
        }),
        false,
        projectData,
        "looks good"
      );
    });

    expect(mockMultiAttest).not.toHaveBeenCalled();
    expect(mockAttestAsReviewer).not.toHaveBeenCalled();
    expect(toastSpies.showError).toHaveBeenCalledWith(CANCELLED_MILESTONE_VERIFY_MESSAGE);
  });

  it("refuses to sign when only the cancellation overlay is present", async () => {
    // Optimistic cancel writes the overlay before the indexer re-derives
    // `status`, so the overlay alone must already block the signature.
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(
        milestone({
          cancellation: {
            uid: `0x${"c".repeat(64)}`,
            cancelledBy: "0xadmin",
            cancelledAt: null,
            reason: null,
          },
          completionDetails: { description: "done", completedAt: "", completedBy: RECIPIENT },
        }),
        false,
        projectData,
        "looks good"
      );
    });

    expect(mockMultiAttest).not.toHaveBeenCalled();
    expect(toastSpies.showError).toHaveBeenCalledWith(CANCELLED_MILESTONE_VERIFY_MESSAGE);
  });

  it("names the cause and reports the step marker on a signing failure (#64)", async () => {
    mockMultiAttest.mockRejectedValue(new Error("insufficient funds for intrinsic transaction"));
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(milestone(), false, projectData, "looks good");
    });

    expect(toastSpies.showError).toHaveBeenCalledWith(
      "Failed to verify milestone: your wallet doesn't have enough funds to cover gas."
    );
    expect(errorManager).toHaveBeenCalledWith(
      "Error verifying milestone",
      expect.any(Error),
      expect.objectContaining({
        milestoneUID: MILESTONE_UID,
        projectUid: PROJECT_UID,
        chainId: 42161,
        programId: PROGRAM_ID,
        step: "attest",
        failureKind: "insufficient-funds",
      })
    );
  });

  it("keeps the dedicated cancelled copy for a user rejection (#64)", async () => {
    mockMultiAttest.mockRejectedValue(
      Object.assign(new Error("User rejected the request"), { code: 4001 })
    );
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(milestone(), false, projectData, "looks good");
    });

    expect(toastSpies.showError).toHaveBeenCalledWith("Verification cancelled");
    expect(errorManager).not.toHaveBeenCalled();
  });

  it("does not mistake an API error whose route contains 'reject' for a cancellation (#64)", async () => {
    mockAttestAsReviewer.mockRejectedValue(
      new HttpError(500, { endpoint: "/v2/milestones/x/reject-completion", method: "POST" })
    );
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(milestone(), true, projectData, "looks good");
    });

    expect(toastSpies.showError).toHaveBeenCalledWith(
      "Failed to verify milestone: the server rejected the request (HTTP 500)."
    );
    expect(errorManager).toHaveBeenCalledWith(
      "Error verifying milestone",
      expect.anything(),
      expect.objectContaining({ step: "backend", failureKind: "server" })
    );
  });

  it("does not re-read the milestone after the backend completion (reviewer flow, #63)", async () => {
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.verifyMilestone(milestone(), true, projectData, "looks good");
    });

    await waitFor(() => expect(mockMultiAttest).toHaveBeenCalledTimes(1));
    expect(mockAttestAsReviewer).toHaveBeenCalledTimes(1);
    // Verification only — the backend already created the completion.
    expect(attestationArgs.map((a) => a.data.type)).toEqual(["verified"]);
    expect(mockProjectById).not.toHaveBeenCalled();
    expect(v1ProjectCalls()).toHaveLength(0);
  });
});

describe("useMilestoneCompletionVerification — complete", () => {
  it("completes on-chain against V2 data only (#63)", async () => {
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.completeMilestone(milestone(), projectData, "all done");
    });

    await waitFor(() =>
      expect(toastSpies.showSuccess).toHaveBeenCalledWith("Milestone completed successfully!")
    );
    expect(attestationArgs).toHaveLength(1);
    expect(attestationArgs[0].recipient).toBe(RECIPIENT);
    expect(mockProjectById).not.toHaveBeenCalled();
    expect(v1ProjectCalls()).toHaveLength(0);
  });

  it("blocks completion with no recipient before any transaction (#63)", async () => {
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.completeMilestone(
        milestone({ recipient: undefined }),
        projectData,
        "all done"
      );
    });

    expect(mockMultiAttest).not.toHaveBeenCalled();
    expect(toastSpies.showError).toHaveBeenCalledWith(
      expect.stringContaining("missing its on-chain recipient")
    );
  });

  it("blocks completion of a cancelled milestone before any transaction", async () => {
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.completeMilestone(
        milestone({ status: "cancelled" }),
        projectData,
        "all done"
      );
    });

    expect(mockMultiAttest).not.toHaveBeenCalled();
    expect(toastSpies.showError).toHaveBeenCalledWith(CANCELLED_MILESTONE_COMPLETE_MESSAGE);
  });

  it("names the cause on a completion failure (#64)", async () => {
    mockMultiAttest.mockRejectedValue(new Error("boom"));
    const { result } = renderVerificationHook();

    await act(async () => {
      await result.current.completeMilestone(milestone(), projectData, "all done");
    });

    expect(toastSpies.showError).toHaveBeenCalledWith(
      "Failed to complete milestone: an unexpected error occurred."
    );
    expect(errorManager).toHaveBeenCalledWith(
      "Error completing milestone",
      expect.any(Error),
      expect.objectContaining({ step: "attest", projectUid: PROJECT_UID })
    );
  });
});
