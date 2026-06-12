import { render, screen } from "@testing-library/react";
import Index from "@/app/page";
import "@testing-library/jest-dom";

vi.mock("@/src/features/home/components/hero", () => ({
  Hero: () => <div data-testid="hero" />,
}));

vi.mock("@/src/features/home/components/workflow-section", () => ({
  WorkflowSection: () => <div data-testid="workflow-section" />,
}));

describe("Homepage (funder workflow landing)", () => {
  const sections = ["hero", "workflow-section"];

  it("renders the three top-level sections", () => {
    render(<Index />);
    sections.forEach((testId) => {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
  });

  it("has the correct structure with main element", () => {
    render(<Index />);

    const mainContainer = screen.getByRole("main");
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass(
      "flex",
      "w-full",
      "flex-col",
      "flex-1",
      "items-center",
      "bg-background"
    );
  });

  it("renders sections inside the main element in order", () => {
    render(<Index />);

    const main = screen.getByRole("main");
    sections.forEach((testId) => {
      expect(main).toContainElement(screen.getByTestId(testId));
    });
  });

  it("renders sections without horizontal dividers (alternating bands carry rhythm)", () => {
    const { container } = render(<Index />);

    // Visual rhythm now comes from the workflow section's alternating
    // bg-secondary band, not a horizontal rule.
    const horizontalLines = container.querySelectorAll("hr");
    expect(horizontalLines.length).toBe(0);
  });

  it("has responsive inner container with max-width", () => {
    const { container } = render(<Index />);

    const innerContainer = container.querySelector(
      "main > div.max-w-\\[1920px\\]"
    ) as HTMLElement | null;
    expect(innerContainer).not.toBeNull();
    expect(innerContainer).toHaveClass("flex", "w-full", "max-w-[1920px]");
  });
});
