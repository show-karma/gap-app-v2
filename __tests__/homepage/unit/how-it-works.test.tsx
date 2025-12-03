/**
 * HowItWorks Component Tests
 * Tests the "How It Works" section with step cards
 *
 * Target: 7 tests
 * - Rendering (3)
 * - Content Display (2)
 * - Visual Elements (2)
 */

import { HowItWorks } from "@/src/features/homepage/components/how-it-works";
import { renderWithProviders, screen } from "../utils/test-helpers";
import "@testing-library/jest-dom";

// Mock Badge component
jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

describe("HowItWorks Component", () => {
  it("should render section heading", () => {
    renderWithProviders(<HowItWorks />);

    expect(screen.getByText("One profile.")).toBeInTheDocument();
    expect(screen.getByText("Unlimited possibilities.")).toBeInTheDocument();
  });

  it("should render 'How It Works' badge", () => {
    renderWithProviders(<HowItWorks />);

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveTextContent("How It Works");
    expect(badge).toHaveAttribute("data-variant", "secondary");
  });

  it("should display all 3 step cards", () => {
    renderWithProviders(<HowItWorks />);

    expect(screen.getByText("Create project")).toBeInTheDocument();
    expect(screen.getByText("Apply and get funded")).toBeInTheDocument();
    expect(screen.getByText("Add milestones, metrics and updates")).toBeInTheDocument();
  });

  it("should render outcome cards", () => {
    renderWithProviders(<HowItWorks />);

    // The rotating outcome stack displays one card at a time
    // By default, the first outcome "Build reputation" should be visible
    expect(screen.getByText("Build reputation")).toBeInTheDocument();
  });

  it("should display check circle icons for steps", () => {
    const { container } = renderWithProviders(<HowItWorks />);

    // There should be check icons (4 for step cards + 1 for outcomes card = 5 total)
    // Using a more flexible selector that works with lucide-react icons
    const checkIcons = container.querySelectorAll("svg");
    expect(checkIcons.length).toBeGreaterThanOrEqual(4);
  });

  it("should use semantic HTML structure", () => {
    const { container } = renderWithProviders(<HowItWorks />);

    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();

    // Component has 1 h2 heading with two lines
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(headings[0]).toHaveTextContent("One profile.");
  });

  it("should maintain proper layout for step flow", () => {
    const { container } = renderWithProviders(<HowItWorks />);

    // Check for flow diagram container
    const flowContainer = container.querySelector(".flex");
    expect(flowContainer).toBeInTheDocument();

    // Check for connector line
    const connectorLine = container.querySelector(".absolute");
    expect(connectorLine).toBeInTheDocument();
  });
});
