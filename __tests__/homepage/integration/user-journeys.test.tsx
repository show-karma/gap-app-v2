/**
 * Homepage User Journeys Integration Tests
 * Tests complete visitor flows through the funder-focused home page:
 * hero + two-row "How Karma works" section (Donor Research + Foundations).
 */

import HomePage from "@/app/page";
import { renderWithProviders, screen, waitFor } from "../utils/test-helpers";
import "@testing-library/jest-dom";

const HERO_SR_TEXT = /Karma helps funders fund and track organizations, projects, and nonprofits/i;

describe("Homepage User Journeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("First-Time Visitor", () => {
    it("should see the hero canonical sentence on load", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(HERO_SR_TEXT)).toBeInTheDocument();
    });

    it("should see two primary CTAs above the fold", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getAllByText(/Schedule a demo/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/See how Karma works/i).length).toBeGreaterThanOrEqual(1);
    });

    it("should see the trust strip with funding programs kicker", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(/Funding programs running on Karma/i)).toBeInTheDocument();
    });

    it("should see the 'How Karma works' section heading", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        expect(screen.getByText(/One platform for two motions\./i)).toBeInTheDocument();
      });
    });

    it("should see both product rows in the workflow section", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        expect(
          screen.getByText(/Donor Research: a research brief for every gift/i)
        ).toBeInTheDocument();
      });
      expect(screen.getByText(/AI-powered software for grant programs/i)).toBeInTheDocument();
    });
  });

  describe("Donor / advisor path", () => {
    it("should route the Donor Research row CTA to /donor-advisors", async () => {
      renderWithProviders(await HomePage());
      const exploreLinks = screen.getAllByRole("link", { name: /Explore Donor Research/i });
      expect(exploreLinks[0]).toHaveAttribute("href", "/donor-advisors");
    });
  });

  describe("Foundation path", () => {
    it("should route the Foundations row CTA to /foundations", async () => {
      renderWithProviders(await HomePage());
      const foundationLinks = screen.getAllByRole("link", {
        name: /See how foundations use Karma/i,
      });
      expect(foundationLinks[0]).toHaveAttribute("href", "/foundations");
    });

    it("should expose at least one Schedule a demo external CTA", async () => {
      renderWithProviders(await HomePage());
      const demoLinks = screen.getAllByRole("link", { name: /Schedule a demo/i });
      const external = demoLinks.find((link) => link.getAttribute("target") === "_blank");
      expect(external).toBeDefined();
    });
  });

  describe("Page Structure", () => {
    it("should render a main element", async () => {
      const { container } = renderWithProviders(await HomePage());
      expect(container.querySelector("main")).toBeInTheDocument();
    });

    it("should render at least two sections", async () => {
      const { container } = renderWithProviders(await HomePage());
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it("should render external links with safe rel attributes", async () => {
      const { container } = renderWithProviders(await HomePage());
      const externalLinks = Array.from(container.querySelectorAll('a[target="_blank"]'));
      externalLinks.forEach((link) => {
        const rel = link.getAttribute("rel") || "";
        expect(rel.includes("noopener") || rel.includes("noreferrer")).toBe(true);
      });
    });
  });
});
