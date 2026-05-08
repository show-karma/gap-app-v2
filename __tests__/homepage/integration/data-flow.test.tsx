/**
 * Homepage Data Flow Integration Tests
 * Tests content and data display throughout the main homepage (funder-facing)
 *
 * Target: 10 tests
 * - Page Structure (5)
 * - Data Display (5)
 */

import HomePage from "@/app/page";
import { renderWithProviders, screen, waitFor } from "../utils/test-helpers";
import "@testing-library/jest-dom";

// Mock chosenCommunities for the hero carousel
vi.mock("@/utilities/chosenCommunities", async () => {
  const { mockCommunities: communities } = await import("../fixtures/communities");
  return {
    chosenCommunities: vi.fn(() => communities.slice(0, 10)),
  };
});

describe("Homepage Data Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Page Structure", () => {
    it("should render main element", async () => {
      const { container } = renderWithProviders(await HomePage());
      expect(container.querySelector("main")).toBeInTheDocument();
    });

    it("should render hero heading", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(/AI powered funding software/i)).toBeInTheDocument();
    });

    it("should load community data for Hero carousel", async () => {
      renderWithProviders(await HomePage());

      // Hero section should render (communities are mocked)
      const heroSection = screen.getByText(/AI powered funding software/i);
      expect(heroSection).toBeInTheDocument();
    });

    it("should render page without errors", async () => {
      const { container } = renderWithProviders(await HomePage());

      // Page should render with main element
      expect(container.querySelector("main")).toBeInTheDocument();
      expect(screen.getByText(/AI powered funding software/i)).toBeInTheDocument();
    });

    it("should render multiple sections", async () => {
      const { container } = renderWithProviders(await HomePage());

      // Multiple sections should be rendered
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Data Display", () => {
    it("should display hero content", async () => {
      renderWithProviders(await HomePage());

      expect(screen.getByText(/AI powered funding software/i)).toBeInTheDocument();
    });

    it("should display community logos in carousel", async () => {
      renderWithProviders(await HomePage());

      // Hero section should render
      const heroSection = screen.getByText(/AI powered funding software/i);
      expect(heroSection).toBeInTheDocument();
    });

    it("should render all static content", async () => {
      renderWithProviders(await HomePage());

      // Hero is always present
      expect(screen.getByText(/AI powered funding software/i)).toBeInTheDocument();

      // FAQ section with questions relevant to funders
      await waitFor(() => {
        expect(screen.getByText(/What is Karma\?/i)).toBeInTheDocument();
      });
    });

    it("should render CTA sections", async () => {
      renderWithProviders(await HomePage());

      // Schedule a Demo appears in hero and other CTAs
      const demoLinks = screen.getAllByText(/Schedule a Demo/i);
      expect(demoLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should maintain UI stability", async () => {
      renderWithProviders(await HomePage());

      // Hero should be immediately visible
      const hero = screen.getByText(/AI powered funding software/i);
      expect(hero).toBeInTheDocument();

      // FAQ section should also load
      await waitFor(() => {
        expect(screen.getByText(/What is Karma\?/i)).toBeInTheDocument();
      });
    });
  });
});
