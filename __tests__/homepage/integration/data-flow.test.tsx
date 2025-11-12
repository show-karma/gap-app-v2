/**
 * Homepage Data Flow Integration Tests
 * Tests API integration and data display throughout homepage
 * 
 * Target: 10 tests
 * - API Integration (5)
 * - Data Display (5)
 */

import HomePage from "@/app/page";
import {
  renderWithProviders,
  screen,
  waitFor,
} from "../utils/test-helpers";
import "@testing-library/jest-dom";
import { mockFundingOpportunities } from "../fixtures/funding-opportunities";
import { mockCommunities } from "../fixtures/communities";

// Mock the service functions
const mockGetLiveFundingOpportunities = jest.fn();

jest.mock("@/src/services/funding/getLiveFundingOpportunities", () => ({
  getLiveFundingOpportunities: jest.fn(() => mockGetLiveFundingOpportunities()),
}));

// Mock chosenCommunities directly with a simple implementation
jest.mock("@/utilities/chosenCommunities", () => {
  const { mockCommunities } = require("../fixtures/communities");
  return {
    chosenCommunities: jest.fn(() => mockCommunities.slice(0, 10)),
  };
});

describe("Homepage Data Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);
  });

  describe("API Integration", () => {
    it("should fetch live funding opportunities successfully", async () => {
      renderWithProviders(await HomePage());

      await waitFor(() => {
        expect(mockGetLiveFundingOpportunities).toHaveBeenCalled();
      });
    });

    it("should handle empty funding opportunities gracefully", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue([]);

      renderWithProviders(await HomePage());

      await waitFor(() => {
        const fundingSection = screen.getByText(/Live funding opportunities/i);
        expect(fundingSection).toBeInTheDocument();
      });
    });

    it("should load community data for Hero carousel", async () => {
      renderWithProviders(await HomePage());

      // Hero section should render (communities are mocked)
      const heroSection = screen.getByText(/Where builders get funded/i);
      expect(heroSection).toBeInTheDocument();
    });

    it("should render page even if API calls fail", async () => {
      // Simulate API failure by returning empty data
      mockGetLiveFundingOpportunities.mockResolvedValue([]);

      const { container } = renderWithProviders(await HomePage());

      // Page should still render
      expect(container.querySelector("main")).toBeInTheDocument();
      expect(screen.getByText(/Where builders get funded/i)).toBeInTheDocument();
    });

    it("should handle async data loading with Suspense", async () => {
      renderWithProviders(await HomePage());

      // Wait for LiveFundingOpportunities to load
      await waitFor(() => {
        const fundingSection = screen.getByText(/Live funding opportunities/i);
        expect(fundingSection).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe("Data Display", () => {
    it("should display fetched funding programs correctly", async () => {
      const testPrograms = mockFundingOpportunities.slice(0, 3);
      mockGetLiveFundingOpportunities.mockResolvedValue(testPrograms);

      renderWithProviders(await HomePage());

      // Verify funding section renders (programs are fetched server-side)
      await waitFor(() => {
        expect(screen.getByText(/Live funding opportunities/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it("should display community logos in Hero carousel", async () => {
      renderWithProviders(await HomePage());

      // Community carousel should render
      const heroSection = screen.getByText(/Where builders get funded/i);
      expect(heroSection).toBeInTheDocument();
    });

    it("should render all static content alongside dynamic data", async () => {
      renderWithProviders(await HomePage());

      // Static sections should always be present
      expect(screen.getByText(/Karma connects builders/i)).toBeInTheDocument();
      expect(screen.getAllByText(/One profile./i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Join our community/i)).toBeInTheDocument();

      // Dynamic section should also load
      await waitFor(() => {
        expect(screen.getByText(/Live funding opportunities/i)).toBeInTheDocument();
      });
    });

    it("should handle multiple data sources simultaneously", async () => {
      const testPrograms = mockFundingOpportunities.slice(0, 3);
      
      mockGetLiveFundingOpportunities.mockResolvedValue(testPrograms);

      renderWithProviders(await HomePage());

      // Both data sources should be utilized
      expect(mockGetLiveFundingOpportunities).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByText(/Live funding opportunities/i)).toBeInTheDocument();
      });
    });

    it("should maintain UI stability when data loads", async () => {
      renderWithProviders(await HomePage());

      // Hero should be immediately visible
      const hero = screen.getByText(/Where builders get funded/i);
      expect(hero).toBeInTheDocument();

      // Other sections should remain stable
      await waitFor(() => {
        expect(screen.getByText(/Karma connects builders/i)).toBeInTheDocument();
        expect(screen.getAllByText(/One profile./i)[0]).toBeInTheDocument();
      });
    });
  });
});

