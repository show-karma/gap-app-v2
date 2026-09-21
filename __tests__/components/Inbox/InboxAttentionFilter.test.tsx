import { fireEvent, render, screen } from "@testing-library/react";
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InboxAttentionFilter", () => {
  it("renders nothing when every stage count is zero", () => {
    const { container } = render(<InboxAttentionFilter {...baseProps} stats={makeStats()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("hides zero-count chips so no filter leads to an empty list", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        stats={makeStats({ pastDue: 3, invoiceUnpaid: 0 })}
        totalMilestones={3}
      />
    );

    expect(screen.getByText("Past due")).toBeInTheDocument();
    expect(screen.queryByText("Invoice unpaid")).not.toBeInTheDocument();
  });

  it("always renders All when at least one stage has items", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        stats={makeStats({ awaitingReview: 2 })}
        totalMilestones={2}
      />
    );

    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("emits the reason when a stage chip is clicked", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        stats={makeStats({ invoiceUnpaid: 5 })}
        totalMilestones={5}
      />
    );

    fireEvent.click(screen.getByText("Invoice unpaid"));

    expect(onChange).toHaveBeenCalledWith("invoice_unpaid");
  });

  it("emits null when All is clicked", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        value="past_due"
        stats={makeStats({ pastDue: 1 })}
        totalMilestones={1}
      />
    );

    fireEvent.click(screen.getByText("All"));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("marks the active chip as pressed", () => {
    render(
      <InboxAttentionFilter
        {...baseProps}
        value="past_due"
        stats={makeStats({ pastDue: 4 })}
        totalMilestones={4}
      />
    );

    const activeChip = screen.getByText("Past due").closest("button");
    expect(activeChip).toHaveAttribute("aria-pressed", "true");
  });

  it("offers the follow-up filter only when a follow-up is overdue", () => {
    const { rerender } = render(
      <InboxAttentionFilter {...baseProps} stats={makeStats({ pastDue: 1 })} />
    );
    expect(screen.queryByText("Follow-up due")).not.toBeInTheDocument();

    rerender(
      <InboxAttentionFilter {...baseProps} stats={makeStats({ pastDue: 1, followUpDue: 2 })} />
    );
    expect(screen.getByText("Follow-up due")).toBeInTheDocument();
  });
});

/**
 * REGRESSION GUARD. A reviewer-scoped feed carries none of the admin stat
 * keys, so the filter must render nothing at all — not a row of zero chips,
 * and not a stray "All". If this ever fails, reviewers are seeing admin UI.
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
