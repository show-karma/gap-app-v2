import { fireEvent, render, screen } from "@testing-library/react";
import { InboxViewTabs } from "@/components/Inbox/InboxViewTabs";
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
  paperworkPending: 27,
  ...overrides,
});

describe("InboxViewTabs", () => {
  it("should_offer_the_working_views_with_full_feed_counts", () => {
    render(<InboxViewTabs stats={stats()} value={null} onChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: /Follow-ups due\s*8/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Milestone overdue\s*5/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Pending payment\s*2/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Paperwork pending\s*27/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /All\s*40/ })).toBeInTheDocument();
  });

  it("should_hide_a_view_with_nothing_behind_it", () => {
    render(<InboxViewTabs stats={stats({ invoiceUnpaid: 0 })} value={null} onChange={vi.fn()} />);

    expect(screen.queryByRole("tab", { name: /Pending payment/ })).not.toBeInTheDocument();
  });

  it("should_render_nothing_when_only_all_would_remain", () => {
    const { container } = render(
      <InboxViewTabs
        stats={stats({ followUpDue: 0, pastDue: 0, invoiceUnpaid: 0, paperworkPending: 0 })}
        value={null}
        onChange={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("should_emit_the_view_and_mark_it_current", () => {
    const onChange = vi.fn();
    render(<InboxViewTabs stats={stats()} value="past_due" onChange={onChange} />);

    expect(screen.getByRole("tab", { name: /Milestone overdue/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    fireEvent.click(screen.getByRole("tab", { name: /Follow-ups due/ }));
    expect(onChange).toHaveBeenCalledWith("followup_due");
    fireEvent.click(screen.getByRole("tab", { name: /All/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
