import { fireEvent, render, screen } from "@testing-library/react";
import { BentoOverview } from "@/components/Pages/Dashboard/v3/BentoOverview";
import type { DashModule } from "@/components/Pages/Dashboard/v3/module";

const makeModule = (key: string, label: string, detail: string): DashModule => ({
  key,
  label,
  icon: key === "projects" ? "rocket" : "users",
  status: "ready",
  summary: { big: 2, rows: [] },
  empty: { prompt: "", cta: { label: "" } },
  render: () => <div>{detail}</div>,
});

describe("BentoOverview", () => {
  const modules = [
    makeModule("projects", "My projects", "PROJECTS DETAIL"),
    makeModule("communities", "My communities", "COMMUNITIES DETAIL"),
  ];

  it("renders one tile per module in the overview", () => {
    render(<BentoOverview modules={modules} />);
    expect(screen.getByText("My projects")).toBeInTheDocument();
    expect(screen.getByText("My communities")).toBeInTheDocument();
    expect(screen.queryByText("PROJECTS DETAIL")).not.toBeInTheDocument();
  });

  it("drills into a module on tile click and back again", () => {
    render(<BentoOverview modules={modules} />);

    fireEvent.click(screen.getByText("My projects"));

    // Full module view + back affordance are shown; the other tile is hidden.
    expect(screen.getByText("PROJECTS DETAIL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to overview/i })).toBeInTheDocument();
    expect(screen.queryByText("My communities")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to overview/i }));

    // Back to the grid.
    expect(screen.getByText("My communities")).toBeInTheDocument();
    expect(screen.queryByText("PROJECTS DETAIL")).not.toBeInTheDocument();
  });
});
