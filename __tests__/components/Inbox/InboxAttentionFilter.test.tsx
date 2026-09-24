import { fireEvent, render, screen, within } from "@testing-library/react";
import { InboxAttentionFilter } from "@/components/Inbox/InboxAttentionFilter";
import type { IReviewerInboxStats } from "@/types/funding-platform";

function makeStats(overrides: Partial<IReviewerInboxStats> = {}): IReviewerInboxStats {
  return {
    action: 0,
    waiting: 0,
    done: 0,
    overdue: 0,
    applications: 0,
    milestones: 0,
    pastDue: 0,
    awaitingReview: 0,
    awaitingInvoice: 0,
    invoiceUnpaid: 0,
    followUpDue: 0,
    ...overrides,
  };
}

const onChange = vi.fn();

const baseProps = {
  value: null,
  onChange,
  totalMilestones: 0,
};

/** The stage list lives in a popover — nothing renders until it is opened. */
function openMenu(): HTMLElement {
  fireEvent.click(screen.getByRole("button", { name: /filter by stage/i }));
  return screen.getByRole("listbox");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InboxAttentionFilter trigger", () => {
  it("renders nothing when every stage count is zero", () => {
    const { container } = render(<InboxAttentionFilter {...baseProps} stats={makeStats()} />);

    expect(container).toBeEmptyDOMElement();
  });

  // Collapsed, the control has to say what the list is currently showing.
  it("names the current view and its size on the trigger", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        stats={makeStats({ pastDue: 3, invoiceUnpaid: 9 })}
        totalMilestones={12}
      />
    );

    const trigger = screen.getByRole("button", { name: /filter by stage/i });
    expect(within(trigger).getByText("All items")).toBeInTheDocument();
    expect(within(trigger).getByText("12")).toBeInTheDocument();
  });

  it("names the selected stage and its own count once filtered", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        value="invoice_unpaid"
        stats={makeStats({ pastDue: 3, invoiceUnpaid: 9 })}
        totalMilestones={12}
      />
    );

    const trigger = screen.getByRole("button", { name: /filter by stage/i });
    expect(within(trigger).getByText("Invoice unpaid")).toBeInTheDocument();
    expect(within(trigger).getByText("9")).toBeInTheDocument();
    expect(within(trigger).queryByText("12")).not.toBeInTheDocument();
  });
});

describe("InboxAttentionFilter menu", () => {
  it("hides zero-count stages so no option leads to an empty list", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        stats={makeStats({ pastDue: 3, invoiceUnpaid: 0 })}
        totalMilestones={3}
      />
    );

    const menu = openMenu();
    expect(within(menu).getByText("Past due")).toBeInTheDocument();
    expect(within(menu).queryByText("Invoice unpaid")).not.toBeInTheDocument();
  });

  // Without it there is no way back from a filtered view.
  it("always offers All items when at least one stage has items", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        stats={makeStats({ awaitingReview: 2 })}
        totalMilestones={2}
      />
    );

    expect(within(openMenu()).getByText("All items")).toBeInTheDocument();
  });

  it("emits the reason when a stage is selected", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        stats={makeStats({ invoiceUnpaid: 5 })}
        totalMilestones={5}
      />
    );

    fireEvent.click(within(openMenu()).getByText("Invoice unpaid"));

    expect(onChange).toHaveBeenCalledWith("invoice_unpaid");
  });

  it("emits null when All items is selected", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        value="past_due"
        stats={makeStats({ pastDue: 1 })}
        totalMilestones={1}
      />
    );

    fireEvent.click(within(openMenu()).getByText("All items"));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows each stage count in the menu", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        stats={makeStats({ pastDue: 3, invoiceUnpaid: 9 })}
        totalMilestones={12}
      />
    );

    const menu = openMenu();
    const pastDue = within(menu).getByText("Past due").closest("[cmdk-item]");
    expect(pastDue).not.toBeNull();
    expect(within(pastDue as HTMLElement).getByText("3")).toBeInTheDocument();
  });

  it("omits the follow-up filter when nothing is due", () => {
    render(<InboxAttentionFilter {...baseProps} stats={makeStats({ pastDue: 1 })} />);

    expect(within(openMenu()).queryByText("Follow-up due")).not.toBeInTheDocument();
  });

  it("offers the follow-up filter when a follow-up is due", () => {
    render(
      <InboxAttentionFilter {...baseProps} stats={makeStats({ pastDue: 1, followUpDue: 2 })} />
    );

    expect(within(openMenu()).getByText("Follow-up due")).toBeInTheDocument();
  });
});

/**
 * REGRESSION GUARD. A reviewer-scoped feed carries none of the admin stat
 * keys, so the filter must render nothing at all — not a dropdown of zero
 * stages, and not a stray "All items". If this ever fails, reviewers are
 * seeing admin UI.
 */
describe("InboxAttentionFilter — reviewer scope", () => {
  it("renders nothing when the stats payload has no admin counters", () => {
    const reviewerStats = {
      action: 4,
      waiting: 2,
      done: 7,
      overdue: 1,
      applications: 3,
      milestones: 10,
    } as IReviewerInboxStats;

    const { container } = render(
      <InboxAttentionFilter
        value={null}
        onChange={onChange}
        totalMilestones={10}
        stats={reviewerStats}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
