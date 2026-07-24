import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MilestoneCard } from "@/components/Pages/Admin/MilestonesReview/MilestoneCard";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => null,
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => <div>{source}</div>,
}));

vi.mock("@/components/EthereumAddressToProfileName", () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

vi.mock("@/hooks/useMilestoneImpactAnswers", () => ({
  useMilestoneImpactAnswers: () => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useCopyToClipboard", () => ({
  useCopyToClipboard: () => [null, vi.fn()],
}));

vi.mock("@/store/agentChat", () => ({
  useAgentChatStore: (selector: (s: { setOpen: () => void; addMention: () => void }) => unknown) =>
    selector({ setOpen: vi.fn(), addMention: vi.fn() }),
}));

vi.mock("@/utilities/milestoneTransforms", () => ({
  toEditableUnifiedMilestone: vi.fn(),
}));

function createMilestone(
  overrides?: Partial<GrantMilestoneWithCompletion>
): GrantMilestoneWithCompletion {
  return {
    uid: "0xmilestone-uid",
    chainId: 10,
    programId: "program-001",
    title: "Audit completion",
    description: "Complete security audit",
    dueDate: "2026-12-31T00:00:00Z",
    status: "pending",
    completionDetails: null,
    verificationDetails: null,
    fundingApplicationCompletion: null,
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  index: 0,
  verifyingMilestoneId: null,
  verificationComment: "",
  isVerifying: false,
  canVerifyMilestones: true,
  canDeleteMilestones: true,
  canEditMilestones: false,
  onVerifyClick: vi.fn(),
  onCancelVerification: vi.fn(),
  onVerificationCommentChange: vi.fn(),
  onSubmitVerification: vi.fn(),
  onDeleteMilestone: vi.fn(() => Promise.resolve()),
};

describe("MilestoneCard (admin review) — overflow → delete dialog flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_open_delete_confirmation_dialog_when_user_clicks_delete_menu_item", () => {
    const milestone = createMilestone();
    render(<MilestoneCard {...DEFAULT_PROPS} milestone={milestone} />);

    // Initially: menu closed, dialog closed
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText(/Are you sure you want to delete/i)).not.toBeInTheDocument();

    // Open the overflow menu
    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Click the Delete menu item
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));

    // Regression: dialog must mount and become visible after the menu closes.
    // Before the fix, DeleteDialog lived inside the menu's conditional, so
    // setting isOverflowOpen=false unmounted it before Radix could open the
    // modal portal — and the confirmation text never appeared.
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
  });

  it("should_call_onDeleteMilestone_when_user_confirms_in_dialog", async () => {
    const onDeleteMilestone = vi.fn(() => Promise.resolve());
    const milestone = createMilestone();

    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={milestone}
        onDeleteMilestone={onDeleteMilestone}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    });

    expect(onDeleteMilestone).toHaveBeenCalledTimes(1);
    expect(onDeleteMilestone).toHaveBeenCalledWith(milestone);
  });

  it("should_allow_reopening_the_menu_after_canceling_the_dialog", () => {
    render(<MilestoneCard {...DEFAULT_PROPS} milestone={createMilestone()} />);

    // First trip: open menu → click delete → cancel dialog
    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText(/Are you sure you want to delete/i)).not.toBeInTheDocument();

    // Second trip: menu must open again. Before the fix, isDeleteDialogOpen
    // stayed true after the failed first open, so re-clicking the overflow
    // trigger flashed the modal instead of showing the dropdown.
    fireEvent.click(screen.getByRole("button", { name: /more actions/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /delete/i })).toBeInTheDocument();
  });

  it("should_not_render_overflow_trigger_when_canDeleteMilestones_is_false", () => {
    render(
      <MilestoneCard {...DEFAULT_PROPS} milestone={createMilestone()} canDeleteMilestones={false} />
    );

    expect(screen.queryByRole("button", { name: /more actions/i })).not.toBeInTheDocument();
  });

  it("should_not_render_overflow_trigger_when_milestone_has_a_completion", () => {
    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={createMilestone({
          completionDetails: {
            description: "submitted",
            completedAt: "2026-01-01T00:00:00Z",
            deliverables: [],
          } as unknown as GrantMilestoneWithCompletion["completionDetails"],
        })}
      />
    );

    expect(screen.queryByRole("button", { name: /more actions/i })).not.toBeInTheDocument();
  });
});

const COMPLETION_PROPS = {
  ...DEFAULT_PROPS,
  canCompleteMilestones: true,
  completingMilestoneId: null,
  completionComment: "",
  isCompleting: false,
  onCompleteClick: vi.fn(),
  onCancelCompletion: vi.fn(),
  onCompletionCommentChange: vi.fn(),
  onSubmitCompletion: vi.fn(),
};

describe("MilestoneCard (admin review) — complete on behalf of grantee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_render_complete_button_for_pending_milestone_when_canCompleteMilestones", () => {
    render(<MilestoneCard {...COMPLETION_PROPS} milestone={createMilestone()} />);

    expect(
      screen.getByRole("button", { name: /complete on behalf of grantee/i })
    ).toBeInTheDocument();
  });

  it("should_not_render_complete_button_when_canCompleteMilestones_is_false", () => {
    render(
      <MilestoneCard
        {...COMPLETION_PROPS}
        canCompleteMilestones={false}
        milestone={createMilestone()}
      />
    );

    expect(
      screen.queryByRole("button", { name: /complete on behalf of grantee/i })
    ).not.toBeInTheDocument();
  });

  it("should_not_render_complete_button_when_milestone_already_has_a_completion", () => {
    render(
      <MilestoneCard
        {...COMPLETION_PROPS}
        milestone={createMilestone({
          completionDetails: {
            description: "submitted",
            completedAt: "2026-01-01T00:00:00Z",
            deliverables: [],
          } as unknown as GrantMilestoneWithCompletion["completionDetails"],
        })}
      />
    );

    expect(
      screen.queryByRole("button", { name: /complete on behalf of grantee/i })
    ).not.toBeInTheDocument();
  });

  it("should_call_onCompleteClick_with_milestone_uid_when_complete_button_clicked", () => {
    const onCompleteClick = vi.fn();
    const milestone = createMilestone();

    render(
      <MilestoneCard
        {...COMPLETION_PROPS}
        milestone={milestone}
        onCompleteClick={onCompleteClick}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /complete on behalf of grantee/i }));

    expect(onCompleteClick).toHaveBeenCalledWith(milestone.uid);
  });

  it("should_show_inline_completion_form_and_submit_when_milestone_is_being_completed", () => {
    const onSubmitCompletion = vi.fn();
    const milestone = createMilestone();

    render(
      <MilestoneCard
        {...COMPLETION_PROPS}
        milestone={milestone}
        completingMilestoneId={milestone.uid}
        onSubmitCompletion={onSubmitCompletion}
      />
    );

    // The on-chain attribution is surfaced to the admin before they submit.
    expect(screen.getByText(/attributed to your wallet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^complete$/i }));

    expect(onSubmitCompletion).toHaveBeenCalledWith(milestone);
  });
});

describe("MilestoneCard (admin review) — cancellation banner", () => {
  const CANCELLER = "0x7177000000000000000000000000000000e1e141";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_render_cancelled_state_with_canceller_profile_name", () => {
    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={createMilestone({
          status: "cancelled",
          cancellation: {
            uid: "0xcancel-uid",
            cancelledBy: CANCELLER,
            cancelledAt: "2026-07-24T12:00:00Z",
            reason: null,
          },
        })}
      />
    );

    // "Cancelled" appears twice: the header status badge and the banner label.
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThanOrEqual(2);
    // The canceller address is handed to EthereumAddressToProfileName (which
    // resolves it to a name/ENS/email), not printed raw as a label.
    expect(screen.getByText(CANCELLER)).toBeInTheDocument();
  });

  it("should_render_cancellation_reason_when_present", () => {
    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={createMilestone({
          status: "cancelled",
          cancellation: {
            uid: "0xcancel-uid",
            cancelledBy: CANCELLER,
            cancelledAt: "2026-07-24T12:00:00Z",
            reason: "Scope moved to next quarter",
          },
        })}
      />
    );

    expect(screen.getByText(/Scope moved to next quarter/i)).toBeInTheDocument();
  });

  it("should_not_render_cancellation_banner_for_a_non_cancelled_milestone", () => {
    render(<MilestoneCard {...DEFAULT_PROPS} milestone={createMilestone()} />);

    expect(screen.queryByText("Cancelled")).not.toBeInTheDocument();
    expect(screen.queryByText(CANCELLER)).not.toBeInTheDocument();
  });
});
