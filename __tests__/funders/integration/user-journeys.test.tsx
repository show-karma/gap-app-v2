/**
 * Integration tests for Funders Page User Journeys
 *
 * Tests cover:
 * - First-time funder visit journey
 * - Ecosystem lead journey
 * - Research phase journey
 * - Complete conversion paths
 */

import { screen } from "@testing-library/react"
import FundersPage from "@/app/funders/page"
import { mockCommunities } from "../fixtures/communities"
import { mockChosenCommunities } from "../setup"
import { renderWithProviders, setViewportSize, VIEWPORTS } from "../utils/test-helpers"

describe("Funders Page User Journeys", () => {
  beforeEach(() => {
    mockChosenCommunities.mockReturnValue(mockCommunities)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("First-Time Funder Visit", () => {
    it("should see all sections on initial page load", () => {
      renderWithProviders(<FundersPage />)

      // Visitor should see hero
      expect(screen.getByText(/Grow your ecosystem/i)).toBeInTheDocument()

      // And all other major sections
      expect(screen.getByText(/The numbers/i)).toBeInTheDocument()
      expect(screen.getByText(/Case Studies/i)).toBeInTheDocument()
      expect(screen.getByText(/How It Works/i)).toBeInTheDocument()
    })

    it("should be able to scroll through all content", () => {
      renderWithProviders(<FundersPage />)

      // All sections should be in DOM for scrolling
      expect(screen.getByText(/Grow your ecosystem/i)).toBeInTheDocument()
      expect(screen.getByText(/Frequently asked questions/i)).toBeInTheDocument()
      expect(screen.getByText(/Focus on ecosystem growth and impact/i)).toBeInTheDocument()
    })

    it("should see multiple Schedule Demo CTAs", () => {
      renderWithProviders(<FundersPage />)

      const scheduleDemoButtons = screen.getAllByRole("link", { name: /Schedule Demo/i })
      expect(scheduleDemoButtons.length).toBeGreaterThanOrEqual(2)
    })

    it("should see social proof through case studies", () => {
      renderWithProviders(<FundersPage />)

      // Testimonials should be visible
      expect(screen.getByText(/Gonna/)).toBeInTheDocument()
      expect(screen.getByText(/Sophia Dew/)).toBeInTheDocument()

      // Metrics should be visible
      expect(screen.getByText(/100\+ hours saved/i)).toBeInTheDocument()
    })

    it("should be able to access FAQ for help", () => {
      renderWithProviders(<FundersPage />)

      // FAQ section should be accessible
      expect(screen.getByText(/Frequently asked questions/i)).toBeInTheDocument()
      expect(screen.getByText(/What is Karma and how does it help funders?/i)).toBeInTheDocument()
    })
  })

  describe("Ecosystem Lead Journey", () => {
    it("should see clear value proposition", () => {
      renderWithProviders(<FundersPage />)

      // Hero value prop
      expect(screen.getByText(/Grow your ecosystem/i)).toBeInTheDocument()

      // Supporting text should be present
      const bodyText = document.body.textContent
      expect(bodyText).toContain("ecosystem")
    })

    it("should view statistics and social proof", () => {
      renderWithProviders(<FundersPage />)

      // Statistics
      expect(screen.getByText(/30\+/)).toBeInTheDocument()
      expect(screen.getByText(/4k/)).toBeInTheDocument()

      // Social proof
      expect(screen.getByText(/Case Studies/i)).toBeInTheDocument()
    })

    it("should read case studies from similar ecosystems", () => {
      renderWithProviders(<FundersPage />)

      // Case studies should mention ecosystem names
      expect(screen.getByText(/100\+ hours saved/i)).toBeInTheDocument()
      expect(screen.getByText(/3,600\+ Milestones/i)).toBeInTheDocument()
    })

    it("should find and click Schedule Demo CTA", () => {
      renderWithProviders(<FundersPage />)

      const scheduleDemoButton = screen.getAllByRole("link", { name: /Schedule Demo/i })[0]
      expect(scheduleDemoButton).toBeInTheDocument()
      expect(scheduleDemoButton).toHaveAttribute("href")
    })
  })

  describe("Research Phase Journey", () => {
    it("should read through platform capabilities", () => {
      renderWithProviders(<FundersPage />)

      // Platform section should be accessible
      expect(screen.getByText(/Smarter decisions with AI-powered evaluation/i)).toBeInTheDocument()
    })

    it("should explore how the platform works", () => {
      renderWithProviders(<FundersPage />)

      // How It Works section
      expect(screen.getByText(/How It Works/i)).toBeInTheDocument()
      expect(screen.getByText(/Connect with our team/i)).toBeInTheDocument()
      expect(screen.getByText(/Configure your ecosystem/i)).toBeInTheDocument()
      expect(screen.getByText(/Launch your program/i)).toBeInTheDocument()
    })

    it("should review pricing and offerings", () => {
      renderWithProviders(<FundersPage />)

      // Offering section
      expect(screen.getByText(/Our Offering/i)).toBeInTheDocument()

      // Check for pricing tiers - use h3 headings specifically
      const h3Elements = screen.getAllByRole("heading", { level: 3 })
      const tierNames = h3Elements.map((el) => el.textContent)

      expect(tierNames).toContain("Starter")
      expect(tierNames).toContain("Pro")
      expect(tierNames).toContain("Enterprise")
    })

    it("should access detailed FAQ information", () => {
      renderWithProviders(<FundersPage />)

      // Multiple FAQ questions should be accessible
      expect(screen.getByText(/What is Karma and how does it help funders?/i)).toBeInTheDocument()
      expect(screen.getByText(/Can we migrate data from other platforms?/i)).toBeInTheDocument()
      expect(screen.getByText(/Can I try out the platform before committing/i)).toBeInTheDocument()
    })
  })

  describe("Mobile User Journey", () => {
    it("should see all sections on mobile viewport", () => {
      setViewportSize(VIEWPORTS.MOBILE.width, VIEWPORTS.MOBILE.height)

      renderWithProviders(<FundersPage />)

      expect(screen.getByText(/Grow your ecosystem/i)).toBeInTheDocument()
      expect(screen.getByText(/The numbers/i)).toBeInTheDocument()
      expect(screen.getByText(/Case Studies/i)).toBeInTheDocument()
    })
  })
})
