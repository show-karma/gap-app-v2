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

    expect(screen.getByText(/in 7 days/i)).toBeInTheDocument();
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

    expect(screen.getByText("Follow-up overdue")).toBeInTheDocument();
    expect(screen.getByTitle(/52 days ago/i)).toBeInTheDocument();
  });

  // The follow-up-ordered list labels its undated tail; a row-level "No
  // follow-up" repeated down the column read like a warning.
  it("should_omit_the_slot_when_none_is_scheduled", () => {
    render(<InboxListItem {...baseProps} item={makeItem({ attentionReason: "invoice_unpaid" })} />);

    expect(screen.queryByText(/follow-up/i)).not.toBeInTheDocument();
  });

  // Reviewer-scoped rows carry no attention reason and no follow-up data.
  it("should_omit_the_slot_entirely_on_a_reviewer_row", () => {
    render(<InboxListItem {...baseProps} item={makeItem({ kind: "application" })} />);

    expect(screen.queryByText(/follow-up/i)).not.toBeInTheDocument();
  });
});

describe("InboxListItem stage age", () => {
  // The clock sits beside the stage badge as one phrase, so the number says
  // what it counts instead of floating alone at the edge of the row.
  it("should_render_the_days_stuck_with_the_stage_it_belongs_to", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "invoice_unpaid", stageAgeDays: 379 })}
      />
    );

    expect(screen.getByText("Invoice unpaid")).toBeInTheDocument();
    expect(screen.getByText("379 days unpaid")).toBeInTheDocument();
  });

  it("should_singularize_a_one_day_age", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "past_due", stageAgeDays: 1 })}
      />
    );

    expect(screen.getByText("1 day overdue")).toBeInTheDocument();
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

    expect(screen.getByText("KYB pending")).toBeInTheDocument();
    expect(screen.getByText("6 days since approval")).toBeInTheDocument();
  });

  it("should_omit_the_age_when_the_feed_did_not_supply_one", () => {
    render(<InboxListItem {...baseProps} item={makeItem({ attentionReason: "invoice_unpaid" })} />);

    expect(screen.queryByText(/\d+d$/)).not.toBeInTheDocument();
  });
});

describe("InboxListItem open action items", () => {
  it("should_pluralize_the_open_item_count", () => {
    const { rerender } = render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "invoice_unpaid", openActionItems: 1 })}
      />
    );
    expect(screen.getByText("1 open note")).toBeInTheDocument();

    rerender(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "invoice_unpaid", openActionItems: 3 })}
      />
    );
    expect(screen.getByText("3 open notes")).toBeInTheDocument();
  });

  // A block tied to a count is hidden when the count is zero — never "0 open".
  it("should_hide_the_count_when_there_are_no_open_items", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "invoice_unpaid", openActionItems: 0 })}
      />
    );

    expect(screen.queryByText(/open note/i)).not.toBeInTheDocument();
  });
});
