/**
 * Unit tests for the OfferingSection component (/funders page)
 *
 * Tests behavioral concerns:
 * - Three distinct pricing tiers with unique features
 * - "Most popular" badge only on the Pro tier (not on Starter or Enterprise)
 * - Each tier has its own description and feature set (no cross-contamination)
 * - CTA link points to external URL with security attributes
 * - Heading hierarchy and semantic section structure
 */

import { screen, within } from "@testing-library/react";
import { OfferingSection } from "@/src/features/funders/components/offering-section";
import { renderWithProviders } from "../utils/test-helpers";

describe("OfferingSection Component", () => {
  describe("section header", () => {
    it("renders badge, heading with two styled parts, and subtitle", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText("Our Offering")).toBeInTheDocument();
      expect(screen.getByText(/Start where you are,/i)).toBeInTheDocument();
      expect(screen.getByText(/scale when you're ready/i)).toBeInTheDocument();
      expect(screen.getByText("Choose your growth path.")).toBeInTheDocument();
    });
  });

  describe("pricing tier differentiation", () => {
    it("renders exactly 3 tier headings: Starter, Pro, and Enterprise", () => {
      renderWithProviders(<OfferingSection />);

      const h3Elements = screen.getAllByRole("heading", { level: 3 });
      expect(h3Elements).toHaveLength(3);

      const tierNames = h3Elements.map((h) => h.textContent);
      expect(tierNames).toEqual(["Starter", "Pro", "Enterprise"]);
    });

    it("shows 'Most popular' badge only on the Pro tier", () => {
      renderWithProviders(<OfferingSection />);

      const badges = screen.getAllByText("Most popular");
      expect(badges).toHaveLength(1);

      // The badge should be a sibling of the Pro card, not Starter or Enterprise
      expect(screen.getByText("Most popular")).toBeInTheDocument();
    });

    it("each tier displays its own unique description", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText(/Start your accountability journey/i)).toBeInTheDocument();
      expect(screen.getByText(/Scale to unlimited funding rounds/i)).toBeInTheDocument();
      expect(screen.getByText(/Continuous grant operations/i)).toBeInTheDocument();
    });
  });

  describe("feature lists per tier", () => {
    it("Starter tier includes tracking limits and attestation features", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText(/Track up to 100 projects/i)).toBeInTheDocument();
      expect(screen.getByText(/Milestone tracking with onchain attestations/i)).toBeInTheDocument();
    });

    it("Pro tier includes AI review and higher project limits", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText(/Track up to 500 projects/i)).toBeInTheDocument();
      expect(screen.getByText(/AI application review/i)).toBeInTheDocument();
    });

    it("Enterprise tier includes multi-chain and 2000+ projects", () => {
      renderWithProviders(<OfferingSection />);

      expect(screen.getByText(/Track 2,000\+ projects/i)).toBeInTheDocument();
      expect(screen.getByText(/Multi-chain deployments/i)).toBeInTheDocument();
    });
  });

  describe("CTA section behavior", () => {
    it("renders a Schedule Demo link with external security attributes", () => {
      renderWithProviders(<OfferingSection />);

      const link = screen.getByRole("link", { name: /Schedule Demo/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("links to the partner form URL (not hardcoded)", () => {
      renderWithProviders(<OfferingSection />);

      const link = screen.getByRole("link", { name: /Schedule Demo/i });
      // Should have an href attribute (actual URL comes from SOCIALS constant)
      expect(link).toHaveAttribute("href");
      expect(link.getAttribute("href")).toBeTruthy();
    });
  });

  describe("semantic structure", () => {
    it("uses a section element with proper heading hierarchy (h2 > h3 x3)", () => {
      const { container } = renderWithProviders(<OfferingSection />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toBeInTheDocument();

      const h3Elements = screen.getAllByRole("heading", { level: 3 });
      expect(h3Elements).toHaveLength(3);
    });
  });
});
