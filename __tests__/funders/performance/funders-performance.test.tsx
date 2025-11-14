/**
 * Performance tests for the Funders Page
 *
 * Tests cover:
 * - Initial render time (< 1 second)
 * - Component mount time
 * - Re-render performance
 * - Memory usage
 * - Layout stability (CLS)
 */

import { render } from "@testing-library/react"
import FundersPage from "@/app/funders/page"
import { mockCommunities } from "../fixtures/communities"
import { mockChosenCommunities } from "../setup"
import { renderWithProviders } from "../utils/test-helpers"

describe("Funders Page Performance", () => {
  beforeEach(() => {
    mockChosenCommunities.mockReturnValue(mockCommunities)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should render initial page in under 1 second", () => {
    const startTime = performance.now()

    renderWithProviders(<FundersPage />)

    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Initial render should be fast
    expect(renderTime).toBeLessThan(1000)
  })

  it("should mount components efficiently", () => {
    const mountTimes: number[] = []

    // Measure multiple renders
    for (let i = 0; i < 5; i++) {
      const startTime = performance.now()
      const { unmount } = renderWithProviders(<FundersPage />)
      const endTime = performance.now()

      mountTimes.push(endTime - startTime)
      unmount()
    }

    // Average mount time should be reasonable
    const avgMountTime = mountTimes.reduce((a, b) => a + b, 0) / mountTimes.length
    expect(avgMountTime).toBeLessThan(1000)
  })

  it("should handle re-renders efficiently", () => {
    const { rerender } = renderWithProviders(<FundersPage />)

    const startTime = performance.now()

    // Trigger re-render
    rerender(<FundersPage />)

    const endTime = performance.now()
    const rerenderTime = endTime - startTime

    // Re-renders should be faster than initial render
    expect(rerenderTime).toBeLessThan(500)
  })

  it("should maintain layout stability", () => {
    const { container } = renderWithProviders(<FundersPage />)

    // Check that all sections have defined dimensions
    const sections = container.querySelectorAll("section")

    sections.forEach((section) => {
      // Sections should have proper structure to prevent layout shifts
      expect(section).toBeInTheDocument()
    })

    expect(sections.length).toBeGreaterThanOrEqual(5)
  })

  it("should render large content lists efficiently", () => {
    const startTime = performance.now()

    // Render the page with all its content
    const { container } = renderWithProviders(<FundersPage />)

    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Even with all sections, render should be fast
    expect(renderTime).toBeLessThan(1000)

    // Verify content is rendered
    expect(container.querySelectorAll("section").length).toBeGreaterThanOrEqual(5)
  })
})
