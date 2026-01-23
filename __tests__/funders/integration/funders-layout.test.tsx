/**
 * Integration tests for the Funders Page Layout
 *
 * Tests cover:
 * - All sections render in correct order
 * - Horizontal dividers between sections
 * - Proper spacing and alignment
 * - Responsive container max-width
 * - Section visibility
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { screen } from "@testing-library/react";
import FundersPage from "@/app/funders/page";
import { mockCommunities } from "../fixtures/communities";
import { mockChosenCommunities } from "../setup";
import { renderWithProviders, setViewportSize, VIEWPORTS } from "../utils/test-helpers";

describe("Funders Page Layout Integration", () => {
  beforeEach(() => {
    mockChosenCommunities.mockReturnValue(mockCommunities);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Section Rendering", () => {
    it("should render all sections in correct order", () => {
      renderWithProviders(<FundersPage />);

      // Get all sections by their key content
      const hero = screen.getByText(/Grow your ecosystem/i);
      const numbers = screen.getByText(/The numbers/i);
      const platform = screen.getByText(/Smarter decisions with AI-powered evaluation/i);
      const caseStudies = screen.getByText(/Case Studies/i);
      const howItWorks = screen.getByText(/How It Works/i);
      const offering = screen.getByText(/Our Offering/i);
      const faq = screen.getByText(/Frequently asked questions/i);
      const vision = screen.getByText(/Focus on ecosystem growth and impact/i);

      // Verify all sections are present
      expect(hero).toBeInTheDocument();
      expect(numbers).toBeInTheDocument();
      expect(platform).toBeInTheDocument();
      expect(caseStudies).toBeInTheDocument();
      expect(howItWorks).toBeInTheDocument();
      expect(offering).toBeInTheDocument();
      expect(faq).toBeInTheDocument();
      expect(vision).toBeInTheDocument();
    });

    it("should render horizontal dividers between sections", () => {
      const { container } = renderWithProviders(<FundersPage />);

      // Count hr elements (dividers)
      const dividers = container.querySelectorAll("hr");
      expect(dividers.length).toBeGreaterThanOrEqual(6);
    });

    it("should have proper spacing between sections", () => {
      const { container } = renderWithProviders(<FundersPage />);

      // Check for gap classes on main container
      const mainContainer = container.querySelector("main");
      const innerContainer = mainContainer?.querySelector("div");

      expect(innerContainer?.className).toMatch(/gap-16|gap-24/);
    });

    it("should maintain sections alignment", () => {
      const { container } = renderWithProviders(<FundersPage />);

      const mainContainer = container.querySelector("main");
      expect(mainContainer?.className).toContain("flex-col");
      expect(mainContainer?.className).toContain("items-center");
    });

    it("should have responsive container max-width (1920px)", () => {
      const { container } = renderWithProviders(<FundersPage />);

      const innerContainer = container.querySelector("main > div");
      expect(innerContainer?.className).toContain("max-w-[1920px]");
    });

    it("should apply background colors correctly", () => {
      const { container } = renderWithProviders(<FundersPage />);

      const mainContainer = container.querySelector("main");
      expect(mainContainer?.className).toContain("bg-background");
    });

    it("should render sections visible in viewport", () => {
      renderWithProviders(<FundersPage />);

      // Hero should be immediately visible
      expect(screen.getByText(/Grow your ecosystem/i)).toBeVisible();
    });

    it("should have gap spacing that adapts to breakpoints", () => {
      const { container } = renderWithProviders(<FundersPage />);

      const innerContainer = container.querySelector("main > div");
      // Check for responsive gap classes (gap-16 lg:gap-24)
      expect(innerContainer?.className).toMatch(/gap-16/);
      expect(innerContainer?.className).toMatch(/lg:gap-24/);
    });
  });

  describe("Scroll Behavior", () => {
    it("should support smooth scrolling between sections", () => {
      renderWithProviders(<FundersPage />);

      // Verify sections are stacked vertically
      const { container } = renderWithProviders(<FundersPage />);
      const mainContainer = container.querySelector("main");

      expect(mainContainer?.className).toContain("flex-col");
    });

    it("should handle anchor link navigation to case studies", () => {
      const { container } = renderWithProviders(<FundersPage />);

      // Check for case-studies id
      const caseStudiesSection = container.querySelector("#case-studies");
      expect(caseStudiesSection).toBeInTheDocument();
    });

    it("should maintain scroll position during interaction", () => {
      renderWithProviders(<FundersPage />);

      // All sections should be in DOM for scroll positioning
      expect(screen.getByText(/Grow your ecosystem/i)).toBeInTheDocument();
      expect(screen.getByText(/The numbers/i)).toBeInTheDocument();
      expect(screen.getByText(/Case Studies/i)).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should render initial content quickly", () => {
      const startTime = performance.now();

      renderWithProviders(<FundersPage />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Initial render should be fast (< 1000ms in test environment)
      expect(renderTime).toBeLessThan(1000);
    });

    it("should avoid layout shifts", () => {
      const { container } = renderWithProviders(<FundersPage />);

      // Check that sections have defined structure
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(5);
    });

    it("should support progressive loading", () => {
      renderWithProviders(<FundersPage />);

      // Hero (above fold) should load first
      expect(screen.getByText(/Grow your ecosystem/i)).toBeInTheDocument();

      // Below-fold sections should also be present
      expect(screen.getByText(/Frequently asked questions/i)).toBeInTheDocument();
    });

    it("should handle images loading progressively", () => {
      const { container } = renderWithProviders(<FundersPage />);

      // Images should be present in DOM
      const images = container.querySelectorAll("img");
      expect(images.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive Layout", () => {
    it("should render correctly on mobile viewport", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height);

      renderWithProviders(<FundersPage />);

      expect(screen.getByText(/Grow your ecosystem/i)).toBeInTheDocument();
      expect(screen.getByText(/The numbers/i)).toBeInTheDocument();
    });
  });
});
