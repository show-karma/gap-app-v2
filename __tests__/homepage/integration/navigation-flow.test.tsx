/**
 * Homepage Navigation Flow Integration Tests
 * Tests the funder-focused home page navigation: hero CTAs and the
 * two-row "How Karma works" section CTAs.
 */

import HomePage from "@/app/page";
import { renderWithProviders, screen } from "../utils/test-helpers";
import "@testing-library/jest-dom";

// Use real PAGES/SOCIALS modules so PAGES.DONOR_RESEARCH.INDEX,
// PAGES.DONOR_ADVISORS, PAGES.FOUNDATIONS, and SOCIALS.PARTNER_FORM
// all resolve.

describe("Homepage Navigation Flows", () => {
  describe("Hero CTAs", () => {
    it("should render the primary Schedule a demo CTA opening in a new tab", async () => {
      renderWithProviders(await HomePage());

      const demoLinks = screen.getAllByRole("link", { name: /Schedule a demo/i });
      const externalDemoLink = demoLinks.find((link) => link.getAttribute("target") === "_blank");
      expect(externalDemoLink).toBeDefined();

      const rel = externalDemoLink?.getAttribute("rel") ?? "";
      expect(rel.includes("noopener") || rel.includes("noreferrer")).toBe(true);
    });

    it("should render the See how Karma works secondary CTA anchoring to #how-it-works", async () => {
      renderWithProviders(await HomePage());

      const anchorLinks = screen.getAllByRole("link", { name: /See how Karma works/i });
      expect(anchorLinks.length).toBeGreaterThanOrEqual(1);
      expect(anchorLinks[0]).toHaveAttribute("href", "#how-it-works");
    });
  });

  describe("How Karma works rows", () => {
    it("should render both product rows", async () => {
      renderWithProviders(await HomePage());

      expect(
        screen.getByText(/Nonprofit Research: a research brief for every gift/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/AI-powered software for grant programs/i)).toBeInTheDocument();
    });

    it("should route the Nonprofit Research row CTA to /donor-advisors", async () => {
      renderWithProviders(await HomePage());

      const exploreLinks = screen.getAllByRole("link", { name: /Explore Nonprofit Research/i });
      expect(exploreLinks[0]).toHaveAttribute("href", "/donor-advisors");
    });

    it("should route the Foundations row CTA to /foundations", async () => {
      renderWithProviders(await HomePage());

      const foundationLinks = screen.getAllByRole("link", {
        name: /See how foundations use Karma/i,
      });
      expect(foundationLinks[0]).toHaveAttribute("href", "/foundations");
    });

    it("should expose audience-differentiated secondary CTAs in each row", async () => {
      renderWithProviders(await HomePage());

      expect(screen.getAllByRole("link", { name: /Get a demo/i }).length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByRole("link", { name: /Schedule a foundation demo/i }).length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe("External Links", () => {
    it("should have at least one external link with proper security attributes", async () => {
      const { container } = renderWithProviders(await HomePage());

      const externalLinks = Array.from(container.querySelectorAll('a[target="_blank"]'));
      expect(externalLinks.length).toBeGreaterThanOrEqual(1);

      externalLinks.forEach((link) => {
        const rel = link.getAttribute("rel") || "";
        expect(rel.includes("noopener") || rel.includes("noreferrer")).toBe(true);
      });
    });
  });

  describe("Navigation Context", () => {
    it("should render all navigation elements within main content", async () => {
      const { container } = renderWithProviders(await HomePage());

      const main = container.querySelector("main");
      expect(main).toBeInTheDocument();

      const links = main?.querySelectorAll("a");
      expect(links?.length).toBeGreaterThan(0);
    });

    it("should render the trust strip kicker", async () => {
      renderWithProviders(await HomePage());

      expect(screen.getByText(/Funding programs running on Karma/i)).toBeInTheDocument();
    });
  });
});
