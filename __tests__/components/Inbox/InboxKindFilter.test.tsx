import { fireEvent, render, screen } from "@testing-library/react";
import { InboxKindFilter } from "@/components/Inbox/InboxKindFilter";
import type { IReviewerInboxStats } from "@/types/funding-platform";

const stats: IReviewerInboxStats = {
  action: 0,
  waiting: 0,
  done: 0,
  overdue: 0,
  applications: 4,
  milestones: 9,
};

describe("InboxKindFilter", () => {
  it("should_show_each_stream_with_its_full_feed_count", () => {
    render(<InboxKindFilter stats={stats} value={null} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /All\s*13/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Applications\s*4/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Milestones\s*9/ })).toBeInTheDocument();
  });

  it("should_mark_the_active_stream", () => {
    render(<InboxKindFilter stats={stats} value="milestone" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Milestones\s*9/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /All\s*13/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("should_emit_the_stream_or_null_for_all", () => {
    const onChange = vi.fn();
    render(<InboxKindFilter stats={stats} value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Applications\s*4/ }));
    expect(onChange).toHaveBeenCalledWith("application");

    fireEvent.click(screen.getByRole("button", { name: /All\s*13/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
