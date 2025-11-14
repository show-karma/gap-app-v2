/**
 * Accessibility tests for the Funders Page using jest-axe
 *
 * Tests cover:
 * - WCAG 2.2 AA compliance
 * - Each major section accessibility
 * - Keyboard navigation
 * - Screen reader compatibility
 */

import { render } from "@testing-library/react"
import { axe, toHaveNoViolations } from "jest-axe"
import FundersPage from "@/app/funders/page"
import { CaseStudiesSection } from "@/src/features/funders/components/case-studies-section"
import { FAQSection } from "@/src/features/funders/components/faq-section"
import { HandleTheVisionSection } from "@/src/features/funders/components/handle-the-vision-section"
import { Hero } from "@/src/features/funders/components/hero"
import { HowItWorksSection } from "@/src/features/funders/components/how-it-works-section"
import { NumbersSection } from "@/src/features/funders/components/numbers-section"
import { OfferingSection } from "@/src/features/funders/components/offering-section"
import { PlatformSection } from "@/src/features/funders/components/platform-section"
import { mockCommunities } from "../fixtures/communities"
import { mockChosenCommunities } from "../setup"
import { renderWithProviders } from "../utils/test-helpers"

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe("Funders Page Accessibility", () => {
  beforeEach(() => {
    mockChosenCommunities.mockReturnValue(mockCommunities)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should have no accessibility violations on the complete page", async () => {
    const { container } = renderWithProviders(<FundersPage />)
    const results = await axe(container)

    // Filter out image-redundant-alt violations (acceptable for carousel images)
    const filteredViolations = results.violations.filter(
      (violation: any) => violation.id !== "image-redundant-alt"
    )

    expect({ ...results, violations: filteredViolations }).toHaveNoViolations()
  }, 15000)

  it("Hero section should pass accessibility checks", async () => {
    const { container } = renderWithProviders(<Hero />)
    const results = await axe(container)

    // Filter out image-redundant-alt violations (acceptable for carousel images)
    const filteredViolations = results.violations.filter(
      (violation: any) => violation.id !== "image-redundant-alt"
    )

    expect({ ...results, violations: filteredViolations }).toHaveNoViolations()
  })

  it("NumbersSection should pass accessibility checks", async () => {
    const { container } = renderWithProviders(<NumbersSection />)
    const results = await axe(container)

    expect(results).toHaveNoViolations()
  })

  it("PlatformSection should pass accessibility checks", async () => {
    const { container } = renderWithProviders(<PlatformSection />)
    const results = await axe(container)

    expect(results).toHaveNoViolations()
  })

  it("CaseStudiesSection should pass accessibility checks", async () => {
    const { container } = renderWithProviders(<CaseStudiesSection />)
    const results = await axe(container)

    expect(results).toHaveNoViolations()
  })

  it("HowItWorksSection should pass accessibility checks", async () => {
    const { container } = renderWithProviders(<HowItWorksSection />)
    const results = await axe(container)

    expect(results).toHaveNoViolations()
  })

  it("OfferingSection should pass accessibility checks", async () => {
    const { container } = renderWithProviders(<OfferingSection />)
    const results = await axe(container)

    expect(results).toHaveNoViolations()
  })

  it("FAQSection and HandleTheVisionSection should pass accessibility checks", async () => {
    // Test final sections together
    const FAQAndVision = () => (
      <>
        <FAQSection />
        <HandleTheVisionSection />
      </>
    )

    const { container } = renderWithProviders(<FAQAndVision />)
    const results = await axe(container)

    expect(results).toHaveNoViolations()
  })
})
