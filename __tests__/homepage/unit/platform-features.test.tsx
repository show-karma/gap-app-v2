/**
 * PlatformFeatures Component Tests
 * Tests the platform features section with feature cards grid
 *
 * Target: 15 tests
 * - Rendering (5)
 * - Responsive Behavior (5)
 * - Interactions (3)
 * - Accessibility (2)
 */

import { PlatformFeatures } from "@/src/features/homepage/components/platform-features"
import { renderWithProviders, screen, setViewportSize, within } from "../utils/test-helpers"
import "@testing-library/jest-dom"

// Define viewports locally
const VIEWPORTS = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 1024, height: 768 },
  DESKTOP: { width: 1440, height: 900 },
}

// Mock Badge component
jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}))

// Mock ThemeImage component
jest.mock("@/src/components/ui/theme-image", () => ({
  ThemeImage: ({ alt, src }: any) => <img data-testid="theme-image" src={src} alt={alt} />,
}))

describe("PlatformFeatures Component", () => {
  describe("Rendering", () => {
    it("should render section heading", () => {
      renderWithProviders(<PlatformFeatures />)

      const heading = screen.getByText(/Karma connects builders/i)
      expect(heading).toBeInTheDocument()
    })

    it("should render 'Our Platform' badge", () => {
      renderWithProviders(<PlatformFeatures />)

      const badge = screen.getByTestId("badge")
      expect(badge).toHaveTextContent("Our Platform")
      expect(badge).toHaveAttribute("data-variant", "secondary")
    })

    it("should render section description", () => {
      renderWithProviders(<PlatformFeatures />)

      const description = screen.getByText(/We support builders across their lifecycle/i)
      expect(description).toBeInTheDocument()
    })

    it("should render all 6 feature cards", () => {
      renderWithProviders(<PlatformFeatures />)

      // Check for all feature titles
      expect(screen.getByText("Onchain Project Profile")).toBeInTheDocument()
      expect(screen.getByText("Multi-Program Participation")).toBeInTheDocument()
      expect(screen.getByText("Direct Funding & Donations")).toBeInTheDocument()
      expect(screen.getByText("Impact Measurement")).toBeInTheDocument()
      expect(screen.getByText("Milestones & Updates")).toBeInTheDocument()
      expect(screen.getByText("Endorsements & Reputation")).toBeInTheDocument()
    })

    it("should render feature cards with titles, descriptions, and images", () => {
      renderWithProviders(<PlatformFeatures />)

      // First card
      const firstCardTitle = screen.getByText("Onchain Project Profile")
      expect(firstCardTitle).toBeInTheDocument()

      const firstCardDescription = screen.getByText(/Create a comprehensive project profile/i)
      expect(firstCardDescription).toBeInTheDocument()

      // Check for images
      const images = screen.getAllByTestId("theme-image")
      expect(images.length).toBeGreaterThanOrEqual(6)
    })
  })

  describe("Responsive Behavior", () => {
    it("should display 1 column on mobile", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height)

      const { container } = renderWithProviders(<PlatformFeatures />)

      const grid = container.querySelector(".grid")
      expect(grid).toHaveClass("grid-cols-1")
    })

    it("should display 2 columns on tablet", () => {
      setViewportSize(VIEWPORTS.TABLET.width, VIEWPORTS.TABLET.height)

      const { container } = renderWithProviders(<PlatformFeatures />)

      const grid = container.querySelector(".grid")
      expect(grid).toHaveClass("md:grid-cols-2")
    })

    it("should display 4 columns on desktop", () => {
      setViewportSize(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height)

      const { container } = renderWithProviders(<PlatformFeatures />)

      const grid = container.querySelector(".grid")
      expect(grid).toHaveClass("lg:grid-cols-4")
    })

    it("should have proper gap spacing between cards", () => {
      const { container } = renderWithProviders(<PlatformFeatures />)

      const grid = container.querySelector(".grid")
      expect(grid).toHaveClass("gap-4")
    })

    it("should adapt card layout for different sizes", () => {
      renderWithProviders(<PlatformFeatures />)

      // Check that "Direct Funding & Donations" card has double size
      const directFundingCard = screen
        .getByText("Direct Funding & Donations")
        .closest(".lg\\:col-span-2")
      expect(directFundingCard).toBeInTheDocument()

      // Check that "Milestones & Updates" card has double size
      const milestonesCard = screen.getByText("Milestones & Updates").closest(".lg\\:col-span-2")
      expect(milestonesCard).toBeInTheDocument()
    })
  })

  describe("Interactions", () => {
    it("should render cards with checklist for specific features", () => {
      renderWithProviders(<PlatformFeatures />)

      // "Direct Funding & Donations" has a checklist
      expect(screen.getByText("Accept fiat donations")).toBeInTheDocument()
      expect(screen.getByText("Support for multiple chains and tokens")).toBeInTheDocument()
      expect(screen.getByText("Track and manage payouts")).toBeInTheDocument()
    })

    it("should display all checklist items for multi-column cards", () => {
      renderWithProviders(<PlatformFeatures />)

      // "Milestones & Updates" has a checklist
      expect(screen.getByText("Add project deliverables")).toBeInTheDocument()
      expect(screen.getByText("Add custom metrics to show impact")).toBeInTheDocument()
    })

    it("should render feature images with correct alt text", () => {
      renderWithProviders(<PlatformFeatures />)

      const images = screen.getAllByTestId("theme-image")

      // Check that first image has correct alt text
      const firstImage = images[0]
      expect(firstImage).toHaveAttribute("alt", "Onchain Project Profile")
    })
  })

  describe("Accessibility", () => {
    it("should use semantic HTML structure", () => {
      const { container } = renderWithProviders(<PlatformFeatures />)

      // Should have a section element
      const section = container.querySelector("section")
      expect(section).toBeInTheDocument()

      // Should have an h2 heading
      const heading = screen.getByRole("heading", { level: 2 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent(/Karma connects builders/i)
    })

    it("should have proper heading hierarchy", () => {
      renderWithProviders(<PlatformFeatures />)

      // Main section heading (h2)
      const mainHeading = screen.getByRole("heading", { level: 2 })
      expect(mainHeading).toBeInTheDocument()

      // Feature card titles (h3)
      const featureTitles = screen.getAllByRole("heading", { level: 3 })
      expect(featureTitles.length).toBe(6)
    })
  })
})
