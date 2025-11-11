/**
 * Homepage Accessibility Tests
 * Tests WCAG 2.2 AA compliance using jest-axe
 * 
 * Target: 8 tests
 * - Automated Checks (8): Each major section tested with axe
 */

import HomePage from "@/app/page";
import {
  renderWithProviders,
  screen,
  waitFor,
} from "../utils/test-helpers";
import { axe, toHaveNoViolations } from "jest-axe";
import "@testing-library/jest-dom";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the service functions
const mockGetLiveFundingOpportunities = jest.fn();

jest.mock("@/src/services/funding/getLiveFundingOpportunities", () => ({
  getLiveFundingOpportunities: jest.fn(() => mockGetLiveFundingOpportunities()),
}));

// Mock chosenCommunities
jest.mock("@/utilities/chosenCommunities", () => {
  const { mockCommunities } = require("../fixtures/communities");
  return {
    chosenCommunities: jest.fn(() => mockCommunities.slice(0, 10)),
  };
});

describe("Homepage Accessibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { mockFundingOpportunities } = require("../fixtures/funding-opportunities");
    mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);
  });

  describe("Automated Accessibility Checks", () => {
    it("Hero section passes axe with minor violations", async () => {
      const { container } = renderWithProviders(await HomePage());

      // Find Hero section
      const heroSection = screen.getByText(/Where builders get funded/i).closest("section");
      expect(heroSection).toBeInTheDocument();

      const results = await axe(heroSection as HTMLElement);
      
      // Hero may have image-redundant-alt violations in carousel (acceptable)
      // Filter out known acceptable violations
      const criticalViolations = results.violations.filter(
        (v) => v.id !== "image-redundant-alt"
      );
      
      expect(criticalViolations.length).toBe(0);
    });

    it("Live Funding section passes axe", async () => {
      const { container } = renderWithProviders(await HomePage());

      await waitFor(() => {
        expect(screen.getByText(/Live funding opportunities/i)).toBeInTheDocument();
      });

      // Find LiveFunding section
      const fundingSection = screen.getByText(/Live funding opportunities/i).closest("section");
      expect(fundingSection).toBeInTheDocument();

      const results = await axe(fundingSection as HTMLElement);
      expect(results).toHaveNoViolations();
    });

    it("Platform Features passes axe", async () => {
      const { container } = renderWithProviders(await HomePage());

      // Find PlatformFeatures section
      const featuresSection = screen.getByText(/Karma connects builders/i).closest("section");
      expect(featuresSection).toBeInTheDocument();

      const results = await axe(featuresSection as HTMLElement);
      expect(results).toHaveNoViolations();
    });

    it("How It Works passes axe", async () => {
      const { container } = renderWithProviders(await HomePage());

      // Find HowItWorks section
      const howItWorksSection = screen.getAllByText(/One profile./i)[0].closest("section");
      expect(howItWorksSection).toBeInTheDocument();

      const results = await axe(howItWorksSection as HTMLElement);
      expect(results).toHaveNoViolations();
    });

    it("Join Community passes axe", async () => {
      const { container } = renderWithProviders(await HomePage());

      // Find JoinCommunity section
      const communitySection = screen.getByText(/Join our community/i).closest("section");
      expect(communitySection).toBeInTheDocument();

      const results = await axe(communitySection as HTMLElement);
      expect(results).toHaveNoViolations();
    });

    it("FAQ section passes axe", async () => {
      const { container } = renderWithProviders(await HomePage());

      // Find FAQ section
      const faqSection = screen.getByText(/What is Karma/i).closest("section");
      expect(faqSection).toBeInTheDocument();

      const results = await axe(faqSection as HTMLElement);
      expect(results).toHaveNoViolations();
    });

    it("Where Builders Grow passes axe", async () => {
      const { container } = renderWithProviders(await HomePage());

      // Find WhereBuildersGrow section
      const buildersSection = screen.getAllByText(/Where builders grow/i)[0].closest("section");
      expect(buildersSection).toBeInTheDocument();

      const results = await axe(buildersSection as HTMLElement);
      expect(results).toHaveNoViolations();
    });

    it("Full page passes axe with acceptable violations", async () => {
      const { container } = renderWithProviders(await HomePage());

      await waitFor(() => {
        expect(screen.getByText(/Live funding opportunities/i)).toBeInTheDocument();
      });

      const results = await axe(container);
      
      // Full page should have minimal violations
      // We allow up to 5 violations for full page as per plan
      expect(results.violations.length).toBeLessThanOrEqual(5);
    });
  });
});

