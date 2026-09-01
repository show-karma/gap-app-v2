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
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Funded & ready to build")).toBeInTheDocument();
    expect(screen.getByText("Mar 27, 2026", { selector: "time" })).toBeInTheDocument();
  });

  it("renders prior history chronologically without repeating the current status", () => {
    render(<ApplicationStatusStepper status="approved" statusHistory={history} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Under Review")).toBeInTheDocument();
    expect(screen.getByText("Looks great")).toBeInTheDocument();
    expect(screen.getAllByText("Approved")).toHaveLength(1);
  });

  it("still renders the hero when there is no history", () => {
    render(
      <ApplicationStatusStepper
        status="pending"
        statusHistory={[]}
        currentStatusDate="2026-06-18T12:00:00Z"
      />
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Awaiting a reviewer")).toBeInTheDocument();
    expect(screen.getByText("Jun 18, 2026")).toBeInTheDocument();
  });
});
