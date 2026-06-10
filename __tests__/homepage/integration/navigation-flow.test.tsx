/**
 * Homepage Navigation Flow Integration Tests
 * Tests the redesigned home page navigation: persona chips, audience switcher,
 * persona-aware CTA section, and quiet demo link.
 */

import HomePage from "@/app/page";
import { renderWithProviders, screen } from "../utils/test-helpers";
import "@testing-library/jest-dom";

// Use real PAGES/SOCIALS modules so audience-switcher's many constants
// (PAGES.FOUNDATIONS, NON_PROFITS_PAGES.HOME, PAGES.DONOR_RESEARCH,
// PAGES.CREATE_PROJECT_PROFILE, PAGES.NONPROFITS, SOCIALS.DONOR_PARTNER_FORM,
// SOCIALS.PARTNER_FORM) all resolve.

describe("Homepage Navigation Flows", () => {
  describe("Persona Chips in Hero", () => {
    it("should render the three persona chips", async () => {
      renderWithProviders(await HomePage());

      expect(screen.getByText(/^For foundations$/)).toBeInTheDocument();
      expect(screen.getByText(/^For donors & advisors$/)).toBeInTheDocument();
      expect(screen.getByText(/^For nonprofits$/)).toBeInTheDocument();
    });

    it("should route chips to audience-switcher hash targets", async () => {
      renderWithProviders(await HomePage());

      const foundationsChip = screen.getByText(/^For foundations$/).closest("a");
      const donorsChip = screen.getByText(/^For donors & advisors$/).closest("a");
      const nonprofitsChip = screen.getByText(/^For nonprofits$/).closest("a");

      expect(foundationsChip).toHaveAttribute("href", "#foundations");
      expect(donorsChip).toHaveAttribute("href", "#donors-advisors");
      expect(nonprofitsChip).toHaveAttribute("href", "#nonprofits");
    });
  });

  describe("Quiet Demo Link", () => {
    it("should render the secondary 'schedule a demo' text link in hero", async () => {
      renderWithProviders(await HomePage());

      // Hero's quiet escape hatch ("Or schedule a demo.")
      const demoLinks = screen.getAllByRole("link", { name: /schedule a demo/i });
      expect(demoLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should open external demo link in a new tab with security attributes", async () => {
      renderWithProviders(await HomePage());

      const demoLinks = screen.getAllByRole("link", { name: /schedule a demo/i });
      const externalDemoLink = demoLinks.find((link) => link.getAttribute("target") === "_blank");
      expect(externalDemoLink).toBeDefined();

      const rel = externalDemoLink?.getAttribute("rel") ?? "";
      expect(rel.includes("noopener") || rel.includes("noreferrer")).toBe(true);
    });
  });

  describe("Persona-aware CTA section", () => {
    it("should render persona-aware closing CTAs", async () => {
      renderWithProviders(await HomePage());

      expect(screen.getByText(/Pick your side/i)).toBeInTheDocument();
      expect(screen.getByText(/Try Donor Research/i)).toBeInTheDocument();
      expect(screen.getByText(/Add your nonprofit free/i)).toBeInTheDocument();
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

      expect(screen.getByText(/Powering 30\+ funding programs/i)).toBeInTheDocument();
    });
  });
});
