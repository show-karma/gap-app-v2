/**
 * Unit tests for the FAQSection component (/funders page)
 *
 * Tests cover:
 * - Rendering of section heading
 * - FAQ accordion with all questions
 * - Responsive layout
 * - Content verification
 * - Accessibility
 */

import { screen } from "@testing-library/react";
import { FAQSection } from "@/src/features/funders/components/faq-section";
import { renderWithProviders, setViewportSize, VIEWPORTS } from "../utils/test-helpers";

describe("FAQSection Component", () => {
  describe("Rendering", () => {
    it("should render the main heading", () => {
      renderWithProviders(<FAQSection />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Frequently asked questions");
    });

    it("should render the subtitle", () => {
      renderWithProviders(<FAQSection />);

      expect(
        screen.getByText(/Everything you need to know about the product and billing/i)
      ).toBeInTheDocument();
    });

    it("should render the FAQ accordion component", () => {
      renderWithProviders(<FAQSection />);

      // FAQ accordion renders with questions - verify by checking for multiple FAQ questions
      expect(screen.getByText(/What is Karma and how does it help funders?/i)).toBeInTheDocument();
      expect(screen.getByText(/Can we migrate data from other platforms?/i)).toBeInTheDocument();
    });
  });

  describe("FAQ Content", () => {
    it("should display FAQ items", () => {
      renderWithProviders(<FAQSection />);

      // Check for presence of FAQ questions
      expect(screen.getByText(/What is Karma and how does it help funders?/i)).toBeInTheDocument();
    });

    it("should include question about data migration", () => {
      renderWithProviders(<FAQSection />);

      expect(screen.getByText(/Can we migrate data from other platforms?/i)).toBeInTheDocument();
    });

    it("should include question about trying the platform", () => {
      renderWithProviders(<FAQSection />);

      expect(screen.getByText(/Can I try out the platform before committing/i)).toBeInTheDocument();
    });

    it("should include question about accountability", () => {
      renderWithProviders(<FAQSection />);

      expect(
        screen.getByText(
          /Can I run my program on another platform and use Karma just for accountability/i
        )
      ).toBeInTheDocument();
    });

    it("should include question about transparency", () => {
      renderWithProviders(<FAQSection />);

      expect(
        screen.getByText(/How does Karma ensure accountability and transparency?/i)
      ).toBeInTheDocument();
    });

    it("should include question about integrating existing mechanisms", () => {
      renderWithProviders(<FAQSection />);

      expect(
        screen.getByText(/Can I integrate my existing funding or evaluation mechanisms?/i)
      ).toBeInTheDocument();
    });

    it("should include question about reports and impact", () => {
      renderWithProviders(<FAQSection />);

      expect(screen.getByText(/Can I generate reports and measure impact?/i)).toBeInTheDocument();
    });

    it("should include question about tool integration", () => {
      renderWithProviders(<FAQSection />);

      expect(
        screen.getByText(/Can Karma integrate with our existing tools or platforms?/i)
      ).toBeInTheDocument();
    });

    it("should include question about whitelabel version", () => {
      renderWithProviders(<FAQSection />);

      expect(
        screen.getByText(/Can we launch a whitelabel version of Karma for our ecosystem?/i)
      ).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("should render correctly on mobile viewport", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height);

      renderWithProviders(<FAQSection />);

      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/What is Karma and how does it help funders?/i)).toBeInTheDocument();
    });

    it("should render correctly on desktop viewport", () => {
      setViewportSize(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height);

      renderWithProviders(<FAQSection />);

      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/What is Karma and how does it help funders?/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should use semantic HTML with proper heading hierarchy", () => {
      renderWithProviders(<FAQSection />);

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toBeInTheDocument();
    });

    it("should use section landmark for semantic structure", () => {
      const { container } = renderWithProviders(<FAQSection />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });
  });
});
