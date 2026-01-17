import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import Index from "@/app/page";
import "@testing-library/jest-dom";

jest.mock("@/src/features/homepage/components/hero", () => ({
  Hero: () => <div data-testid="hero" />,
}));

jest.mock("@/src/features/homepage/components/live-funding-opportunities", () => ({
  LiveFundingOpportunities: () => <div data-testid="live-funding-opportunities" />,
}));

jest.mock("@/src/features/homepage/components/live-funding-opportunities-skeleton", () => ({
  LiveFundingOpportunitiesSkeleton: () => <div data-testid="live-funding-opportunities-skeleton" />,
}));

jest.mock("@/src/features/homepage/components/platform-features", () => ({
  PlatformFeatures: () => <div data-testid="platform-features" />,
}));

jest.mock("@/src/features/homepage/components/how-it-works", () => ({
  HowItWorks: () => <div data-testid="how-it-works" />,
}));

jest.mock("@/src/features/homepage/components/where-builders-grow", () => ({
  WhereBuildersGrow: () => <div data-testid="where-builders-grow" />,
}));

jest.mock("@/src/features/homepage/components/join-community", () => ({
  JoinCommunity: () => <div data-testid="join-community" />,
}));

jest.mock("@/src/features/homepage/components/faq", () => ({
  FAQ: () => <div data-testid="faq" />,
}));

describe("Homepage", () => {
  it("renders all main components correctly", () => {
    render(<Index />);

    expect(screen.getByTestId("hero")).toBeInTheDocument();
    expect(screen.getByTestId("live-funding-opportunities")).toBeInTheDocument();
    expect(screen.getByTestId("platform-features")).toBeInTheDocument();
    expect(screen.getByTestId("how-it-works")).toBeInTheDocument();
    expect(screen.getByTestId("join-community")).toBeInTheDocument();
    expect(screen.getByTestId("faq")).toBeInTheDocument();
    expect(screen.getByTestId("where-builders-grow")).toBeInTheDocument();
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

  it("renders sections in the correct order", () => {
    render(<Index />);

    const main = screen.getByRole("main");
    const sections = [
      "hero",
      "live-funding-opportunities",
      "platform-features",
      "how-it-works",
      "join-community",
      "faq",
      "where-builders-grow",
    ];

    sections.forEach((testId) => {
      const element = screen.getByTestId(testId);
      expect(main).toContainElement(element);
    });
  });

  it("contains horizontal dividers between sections", () => {
    const { container } = render(<Index />);

    // Check for hr elements (horizontal lines between sections)
    const horizontalLines = container.querySelectorAll("hr");
    expect(horizontalLines.length).toBeGreaterThan(0);

    // Verify they have the correct styling
    horizontalLines.forEach((hr) => {
      expect(hr).toHaveClass("w-full", "h-[1px]", "bg-border");
    });
  });

  it("has responsive container with max-width", () => {
    render(<Index />);

    const mainContainer = screen.getByRole("main");
    const innerContainer = mainContainer.firstChild as HTMLElement;

    expect(innerContainer).toHaveClass("flex", "w-full", "max-w-[1920px]");
  });
});
