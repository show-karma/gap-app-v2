import { render, screen } from "@testing-library/react";
import Index from "@/app/page";
import "@testing-library/jest-dom";

vi.mock("@/src/features/home/components/hero", () => ({
  Hero: () => <div data-testid="hero" />,
}));

vi.mock("@/src/features/home/components/audience-switcher", () => ({
  AudienceSwitcher: () => <div data-testid="audience-switcher" />,
}));

vi.mock("@/src/features/home/components/cta-section", () => ({
  CTASection: () => <div data-testid="cta-section" />,
}));

describe("Homepage (audience-switcher landing)", () => {
  const sections = ["hero", "audience-switcher", "cta-section"];

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

  it("contains horizontal dividers between sections", () => {
    const { container } = render(<Index />);

    const horizontalLines = container.querySelectorAll("hr");
    expect(horizontalLines.length).toBeGreaterThan(0);

    horizontalLines.forEach((hr) => {
      expect(hr).toHaveClass("w-full", "h-[1px]", "bg-border");
    });
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
