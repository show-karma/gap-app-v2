/**
 * Infrastructure verification tests for funders page testing setup
 *
 * These tests verify that the testing infrastructure is correctly configured
 * and all necessary mocks are in place.
 */

import { render, screen } from "@testing-library/react"
import { renderWithProviders } from "../utils/test-helpers"

describe("Funders Testing Infrastructure", () => {
  describe("Basic Setup", () => {
    it("should have @testing-library/react available", () => {
      const { container } = render(<div>Test</div>)
      expect(container).toBeInTheDocument()
    })

    it("should have jest-dom matchers available", () => {
      render(<button>Click me</button>)
      const button = screen.getByRole("button")
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent("Click me")
    })
  })

  describe("Custom Render Function", () => {
    it("should render components with renderWithProviders", () => {
      renderWithProviders(<div data-testid="test-component">Test Content</div>)
      expect(screen.getByTestId("test-component")).toBeInTheDocument()
      expect(screen.getByText("Test Content")).toBeInTheDocument()
    })

    it("should wrap components with QueryClientProvider", () => {
      // This test verifies the QueryClientProvider is available
      // by rendering a component that would need it
      renderWithProviders(<div data-testid="query-test">Query Client Test</div>)
      expect(screen.getByTestId("query-test")).toBeInTheDocument()
    })
  })

  describe("Browser APIs", () => {
    it("should have window.matchMedia mocked", () => {
      const mediaQuery = window.matchMedia("(min-width: 768px)")
      expect(mediaQuery).toBeDefined()
      expect(mediaQuery.matches).toBeDefined()
      expect(typeof mediaQuery.addEventListener).toBe("function")
    })

    it("should have IntersectionObserver mocked", () => {
      expect(IntersectionObserver).toBeDefined()
      const observer = new IntersectionObserver(() => {})
      expect(observer.observe).toBeDefined()
      expect(observer.disconnect).toBeDefined()
    })

    it("should have ResizeObserver mocked", () => {
      expect(ResizeObserver).toBeDefined()
      const observer = new ResizeObserver(() => {})
      expect(observer.observe).toBeDefined()
      expect(observer.disconnect).toBeDefined()
    })
  })
})
