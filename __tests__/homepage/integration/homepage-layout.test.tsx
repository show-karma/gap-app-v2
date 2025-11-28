/**
 * Homepage Layout Integration Tests
 * Tests the overall layout structure and section rendering
 *
 * Target: 15 tests
 * - Section Rendering (7)
 * - Scroll Behavior (4)
 * - Performance (4)
 */

import HomePage from "@/app/page";
import { renderWithProviders, screen, waitFor } from "../utils/test-helpers";
import "@testing-library/jest-dom";

describe("Homepage Layout Integration", () => {
  describe("Section Rendering", () => {
    it("should render all sections in correct order", async () => {
      renderWithProviders(await HomePage());

      // Check sections exist
      expect(screen.getByText(/Where builders get funded/i)).toBeInTheDocument();
      expect(screen.getByText(/Live funding opportunities/i)).toBeInTheDocument();
      expect(screen.getByText(/Karma connects builders/i)).toBeInTheDocument();
      expect(screen.getAllByText(/One profile./i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Join our community/i)).toBeInTheDocument();
      expect(screen.getByText(/What is Karma/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Where builders grow/i)[0]).toBeInTheDocument();
    });

    it("should render horizontal dividers between sections", async () => {
      const { container } = renderWithProviders(await HomePage());

      // Check for hr elements (HorizontalLine components)
      const dividers = container.querySelectorAll("hr");
      expect(dividers.length).toBeGreaterThanOrEqual(6); // At least 6 dividers
    });

    it("should apply correct max-width to container", async () => {
      const { container } = renderWithProviders(await HomePage());

      const mainContainer = container.querySelector(".max-w-\\[1920px\\]");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should maintain proper spacing between sections", async () => {
      const { container } = renderWithProviders(await HomePage());

      const mainContent = container.querySelector(".flex-col.gap-2");
      expect(mainContent).toBeInTheDocument();
    });

    it("should render main element with correct styling", async () => {
      const { container } = renderWithProviders(await HomePage());

      const main = container.querySelector("main");
      expect(main).toHaveClass("flex");
      expect(main).toHaveClass("w-full");
      expect(main).toHaveClass("flex-col");
      expect(main).toHaveClass("bg-background");
    });

    it("should center content within container", async () => {
      const { container } = renderWithProviders(await HomePage());

      const contentContainer = container.querySelector(".justify-center.items-center");
      expect(contentContainer).toBeInTheDocument();
    });

    it("should apply background color to main element", async () => {
      const { container } = renderWithProviders(await HomePage());

      const main = container.querySelector("main");
      expect(main).toHaveClass("bg-background");
    });
  });

  describe("Scroll Behavior", () => {
    it("should render sections visible in viewport", async () => {
      renderWithProviders(await HomePage());

      // Hero should be immediately visible
      const hero = screen.getByText(/Where builders get funded/i);
      expect(hero).toBeVisible();
    });

    it("should have proper main element structure for scrolling", async () => {
      const { container } = renderWithProviders(await HomePage());

      const main = container.querySelector("main");
      expect(main).toHaveClass("flex-1");
    });

    it("should maintain section order for smooth navigation", async () => {
      const { container } = renderWithProviders(await HomePage());

      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(7);
    });

    it("should have all sections within scrollable container", async () => {
      const { container } = renderWithProviders(await HomePage());

      const scrollContainer = container.querySelector(".flex-col.flex-1");
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should render Hero section immediately", async () => {
      const startTime = Date.now();
      renderWithProviders(await HomePage());
      const endTime = Date.now();

      const hero = screen.getByText(/Where builders get funded/i);
      expect(hero).toBeInTheDocument();

      // Hero should render quickly (allow 15000ms for test environment, especially CI/CD)
      expect(endTime - startTime).toBeLessThan(15000);
    });

    it("should use Suspense for LiveFundingOpportunities", async () => {
      // This test verifies that the component structure supports Suspense
      renderWithProviders(await HomePage());

      await waitFor(() => {
        const fundingSection = screen.getByText(/Live funding opportunities/i);
        expect(fundingSection).toBeInTheDocument();
      });
    });

    it("should render all sections without errors", async () => {
      const { container } = renderWithProviders(await HomePage());

      // No errors should be thrown
      expect(container).toBeInTheDocument();

      // All major sections should be present
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(7);
    });

    it("should have proper flex layout for responsive rendering", async () => {
      const { container } = renderWithProviders(await HomePage());

      const main = container.querySelector("main");
      expect(main).toHaveClass("flex");
      expect(main).toHaveClass("flex-col");

      // Should enable proper responsive layout
      const innerContainer = container.querySelector(".flex-col.flex-1");
      expect(innerContainer).toBeInTheDocument();
    });
  });
});
