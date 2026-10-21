import { fireEvent, render, screen } from "@testing-library/react";
import { InboxViewChips } from "@/components/Inbox/InboxViewChips";
import type { IReviewerInboxStats } from "@/types/funding-platform";

const stats = (overrides: Partial<IReviewerInboxStats> = {}): IReviewerInboxStats => ({
  action: 0,
  waiting: 0,
  done: 0,
  overdue: 0,
  applications: 25,
  milestones: 15,
  followUpDue: 8,
  pastDue: 5,
  invoiceUnpaid: 2,
  ...overrides,
});

describe("InboxViewChips", () => {
  it("should_offer_the_working_views_with_full_feed_counts", () => {
    render(<InboxViewChips stats={stats()} value={null} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Follow-ups due\s*8/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Milestone overdue\s*5/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pending payment\s*2/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All\s*40/ })).toBeInTheDocument();
  });

  it("should_hide_a_view_with_nothing_behind_it", () => {
    render(<InboxViewChips stats={stats({ invoiceUnpaid: 0 })} value={null} onChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /Pending payment/ })).not.toBeInTheDocument();
  });

  it("should_render_nothing_when_only_all_would_remain", () => {
    const { container } = render(
      <InboxViewChips
        stats={stats({ followUpDue: 0, pastDue: 0, invoiceUnpaid: 0 })}
        value={null}
        onChange={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("should_emit_the_view_and_mark_it_active", () => {
    const onChange = vi.fn();
    render(<InboxViewChips stats={stats()} value="past_due" onChange={onChange} />);

    expect(screen.getByRole("button", { name: /Milestone overdue/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: /Follow-ups due/ }));
    expect(onChange).toHaveBeenCalledWith("followup_due");
    fireEvent.click(screen.getByRole("button", { name: /All/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
