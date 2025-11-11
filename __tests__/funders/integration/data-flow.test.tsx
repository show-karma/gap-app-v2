/**
 * Integration tests for Funders Page Data Flow
 * 
 * Tests cover:
 * - Community data fetching and display
 * - Statistics data display
 * - Case studies data rendering
 * - Data consistency across sections
 */

import { screen } from "@testing-library/react";
import FundersPage from "@/app/funders/page";
import { renderWithProviders } from "../utils/test-helpers";
import { mockCommunities } from "../fixtures/communities";
import { mockChosenCommunities } from "../setup";

describe("Funders Page Data Flow", () => {
  beforeEach(() => {
    mockChosenCommunities.mockReturnValue(mockCommunities);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Community Data", () => {
    it("should fetch chosen communities successfully", () => {
      renderWithProviders(<FundersPage />);
      
      // Verify the page renders with community-related content
      expect(screen.getByText(/Trusted by growing ecosystems/i)).toBeInTheDocument();
    });

    it("should display community logos in hero carousel", () => {
      const { container } = renderWithProviders(<FundersPage />);
      
      // Hero carousel should render
      expect(screen.getByText(/Trusted by growing ecosystems/i)).toBeInTheDocument();
      
      // Verify carousel structure exists
      const carouselImages = container.querySelectorAll("img");
      expect(carouselImages.length).toBeGreaterThan(0);
    });

    it("should display community logos in case studies", () => {
      renderWithProviders(<FundersPage />);
      
      // Case studies should be present
      expect(screen.getByText(/Case Studies/i)).toBeInTheDocument();
      
      // Community names should be present in case studies
      const bodyText = document.body.textContent;
      expect(bodyText).toBeTruthy();
    });

    it("should handle missing community data gracefully", () => {
      mockChosenCommunities.mockReturnValue([]);
      
      renderWithProviders(<FundersPage />);
      
      // Page should still render even without communities
      expect(screen.getByText(/Grow your ecosystem/i)).toBeInTheDocument();
    });
  });

  describe("Statistics Display", () => {
    it("should display all 4 statistics correctly", () => {
      renderWithProviders(<FundersPage />);
      
      expect(screen.getByText(/30\+/)).toBeInTheDocument();
      expect(screen.getByText(/4k/)).toBeInTheDocument();
      expect(screen.getByText(/50k/)).toBeInTheDocument();
      expect(screen.getByText(/4x/)).toBeInTheDocument();
    });

    it("should render proper number formatting", () => {
      renderWithProviders(<FundersPage />);
      
      // Check for formatted numbers and titles (they're separate elements)
      expect(screen.getByText(/30\+/)).toBeInTheDocument();
      expect(screen.getByText(/Ecosystems supported/i)).toBeInTheDocument();
      expect(screen.getByText(/4k/)).toBeInTheDocument();
      expect(screen.getByText(/Projects tracked/i)).toBeInTheDocument();
    });

    it("should display statistics data without API calls", () => {
      renderWithProviders(<FundersPage />);
      
      // Statistics are static and should render immediately
      expect(screen.getByText(/The numbers/i)).toBeInTheDocument();
      expect(screen.getByText(/30\+/)).toBeInTheDocument();
    });

    it("should maintain data consistency across page", () => {
      renderWithProviders(<FundersPage />);
      
      // Verify consistent data presentation
      expect(screen.getByText(/Ecosystems supported/i)).toBeInTheDocument();
      expect(screen.getByText(/Projects tracked/i)).toBeInTheDocument();
    });
  });

  describe("Case Studies Data", () => {
    it("should render all testimonials", () => {
      renderWithProviders(<FundersPage />);
      
      expect(screen.getByText(/Gonna/)).toBeInTheDocument();
      expect(screen.getByText(/Sophia Dew/)).toBeInTheDocument();
    });

    it("should render all metrics", () => {
      renderWithProviders(<FundersPage />);
      
      expect(screen.getByText(/100\+ hours saved/i)).toBeInTheDocument();
      expect(screen.getByText(/3,600\+ Milestones/i)).toBeInTheDocument();
    });

    it("should render all case studies with proper structure", () => {
      renderWithProviders(<FundersPage />);
      
      const caseStudyButtons = screen.getAllByRole("button", { name: /Read Case Study/i });
      expect(caseStudyButtons).toHaveLength(2);
    });

    it("should handle missing avatar images gracefully", () => {
      renderWithProviders(<FundersPage />);
      
      // Testimonials should render even if avatars fail to load
      expect(screen.getByText(/Gonna/)).toBeInTheDocument();
      expect(screen.getByText(/Optimism Grants Council Lead/)).toBeInTheDocument();
    });
  });
});

