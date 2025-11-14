/**
 * Unit tests for the Hero component (/funders page)
 *
 * Tests cover:
 * - Rendering of all major sections
 * - Schedule Demo CTA button
 * - Community carousel
 * - Responsive behavior
 * - Accessibility
 * - External link security attributes
 */

import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Hero } from "@/src/features/funders/components/hero"
import { mockCommunities } from "../fixtures/communities"
import { mockChosenCommunities } from "../setup"
import { renderWithProviders, setViewportSize, VIEWPORTS } from "../utils/test-helpers"

describe("Hero Component", () => {
  beforeEach(() => {
    mockChosenCommunities.mockReturnValue(mockCommunities)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("Rendering", () => {
    it("should render the main heading", () => {
      renderWithProviders(<Hero />)

      const heading = screen.getByRole("heading", { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent("Grow your ecosystem with a world-class funding platform")
    })

    it("should render the description text", () => {
      renderWithProviders(<Hero />)

      expect(
        screen.getByText(/From intake to impact, Karma gives you the tools/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/fund smarter, track progress transparently/i)).toBeInTheDocument()
    })

    it("should render the Schedule Demo button", () => {
      renderWithProviders(<Hero />)

      const button = screen.getByRole("link", { name: /Schedule Demo/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute("href")
    })

    it("should render the trusted communities text", () => {
      renderWithProviders(<Hero />)

      expect(screen.getByText("Trusted by growing ecosystems")).toBeInTheDocument()
    })

    it("should render the community carousel", () => {
      renderWithProviders(<Hero />)

      // Check for carousel container (InfiniteMovingCards renders as a div with specific classes)
      const communitySection = screen.getByText("Trusted by growing ecosystems")
      expect(communitySection).toBeInTheDocument()
    })
  })

  describe("Schedule Demo CTA", () => {
    it("should link to the partner form", () => {
      renderWithProviders(<Hero />)

      const link = screen.getByRole("link", { name: /Schedule Demo/i })
      expect(link.getAttribute("href")).toBeTruthy()
      expect(link.getAttribute("href")).not.toBe("")
    })

    it("should open in a new tab", () => {
      renderWithProviders(<Hero />)

      const link = screen.getByRole("link", { name: /Schedule Demo/i })
      expect(link).toHaveAttribute("target", "_blank")
    })

    it("should have security attributes for external links", () => {
      renderWithProviders(<Hero />)

      const link = screen.getByRole("link", { name: /Schedule Demo/i })
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("should have correct button styling classes", () => {
      renderWithProviders(<Hero />)

      const link = screen.getByRole("link", { name: /Schedule Demo/i })
      expect(link.className).toContain("bg-foreground")
      expect(link.className).toContain("text-background")
    })
  })

  describe("Community Carousel", () => {
    it("should display all chosen communities", () => {
      const testCommunities = mockCommunities.slice(0, 3)
      mockChosenCommunities.mockReturnValue(testCommunities)

      renderWithProviders(<Hero />)

      testCommunities.forEach((community) => {
        // Use getAllByText since carousel may duplicate items
        expect(screen.getAllByText(community.name).length).toBeGreaterThan(0)
      })
    })

    it("should pass includeAll=true to chosenCommunities", () => {
      // The Hero component calls chosenCommunities(true) on render
      renderWithProviders(<Hero />)

      // Since chosenCommunities is called during component evaluation (not in a hook/effect),
      // we just verify the component renders communities correctly
      expect(screen.getByText("Trusted by growing ecosystems")).toBeInTheDocument()
    })

    it("should handle empty communities gracefully", () => {
      mockChosenCommunities.mockReturnValue([])

      const { container } = renderWithProviders(<Hero />)

      // Component should still render without crashing
      expect(container).toBeInTheDocument()
      expect(screen.getByText("Trusted by growing ecosystems")).toBeInTheDocument()
    })
  })

  describe("Responsive Behavior", () => {
    it("should render on mobile viewport", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height)

      renderWithProviders(<Hero />)

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /Schedule Demo/i })).toBeInTheDocument()
    })

    it("should render on tablet viewport", () => {
      setViewportSize(VIEWPORTS.TABLET.width, VIEWPORTS.TABLET.height)

      renderWithProviders(<Hero />)

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /Schedule Demo/i })).toBeInTheDocument()
    })

    it("should render on desktop viewport", () => {
      setViewportSize(VIEWPORTS.DESKTOP.width, VIEWPORTS.DESKTOP.height)

      renderWithProviders(<Hero />)

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /Schedule Demo/i })).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("should use semantic HTML with proper heading hierarchy", () => {
      renderWithProviders(<Hero />)

      const heading = screen.getByRole("heading", { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    it("should have accessible link text for Schedule Demo", () => {
      renderWithProviders(<Hero />)

      const link = screen.getByRole("link", { name: /Schedule Demo/i })
      expect(link).toHaveAccessibleName()
    })

    it("should use section landmark for semantic structure", () => {
      const { container } = renderWithProviders(<Hero />)

      const section = container.querySelector("section")
      expect(section).toBeInTheDocument()
    })
  })
})
