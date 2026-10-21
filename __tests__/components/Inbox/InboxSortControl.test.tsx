import { fireEvent, render, screen } from "@testing-library/react";
import { InboxSortControl } from "@/components/Inbox/InboxSortControl";

describe("InboxSortControl", () => {
  it("should_mark_the_active_mode_with_aria_pressed", () => {
    render(<InboxSortControl value="follow_up_date" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Next follow-up" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Priority" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("should_emit_the_wire_value_the_indexer_accepts", () => {
    const onChange = vi.fn();
    render(<InboxSortControl value="follow_up_date" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Priority" }));

    expect(onChange).toHaveBeenCalledWith("priority");
  });

  it("should_expose_the_group_under_an_order_label", () => {
    render(<InboxSortControl value="priority" onChange={vi.fn()} />);

    expect(screen.getByRole("group", { name: "Order" })).toBeInTheDocument();
  });
});
