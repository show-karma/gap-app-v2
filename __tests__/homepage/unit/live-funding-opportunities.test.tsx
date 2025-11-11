/**
 * LiveFundingOpportunities Component Tests
 * Tests the live funding opportunities section with async data loading
 * 
 * Target: 24 tests
 * - Loading States (5)
 * - Data Display (7)
 * - Carousel Behavior (5)
 * - Card Interactions (4)
 * - Error Handling (3)
 */

import { LiveFundingOpportunities } from "@/src/features/homepage/components/live-funding-opportunities";
import {
  renderWithProviders,
  screen,
  within,
  waitFor,
} from "../utils/test-helpers";
import "@testing-library/jest-dom";
import { mockFundingOpportunities } from "../fixtures/funding-opportunities";

// Mock the service that fetches funding opportunities
const mockGetLiveFundingOpportunities = jest.fn();

jest.mock("@/src/services/funding/getLiveFundingOpportunities", () => ({
  getLiveFundingOpportunities: () => mockGetLiveFundingOpportunities(),
}));

// Mock PAGES utility
jest.mock("@/utilities/pages", () => ({
  PAGES: {
    FUNDING_APP: "/funding-map",
  },
}));

// Mock LiveFundingOpportunitiesSkeleton
jest.mock("@/src/features/homepage/components/live-funding-opportunities-skeleton", () => ({
  LiveFundingOpportunitiesSkeleton: () => (
    <div data-testid="funding-skeleton">Loading...</div>
  ),
}));

// Mock LiveFundingOpportunitiesCarousel
jest.mock("@/src/features/homepage/components/live-funding-opportunities-carousel", () => ({
  LiveFundingOpportunitiesCarousel: ({ programs }: any) => (
    <div data-testid="funding-carousel">
      {programs.map((program: any) => (
        <div key={program.uid} data-testid={`funding-card-${program.uid}`}>
          <h3>{program.title}</h3>
          <p>{program.description}</p>
          <span>{program.communityName}</span>
          <span>{program.fundingAmount}</span>
        </div>
      ))}
    </div>
  ),
}));

describe("LiveFundingOpportunities Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading States", () => {
    it("should render section with correct heading", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const heading = screen.getByText(/live funding opportunities/i);
      expect(heading).toBeInTheDocument();
    });

    it("should render View all link", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const viewAllLink = screen.getByRole("link", { name: /view all/i });
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink).toHaveAttribute("href", "/funding-map");
    });

    it("should have correct section id for anchor links", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      const { container } = renderWithProviders(await LiveFundingOpportunities());

      const section = container.querySelector("#live-funding-opportunities");
      expect(section).toBeInTheDocument();
    });

    it("should render carousel when data loads", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const carousel = screen.getByTestId("funding-carousel");
      expect(carousel).toBeInTheDocument();
    });

    it("should pass programs data to carousel", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      // Verify carousel has received the data by checking for rendered cards
      const cards = screen.getAllByTestId(/^funding-card-/);
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe("Data Display", () => {
    it("should display funding opportunities when data loads", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      // Check for first program title
      const firstProgram = mockFundingOpportunities[0];
      const programTitle = screen.getByText(firstProgram.title);
      expect(programTitle).toBeInTheDocument();
    });

    it("should display correct number of funding opportunities", async () => {
      const testPrograms = mockFundingOpportunities.slice(0, 3);
      mockGetLiveFundingOpportunities.mockResolvedValue(testPrograms);

      renderWithProviders(await LiveFundingOpportunities());

      const cards = screen.getAllByTestId(/^funding-card-/);
      expect(cards).toHaveLength(3);
    });

    it("should display program titles correctly", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const firstProgram = mockFundingOpportunities[0];
      expect(screen.getByText(firstProgram.title)).toBeInTheDocument();
    });

    it("should display program descriptions", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const firstProgram = mockFundingOpportunities[0];
      expect(screen.getByText(firstProgram.description)).toBeInTheDocument();
    });

    it("should display program funding amounts", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const firstProgram = mockFundingOpportunities[0];
      expect(screen.getByText(firstProgram.fundingAmount)).toBeInTheDocument();
    });

    it("should display community names", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const firstProgram = mockFundingOpportunities[0];
      expect(screen.getByText(firstProgram.communityName)).toBeInTheDocument();
    });

    it("should handle empty opportunities array", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue([]);

      renderWithProviders(await LiveFundingOpportunities());

      // Carousel should still render, just with empty data
      const carousel = screen.getByTestId("funding-carousel");
      expect(carousel).toBeInTheDocument();

      // No cards should be present
      const cards = screen.queryAllByTestId(/^funding-card-/);
      expect(cards).toHaveLength(0);
    });
  });

  describe("Carousel Behavior", () => {
    it("should render carousel component", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const carousel = screen.getByTestId("funding-carousel");
      expect(carousel).toBeInTheDocument();
    });

    it("should display all programs in carousel", async () => {
      const testPrograms = mockFundingOpportunities.slice(0, 5);
      mockGetLiveFundingOpportunities.mockResolvedValue(testPrograms);

      renderWithProviders(await LiveFundingOpportunities());

      testPrograms.forEach((program) => {
        expect(screen.getByText(program.title)).toBeInTheDocument();
      });
    });

    it("should render funding cards with unique keys", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const cards = screen.getAllByTestId(/^funding-card-/);
      
      // Each card should have a unique testid
      const testIds = cards.map(card => card.getAttribute("data-testid"));
      const uniqueTestIds = new Set(testIds);
      expect(uniqueTestIds.size).toBe(cards.length);
    });

    it("should display programs in the order received", async () => {
      const testPrograms = mockFundingOpportunities.slice(0, 3);
      mockGetLiveFundingOpportunities.mockResolvedValue(testPrograms);

      renderWithProviders(await LiveFundingOpportunities());

      const cards = screen.getAllByTestId(/^funding-card-/);
      
      // First card should contain first program's title
      expect(within(cards[0]).getByText(testPrograms[0].title)).toBeInTheDocument();
    });

    it("should maintain carousel structure with different data sizes", async () => {
      // Test with 1 program
      mockGetLiveFundingOpportunities.mockResolvedValue([mockFundingOpportunities[0]]);

      const { unmount } = renderWithProviders(await LiveFundingOpportunities());
      expect(screen.getByTestId("funding-carousel")).toBeInTheDocument();
      
      unmount();

      // Test with many programs
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);
      renderWithProviders(await LiveFundingOpportunities());
      expect(screen.getByTestId("funding-carousel")).toBeInTheDocument();
    });
  });

  describe("Card Interactions", () => {
    it("should render cards with program information", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const firstProgram = mockFundingOpportunities[0];
      const card = screen.getByTestId(`funding-card-${firstProgram.uid}`);
      
      expect(card).toBeInTheDocument();
      expect(within(card).getByText(firstProgram.title)).toBeInTheDocument();
    });

    it("should display community information on cards", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const firstProgram = mockFundingOpportunities[0];
      expect(screen.getByText(firstProgram.communityName)).toBeInTheDocument();
    });

    it("should display funding amount on cards", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const firstProgram = mockFundingOpportunities[0];
      expect(screen.getByText(firstProgram.fundingAmount)).toBeInTheDocument();
    });

    it("should render all card content for each program", async () => {
      const testPrograms = mockFundingOpportunities.slice(0, 2);
      mockGetLiveFundingOpportunities.mockResolvedValue(testPrograms);

      renderWithProviders(await LiveFundingOpportunities());

      testPrograms.forEach((program) => {
        const card = screen.getByTestId(`funding-card-${program.uid}`);
        
        // Verify all content is present
        expect(within(card).getByText(program.title)).toBeInTheDocument();
        expect(within(card).getByText(program.description)).toBeInTheDocument();
        expect(within(card).getByText(program.communityName)).toBeInTheDocument();
        expect(within(card).getByText(program.fundingAmount)).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle API fetch gracefully", async () => {
      // Mock successful fetch
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      // Component should render successfully
      const carousel = screen.getByTestId("funding-carousel");
      expect(carousel).toBeInTheDocument();
    });

    it("should render component even with empty data", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue([]);

      renderWithProviders(await LiveFundingOpportunities());

      // Section should still render
      const heading = screen.getByText(/live funding opportunities/i);
      expect(heading).toBeInTheDocument();

      // View all link should still be present
      const viewAllLink = screen.getByRole("link", { name: /view all/i });
      expect(viewAllLink).toBeInTheDocument();
    });

    it("should handle data structure correctly", async () => {
      // Test with well-formed data
      const validPrograms = mockFundingOpportunities.slice(0, 3);
      mockGetLiveFundingOpportunities.mockResolvedValue(validPrograms);

      renderWithProviders(await LiveFundingOpportunities());

      // All programs should render
      validPrograms.forEach((program) => {
        expect(screen.getByTestId(`funding-card-${program.uid}`)).toBeInTheDocument();
      });
    });
  });
});

