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
  it("should_show_all_types_with_the_full_feed_count_when_nothing_is_selected", () => {
    render(<InboxKindFilter stats={stats} value={null} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Filter by type: All types" })).toHaveTextContent(
      "13"
    );
  });

  it("should_name_the_selected_stream_on_the_trigger", () => {
    render(<InboxKindFilter stats={stats} value="milestone" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Filter by type: Milestones" })).toHaveTextContent(
      "9"
    );
  });

  it("should_list_each_stream_with_its_count_and_emit_the_choice", () => {
    const onChange = vi.fn();
    render(<InboxKindFilter stats={stats} value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Filter by type: All types" }));
    const applications = screen.getByRole("option", { name: /Applications\s*4/ });
    expect(screen.getByRole("option", { name: /Milestones\s*9/ })).toBeInTheDocument();

    fireEvent.click(applications);
    expect(onChange).toHaveBeenCalledWith("application");
  });
});
