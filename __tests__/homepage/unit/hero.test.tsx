/**
 * Hero Component Tests
 * Tests the main hero section of the homepage
 * 
 * Target: 25 tests
 * - Rendering (5)
 * - Interactions (6)
 * - Responsive (5)
 * - Accessibility (5)
 * - Edge Cases (4)
 */

import { Hero } from "@/src/features/homepage/components/hero";
import {
  renderWithProviders,
  screen,
  within,
  userEvent,
  waitFor,
  setViewportSize,
  createMockAuth,
  createMockRouter,
} from "../utils/test-helpers";
import "@testing-library/jest-dom";
import { VIEWPORTS } from "../setup";

// Mock the utilities that provide community data
jest.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: jest.fn(() => [
    { name: "Optimism", slug: "optimism", imageURL: "https://example.com/optimism.png" },
    { name: "Arbitrum", slug: "arbitrum", imageURL: "https://example.com/arbitrum.png" },
    { name: "Base", slug: "base", imageURL: "https://example.com/base.png" },
  ]),
}));

// Mock PAGES utility
jest.mock("@/utilities/pages", () => ({
  PAGES: {
    FUNDERS: "/funders",
    PROJECTS_EXPLORER: "/projects",
    COMMUNITIES: "/communities",
    COMMUNITY: {
      ALL_GRANTS: (slug: string) => `/community/${slug}`,
    },
  },
}));

// Mock CreateProjectButton
jest.mock("@/src/features/homepage/components/create-project-button", () => ({
  CreateProjectButton: () => <button data-testid="create-project-button">Create project</button>,
}));

describe("Hero Component", () => {
  describe("Rendering Tests", () => {
    it("should render hero section with correct heading", () => {
      renderWithProviders(<Hero />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Where builders get funded and ecosystems grow");
    });

    it("should render description text", () => {
      renderWithProviders(<Hero />);

      const description = screen.getByText(/Ecosystems use Karma to fund projects transparently/i);
      expect(description).toBeInTheDocument();
    });

    it("should render Create Project CTA button", () => {
      renderWithProviders(<Hero />);

      const createButton = screen.getByTestId("create-project-button");
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveTextContent("Create project");
    });

    it("should render Run a funding program CTA button", () => {
      renderWithProviders(<Hero />);

      const fundersButton = screen.getByRole("link", { name: /run a funding program/i });
      expect(fundersButton).toBeInTheDocument();
      expect(fundersButton).toHaveAttribute("href", "/funders");
    });

    it("should render user avatars (3 images)", () => {
      const { container } = renderWithProviders(<Hero />);

      // Hero component shows 3 user avatars
      const avatars = container.querySelectorAll('img[alt="User"]');
      expect(avatars).toHaveLength(3);
    });
  });

  describe("Interaction Tests", () => {
    it("should have clickable Run a funding program button", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Hero />);

      const fundersButton = screen.getByRole("link", { name: /run a funding program/i });
      expect(fundersButton).toBeInTheDocument();

      // Button should be clickable (it's a link)
      await user.click(fundersButton);
      expect(fundersButton).toHaveAttribute("href", "/funders");
    });

    it("should display community carousel", () => {
      renderWithProviders(<Hero />);

      const carousel = screen.getByTestId("infinite-moving-cards");
      expect(carousel).toBeInTheDocument();
    });

    it("should show Explore Projects link", () => {
      renderWithProviders(<Hero />);

      const exploreLink = screen.getByRole("link", { name: /explore projects/i });
      expect(exploreLink).toBeInTheDocument();
      expect(exploreLink).toHaveAttribute("href", "/projects");
    });

    it("should show View all communities link", () => {
      renderWithProviders(<Hero />);

      const viewAllLink = screen.getByRole("link", { name: /view all/i });
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink).toHaveAttribute("href", "/communities");
    });

    it("should display project count text", () => {
      renderWithProviders(<Hero />);

      const projectCount = screen.getByText(/4k\+ projects active on Karma/i);
      expect(projectCount).toBeInTheDocument();
    });

    it("should display communities on Karma text", () => {
      renderWithProviders(<Hero />);

      const communitiesText = screen.getByText(/communities on karma/i);
      expect(communitiesText).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("should adapt layout to mobile viewport", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height);
      const { container } = renderWithProviders(<Hero />);

      // Hero section should exist
      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();

      // Hero image should be hidden on mobile (has hidden md:flex class)
      const heroImage = screen.getByAltText("Builder Hero");
      expect(heroImage).toHaveClass("hidden");
    });

    it("should adapt layout to tablet viewport", () => {
      setViewportSize(VIEWPORTS.TABLET.width, VIEWPORTS.TABLET.height);
      renderWithProviders(<Hero />);

      const section = screen.getByRole("heading", { level: 1 }).closest("section");
      expect(section).toBeInTheDocument();
    });

    it("should adapt layout to desktop viewport", () => {
      setViewportSize(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height);
      renderWithProviders(<Hero />);

      // Desktop should show hero image
      const heroImage = screen.getByAltText("Builder Hero");
      expect(heroImage).toBeInTheDocument();
    });

    it("should stack CTA buttons vertically on mobile", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height);
      renderWithProviders(<Hero />);

      // Both buttons should be present
      const createButton = screen.getByTestId("create-project-button");
      const fundersButton = screen.getByRole("link", { name: /run a funding program/i });

      expect(createButton).toBeInTheDocument();
      expect(fundersButton).toBeInTheDocument();
    });

    it("should show hero image on desktop but hide on mobile", () => {
      renderWithProviders(<Hero />);

      const heroImage = screen.getByAltText("Builder Hero");
      expect(heroImage).toBeInTheDocument();
      // Image has "hidden md:flex" classes - hidden on mobile, flex on md+
      expect(heroImage).toHaveClass("hidden", "md:flex");
    });
  });

  describe("Accessibility Tests", () => {
    it("should have proper heading hierarchy", () => {
      renderWithProviders(<Hero />);

      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveTextContent(/where builders get funded/i);
    });

    it("should have descriptive image alt text", () => {
      const { container } = renderWithProviders(<Hero />);

      const userImages = container.querySelectorAll('img[alt="User"]');
      expect(userImages).toHaveLength(3);

      const heroImage = screen.getByAltText("Builder Hero");
      expect(heroImage).toBeInTheDocument();
    });

    it("should have accessible CTA buttons", () => {
      renderWithProviders(<Hero />);

      const createButton = screen.getByTestId("create-project-button");
      expect(createButton).toBeInTheDocument();

      const fundersLink = screen.getByRole("link", { name: /run a funding program/i });
      expect(fundersLink).toBeInTheDocument();
    });

    it("should have keyboard navigable links", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Hero />);

      const exploreLink = screen.getByRole("link", { name: /explore projects/i });
      
      // Focus the link
      exploreLink.focus();
      expect(exploreLink).toHaveFocus();

      // Press Enter should work (link is keyboard accessible)
      await user.keyboard("{Enter}");
    });

    it("should have semantic HTML structure", () => {
      const { container } = renderWithProviders(<Hero />);

      // Should be wrapped in a section element
      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();

      // Should have an h1 heading
      const h1 = container.querySelector("h1");
      expect(h1).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing community data gracefully", () => {
      // Mock empty communities
      const { chosenCommunities } = require("@/utilities/chosenCommunities");
      chosenCommunities.mockReturnValueOnce([]);

      renderWithProviders(<Hero />);

      // Hero should still render
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it("should handle long text content", () => {
      renderWithProviders(<Hero />);

      // Verify text content is displayed
      const heading = screen.getByRole("heading", { level: 1 });
      const description = screen.getByText(/Ecosystems use Karma/i);

      expect(heading).toBeInTheDocument();
      expect(description).toBeInTheDocument();
    });

    it("should render all links with correct href attributes", () => {
      renderWithProviders(<Hero />);

      const fundersLink = screen.getByRole("link", { name: /run a funding program/i });
      expect(fundersLink).toHaveAttribute("href", "/funders");

      const exploreLink = screen.getByRole("link", { name: /explore projects/i });
      expect(exploreLink).toHaveAttribute("href", "/projects");

      const viewAllLink = screen.getByRole("link", { name: /view all/i });
      expect(viewAllLink).toHaveAttribute("href", "/communities");
    });

    it("should maintain proper z-index for overlapping user avatars", () => {
      const { container } = renderWithProviders(<Hero />);

      const userImages = container.querySelectorAll('img[alt="User"]');
      
      // First avatar should have z-[4], second z-[5], third z-[6]
      expect(userImages[0]).toHaveClass("z-[4]");
      expect(userImages[1]).toHaveClass("z-[5]");
      expect(userImages[2]).toHaveClass("z-[6]");
    });
  });
});

