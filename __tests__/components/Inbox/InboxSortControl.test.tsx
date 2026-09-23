import { fireEvent, render, screen } from "@testing-library/react";
import { InboxSortControl } from "@/components/Inbox/InboxSortControl";

const onChange = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InboxSortControl", () => {
  it("should_mark_the_active_mode_with_aria_pressed", () => {
    render(<InboxSortControl value="priority" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Priority" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Follow-up date" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("should_emit_the_wire_value_the_indexer_accepts", () => {
    // "follow_up_date", not "followUpDate" — the schema rejects anything else.
    render(<InboxSortControl value="priority" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Follow-up date" }));

    expect(onChange).toHaveBeenCalledWith("follow_up_date");
  });

  it("should_emit_priority_when_switching_back", () => {
    render(<InboxSortControl value="follow_up_date" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Priority" }));

    expect(onChange).toHaveBeenCalledWith("priority");
  });

  it("should_expose_the_group_under_a_sort_label", () => {
    render(<InboxSortControl value="priority" onChange={onChange} />);

    expect(screen.getByRole("group", { name: "Sort by" })).toBeInTheDocument();
  });
});
