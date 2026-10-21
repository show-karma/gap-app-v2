import { fireEvent, render, screen, within } from "@testing-library/react";
import { InboxSortControl } from "@/components/Inbox/InboxSortControl";

describe("InboxSortControl", () => {
  it("should_state_the_current_order_on_the_trigger", () => {
    render(<InboxSortControl value="follow_up_date" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Sort by: Follow-up date" })).toBeInTheDocument();
  });

  it("should_emit_the_wire_value_the_indexer_accepts", () => {
    const onChange = vi.fn();
    render(<InboxSortControl value="follow_up_date" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /sort by/i }));
    fireEvent.click(within(screen.getByRole("listbox")).getByText("Priority"));

    expect(onChange).toHaveBeenCalledWith("priority");
  });
});
