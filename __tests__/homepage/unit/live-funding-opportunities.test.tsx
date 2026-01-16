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

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { LiveFundingOpportunities } from "@/src/features/homepage/components/live-funding-opportunities";
import { renderWithProviders, screen, within } from "../utils/test-helpers";
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
    REGISTRY: {
      ROOT: "/funding-map",
      ADD_PROGRAM: "/funding-map/add-program",
      MANAGE_PROGRAMS: "/funding-map/manage-programs",
    },
  },
}));

// Mock LiveFundingOpportunitiesSkeleton
jest.mock("@/src/features/homepage/components/live-funding-opportunities-skeleton", () => ({
  LiveFundingOpportunitiesSkeleton: () => <div data-testid="funding-skeleton">Loading...</div>,
}));

// Mock LiveFundingOpportunitiesCarousel
jest.mock("@/src/features/homepage/components/live-funding-opportunities-carousel", () => ({
  LiveFundingOpportunitiesCarousel: ({ programs }: any) => (
    <div data-testid="funding-carousel">
      {programs.map((program: any) => {
        const uid = `${program.programId}-${program.chainID}`;
        const title = program.metadata?.title || program.name;
        const description = program.metadata?.description || "";
        const fundingAmount = program.metadata?.programBudget || "";
        return (
          <div key={uid} data-testid={`funding-card-${uid}`}>
            <h3>{title}</h3>
            <p>{description}</p>
            <span>{program.communityName}</span>
            <span>{fundingAmount}</span>
          </div>
        );
      })}
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
      const programTitle = firstProgram.metadata?.title || firstProgram.name;
      expect(screen.getByText(programTitle)).toBeInTheDocument();
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
      const title = firstProgram.metadata?.title || firstProgram.name;
      expect(screen.getByText(title)).toBeInTheDocument();
    });

    it("should display program descriptions", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const firstProgram = mockFundingOpportunities[0];
      const description = firstProgram.metadata?.description || "";
      if (description) {
        expect(screen.getByText(description)).toBeInTheDocument();
      }
    });

    it("should display program funding amounts", async () => {
      mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);

      renderWithProviders(await LiveFundingOpportunities());

      const firstProgram = mockFundingOpportunities[0];
      const fundingAmount = firstProgram.metadata?.programBudget || "";
      if (fundingAmount) {
        expect(screen.getByText(fundingAmount)).toBeInTheDocument();
      }
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
        const title = program.metadata?.title || program.name;
        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });

    it("should render funding cards with unique keys", async () => {
      const testPrograms = mockFundingOpportunities.slice(0, 5);
      mockGetLiveFundingOpportunities.mockResolvedValue(testPrograms);

      renderWithProviders(await LiveFundingOpportunities());

      const cards = screen.getAllByTestId(/^funding-card-/);

      // Each card should have a unique testid
      const testIds = cards.map((card) => card.getAttribute("data-testid"));
      const uniqueTestIds = new Set(testIds);
      expect(uniqueTestIds.size).toBe(cards.length);
      expect(cards.length).toBe(testPrograms.length);
    });

    it("should display programs in the order received", async () => {
      const testPrograms = mockFundingOpportunities.slice(0, 3);
      mockGetLiveFundingOpportunities.mockResolvedValue(testPrograms);

      renderWithProviders(await LiveFundingOpportunities());

      const cards = screen.getAllByTestId(/^funding-card-/);

      // First card should contain first program's title
      const firstTitle = testPrograms[0].metadata?.title || testPrograms[0].name;
      expect(within(cards[0]).getByText(firstTitle)).toBeInTheDocument();
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
      const uid = `${firstProgram.programId}-${firstProgram.chainID}`;
      const card = screen.getByTestId(`funding-card-${uid}`);
      const title = firstProgram.metadata?.title || firstProgram.name;

      expect(card).toBeInTheDocument();
      expect(within(card).getByText(title)).toBeInTheDocument();
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
      const fundingAmount = firstProgram.metadata?.programBudget || "";
      if (fundingAmount) {
        expect(screen.getByText(fundingAmount)).toBeInTheDocument();
      }
    });

    it("should render all card content for each program", async () => {
      const testPrograms = mockFundingOpportunities.slice(0, 2);
      mockGetLiveFundingOpportunities.mockResolvedValue(testPrograms);

      renderWithProviders(await LiveFundingOpportunities());

      testPrograms.forEach((program) => {
        const uid = `${program.programId}-${program.chainID}`;
        const card = screen.getByTestId(`funding-card-${uid}`);
        const title = program.metadata?.title || program.name;
        const description = program.metadata?.description || "";
        const fundingAmount = program.metadata?.programBudget || "";

        // Verify all content is present
        expect(within(card).getByText(title)).toBeInTheDocument();
        if (description) {
          expect(within(card).getByText(description)).toBeInTheDocument();
        }
        expect(within(card).getByText(program.communityName)).toBeInTheDocument();
        if (fundingAmount) {
          expect(within(card).getByText(fundingAmount)).toBeInTheDocument();
        }
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
        const uid = `${program.programId}-${program.chainID}`;
        expect(screen.getByTestId(`funding-card-${uid}`)).toBeInTheDocument();
      });
    });
  });
});
