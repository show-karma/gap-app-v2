import { fireEvent, render, screen } from "@testing-library/react";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";

// --- Hook mocks -------------------------------------------------------------

const mockUseProjectGrantMilestones = vi.fn();
const mockUsePermissionContext = vi.fn();
const mockUseIsReviewerType = vi.fn();
const mockVerifyMilestone = vi.fn();
const mockUseMilestoneEvaluation = vi.fn();
const mockUseMilestoneAllocationsByGrants = vi.fn();
const mockRefetch = vi.fn();
const mockInvalidateQueries = vi.fn();

// Captures the options the component passes to the verification hook so tests
// can drive its `onSuccess` / `onCachesInvalidated` callbacks directly.
let capturedVerificationOptions: {
  onSuccess?: () => void | Promise<void>;
  onCachesInvalidated?: () => void;
} = {};

vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

vi.mock("@/hooks/useProjectGrantMilestones", () => ({
  useProjectGrantMilestones: (...args: unknown[]) => mockUseProjectGrantMilestones(...args),
}));

vi.mock("@/src/core/rbac/context/permission-context", () => ({
  usePermissionContext: () => mockUsePermissionContext(),
  useIsReviewerType: (...args: unknown[]) => mockUseIsReviewerType(...args),
}));

vi.mock("@/hooks/useMilestoneCompletionVerification", () => ({
  useMilestoneCompletionVerification: (options: {
    onSuccess?: () => void | Promise<void>;
    onCachesInvalidated?: () => void;
  }) => {
    capturedVerificationOptions = options;
    return {
      verifyMilestone: mockVerifyMilestone,
      isVerifying: false,
    };
  },
}));

vi.mock("@/hooks/useMilestoneEvaluation", () => ({
  useMilestoneEvaluation: (...args: unknown[]) => mockUseMilestoneEvaluation(...args),
}));

vi.mock("@/hooks/useCommunityMilestoneAllocations", () => ({
  useMilestoneAllocationsByGrants: (...args: unknown[]) =>
    mockUseMilestoneAllocationsByGrants(...args),
}));

// MilestoneCard pulls in heavy SDK + clipboard utilities; stub it to a probe
// that surfaces the wired props we care about (verify availability + handler).
vi.mock("@/components/Pages/Admin/MilestonesReview/MilestoneCard", () => ({
  MilestoneCard: (props: {
    milestone: GrantMilestoneWithCompletion;
    canVerifyMilestones: boolean;
    onSubmitVerification: (m: GrantMilestoneWithCompletion) => void;
  }) => (
    <div data-testid="milestone-card">
      <span>{props.milestone.title}</span>
      <span data-testid="can-verify">{String(props.canVerifyMilestones)}</span>
      <button type="button" onClick={() => props.onSubmitVerification(props.milestone)}>
        verify
      </button>
    </div>
  ),
}));

import { InboxMilestoneDetail } from "@/components/Inbox/InboxMilestoneDetail";

function makeMilestone(
  overrides: Partial<GrantMilestoneWithCompletion> = {}
): GrantMilestoneWithCompletion {
  return {
    uid: "ms-1",
    chainId: 42161,
    title: "Milestone One",
    description: "Do the thing",
    dueDate: "2026-06-01T00:00:00Z",
    status: "completed",
    completionDetails: null,
    verificationDetails: null,
    fundingApplicationCompletion: null,
    ...overrides,
  };
}

function makeData(milestones: GrantMilestoneWithCompletion[]) {
  return {
    project: { uid: "proj-1", chainID: 42161, owner: "0x1", details: { title: "Proj", slug: "p" } },
    grant: { uid: "grant-1", chainID: 42161 },
    grantMilestones: milestones,
  };
}

const baseProps = {
  projectUid: "proj-1",
  programId: "959_42161",
  grantUid: "grant-1",
  projectSlug: "p",
  projectTitle: "Proj",
  milestoneUid: "ms-1",
  communityId: "community-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  capturedVerificationOptions = {};
  mockUseIsReviewerType.mockReturnValue(false);
  mockUsePermissionContext.mockReturnValue({ isCommunityAdmin: false, isLoading: false });
  mockUseMilestoneEvaluation.mockReturnValue({
    data: { evaluations: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseMilestoneAllocationsByGrants.mockReturnValue({ allocationMap: new Map() });
});

describe("InboxMilestoneDetail", () => {
  it("renders a loading skeleton while milestones load", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<InboxMilestoneDetail {...baseProps} />);
    expect(screen.getByLabelText("Loading milestone")).toBeInTheDocument();
  });

  it("renders a loading skeleton while permissions resolve", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: makeData([makeMilestone()]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUsePermissionContext.mockReturnValue({ isCommunityAdmin: false, isLoading: true });

    render(<InboxMilestoneDetail {...baseProps} />);
    expect(screen.getByLabelText("Loading milestone")).toBeInTheDocument();
  });

  it("renders an error state with retry", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("boom"),
      refetch: mockRefetch,
    });

    render(<InboxMilestoneDetail {...baseProps} />);
    expect(screen.getByText("Error loading milestone")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("renders a not-found state when the milestone is absent", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: makeData([makeMilestone({ uid: "other" })]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<InboxMilestoneDetail {...baseProps} />);
    expect(screen.getByText("Milestone not found")).toBeInTheDocument();
  });

  it("renders the milestone card for the matching milestone", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: makeData([makeMilestone()]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<InboxMilestoneDetail {...baseProps} />);
    expect(screen.getByTestId("milestone-card")).toBeInTheDocument();
    expect(screen.getByText("Milestone One")).toBeInTheDocument();
  });

  it("grants verify ability to milestone reviewers", () => {
    mockUseIsReviewerType.mockReturnValue(true);
    mockUseProjectGrantMilestones.mockReturnValue({
      data: makeData([makeMilestone()]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<InboxMilestoneDetail {...baseProps} />);
    expect(screen.getByTestId("can-verify")).toHaveTextContent("true");
  });

  it("grants verify ability to community admins", () => {
    mockUsePermissionContext.mockReturnValue({ isCommunityAdmin: true, isLoading: false });
    mockUseProjectGrantMilestones.mockReturnValue({
      data: makeData([makeMilestone()]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<InboxMilestoneDetail {...baseProps} />);
    expect(screen.getByTestId("can-verify")).toHaveTextContent("true");
  });

  it("withholds verify ability from non-reviewers", () => {
    mockUseProjectGrantMilestones.mockReturnValue({
      data: makeData([makeMilestone()]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<InboxMilestoneDetail {...baseProps} />);
    expect(screen.getByTestId("can-verify")).toHaveTextContent("false");
  });

  it("submits verification through the completion-verification hook", () => {
    mockUseIsReviewerType.mockReturnValue(true);
    const milestone = makeMilestone();
    const data = makeData([milestone]);
    mockUseProjectGrantMilestones.mockReturnValue({
      data,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<InboxMilestoneDetail {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "verify" }));

    expect(mockVerifyMilestone).toHaveBeenCalledTimes(1);
    expect(mockVerifyMilestone).toHaveBeenCalledWith(milestone, true, data, "");
  });

  it("invalidates the reviewer-inbox feed when a verification succeeds", async () => {
    mockUseIsReviewerType.mockReturnValue(true);
    mockUseProjectGrantMilestones.mockReturnValue({
      data: makeData([makeMilestone()]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<InboxMilestoneDetail {...baseProps} />);

    // Drive the hook's onSuccess as the verification flow would on success.
    await capturedVerificationOptions.onSuccess?.();

    expect(mockRefetch).toHaveBeenCalled();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["reviewer-inbox"] });
  });

  it("refreshes the reviewer-inbox feed as soon as milestone caches invalidate, before on-chain indexing confirms", () => {
    mockUseIsReviewerType.mockReturnValue(true);
    mockUseProjectGrantMilestones.mockReturnValue({
      data: makeData([makeMilestone()]),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<InboxMilestoneDetail {...baseProps} />);

    // The verification hook fires `onCachesInvalidated` right after the backend
    // state changes (bucket transition) — before the long verification-indexing
    // poll. The inbox must refresh then so the item moves buckets without a
    // page reload, even while the verify spinner is still resolving on-chain.
    capturedVerificationOptions.onCachesInvalidated?.();

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["reviewer-inbox"] });
  });
});
