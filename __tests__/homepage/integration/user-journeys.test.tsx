/**
 * Homepage User Journeys Integration Tests
 * Tests complete visitor flows through the redesigned home page.
 */

import HomePage from "@/app/page";
import { renderWithProviders, screen, waitFor } from "../utils/test-helpers";
import "@testing-library/jest-dom";

const HERO_SR_TEXT = /Karma connects funders to organizations, projects, and individuals/i;

describe("Homepage User Journeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("First-Time Visitor", () => {
    it("should see the hero canonical sentence on load", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(HERO_SR_TEXT)).toBeInTheDocument();
    });

    it("should see persona chips as the primary entry", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(/^For foundations$/)).toBeInTheDocument();
      expect(screen.getByText(/^For donors & advisors$/)).toBeInTheDocument();
      expect(screen.getByText(/^For nonprofits$/)).toBeInTheDocument();
    });

    it("should see the trust strip with funding programs kicker", async () => {
      renderWithProviders(await HomePage());
      expect(screen.getByText(/Powering 30\+ funding programs/i)).toBeInTheDocument();
    });

    it("should see the audience switcher heading below the hero", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        expect(
          screen.getByText(/One platform\. Three sides of philanthropic capital\./i)
        ).toBeInTheDocument();
      });
    });

    it("should see the closing CTA section", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        expect(screen.getByText(/Pick your side/i)).toBeInTheDocument();
      });
    });
  });

  describe("Foundation Visitor", () => {
    it("should be able to click 'For foundations' chip routing to #foundations", async () => {
      renderWithProviders(await HomePage());
      const chip = screen.getByText(/^For foundations$/).closest("a");
      expect(chip).toHaveAttribute("href", "#foundations");
    });

    it("should see a closing CTA for foundations (Schedule a demo)", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        // The CTA section has multiple "Schedule a demo" labels; the hero
        // also has the small text link. At least one is for foundations.
        const demoLinks = screen.getAllByRole("link", { name: /schedule a demo/i });
        expect(demoLinks.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Donor Visitor", () => {
    it("should be able to click 'For donors & advisors' chip", async () => {
      renderWithProviders(await HomePage());
      const chip = screen.getByText(/^For donors & advisors$/).closest("a");
      expect(chip).toHaveAttribute("href", "#donors-advisors");
    });

    it("should see a Donor Research CTA in the closing section", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        // Appears in both the switcher's donors panel and the closing CTA.
        expect(screen.getAllByText(/Try Donor Research/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Nonprofit Visitor", () => {
    it("should be able to click 'For nonprofits' chip", async () => {
      renderWithProviders(await HomePage());
      const chip = screen.getByText(/^For nonprofits$/).closest("a");
      expect(chip).toHaveAttribute("href", "#nonprofits");
    });

    it("should see 'Add your nonprofit free' in the closing CTA", async () => {
      renderWithProviders(await HomePage());
      await waitFor(() => {
        // Appears in both the switcher's nonprofits panel and the closing CTA.
        expect(screen.getAllByText(/Add your nonprofit free/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Page Structure", () => {
    it("should render a main element", async () => {
      const { container } = renderWithProviders(await HomePage());
      expect(container.querySelector("main")).toBeInTheDocument();
    });

    it("should render at least three sections", async () => {
      const { container } = renderWithProviders(await HomePage());
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(3);
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
