import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PanelTitle } from "@/components/Pages/Panels/PanelTitle";

describe("PanelTitle", () => {
  it("renames on Enter with the trimmed value", () => {
    const onRename = vi.fn();
    render(<PanelTitle title="Untitled panel" saving={false} onRename={onRename} />);

    fireEvent.click(screen.getByRole("button", { name: "Rename panel" }));
    const input = screen.getByLabelText("Panel title");
    fireEvent.change(input, { target: { value: "  Q3 funding  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRename).toHaveBeenCalledWith("Q3 funding");
    expect(screen.getByRole("button", { name: "Rename panel" })).toBeInTheDocument();
  });

  it("does not rename when the value is unchanged or empty", () => {
    const onRename = vi.fn();
    render(<PanelTitle title="Untitled panel" saving={false} onRename={onRename} />);

    fireEvent.click(screen.getByRole("button", { name: "Rename panel" }));
    fireEvent.blur(screen.getByLabelText("Panel title"));
    fireEvent.click(screen.getByRole("button", { name: "Rename panel" }));
    fireEvent.change(screen.getByLabelText("Panel title"), { target: { value: "   " } });
    fireEvent.blur(screen.getByLabelText("Panel title"));

    expect(onRename).not.toHaveBeenCalled();
  });

  it("restores the title on Escape", () => {
    const onRename = vi.fn();
    render(<PanelTitle title="Untitled panel" saving={false} onRename={onRename} />);

    fireEvent.click(screen.getByRole("button", { name: "Rename panel" }));
    fireEvent.change(screen.getByLabelText("Panel title"), { target: { value: "oops" } });
    fireEvent.keyDown(screen.getByLabelText("Panel title"), { key: "Escape" });

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText("Untitled panel")).toBeInTheDocument();
  });
});
