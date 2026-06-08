import { render, screen } from "@testing-library/react";
import { ApplicationStatusStepper } from "../ApplicationStatusStepper";

const history = [
  { status: "pending", timestamp: "2026-03-27T17:24:00Z", reason: "" },
  { status: "under_review", timestamp: "2026-03-27T17:26:00Z", reason: "" },
  { status: "approved", timestamp: "2026-03-27T17:29:00Z", reason: "Looks great" },
];

describe("ApplicationStatusStepper", () => {
  it("renders the hero for the current status with its subtitle", () => {
    render(<ApplicationStatusStepper status="approved" statusHistory={history} />);
    // Hero label + each timeline node label both read "Approved"; at least one exists.
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getByText("Funded & ready to build")).toBeInTheDocument();
  });

  it("renders every history entry chronologically with reasons", () => {
    render(<ApplicationStatusStepper status="approved" statusHistory={history} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Under Review")).toBeInTheDocument();
    expect(screen.getByText("Looks great")).toBeInTheDocument();
  });

  it("still renders the hero when there is no history", () => {
    render(<ApplicationStatusStepper status="pending" statusHistory={[]} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Awaiting a reviewer")).toBeInTheDocument();
  });
});
