import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MilestoneCard } from "@/components/Pages/Admin/MilestonesReview/MilestoneCard";
import type { GrantMilestoneWithCompletion } from "@/services/milestones";
import { CANCELLED_MILESTONE_VERIFY_MESSAGE } from "@/utilities/milestones/cancellation";

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Provider passed as a `wrapper` (not inlined into `ui`) so `rerender` keeps
  // the same client — a rerender is how memo staleness is observed.
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
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

    // Both the header status badge and the banner label surface the state.
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Milestone cancelled")).toBeInTheDocument();
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

  it("should_render_cancelled_banner_for_a_status_only_cancellation_without_overlay", () => {
    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={createMilestone({ status: "cancelled", cancellation: null })}
      />
    );

    // Terminal cancelled state still surfaces the banner (header badge + banner
    // label) even when the on-chain overlay is absent.
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Milestone cancelled")).toBeInTheDocument();
    // No canceller metadata is rendered when the overlay is missing.
    expect(screen.queryByText(CANCELLER)).not.toBeInTheDocument();
  });

  it("should_not_render_cancellation_banner_for_a_non_cancelled_milestone", () => {
    render(<MilestoneCard {...DEFAULT_PROPS} milestone={createMilestone()} />);

    expect(screen.queryByText("Cancelled")).not.toBeInTheDocument();
    expect(screen.queryByText("Milestone cancelled")).not.toBeInTheDocument();
    expect(screen.queryByText(CANCELLER)).not.toBeInTheDocument();
  });
});

describe("MilestoneCard (admin review) — status badge freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_recompute_the_status_badge_when_only_the_due_date_changes", () => {
    const overdue = createMilestone({ dueDate: "2020-01-01T00:00:00Z" });
    const { rerender } = render(<MilestoneCard {...DEFAULT_PROPS} milestone={overdue} />);

    expect(screen.getByText("Past Due")).toBeInTheDocument();

    // Only the deadline moves. `status`, `cancellation`, `completionDetails`
    // and `verificationDetails` are byte-identical (and null) across both
    // renders, so a memo keyed on those alone never recomputes and the badge
    // stays "Past Due" after an admin extends the due date.
    rerender(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={createMilestone({ dueDate: "2030-01-01T00:00:00Z" })}
      />
    );

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("Past Due")).not.toBeInTheDocument();
  });
});

describe("MilestoneCard (admin review) — verify gate on a cancelled milestone", () => {
  const COMPLETION = {
    description: "submitted",
    completedAt: "2026-01-01T00:00:00Z",
    completedBy: "0xgrantee",
    deliverables: [],
  } as unknown as GrantMilestoneWithCompletion["completionDetails"];

  const CANCELLATION = {
    uid: "0xcancel-uid",
    cancelledBy: "0x7177000000000000000000000000000000e1e141",
    cancelledAt: "2026-07-24T12:00:00Z",
    reason: "Scope moved to next quarter",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should_render_verify_button_for_a_completed_milestone_that_is_not_cancelled", () => {
    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={createMilestone({ completionDetails: COMPLETION })}
      />
    );

    expect(screen.getByRole("button", { name: /verify milestone/i })).toBeInTheDocument();
  });

  it("should_hide_verify_button_and_explain_why_when_the_milestone_is_cancelled", () => {
    // The indexer admits the verification attestation and then skips it, so a
    // Verify button here burns gas on a write that silently never appears.
    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={createMilestone({
          status: "cancelled",
          cancellation: CANCELLATION,
          completionDetails: COMPLETION,
        })}
      />
    );

    expect(screen.queryByRole("button", { name: /verify milestone/i })).not.toBeInTheDocument();
    expect(screen.getByText(CANCELLED_MILESTONE_VERIFY_MESSAGE)).toBeInTheDocument();
  });

  it("should_hide_verify_button_for_a_status_only_cancellation_without_overlay", () => {
    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={createMilestone({
          status: "cancelled",
          cancellation: null,
          completionDetails: COMPLETION,
        })}
      />
    );

    expect(screen.queryByRole("button", { name: /verify milestone/i })).not.toBeInTheDocument();
    expect(screen.getByText(CANCELLED_MILESTONE_VERIFY_MESSAGE)).toBeInTheDocument();
  });

  it("should_not_render_the_inline_verification_form_when_a_cancelled_milestone_is_selected", () => {
    const milestone = createMilestone({
      status: "cancelled",
      cancellation: CANCELLATION,
      completionDetails: COMPLETION,
    });

    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={milestone}
        verifyingMilestoneId={milestone.uid}
      />
    );

    // Stale selection (cancelled while the form was open) must not leave a
    // submit affordance behind.
    expect(screen.queryByText(/Verify Milestone Completion/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^verify$/i })).not.toBeInTheDocument();
    expect(screen.getByText(CANCELLED_MILESTONE_VERIFY_MESSAGE)).toBeInTheDocument();
  });

  it("should_not_show_the_cancelled_verification_notice_to_users_who_cannot_verify", () => {
    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        canVerifyMilestones={false}
        milestone={createMilestone({
          status: "cancelled",
          cancellation: CANCELLATION,
          completionDetails: COMPLETION,
        })}
      />
    );

    expect(screen.queryByText(CANCELLED_MILESTONE_VERIFY_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /verify milestone/i })).not.toBeInTheDocument();
  });

  it("should_hide_verify_button_on_the_inbox_surface_too", () => {
    // The reviewer Inbox renders this same card (quiet surface, no AI button),
    // so the gate covers both surfaces from one place.
    render(
      <MilestoneCard
        {...DEFAULT_PROPS}
        milestone={createMilestone({
          status: "cancelled",
          cancellation: CANCELLATION,
          completionDetails: COMPLETION,
        })}
        canDeleteMilestones={false}
        showAIEvaluationButton={false}
        quietSurface
      />
    );

    expect(screen.queryByRole("button", { name: /verify milestone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ai evaluation/i })).not.toBeInTheDocument();
    expect(screen.getByText(CANCELLED_MILESTONE_VERIFY_MESSAGE)).toBeInTheDocument();
  });
});
