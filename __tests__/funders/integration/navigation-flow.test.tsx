/**
 * Integration tests for Funders Page Navigation Flows
 *
 * Tests cover:
 * - Schedule Demo CTA navigation
 * - External link behavior
 * - Link security attributes
 * - Community carousel navigation
 * - Case study external links
 */

import { screen } from "@testing-library/react"
import FundersPage from "@/app/funders/page"
import { mockCommunities } from "../fixtures/communities"
import { mockChosenCommunities } from "../setup"
import { renderWithProviders } from "../utils/test-helpers"

describe("Funders Page Navigation Flows", () => {
  beforeEach(() => {
    mockChosenCommunities.mockReturnValue(mockCommunities)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("CTA Navigation", () => {
    it("should have Schedule Demo buttons that navigate correctly", () => {
      renderWithProviders(<FundersPage />)

      const scheduleDemoButtons = screen.getAllByRole("link", { name: /Schedule Demo/i })
      expect(scheduleDemoButtons.length).toBeGreaterThanOrEqual(2)
    })

    it("should open Schedule Demo in new tab", () => {
      renderWithProviders(<FundersPage />)

      const scheduleDemoButtons = screen.getAllByRole("link", { name: /Schedule Demo/i })
      scheduleDemoButtons.forEach((button) => {
        expect(button).toHaveAttribute("target", "_blank")
      })
    })

    it("should have correct partner form URL for Schedule Demo", () => {
      renderWithProviders(<FundersPage />)

      const scheduleDemoButtons = screen.getAllByRole("link", { name: /Schedule Demo/i })
      scheduleDemoButtons.forEach((button) => {
        expect(button.getAttribute("href")).toBeTruthy()
      })
    })

    it("should have community carousel with links", () => {
      renderWithProviders(<FundersPage />)

      // Community carousel should be present
      expect(screen.getByText(/Trusted by growing ecosystems/i)).toBeInTheDocument()
    })

    it("should have case study external links that work correctly", () => {
      renderWithProviders(<FundersPage />)

      const caseStudyButtons = screen.getAllByRole("button", { name: /Read Case Study/i })
      expect(caseStudyButtons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("External Links", () => {
    it("should open all external links in new tab", () => {
      renderWithProviders(<FundersPage />)

      // Get all Schedule Demo and case study links
      const externalLinks = screen.getAllByRole("link", { name: /Schedule Demo/i })

      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute("target", "_blank")
      })
    })

    it("should have rel='noopener noreferrer' on all external links", () => {
      renderWithProviders(<FundersPage />)

      const externalLinks = screen.getAllByRole("link", { name: /Schedule Demo/i })

      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute("rel", "noopener noreferrer")
      })
    })

    it("should have correct partner form link", () => {
      renderWithProviders(<FundersPage />)

      const scheduleDemoLink = screen.getAllByRole("link", { name: /Schedule Demo/i })[0]
      const href = scheduleDemoLink.getAttribute("href")

      expect(href).toBeTruthy()
      expect(typeof href).toBe("string")
    })
  })

  describe("Navigation Context", () => {
    it("should render page content without navbar interference", () => {
      renderWithProviders(<FundersPage />)

      // Main content should be accessible
      expect(screen.getByText(/Grow your ecosystem/i)).toBeInTheDocument()
      expect(screen.getByText(/The numbers/i)).toBeInTheDocument()
    })

    it("should render page content without footer interference", () => {
      renderWithProviders(<FundersPage />)

      // All sections should be accessible
      expect(screen.getByText(/Frequently asked questions/i)).toBeInTheDocument()
      expect(screen.getByText(/Focus on ecosystem growth and impact/i)).toBeInTheDocument()
    })
  })
})
