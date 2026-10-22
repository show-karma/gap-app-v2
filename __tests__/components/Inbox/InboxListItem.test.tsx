import { render, screen } from "@testing-library/react";
import { InboxListItem } from "@/components/Inbox/InboxListItem";
import type { InboxItem } from "@/components/Inbox/types";

function makeItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "MS-1",
    kind: "milestone",
    bucket: "action",
    status: "verified",
    title: "Documentation, audit, public launch",
    project: "Filecoin EconoLens MCP Server",
    programId: "p1",
    activitySort: 0,
    ...overrides,
  };
}

/** Local calendar day offset by whole days — mirrors utilities/calendarDay. */
function dayOffset(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}T00:00:00.000Z`;
}

const onSelect = vi.fn();

const baseProps = { selected: false, onSelect };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InboxListItem follow-up slot", () => {
  // The queue can be ORDERED by this date. Showing it only when overdue left
  // the reader with an order they had no way to verify.
  it("should_show_an_upcoming_follow_up_date_not_just_an_overdue_one", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({
          attentionReason: "invoice_unpaid",
          nextFollowUpAt: dayOffset(7),
        })}
      />
    );

    expect(screen.getByText(/follow up in 7 days/i)).toBeInTheDocument();
  });

  it("should_show_an_overdue_follow_up_date", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({
          attentionReason: "invoice_unpaid",
          nextFollowUpAt: dayOffset(-52),
        })}
      />
    );

    expect(screen.getByText("follow-up overdue")).toBeInTheDocument();
    expect(screen.getByTitle(/52 days ago/i)).toBeInTheDocument();
  });

  // The follow-up-ordered list labels its undated tail; a row-level "No
  // follow-up" repeated down the column read like a warning.
  it("should_say_nobody_has_followed_up_when_nothing_is_scheduled_or_logged", () => {
    render(<InboxListItem {...baseProps} item={makeItem({ attentionReason: "invoice_unpaid" })} />);

    expect(screen.getByText("no follow-up yet")).toBeInTheDocument();
  });

  // Reviewer-scoped rows carry no attention reason and no follow-up data.
  it("should_omit_the_slot_entirely_on_a_reviewer_row", () => {
    render(<InboxListItem {...baseProps} item={makeItem({ kind: "application" })} />);

    expect(screen.queryByText(/follow-up/i)).not.toBeInTheDocument();
  });
});

describe("InboxListItem stage age", () => {
  // The clock says what it counts in the stage's own words, so "379d unpaid"
  // never needs the badge next to it to make sense.
  it("should_render_the_days_stuck_in_the_stage_s_own_words", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "invoice_unpaid", stageAgeDays: 379 })}
      />
    );

    expect(screen.getByText(/Pending payment/)).toBeInTheDocument();
    expect(screen.getByText("379d unpaid")).toBeInTheDocument();
  });

  it("should_say_late_for_an_overdue_milestone", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "past_due", stageAgeDays: 1 })}
      />
    );

    expect(screen.getByText("1d late")).toBeInTheDocument();
  });

  it("should_show_every_open_gate_with_one_clock", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({
          kind: "application",
          attentionReason: "kyb_pending",
          pendingGates: ["kyb_pending", "agreement_pending"],
          stageAgeDays: 6,
        })}
      />
    );

    expect(screen.getByText(/KYB pending and Agreement pending/)).toBeInTheDocument();
    expect(screen.getAllByText("6d since approval")).toHaveLength(1);
  });

  it("should_describe_an_application_stage_in_its_own_words", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({
          kind: "application",
          attentionReason: "kyb_pending",
          stageAgeDays: 6,
        })}
      />
    );

    expect(screen.getByText(/KYB pending/)).toBeInTheDocument();
    expect(screen.getByText("6d since approval")).toBeInTheDocument();
  });

  it("should_omit_the_age_when_the_feed_did_not_supply_one", () => {
    render(<InboxListItem {...baseProps} item={makeItem({ attentionReason: "invoice_unpaid" })} />);

    expect(screen.queryByText(/^\d+d /)).not.toBeInTheDocument();
  });
});

describe("InboxListItem colour", () => {
  // The grantee being late is the queue's normal state; only the admin's own
  // missed date earns red.
  it("should_keep_the_stage_and_clock_grey_however_late_the_grantee_is", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "past_due", stageAgeDays: 153 })}
      />
    );

    expect(screen.getByText(/Milestone overdue/)).not.toHaveClass("text-red-600");
    expect(screen.getByText("153d late")).not.toHaveClass("text-red-600");
  });

  it("should_turn_only_an_overdue_follow_up_red", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "past_due", nextFollowUpAt: dayOffset(-2) })}
      />
    );

    expect(screen.getByText("follow-up overdue")).toHaveClass("text-red-600");
  });
});

describe("InboxListItem headline", () => {
  it("should_lead_with_the_project_for_a_milestone", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({
          attentionReason: "past_due",
          project: "ProbeLab Gauge",
          title: "Milestone 3: Expand the Dashboard",
          subtitle: "Filecoin ProPGF Batch 2",
        })}
      />
    );

    expect(screen.getByText("ProbeLab Gauge")).toBeInTheDocument();
    expect(screen.getByText("Milestone 3: Expand the Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Batch 2")).toBeInTheDocument();
  });

  it("should_lead_with_the_application_name_and_show_the_applicant_under_it", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({
          kind: "application",
          attentionReason: "kyb_pending",
          title: "Blockscout block explorer",
          who: "test+1@example.invalid",
        })}
      />
    );

    expect(screen.getByText("Blockscout block explorer")).toBeInTheDocument();
    expect(screen.getByText("test+1@example.invalid")).toBeInTheDocument();
  });
});
