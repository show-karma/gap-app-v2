/**
 * Regression tests for the milestone-completion indexing wait.
 *
 * The completion flow signed on-chain, POSTed to the attestation listener, then
 * polled `retryUntilConditionMet` on the DEFAULT budget (200 x 1500ms, plus a
 * full project-query invalidation + refetch per iteration) waiting for
 * `milestone.completed` to appear. When the indexer REFUSES a completion
 * attestation — which it does silently, and which
 * `POST /attestations/index-by-transaction` reports as 200 either way — that
 * condition can never be satisfied, so the stepper spun for minutes and then
 * showed a generic "There was an error completing the milestone" to a user who
 * had already signed and paid gas.
 *
 * These lock in: the INTERACTIVE budget (~60s, as the undo flow already uses)
 * and an actionable, cause-naming message on exhaustion.
 */
import { act, renderHook } from "@testing-library/react";

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
const mockApiPost = vi.fn();
const mockOpenShareDialog = vi.fn();
const mockErrorManager = vi.fn();
const mockComplete = vi.fn();

vi.mock("@show-karma/karma-gap-sdk/core/class/entities/ProjectMilestone", () => ({
  ProjectMilestone: { from: vi.fn(() => []) },
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
  errorManager: (...args: unknown[]) => mockErrorManager(...args),
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
  useOffChainRevoke: vi.fn(() => ({ performOffChainRevoke: vi.fn() })),
}));

// useMilestone imports this relatively; alias and relative specifiers resolve
// to distinct module ids under vitest, so every variant must be mocked or the
// real hook pulls in wagmi's createConfig through useZeroDevSigner.
vi.mock("@/hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({ setupChainAndWallet: mockSetupChainAndWallet })),
}));
vi.mock("hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({ setupChainAndWallet: mockSetupChainAndWallet })),
}));
vi.mock("../../../hooks/useSetupChainAndWallet", () => ({
  useSetupChainAndWallet: vi.fn(() => ({ setupChainAndWallet: mockSetupChainAndWallet })),
}));

vi.mock("@/hooks/v2/useProjectUpdates", () => ({
  useProjectUpdates: vi.fn(() => ({ refetch: mockRefetchUpdates })),
}));

vi.mock("@/hooks/v2/useProjectGrants", () => ({
  useProjectGrants: vi.fn(() => ({ refetch: mockRefetchGrants })),
}));

vi.mock("@/utilities/sdk", () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

vi.mock("@/utilities/gapIndexerApi/getProjectObjectives", () => ({
  getProjectObjectives: (...args: unknown[]) => mockGetProjectObjectives(...args),
}));

vi.mock("@/utilities/api/client", () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args) },
}));

vi.mock("@/store/modals/shareDialog", () => ({
  useShareDialogStore: vi.fn((selector?: any) => {
    const state = { openShareDialog: mockOpenShareDialog };
    return selector ? selector(state) : state;
  }),
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
    project: { uid: "0xproject", details: { slug: "project-slug" } },
    isProjectOwner: true,
    isOwner: false,
  };
  return {
    useProjectStore: vi.fn((selector?: any) => (selector ? selector(state) : state)),
    useOwnerStore: vi.fn((selector?: any) => {
      const ownerState = { isOwner: state.isOwner };
      return selector ? selector(ownerState) : ownerState;
    }),
  };
});

import { useMilestone } from "@/hooks/useMilestone";
import {
  COMPLETION_INDEXING_TIMEOUT_MESSAGE,
  IndexingTimeoutError,
  isSurfacedError,
} from "@/utilities/errors";
import { INTERACTIVE_INDEXING_POLL, RetryConditionNotMetError } from "@/utilities/retries";

const milestone = {
  uid: "0xmilestone",
  type: "grant",
  chainID: 8453,
  refUID: "0xgrant",
  title: "Systems Boundary Mapping",
  mergedGrants: undefined,
  source: {},
} as any;

const completionForm = {
  description: "done",
  completionPercentage: "25",
  outputs: [],
  deliverables: [],
  noProofCheckbox: true,
};

function wireHappyChainAndProject() {
  mockComplete.mockResolvedValue({ tx: [{ hash: "0xtx" }] });
  mockSetupChainAndWallet.mockResolvedValue({
    gapClient: {
      fetch: {
        projectById: vi.fn().mockResolvedValue({
          uid: "0xproject",
          grants: [
            {
              uid: "0xgrant",
              details: { title: "Filecoin ProPGF Batch 2" },
              milestones: [{ uid: "0xmilestone", chainID: 8453, complete: mockComplete }],
            },
          ],
        }),
      },
    },
    walletSigner: {},
  });
}

describe("useMilestone - completion indexing wait", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccount.mockReturnValue({ chain: { id: 8453 }, address: "0xsigner" });
    mockApiPost.mockResolvedValue(undefined);
    mockRefetchUpdates.mockResolvedValue(undefined);
    mockRefetchGrants.mockResolvedValue({ data: [] });
    wireHappyChainAndProject();
  });

  it("polls the indexer on the interactive budget, not the multi-minute default", async () => {
    mockRetryUntilConditionMet.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMilestone());

    await act(async () => {
      await result.current.completeMilestone(milestone, completionForm as any);
    });

    expect(mockRetryUntilConditionMet).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      INTERACTIVE_INDEXING_POLL.maxRetries,
      INTERACTIVE_INDEXING_POLL.delay
    );
  });

  it("throws an IndexingTimeoutError when the completion is never indexed", async () => {
    mockRetryUntilConditionMet.mockRejectedValue(new RetryConditionNotMetError());

    const { result } = renderHook(() => useMilestone());

    let caught: unknown;
    await act(async () => {
      await result.current
        .completeMilestone(milestone, completionForm as any)
        .catch((error: unknown) => {
          caught = error;
        });
    });

    expect(caught).toBeInstanceOf(IndexingTimeoutError);
    expect((caught as Error).message).toBe(COMPLETION_INDEXING_TIMEOUT_MESSAGE);
  });

  it("shows the actionable timeout message instead of the generic completion error", async () => {
    mockRetryUntilConditionMet.mockRejectedValue(new RetryConditionNotMetError());

    const { result } = renderHook(() => useMilestone());

    await act(async () => {
      await result.current.completeMilestone(milestone, completionForm as any).catch(() => {});
    });

    expect(mockShowError).toHaveBeenCalledWith(COMPLETION_INDEXING_TIMEOUT_MESSAGE);
    expect(mockShowError).not.toHaveBeenCalledWith("There was an error completing the milestone");
  });

  it("marks the timeout surfaced so outer catches do not stack a second toast", async () => {
    mockRetryUntilConditionMet.mockRejectedValue(new RetryConditionNotMetError());

    const { result } = renderHook(() => useMilestone());

    let caught: unknown;
    await act(async () => {
      await result.current
        .completeMilestone(milestone, completionForm as any)
        .catch((error: unknown) => {
          caught = error;
        });
    });

    expect(isSurfacedError(caught)).toBe(true);
    expect(mockShowError).toHaveBeenCalledTimes(1);
  });

  it("reports the timeout to telemetry exactly once", async () => {
    mockRetryUntilConditionMet.mockRejectedValue(new RetryConditionNotMetError());

    const { result } = renderHook(() => useMilestone());

    await act(async () => {
      await result.current.completeMilestone(milestone, completionForm as any).catch(() => {});
    });

    expect(mockErrorManager).toHaveBeenCalledTimes(1);
  });

  it("still completes and celebrates when the indexer confirms", async () => {
    mockRetryUntilConditionMet.mockImplementation(
      async (_condition: unknown, onSuccess: () => Promise<void>) => {
        await onSuccess();
      }
    );

    const { result } = renderHook(() => useMilestone());

    await act(async () => {
      await result.current.completeMilestone(milestone, completionForm as any);
    });

    expect(mockShowSuccess).toHaveBeenCalled();
    expect(mockOpenShareDialog).toHaveBeenCalled();
    expect(mockShowError).not.toHaveBeenCalled();
  });
});
