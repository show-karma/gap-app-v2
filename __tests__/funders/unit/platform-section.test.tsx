/**
 * Unit tests for the PlatformSection component (/funders page)
 *
 * Tests cover:
 * - Rendering of section header
 * - Display of all 4 platform cards
 * - Card content (subtitle, title, description, image)
 * - Responsive grid layout
 * - Accessibility
 */

import { screen } from "@testing-library/react";
import { PlatformSection } from "@/src/features/funders/components/platform-section";
import { mockPlatformCards } from "../fixtures/platform-cards";
import { renderWithProviders, setViewportSize, VIEWPORTS } from "../utils/test-helpers";

describe("PlatformSection Component", () => {
  describe("Rendering", () => {
    it("should render the section badge", () => {
      renderWithProviders(<PlatformSection />);

      expect(screen.getByText("Our Platform")).toBeInTheDocument();
    });

    it("should render the main heading with both colored parts", () => {
      renderWithProviders(<PlatformSection />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Modular funding infrastructure");
      expect(heading).toHaveTextContent("for growth and impact");
    });

    it("should render the description text", () => {
      renderWithProviders(<PlatformSection />);

      expect(
        screen.getByText(
          /Whether you're running applications, tracking milestones, or measuring impact/i
        )
      ).toBeInTheDocument();
    });

    it("should render all four platform cards", () => {
      renderWithProviders(<PlatformSection />);

      mockPlatformCards.forEach((card) => {
        expect(screen.getByText(card.subtitle)).toBeInTheDocument();
        expect(screen.getByText(card.title)).toBeInTheDocument();
        expect(screen.getByText(card.description)).toBeInTheDocument();
      });
    });
  });

  describe("Platform Cards", () => {
    it("should display Application Evaluation card", () => {
      renderWithProviders(<PlatformSection />);

      expect(screen.getByText("Application Evaluation")).toBeInTheDocument();
      expect(screen.getByText("Smarter decisions with AI-powered evaluation")).toBeInTheDocument();
    });

    it("should display Public Registry card", () => {
      renderWithProviders(<PlatformSection />);

      expect(screen.getByText("Public Registry")).toBeInTheDocument();
      expect(screen.getByText("One place for all projects and their progress")).toBeInTheDocument();
    });

    it("should display Impact card", () => {
      renderWithProviders(<PlatformSection />);

      expect(screen.getByText("Impact")).toBeInTheDocument();
      expect(screen.getByText("Measure what matters with real-time insights")).toBeInTheDocument();
    });

    it("should display Distribution card", () => {
      renderWithProviders(<PlatformSection />);

      expect(screen.getByText("Distribution")).toBeInTheDocument();
      expect(screen.getByText("Funding methods to meet your needs")).toBeInTheDocument();
    });

    it("should render images for all cards", () => {
      renderWithProviders(<PlatformSection />);

      // ThemeImage renders both light and dark versions for each card
      const allImages = screen.getAllByRole("img");
      // 4 cards * 2 images (light + dark) = 8 images total
      expect(allImages.length).toBeGreaterThanOrEqual(8);

      // Check that each platform card has its corresponding images
      mockPlatformCards.forEach((card) => {
        const images = allImages.filter((img) => img.getAttribute("alt") === card.title);
        expect(images.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should have correct alt text for card images", () => {
      renderWithProviders(<PlatformSection />);

      // Check that all images have proper alt text (each card has 2 images: light & dark)
      mockPlatformCards.forEach((card) => {
        const images = screen.getAllByAltText(card.title);
        expect(images.length).toBeGreaterThanOrEqual(2); // light + dark versions
      });
    });
  });

  describe("Responsive Behavior", () => {
    it("should render correctly on mobile viewport", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height);

      renderWithProviders(<PlatformSection />);

      expect(screen.getByText("Our Platform")).toBeInTheDocument();
      // Verify all 4 cards are rendered
      mockPlatformCards.forEach((card) => {
        expect(screen.getByText(card.title)).toBeInTheDocument();
      });
    });

    it("should render correctly on desktop viewport", () => {
      setViewportSize(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height);

      renderWithProviders(<PlatformSection />);

      expect(screen.getByText("Our Platform")).toBeInTheDocument();
      // Verify all 4 cards are rendered
      mockPlatformCards.forEach((card) => {
        expect(screen.getByText(card.title)).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should use semantic HTML with proper heading hierarchy", () => {
      renderWithProviders(<PlatformSection />);

      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toBeInTheDocument();

      const h3Elements = screen.getAllByRole("heading", { level: 3 });
      expect(h3Elements).toHaveLength(4);
    });

    it("should use section landmark for semantic structure", () => {
      const { container } = renderWithProviders(<PlatformSection />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("should have descriptive alt text for all images", () => {
      renderWithProviders(<PlatformSection />);

      // Each card has 2 images (light & dark) with the same alt text
      mockPlatformCards.forEach((card) => {
        const images = screen.getAllByAltText(card.title);
        expect(images.length).toBeGreaterThanOrEqual(2);
      });
    });
  });
});
