import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ActivityFeedStatic } from "@/components/Pages/Project/v2/MainContent/ActivityFeedStatic";
import type { UnifiedMilestone } from "@/types/v2/roadmap";

function createMilestone(overrides?: Partial<UnifiedMilestone>): UnifiedMilestone {
  return {
    uid: "m-1",
    type: "milestone",
    title: "Ship the v2 dashboard",
    description: "We delivered the **redesigned** analytics dashboard to all users.",
    completed: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    chainID: 42161,
    refUID: "0xref",
    source: {} as UnifiedMilestone["source"],
    ...overrides,
  };
}

describe("ActivityFeedStatic", () => {
  it("renders each item's title and a plain-text description excerpt", () => {
    render(<ActivityFeedStatic milestones={[createMilestone()]} />);
    expect(screen.getByText("Ship the v2 dashboard")).toBeInTheDocument();
    // Markdown is stripped to plain text — no literal ** markers.
    expect(
      screen.getByText(/We delivered the redesigned analytics dashboard to all users\./)
    ).toBeInTheDocument();
  });

  it("renders a human-readable activity type label", () => {
    render(
      <ActivityFeedStatic milestones={[createMilestone({ type: "grant_received", uid: "m-2" })]} />
    );
    expect(screen.getByText("Grant Approved")).toBeInTheDocument();
  });

  it("renders a date with a machine-readable dateTime attribute", () => {
    const { container } = render(<ActivityFeedStatic milestones={[createMilestone()]} />);
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("dateTime", "2026-05-01T00:00:00.000Z");
  });

  it("renders one list item per milestone", () => {
    render(
      <ActivityFeedStatic
        milestones={[createMilestone({ uid: "a" }), createMilestone({ uid: "b" })]}
      />
    );
    expect(screen.getAllByTestId("activity-item-static")).toHaveLength(2);
  });

  it("truncates long descriptions to a bounded excerpt", () => {
    const long = "word ".repeat(200).trim();
    render(<ActivityFeedStatic milestones={[createMilestone({ description: long })]} />);
    const excerpt = screen.getByText(/word word/);
    expect(excerpt.textContent?.length).toBeLessThanOrEqual(282);
    expect(excerpt.textContent?.endsWith("…")).toBe(true);
  });

  it("renders nothing when there are no milestones", () => {
    const { container } = render(<ActivityFeedStatic milestones={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
