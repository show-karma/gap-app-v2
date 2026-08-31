/**
 * Homepage Accessibility Tests
 * Tests WCAG 2.2 AA compliance using jest-axe
 *
 * Every major section is axe-checked against a SINGLE render of the homepage.
 * The suite previously rendered the full page once per section (8 full-page
 * renders in one file); the resulting native jsdom/axe memory churn was a
 * major contributor to CI test-shard worker OOMs. Rendering once and reusing
 * the DOM keeps identical coverage at a fraction of the memory.
 */

import { axe, toHaveNoViolations } from "jest-axe";
import HomePage from "@/app/for-projects/page";
import { renderWithProviders, screen, waitFor } from "../utils/test-helpers";
import "@testing-library/jest-dom";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the service functions
const mockGetLiveFundingOpportunities = vi.fn();

vi.mock("@/src/services/funding/getLiveFundingOpportunities", () => ({
  getLiveFundingOpportunities: vi.fn(() => mockGetLiveFundingOpportunities()),
}));

// Import fixtures
import { mockFundingOpportunities } from "../fixtures/funding-opportunities";

// Mock chosenCommunities
vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: vi.fn(() => []),
}));

describe("Homepage Accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);
  });

  describe("Automated Accessibility Checks", () => {
    // One render, every section checked. RTL auto-cleanup unmounts between
    // separate `it`s, so a shared render can only live within a single test —
    // hence the section checks run sequentially here instead of one `it` each.
    it("each section and the full page pass axe", async () => {
      const { container } = renderWithProviders(await HomePage());

      await waitFor(() => {
        expect(screen.getByText(/Live funding opportunities/i)).toBeInTheDocument();
      });

      // Hero — the carousel may carry acceptable image-redundant-alt violations
      const heroSection = screen.getAllByText(/Get funded/i)[0].closest("section");
      expect(heroSection).toBeInTheDocument();
      const heroResults = await axe(heroSection as HTMLElement);
      expect(
        heroResults.violations.filter((violation) => violation.id !== "image-redundant-alt").length
      ).toBe(0);

      // Live funding
      const fundingSection = screen.getByText(/Live funding opportunities/i).closest("section");
      expect(fundingSection).toBeInTheDocument();
      expect(await axe(fundingSection as HTMLElement)).toHaveNoViolations();

      // Platform features
      const featuresSection = screen.getByText(/Karma connects builders/i).closest("section");
      expect(featuresSection).toBeInTheDocument();
      expect(await axe(featuresSection as HTMLElement)).toHaveNoViolations();

      // How it works
      const howItWorksSection = screen.getAllByText(/One profile./i)[0].closest("section");
      expect(howItWorksSection).toBeInTheDocument();
      expect(await axe(howItWorksSection as HTMLElement)).toHaveNoViolations();

      // Join community
      const communitySection = screen.getByText(/Join our community/i).closest("section");
      expect(communitySection).toBeInTheDocument();
      expect(await axe(communitySection as HTMLElement)).toHaveNoViolations();

      // FAQ
      const faqSection = screen.getByText(/What is Karma/i).closest("section");
      expect(faqSection).toBeInTheDocument();
      expect(await axe(faqSection as HTMLElement)).toHaveNoViolations();

      // Where builders grow
      const buildersSection = screen.getAllByText(/Where builders grow/i)[0].closest("section");
      expect(buildersSection).toBeInTheDocument();
      expect(await axe(buildersSection as HTMLElement)).toHaveNoViolations();

      // Full page — allow up to 5 acceptable violations, per the a11y plan
      const fullResults = await axe(container);
      expect(fullResults.violations.length).toBeLessThanOrEqual(5);
    });
  });
});
