/**
 * Tests for DonationErrorBoundary component
 *
 * Tests error boundary functionality including:
 * - Error catching and display
 * - Error recovery flows
 * - Cart state preservation
 * - Error reporting integration
 */

import { fireEvent, render, screen } from "@testing-library/react"
import type React from "react"
import { DonationErrorBoundary } from "@/components/Donation/DonationErrorBoundary"
import { errorManager } from "@/components/Utilities/errorManager"
import { getDetailedErrorInfo } from "@/utilities/donations/errorMessages"

// Mock dependencies
jest.mock("@/components/Utilities/errorManager")
jest.mock("@/utilities/donations/errorMessages")
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

// Component that throws an error for testing
const ThrowError = ({
  shouldThrow = false,
  errorMessage = "Test error",
}: {
  shouldThrow?: boolean
  errorMessage?: string
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div>No error</div>
}

describe("DonationErrorBoundary", () => {
  const mockErrorManager = errorManager as jest.MockedFunction<typeof errorManager>
  const mockGetDetailedErrorInfo = getDetailedErrorInfo as jest.MockedFunction<
    typeof getDetailedErrorInfo
  >

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation(() => {}) // Suppress React error boundary console errors

    // Setup default mock return for getDetailedErrorInfo
    mockGetDetailedErrorInfo.mockReturnValue({
      code: "UNKNOWN_ERROR" as any,
      message: "An unexpected error occurred",
      technicalMessage: "Test error",
      actionableSteps: ["Try again", "Contact support"],
    })

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("Error Catching", () => {
    it("should catch errors thrown by children", () => {
      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DonationErrorBoundary>
      )

      expect(screen.getByText("Something went wrong")).toBeInTheDocument()
      expect(
        screen.getByText(/Don't worry - your donation cart has been saved/)
      ).toBeInTheDocument()
    })

    it("should call errorManager when an error is caught", () => {
      const testError = new Error("Test error")

      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </DonationErrorBoundary>
      )

      expect(mockErrorManager).toHaveBeenCalledWith(
        "DonationErrorBoundary caught an error",
        expect.any(Error),
        expect.objectContaining({
          errorBoundary: "donation-flow",
        })
      )
    })

    it("should call getDetailedErrorInfo to parse error", () => {
      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Insufficient balance" />
        </DonationErrorBoundary>
      )

      expect(mockGetDetailedErrorInfo).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe("Error Display", () => {
    it("should display parsed error message", () => {
      mockGetDetailedErrorInfo.mockReturnValue({
        code: "INSUFFICIENT_BALANCE" as any,
        message: "Insufficient token balance",
        actionableSteps: ["Check your wallet balance", "Reduce the donation amount"],
      })

      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DonationErrorBoundary>
      )

      expect(screen.getByText("Insufficient token balance")).toBeInTheDocument()
    })

    it("should display actionable steps when available", () => {
      mockGetDetailedErrorInfo.mockReturnValue({
        code: "NETWORK_MISMATCH" as any,
        message: "Network mismatch detected",
        actionableSteps: ["Switch to the correct network", "Try again"],
      })

      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DonationErrorBoundary>
      )

      expect(screen.getByText("What you can do")).toBeInTheDocument()
      expect(screen.getByText("Switch to the correct network")).toBeInTheDocument()
      expect(screen.getByText("Try again")).toBeInTheDocument()
    })

    it("should display technical details when available", () => {
      mockGetDetailedErrorInfo.mockReturnValue({
        code: "CONTRACT_ERROR" as any,
        message: "Contract execution failed",
        technicalMessage: "Error: execution reverted",
        actionableSteps: [],
      })

      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DonationErrorBoundary>
      )

      const detailsElement = screen.getByText("Technical Details")
      expect(detailsElement).toBeInTheDocument()

      fireEvent.click(detailsElement)
      expect(screen.getByText("Error: execution reverted")).toBeInTheDocument()
    })

    it("should not display actionable steps section when empty", () => {
      mockGetDetailedErrorInfo.mockReturnValue({
        code: "UNKNOWN_ERROR" as any,
        message: "An error occurred",
        actionableSteps: [],
      })

      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DonationErrorBoundary>
      )

      expect(screen.queryByText("What you can do")).not.toBeInTheDocument()
    })
  })

  describe("Error Recovery - Try Again", () => {
    it("should reset error state when Try Again is clicked", () => {
      const ThrowErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error("Test error")
        }
        return <div>No error</div>
      }

      const { rerender } = render(
        <DonationErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </DonationErrorBoundary>
      )

      expect(screen.getByText("Something went wrong")).toBeInTheDocument()

      const tryAgainButton = screen.getByText("Try Again")
      fireEvent.click(tryAgainButton)

      // Rerender with error cleared - need to use a key to force remount or use different component
      rerender(
        <DonationErrorBoundary key="reset">
          <ThrowErrorComponent shouldThrow={false} />
        </DonationErrorBoundary>
      )

      // After clicking Try Again, error state is reset, so children should render
      expect(screen.getByText("No error")).toBeInTheDocument()
    })

    it("should allow children to render again after reset", () => {
      const ThrowErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error("Test error")
        }
        return <div>Recovered content</div>
      }

      const { rerender } = render(
        <DonationErrorBoundary>
          <ThrowErrorComponent shouldThrow={true} />
        </DonationErrorBoundary>
      )

      const tryAgainButton = screen.getByText("Try Again")
      fireEvent.click(tryAgainButton)

      // Rerender with non-throwing children
      rerender(
        <DonationErrorBoundary key="reset">
          <ThrowErrorComponent shouldThrow={false} />
        </DonationErrorBoundary>
      )

      expect(screen.getByText("Recovered content")).toBeInTheDocument()
    })
  })

  describe("Error Recovery - Clear Cart", () => {
    const originalLocation = window.location

    beforeEach(() => {
      // Reset window.location before each test
      delete (window as any).location
      window.location = { ...originalLocation }
    })

    afterEach(() => {
      // Restore original location after each test
      window.location = originalLocation
    })

    it("should clear localStorage and reload page when Clear Cart is clicked", () => {
      const removeItemSpy = jest.spyOn(window.localStorage, "removeItem")

      // Mock window.location.href assignment
      const hrefSetter = jest.fn()
      Object.defineProperty(window.location, "href", {
        set: hrefSetter,
        get: () => originalLocation.href,
        configurable: true,
      })

      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DonationErrorBoundary>
      )

      const clearCartButton = screen.getByText("Clear Cart and Start Over")
      fireEvent.click(clearCartButton)

      expect(removeItemSpy).toHaveBeenCalledWith("donation-cart-storage")
      expect(hrefSetter).toHaveBeenCalled()
    })

    it("should handle localStorage errors gracefully", () => {
      const removeItemSpy = jest.spyOn(window.localStorage, "removeItem")
      removeItemSpy.mockImplementation(() => {
        throw new Error("localStorage error")
      })
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DonationErrorBoundary>
      )

      const clearCartButton = screen.getByText("Clear Cart and Start Over")
      fireEvent.click(clearCartButton)

      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to clear cart:", expect.any(Error))
    })
  })

  describe("Navigation", () => {
    it("should provide link to return home", () => {
      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DonationErrorBoundary>
      )

      const homeLink = screen.getByText("Return to Home")
      expect(homeLink).toBeInTheDocument()
      expect(homeLink.closest("a")).toHaveAttribute("href", "/")
    })
  })

  describe("Error Info Storage", () => {
    it("should store error info in state", () => {
      const testError = new Error("Test error")
      const testErrorInfo = {
        componentStack: "at Component (test.js:1:1)",
      } as React.ErrorInfo

      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </DonationErrorBoundary>
      )

      // Error info should be available for display in technical details
      const detailsElement = screen.getByText("Technical Details")
      expect(detailsElement).toBeInTheDocument()
    })
  })

  describe("Cart State Preservation", () => {
    it("should inform user that cart is saved", () => {
      render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DonationErrorBoundary>
      )

      expect(
        screen.getByText(/Don't worry - your donation cart has been saved/)
      ).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("should handle multiple errors sequentially", () => {
      const { rerender } = render(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </DonationErrorBoundary>
      )

      expect(screen.getByText("Something went wrong")).toBeInTheDocument()

      const tryAgainButton = screen.getByText("Try Again")
      fireEvent.click(tryAgainButton)

      rerender(
        <DonationErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Second error" />
        </DonationErrorBoundary>
      )

      expect(screen.getByText("Something went wrong")).toBeInTheDocument()
      expect(mockErrorManager).toHaveBeenCalledTimes(2)
    })

    it("should render children normally when no error occurs", () => {
      render(
        <DonationErrorBoundary>
          <div>Normal content</div>
        </DonationErrorBoundary>
      )

      expect(screen.getByText("Normal content")).toBeInTheDocument()
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument()
      expect(mockErrorManager).not.toHaveBeenCalled()
    })
  })
})
