import { describe, expect, it } from "bun:test";
/**
 * Unit tests for the OfferingSection component (/funders page)
 *
 * Tests cover:
 * - Rendering of section header
 * - All 3 pricing tiers (Starter, Pro, Enterprise)
 * - "Most Popular" badge on Pro tier
 * - Features list for each tier
 * - Schedule Demo CTA at bottom
 * - Responsive grid layout
 * - Accessibility
 */

import { screen } from "@testing-library/react";
import { OfferingSection } from "@/src/features/funders/components/offering-section";
import { renderWithProviders, setViewportSize, VIEWPORTS } from "../utils/test-helpers";

describe("OfferingSection Component", () => {
  describe("Rendering", () => {
    it("should render the section badge", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Our Offering")).toBeInTheDocument();
    });

    it("should render the main heading with both colored parts", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText(/Start where you are,/i)).toBeInTheDocument();
      expect(screen.getByText(/scale when you're ready/i)).toBeInTheDocument();
    });

    it("should render subtitle", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Choose your growth path.")).toBeInTheDocument();
    });

    it("should render all 3 pricing tiers", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });
  });

  describe("Starter Tier", () => {
    it("should display Starter tier with description", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByText(/Start your accountability journey/i)).toBeInTheDocument();
    });

    it("should display Starter tier features", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText(/Track up to 100 projects/i)).toBeInTheDocument();
      expect(screen.getByText(/Milestone tracking with onchain attestations/i)).toBeInTheDocument();
    });
  });

  describe("Pro Tier (Most Popular)", () => {
    it("should display Pro tier with description", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByText(/Scale to unlimited funding rounds/i)).toBeInTheDocument();
    });

    it("should show 'Most popular' badge on Pro tier", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Most popular")).toBeInTheDocument();
    });

    it("should display Pro tier features", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText(/Track up to 500 projects/i)).toBeInTheDocument();
      expect(screen.getByText(/AI application review/i)).toBeInTheDocument();
    });
  });

  describe("Enterprise Tier", () => {
    it("should display Enterprise tier with description", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Enterprise")).toBeInTheDocument();
      expect(screen.getByText(/Continuous grant operations/i)).toBeInTheDocument();
    });

    it("should display Enterprise tier features", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText(/Track 2,000\+ projects/i)).toBeInTheDocument();
      expect(screen.getByText(/Multi-chain deployments/i)).toBeInTheDocument();
    });
  });

  describe("CTA Section", () => {
    it("should render bottom CTA text", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Ready to Scale Your Ecosystem?")).toBeInTheDocument();
    });

    it("should render Schedule Demo button", () => {
      renderWithProviders(<OfferingSection />);

      const button = screen.getByRole("link", { name: /Schedule Demo/i });
      expect(button).toBeInTheDocument();
    });

    it("should have external link with security attributes", () => {
      renderWithProviders(<OfferingSection />);

      const link = screen.getByRole("link", { name: /Schedule Demo/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Responsive Behavior", () => {
    it("should render correctly on mobile viewport", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height);

      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });

    it("should render correctly on desktop with 3-column grid", () => {
      setViewportSize(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height);

      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should use semantic HTML with proper heading hierarchy", () => {
      renderWithProviders(<OfferingSection />);

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toBeInTheDocument();

      const h3Elements = screen.getAllByRole("heading", { level: 3 });
      expect(h3Elements).toHaveLength(3);
    });

    it("should use section landmark for semantic structure", () => {
      const { container } = renderWithProviders(<OfferingSection />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });
  });
});
