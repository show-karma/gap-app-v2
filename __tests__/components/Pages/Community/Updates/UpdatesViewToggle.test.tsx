/**
 * Tests for UpdatesViewToggle component.
 *
 * Covers:
 * - Renders both card and table buttons with accessible labels
 * - aria-pressed reflects the active view
 * - Clicking a button calls onChange with the correct view
 */

import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { UpdatesViewToggle } from "@/components/Pages/Community/Updates/UpdatesViewToggle";

describe("UpdatesViewToggle", () => {
  it("renders both card and table buttons", () => {
    render(<UpdatesViewToggle value="cards" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Card view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table view" })).toBeInTheDocument();
  });

  it("marks the active view with aria-pressed", () => {
    render(<UpdatesViewToggle value="table" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Table view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("calls onChange with 'table' when the table button is clicked", () => {
    const onChange = vi.fn();
    render(<UpdatesViewToggle value="cards" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Table view" }));

    expect(onChange).toHaveBeenCalledWith("table");
  });

  it("calls onChange with 'cards' when the card button is clicked", () => {
    const onChange = vi.fn();
    render(<UpdatesViewToggle value="table" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Card view" }));

    expect(onChange).toHaveBeenCalledWith("cards");
  });
});
