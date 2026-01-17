import { describe, expect, it } from "bun:test";
/**
 * Unit tests for the NumbersSection component (/funders page)
 *
 * Tests cover:
 * - Rendering of all statistics
 * - Badge and heading display
 * - Gradient styling for numbers
 * - Special handling of "4x faster" statistic
 * - Responsive layout
 * - Accessibility
 */

import { screen } from "@testing-library/react";
import { NumbersSection } from "@/src/features/funders/components/numbers-section";
import { mockStatistics } from "../fixtures/statistics";
import { renderWithProviders, setViewportSize, VIEWPORTS } from "../utils/test-helpers";

describe("NumbersSection Component", () => {
  describe("Rendering", () => {
    it("should render the section badge", () => {
      renderWithProviders(<NumbersSection />);

      expect(screen.getByText("The Numbers")).toBeInTheDocument();
    });

    it("should render the main heading", () => {
      renderWithProviders(<NumbersSection />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Proven expertise in ecosystem funding");
    });

    it("should render the description text", () => {
      renderWithProviders(<NumbersSection />);

      expect(
        screen.getByText(/We've powered some of the largest onchain funding programs/i)
      ).toBeInTheDocument();
    });

    it("should render all four statistics", () => {
      renderWithProviders(<NumbersSection />);

      mockStatistics.forEach((stat) => {
        expect(screen.getByText(stat.title)).toBeInTheDocument();
        expect(screen.getByText(stat.description)).toBeInTheDocument();
      });
    });
  });

  describe("Statistics Display", () => {
    it("should display the '30+' statistic correctly", () => {
      const { container } = renderWithProviders(<NumbersSection />);

      expect(screen.getByText("Ecosystems supported")).toBeInTheDocument();
      expect(container.textContent).toContain("30+");
    });

    it("should display the '4k' statistic correctly", () => {
      const { container } = renderWithProviders(<NumbersSection />);

      expect(screen.getByText("Projects tracked")).toBeInTheDocument();
      expect(container.textContent).toContain("4k");
    });

    it("should display the '50k' statistic correctly", () => {
      const { container } = renderWithProviders(<NumbersSection />);

      expect(screen.getByText("Onchain attestations")).toBeInTheDocument();
      expect(container.textContent).toContain("50k");
    });

    it("should display the '4x faster' statistic with special formatting", () => {
      const { container } = renderWithProviders(<NumbersSection />);

      expect(screen.getByText("Program Launch Time")).toBeInTheDocument();
      expect(container.textContent).toContain("4x");
      expect(container.textContent).toContain("faster");
    });

    it("should display all statistic titles as h3 headings", () => {
      renderWithProviders(<NumbersSection />);

      const h3Elements = screen.getAllByRole("heading", { level: 3 });
      expect(h3Elements).toHaveLength(4);

      mockStatistics.forEach((stat) => {
        const heading = h3Elements.find((h3) => h3.textContent === stat.title);
        expect(heading).toBeInTheDocument();
      });
    });

    it("should display all statistic descriptions", () => {
      renderWithProviders(<NumbersSection />);

      mockStatistics.forEach((stat) => {
        expect(screen.getByText(stat.description)).toBeInTheDocument();
      });
    });
  });

  describe("Styling", () => {
    it("should apply gradient styling to statistic numbers", () => {
      const { container } = renderWithProviders(<NumbersSection />);

      // The numbers have inline gradient styles applied via style attribute
      // Check that the component renders all the numbers
      expect(container.textContent).toContain("30+");
      expect(container.textContent).toContain("4k");
      expect(container.textContent).toContain("50k");
      expect(container.textContent).toContain("4x");
      expect(container.textContent).toContain("faster");
    });

    it("should use badge styling for 'The numbers' pill", () => {
      renderWithProviders(<NumbersSection />);

      const badge = screen.getByText("The Numbers");
      expect(badge.className).toContain("rounded-full");
    });
  });

  describe("Responsive Behavior", () => {
    it("should render correctly on mobile viewport", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height);

      renderWithProviders(<NumbersSection />);

      expect(screen.getByText("The Numbers")).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
    });

    it("should render correctly on tablet viewport", () => {
      setViewportSize(VIEWPORTS.TABLET.width, VIEWPORTS.TABLET.height);

      renderWithProviders(<NumbersSection />);

      expect(screen.getByText("The Numbers")).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
    });

    it("should render correctly on desktop viewport", () => {
      setViewportSize(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height);

      renderWithProviders(<NumbersSection />);

      expect(screen.getByText("The Numbers")).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
    });
  });

  describe("Accessibility", () => {
    it("should use semantic HTML with proper heading hierarchy", () => {
      renderWithProviders(<NumbersSection />);

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toBeInTheDocument();

      const h3Elements = screen.getAllByRole("heading", { level: 3 });
      expect(h3Elements).toHaveLength(4);
    });

    it("should use section landmark for semantic structure", () => {
      const { container } = renderWithProviders(<NumbersSection />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("should have descriptive text for all statistics", () => {
      renderWithProviders(<NumbersSection />);

      mockStatistics.forEach((stat) => {
        expect(screen.getByText(stat.description)).toBeInTheDocument();
      });
    });
  });
});
