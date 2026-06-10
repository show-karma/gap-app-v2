/**
 * Homepage Data Flow Integration Tests
 * Tests content and data display throughout the redesigned home page
 * (rotating-word hero + audience switcher + persona-aware CTA).
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

const HERO_SR_TEXT = /Karma connects funders to organizations, projects, and individuals/i;

describe("Homepage Data Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Page Structure", () => {
    it("should render main element", async () => {
      const { container } = renderWithProviders(await HomePage());
      expect(container.querySelector("main")).toBeInTheDocument();
    });

    it("should render hero heading with the canonical sentence", async () => {
      renderWithProviders(await HomePage());
      // The H1's sr-only span carries the full sentence for screen readers
      // and SEO. The decorative rotating word is split across spans.
      expect(screen.getByText(HERO_SR_TEXT)).toBeInTheDocument();
    });

    it("should load community data for the hero trust strip", async () => {
      renderWithProviders(await HomePage());
      // Trust strip kicker is rendered with the marquee that consumes
      // the mocked communities.
      expect(screen.getByText(/Powering 30\+ funding programs/i)).toBeInTheDocument();
    });

    it("should render page without errors", async () => {
      const { container } = renderWithProviders(await HomePage());
      expect(container.querySelector("main")).toBeInTheDocument();
      expect(screen.getByText(HERO_SR_TEXT)).toBeInTheDocument();
    });

    it("should render multiple sections", async () => {
      const { container } = renderWithProviders(await HomePage());
      // Hero + audience switcher + CTA, minimum three sections.
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Data Display", () => {
    it("should display the hero subtext naming all three audiences", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(/grantmaking software for foundations/i)).toBeInTheDocument();
    });

    it("should display the trust strip kicker", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(/Powering 30\+ funding programs/i)).toBeInTheDocument();
    });

    it("should render persona entry chips", async () => {
      renderWithProviders(await HomePage());
      // Hero chips
      expect(screen.getByText(/^For foundations$/)).toBeInTheDocument();
      expect(screen.getByText(/^For donors & advisors$/)).toBeInTheDocument();
      expect(screen.getByText(/^For nonprofits$/)).toBeInTheDocument();
    });

    it("should render persona CTA section below the switcher", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        expect(screen.getByText(/Pick your side/i)).toBeInTheDocument();
      });
    });

    it("should maintain UI stability across renders", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(HERO_SR_TEXT)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText(/Pick your side/i)).toBeInTheDocument();
      });
    });
  });
});
