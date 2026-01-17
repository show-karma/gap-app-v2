import { describe, expect, it } from "bun:test";
/**
 * Unit tests for the HandleTheVisionSection component (/funders page)
 *
 * Tests cover:
 * - Rendering of heading and subtitle
 * - Schedule Demo CTA button
 * - External link security
 * - Responsive layout
 * - Accessibility
 */

import { screen } from "@testing-library/react";
import { HandleTheVisionSection } from "@/src/features/funders/components/handle-the-vision-section";
import { renderWithProviders, setViewportSize, VIEWPORTS } from "../utils/test-helpers";

describe("HandleTheVisionSection Component", () => {
  describe("Rendering", () => {
    it("should render the main heading", () => {
      renderWithProviders(<HandleTheVisionSection />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/Focus on ecosystem growth and impact/i);
      expect(heading).toHaveTextContent(/We handle the infrastructure/i);
    });

    it("should render the subtitle", () => {
      renderWithProviders(<HandleTheVisionSection />);

      expect(screen.getByText("Ready to grow your community?")).toBeInTheDocument();
    });

    it("should render the Schedule Demo button", () => {
      renderWithProviders(<HandleTheVisionSection />);

      const button = screen.getByRole("link", { name: /Schedule Demo/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Schedule Demo CTA", () => {
    it("should link to partner form", () => {
      renderWithProviders(<HandleTheVisionSection />);

      const link = screen.getByRole("link", { name: /Schedule Demo/i });
      expect(link.getAttribute("href")).toBeTruthy();
    });

    it("should open in a new tab", () => {
      renderWithProviders(<HandleTheVisionSection />);

      const link = screen.getByRole("link", { name: /Schedule Demo/i });
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("should have security attributes for external links", () => {
      renderWithProviders(<HandleTheVisionSection />);

      const link = screen.getByRole("link", { name: /Schedule Demo/i });
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Responsive Behavior", () => {
    it("should render correctly on mobile viewport", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height);

      renderWithProviders(<HandleTheVisionSection />);

      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Schedule Demo/i })).toBeInTheDocument();
    });

    it("should render correctly on desktop viewport", () => {
      setViewportSize(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height);

      renderWithProviders(<HandleTheVisionSection />);

      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Schedule Demo/i })).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should use semantic HTML with proper heading hierarchy", () => {
      renderWithProviders(<HandleTheVisionSection />);

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toBeInTheDocument();
    });

    it("should use section landmark for semantic structure", () => {
      const { container } = renderWithProviders(<HandleTheVisionSection />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });
  });
});
