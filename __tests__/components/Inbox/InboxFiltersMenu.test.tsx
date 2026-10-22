import { fireEvent, render, screen } from "@testing-library/react";
import { InboxFiltersMenu } from "@/components/Inbox/InboxFiltersMenu";

const rows = [
  { label: "Type", control: <span>type control</span> },
  { label: "Stage", control: <span>stage control</span> },
];

describe("InboxFiltersMenu", () => {
  it("should_keep_the_controls_behind_the_button_until_opened", () => {
    render(<InboxFiltersMenu activeCount={0} rows={rows} />);

    expect(screen.queryByText("type control")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByText("type control")).toBeInTheDocument();
    expect(screen.getByText("Stage")).toBeInTheDocument();
  });

  it("should_say_how_many_filters_are_active_and_offer_to_clear_them", () => {
    const onClear = vi.fn();
    render(<InboxFiltersMenu activeCount={2} rows={rows} onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: "Filters, 2 active" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onClear).toHaveBeenCalled();
  });

  it("should_not_offer_clear_when_nothing_is_active", () => {
    render(<InboxFiltersMenu activeCount={0} rows={rows} onClear={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });
});
