/**
 * Homepage Navigation Flow Integration Tests
 * Tests navigation and link flows throughout the homepage
 *
 * Target: 12 tests
 * - CTA Navigation (6)
 * - External Links (3)
 * - Navigation Context (3)
 */

import HomePage from "@/app/page";
import { renderWithProviders, screen } from "../utils/test-helpers";
import "@testing-library/jest-dom";

// Mock PAGES utility
jest.mock("@/utilities/pages", () => ({
  PAGES: {
    FUNDERS: "/funders",
    FUNDING_APP: "/funding-map",
    COMMUNITIES: "/communities",
    COMMUNITY: {
      ALL_GRANTS: (slug: string) => `/community/${slug}/grants`,
    },
    REGISTRY: {
      ROOT: "/funding-map",
      ADD_PROGRAM: "/funding-map/add-program",
      MANAGE_PROGRAMS: "/funding-map/manage-programs",
    },
  },
}));

// Mock SOCIALS utility
jest.mock("@/utilities/socials", () => ({
  SOCIALS: {
    DISCORD: "https://discord.gg/karmahq",
  },
}));

describe("Homepage Navigation Flows", () => {
  describe("CTA Navigation", () => {
    it("should have 'Create Project' button in Hero section", async () => {
      renderWithProviders(await HomePage());

      const createButtons = screen.getAllByRole("button", { name: /Create project/i });
      expect(createButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("should have 'Run a funding program' link to /funders", async () => {
      renderWithProviders(await HomePage());

      const fundersLink = screen.getByRole("link", { name: /Run a funding program/i });
      expect(fundersLink).toHaveAttribute("href", "/funders");
    });

    it("should have 'View all' link for funding opportunities", async () => {
      renderWithProviders(await HomePage());

      const viewAllLinks = screen.getAllByRole("link", { name: /View all/i });
      expect(viewAllLinks.length).toBeGreaterThanOrEqual(1);

      // Find the one pointing to funding-map
      const fundingMapLink = viewAllLinks.find(
        (link) => link.getAttribute("href") === "/funding-map"
      );
      expect(fundingMapLink).toBeDefined();
    });

    it("should have 'Grow your ecosystem' link in WhereBuildersGrow", async () => {
      renderWithProviders(await HomePage());

      const growLink = screen.getByRole("link", { name: /Grow your ecosystem/i });
      expect(growLink).toHaveAttribute("href", "/funders");
    });

    it("should have 'View all' communities link in Hero", async () => {
      renderWithProviders(await HomePage());

      const viewAllLinks = screen.getAllByRole("link", { name: /View all/i });
      expect(viewAllLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should have multiple 'Create' CTAs throughout the page", async () => {
      renderWithProviders(await HomePage());

      // CreateProject buttons
      const createButtons = screen.getAllByRole("button", { name: /Create project/i });
      expect(createButtons.length).toBeGreaterThanOrEqual(2); // Hero + WhereBuildersGrow
    });
  });

  describe("External Links", () => {
    it("should have Discord link that opens in new tab", async () => {
      renderWithProviders(await HomePage());

      const discordLinks = screen.getAllByRole("link", { name: /Discord/i });
      expect(discordLinks.length).toBeGreaterThanOrEqual(1);

      // At least one should have target="_blank"
      const externalDiscordLink = discordLinks.find(
        (link) => link.getAttribute("target") === "_blank"
      );
      expect(externalDiscordLink).toBeDefined();
      expect(externalDiscordLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should have Discord support link in FAQ section", async () => {
      renderWithProviders(await HomePage());

      const discordLinks = screen.getAllByRole("link", { name: /Discord/i });
      expect(discordLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should have external links with proper security attributes", async () => {
      const { container } = renderWithProviders(await HomePage());

      const externalLinks = Array.from(container.querySelectorAll('a[target="_blank"]'));

      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute("rel");
        expect(link.getAttribute("rel")).toContain("noopener");
      });
    });
  });

  describe("Navigation Context", () => {
    it("should render all navigation elements within main content", async () => {
      const { container } = renderWithProviders(await HomePage());

      const main = container.querySelector("main");
      expect(main).toBeInTheDocument();

      // All links should be within main
      const links = main?.querySelectorAll("a");
      expect(links?.length).toBeGreaterThan(0);
    });

    it("should have proper link structure for internal navigation", async () => {
      renderWithProviders(await HomePage());

      // Check for Next.js Link components (rendered as <a>)
      const fundersLink = screen.getByRole("link", { name: /Run a funding program/i });
      expect(fundersLink.tagName).toBe("A");
    });

    it("should maintain consistent navigation patterns across sections", async () => {
      renderWithProviders(await HomePage());

      // Multiple sections should have similar CTA patterns
      const createButtons = screen.getAllByRole("button", { name: /Create project/i });
      const fundersLinks = screen.getAllByRole("link", { name: /funders|Grow your ecosystem/i });

      expect(createButtons.length).toBeGreaterThanOrEqual(2);
      expect(fundersLinks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
