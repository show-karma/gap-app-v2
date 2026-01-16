/**
 * Homepage User Journeys Integration Tests
 * Tests complete user flows through the homepage
 *
 * Target: 13 tests
 * - First-Time Visitor (5)
 * - Authenticated Builder (4)
 * - Funder Journey (4)
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import HomePage from "@/app/page";
import { renderWithProviders, screen, waitFor } from "../utils/test-helpers";
import "@testing-library/jest-dom";
import { mockFundingOpportunities } from "../fixtures/funding-opportunities";

// Mock the service functions
const mockGetLiveFundingOpportunities = jest.fn();

jest.mock("@/src/services/funding/getLiveFundingOpportunities", () => ({
  getLiveFundingOpportunities: () => mockGetLiveFundingOpportunities(),
}));

// Mock auth states
const createMockUseAuth = (overrides = {}) => ({
  ready: true,
  authenticated: false,
  isConnected: false,
  address: undefined,
  user: null,
  authenticate: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  disconnect: jest.fn(),
  getAccessToken: jest.fn().mockResolvedValue("mock-token"),
  ...overrides,
});

describe("Homepage User Journeys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLiveFundingOpportunities.mockResolvedValue(mockFundingOpportunities);
  });

  describe("First-Time Visitor", () => {
    it("should see all sections on load", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      // Hero
      expect(screen.getByText(/Where builders get funded/i)).toBeInTheDocument();

      // Funding opportunities
      await waitFor(() => {
        expect(screen.getByText(/Live funding opportunities/i)).toBeInTheDocument();
      });

      // Platform features
      expect(screen.getByText(/Karma connects builders/i)).toBeInTheDocument();

      // How it works
      expect(screen.getAllByText(/One profile./i)[0]).toBeInTheDocument();

      // Community
      expect(screen.getByText(/Join our community/i)).toBeInTheDocument();

      // FAQ
      expect(screen.getByText(/What is Karma/i)).toBeInTheDocument();

      // Where builders grow
      expect(screen.getAllByText(/Where builders grow/i)[0]).toBeInTheDocument();
    });

    it("should be able to scroll through content", async () => {
      const { container } = renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      const main = container.querySelector("main");
      expect(main).toHaveClass("flex-1");
      expect(main).toHaveClass("flex-col");

      // All sections should be in the DOM for scrolling
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(7);
    });

    it("should see 'Create Project' CTA", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      const createButtons = screen.getAllByRole("button", { name: /Create project/i });
      expect(createButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("should be able to browse opportunities", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      await waitFor(() => {
        expect(screen.getByText(/Live funding opportunities/i)).toBeInTheDocument();
      });

      // View all links should be present
      const viewAllLinks = screen.getAllByRole("link", { name: /View all/i });
      expect(viewAllLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should access FAQ for help", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      // FAQ section should be visible
      expect(screen.getByText(/What is Karma/i)).toBeInTheDocument();

      // Discord support link should be present
      const discordLinks = screen.getAllByRole("link", { name: /Discord/i });
      expect(discordLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Authenticated Builder", () => {
    const mockAuthenticatedUser = {
      id: "user123",
      wallet: { address: "0x123" },
    };

    it("should see 'Create Project' CTA", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({
          authenticated: true,
          isConnected: true,
          address: "0x123",
          user: mockAuthenticatedUser,
        }),
      });

      const createButtons = screen.getAllByRole("button", { name: /Create project/i });
      expect(createButtons.length).toBeGreaterThanOrEqual(2); // Hero + WhereBuildersGrow
    });

    it("should be able to start project creation", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({
          authenticated: true,
          isConnected: true,
          address: "0x123",
          user: mockAuthenticatedUser,
        }),
      });

      // Create Project button should be clickable
      const createButton = screen.getAllByRole("button", { name: /Create project/i })[0];
      expect(createButton).not.toBeDisabled();
    });

    it("should be able to browse funding opportunities", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({
          authenticated: true,
          isConnected: true,
          address: "0x123",
          user: mockAuthenticatedUser,
        }),
      });

      await waitFor(() => {
        expect(screen.getByText(/Live funding opportunities/i)).toBeInTheDocument();
      });

      // Funding opportunities should be accessible (there may be multiple "View all" links)
      const viewAllLinks = screen.getAllByRole("link", { name: /View all/i });
      expect(viewAllLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("should see platform features section", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({
          authenticated: true,
          isConnected: true,
          address: "0x123",
          user: mockAuthenticatedUser,
        }),
      });

      // Platform features should be visible
      expect(screen.getByText(/Karma connects builders/i)).toBeInTheDocument();
      expect(screen.getByText(/Onchain Project Profile/i)).toBeInTheDocument();
    });
  });

  describe("Funder Journey", () => {
    it("should see 'Run a funding program' CTA", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      const fundersLink = screen.getByRole("link", { name: /Run a funding program/i });
      expect(fundersLink).toBeInTheDocument();
      expect(fundersLink).toHaveAttribute("href", "/funders");
    });

    it("should be able to navigate to funders page", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      const fundersLinks = screen.getAllByRole("link", { name: /funders|Grow your ecosystem/i });
      expect(fundersLinks.length).toBeGreaterThanOrEqual(1);

      fundersLinks.forEach((link) => {
        expect(link).toHaveAttribute("href", "/funders");
      });
    });

    it("should see platform benefits", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      // Platform features section shows benefits
      expect(screen.getByText(/Karma connects builders/i)).toBeInTheDocument();
      expect(screen.getByText(/We support builders across their lifecycle/i)).toBeInTheDocument();
    });

    it("should see how it works flow", async () => {
      renderWithProviders(await HomePage(), {
        mockUseAuth: createMockUseAuth({ authenticated: false }),
      });

      // How it works section
      expect(screen.getAllByText(/One profile./i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Create project/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/Apply and get funded/i)).toBeInTheDocument();
    });
  });
});
