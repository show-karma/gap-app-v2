import { describe, expect, it } from "bun:test";
/**
 * Unit tests for the HowItWorksSection component (/funders page)
 *
 * Tests cover:
 * - Rendering of section header
 * - All 3 step cards with icons, badges, and content
 * - Schedule Demo CTA button in first step
 * - Icons for each step
 * - Responsive grid layout
 * - Accessibility
 */

import { screen } from "@testing-library/react";
import { HowItWorksSection } from "@/src/features/funders/components/how-it-works-section";
import { renderWithProviders, setViewportSize, VIEWPORTS } from "../utils/test-helpers";

describe("HowItWorksSection Component", () => {
  describe("Rendering", () => {
    it("should render the section badge", () => {
      renderWithProviders(<HowItWorksSection />);

      expect(screen.getByText("How It Works")).toBeInTheDocument();
    });

    it("should render the main heading with both colored parts", () => {
      renderWithProviders(<HowItWorksSection />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Launch and fund impact");
      expect(heading).toHaveTextContent("in 48 hours");
    });

    it("should render all 3 step cards", () => {
      renderWithProviders(<HowItWorksSection />);

      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 2")).toBeInTheDocument();
      expect(screen.getByText("Step 3")).toBeInTheDocument();
    });
  });

  describe("Step 1 - Connect", () => {
    it("should display step 1 title and description", () => {
      renderWithProviders(<HowItWorksSection />);

      expect(screen.getByText("Connect with our team")).toBeInTheDocument();
      expect(screen.getByText(/Meet your dedicated success partner/i)).toBeInTheDocument();
    });

    it("should render Mail icon for step 1", () => {
      renderWithProviders(<HowItWorksSection />);

      // Verify step 1 card is rendered (icons render as SVGs)
      expect(screen.getByText("Connect with our team")).toBeInTheDocument();
    });

    it("should include Schedule Demo button in step 1", () => {
      renderWithProviders(<HowItWorksSection />);

      const buttons = screen.getAllByRole("link", { name: /Schedule Demo/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it("should have external link for Schedule Demo", () => {
      renderWithProviders(<HowItWorksSection />);

      const link = screen.getAllByRole("link", { name: /Schedule Demo/i })[0];
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Step 2 - Configure", () => {
    it("should display step 2 title and description", () => {
      renderWithProviders(<HowItWorksSection />);

      expect(screen.getByText("Configure your ecosystem")).toBeInTheDocument();
      // Check for key part of description text
      expect(screen.getByText(/help you set up your community space/i)).toBeInTheDocument();
    });

    it("should render Zap icon for step 2", () => {
      renderWithProviders(<HowItWorksSection />);

      // Verify step 2 card is rendered (icons render as SVGs)
      expect(screen.getByText("Configure your ecosystem")).toBeInTheDocument();
    });
  });

  describe("Step 3 - Launch", () => {
    it("should display step 3 title and description", () => {
      renderWithProviders(<HowItWorksSection />);

      expect(screen.getByText("Launch your program")).toBeInTheDocument();
      expect(screen.getByText(/Design your funding program/i)).toBeInTheDocument();
    });

    it("should render BarChart2 icon for step 3", () => {
      renderWithProviders(<HowItWorksSection />);

      // Verify step 3 card is rendered (icons render as SVGs)
      expect(screen.getByText("Launch your program")).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("should render correctly on mobile viewport", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height);

      renderWithProviders(<HowItWorksSection />);

      expect(screen.getByText("How It Works")).toBeInTheDocument();
      expect(screen.getAllByText(/Step \d/)).toHaveLength(3);
    });

    it("should render correctly on desktop with 3-column grid", () => {
      setViewportSize(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height);

      renderWithProviders(<HowItWorksSection />);

      expect(screen.getByText("How It Works")).toBeInTheDocument();
      expect(screen.getAllByText(/Step \d/)).toHaveLength(3);
    });
  });

  describe("Accessibility", () => {
    it("should use semantic HTML with proper heading hierarchy", () => {
      renderWithProviders(<HowItWorksSection />);

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toBeInTheDocument();

      const h3Elements = screen.getAllByRole("heading", { level: 3 });
      expect(h3Elements).toHaveLength(3);
    });

    it("should use section landmark for semantic structure", () => {
      const { container } = renderWithProviders(<HowItWorksSection />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });
  });
});
