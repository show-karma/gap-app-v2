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

    expect(screen.getByText(/52 days ago/i)).toBeInTheDocument();
  });

  // These rows sort last; a blank slot gives no reason why.
  it("should_say_no_follow_up_when_none_is_scheduled", () => {
    render(<InboxListItem {...baseProps} item={makeItem({ attentionReason: "invoice_unpaid" })} />);

    expect(screen.getByText("No follow-up")).toBeInTheDocument();
  });

  // Reviewer-scoped rows carry no attention reason and no follow-up data.
  it("should_omit_the_slot_entirely_on_a_reviewer_row", () => {
    render(<InboxListItem {...baseProps} item={makeItem({ kind: "application" })} />);

    expect(screen.queryByText("No follow-up")).not.toBeInTheDocument();
  });
});

describe("InboxListItem stage age", () => {
  it("should_render_the_days_stuck_beside_the_title", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "invoice_unpaid", stageAgeDays: 379 })}
      />
    );

    expect(screen.getByText("379d")).toBeInTheDocument();
  });

  // The numeral carries a title attribute so the stage the age belongs to is
  // recoverable — "379d" alone does not say 379 days of what.
  it("should_name_the_stage_the_age_belongs_to", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "invoice_unpaid", stageAgeDays: 379 })}
      />
    );

    expect(screen.getByTitle("379 days awaiting payment")).toBeInTheDocument();
  });

  it("should_singularize_a_one_day_age", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "past_due", stageAgeDays: 1 })}
      />
    );

    expect(screen.getByTitle("1 day overdue")).toBeInTheDocument();
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
    expect(screen.getByText("1 open item")).toBeInTheDocument();

    rerender(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "invoice_unpaid", openActionItems: 3 })}
      />
    );
    expect(screen.getByText("3 open items")).toBeInTheDocument();
  });

  // A block tied to a count is hidden when the count is zero — never "0 open".
  it("should_hide_the_count_when_there_are_no_open_items", () => {
    render(
      <InboxListItem
        {...baseProps}
        item={makeItem({ attentionReason: "invoice_unpaid", openActionItems: 0 })}
      />
    );

    expect(screen.queryByText(/open item/i)).not.toBeInTheDocument();
  });
});
