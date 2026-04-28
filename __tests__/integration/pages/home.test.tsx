import { render, screen } from "@testing-library/react";
import Index from "@/app/page";
import "@testing-library/jest-dom";

vi.mock("@/src/features/home/components/hero", () => ({
  Hero: () => <div data-testid="hero" />,
}));

vi.mock("@/src/features/home/components/pain-points", () => ({
  PainPoints: () => <div data-testid="pain-points" />,
}));

vi.mock("@/src/features/home/components/numbers-section", () => ({
  NumbersSection: () => <div data-testid="numbers-section" />,
}));

vi.mock("@/src/features/home/components/platform-section", () => ({
  PlatformSection: () => <div data-testid="platform-section" />,
}));

vi.mock("@/src/features/home/components/case-studies-section", () => ({
  CaseStudiesSection: () => <div data-testid="case-studies-section" />,
}));

vi.mock("@/src/features/home/components/how-it-works-section", () => ({
  HowItWorksSection: () => <div data-testid="how-it-works-section" />,
}));

vi.mock("@/src/features/home/components/objections-section", () => ({
  ObjectionsSection: () => <div data-testid="objections-section" />,
}));

vi.mock("@/src/features/home/components/offering-section", () => ({
  OfferingSection: () => <div data-testid="offering-section" />,
}));

vi.mock("@/src/features/home/components/faq-section", () => ({
  FAQSection: () => <div data-testid="faq-section" />,
}));

vi.mock("@/src/features/home/components/cta-section", () => ({
  CTASection: () => <div data-testid="cta-section" />,
}));

describe("Homepage (funder landing)", () => {
  const sections = [
    "hero",
    "pain-points",
    "numbers-section",
    "platform-section",
    "case-studies-section",
    "how-it-works-section",
    "objections-section",
    "offering-section",
    "faq-section",
    "cta-section",
  ];

  it("renders all main sections", () => {
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
