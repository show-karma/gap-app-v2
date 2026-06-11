/**
 * Homepage Data Flow Integration Tests
 * Tests content and data display on the funder-focused home page:
 * hero + a two-row "How Karma works" section (Nonprofit Research + Foundations).
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

const HERO_SR_TEXT = /Karma helps funders fund and track organizations, projects, and nonprofits/i;

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
      expect(screen.getByText(HERO_SR_TEXT)).toBeInTheDocument();
    });

    it("should load community data for the hero trust strip", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(/Funding programs running on Karma/i)).toBeInTheDocument();
    });

    it("should render page without errors", async () => {
      const { container } = renderWithProviders(await HomePage());
      expect(container.querySelector("main")).toBeInTheDocument();
      expect(screen.getByText(HERO_SR_TEXT)).toBeInTheDocument();
    });

    it("should render at least two sections", async () => {
      const { container } = renderWithProviders(await HomePage());
      // Hero + How Karma works section, minimum two sections.
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Data Display", () => {
    it("should display the funder-centric hero subtext", async () => {
      renderWithProviders(await HomePage());
      expect(
        screen.getByText(/discover credible organizations, evaluate fit, and track outcomes/i)
      ).toBeInTheDocument();
    });

    it("should display the trust strip kicker", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(/Funding programs running on Karma/i)).toBeInTheDocument();
    });

    it("should render the 'How Karma works' section header", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        expect(screen.getByText(/One platform for two motions\./i)).toBeInTheDocument();
      });
    });

    it("should render the Nonprofit Research row with its product pitch", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        expect(
          screen.getByText(/Nonprofit Research: a research brief for every gift/i)
        ).toBeInTheDocument();
      });
    });

    it("should render the Foundations row with its product pitch", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        expect(screen.getByText(/AI-powered software for grant programs/i)).toBeInTheDocument();
      });
    });
  });
});
