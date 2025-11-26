import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { GrantCompletedButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton/GrantCompletedButton"
import "@testing-library/jest-dom"

// Mock Spinner
jest.mock("@/components/ui/spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className}>
      Loading...
    </div>
  ),
}))

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle-icon" className={className} />
  ),
  XCircleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="x-circle-icon" className={className} />
  ),
}))

describe("GrantCompletedButton", () => {
  const mockOnClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Rendering", () => {
    it("should render button element", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("should show 'Marked as complete' text by default", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      expect(screen.getByText("Marked as complete")).toBeInTheDocument()
    })

    it("should show CheckCircleIcon by default", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument()
    })

    it("should apply correct CSS classes", () => {
      const { container } = render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toHaveClass(
        "group",
        "relative",
        "flex",
        "flex-row",
        "items-center",
        "justify-center",
        "gap-2",
        "rounded-md",
        "border",
        "border-emerald-600",
        "bg-green-100",
        "px-3.5",
        "py-2",
        "text-sm",
        "font-semibold",
        "text-emerald-700"
      )
    })
  })

  describe("Loading State", () => {
    it("should show Spinner when isRevoking is true", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={true}
          isAuthorized={true}
        />
      )

      expect(screen.getByTestId("spinner")).toBeInTheDocument()
    })

    it("should show 'Revoking...' text when loading", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={true}
          isAuthorized={true}
        />
      )

      expect(screen.getByText("Revoking...")).toBeInTheDocument()
    })

    it("should hide default text/icon when loading", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={true}
          isAuthorized={true}
        />
      )

      expect(screen.queryByText("Marked as complete")).not.toBeInTheDocument()
      expect(screen.queryByTestId("check-circle-icon")).not.toBeInTheDocument()
    })

    it("should not show Spinner when isRevoking is false", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument()
    })
  })

  describe("Disabled State", () => {
    it("should disable button when disabled is true", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toBeDisabled()
    })

    it("should not disable button when disabled is false", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      expect(button).not.toBeDisabled()
    })

    it("should apply disabled styling", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toHaveClass("disabled:opacity-50", "disabled:cursor-not-allowed")
    })

    it("should prevent onClick when disabled", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(mockOnClick).not.toHaveBeenCalled()
    })
  })

  describe("Click Handler", () => {
    it("should call onClick when clicked (not disabled)", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it("should not call onClick when disabled", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it("should not call onClick when isRevoking is true", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={true}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      fireEvent.click(button)

      // Button should be disabled when disabled prop is true (parent sets this when isRevoking is true)
      expect(button).toBeDisabled()
      expect(mockOnClick).not.toHaveBeenCalled()
    })
  })

  describe("Hover States", () => {
    it("should show 'Revoke completion' text on hover", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      fireEvent.mouseEnter(button)

      // The hover text should be in the DOM (hidden by default, shown on hover via CSS)
      expect(screen.getByText("Revoke completion")).toBeInTheDocument()
    })

    it("should show XCircleIcon on hover", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      // XCircleIcon should be in the DOM (hidden by default, shown on hover via CSS)
      expect(screen.getByTestId("x-circle-icon")).toBeInTheDocument()
    })

    it("should have hover classes for styling", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toHaveClass("hover:border-red-600", "hover:bg-red-100", "hover:text-red-700")
    })

    it("should hide default text on hover (via CSS classes)", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const defaultText = screen.getByText("Marked as complete")
      expect(defaultText).toHaveClass("group-hover:hidden")
    })

    it("should hide CheckCircleIcon on hover (via CSS classes)", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const checkIcon = screen.getByTestId("check-circle-icon")
      expect(checkIcon).toHaveClass("group-hover:hidden")
    })

    it("should show hover text inline on hover (via CSS classes)", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const hoverText = screen.getByText("Revoke completion")
      expect(hoverText).toHaveClass("hidden", "group-hover:inline")
    })

    it("should show XCircleIcon on hover (via CSS classes)", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const xIcon = screen.getByTestId("x-circle-icon")
      expect(xIcon).toHaveClass("hidden", "group-hover:block")
    })
  })

  describe("Accessibility", () => {
    it("should have aria-label='Revoke grant completion'", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-label", "Revoke grant completion")
    })

    it("should have aria-busy={isRevoking}", () => {
      const { rerender } = render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={true}
          isAuthorized={true}
        />
      )

      let button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-busy", "true")

      rerender(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-busy", "false")
    })

    it("should have aria-disabled={disabled}", () => {
      const { rerender } = render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      let button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-disabled", "true")

      rerender(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-disabled", "false")
    })

    it("should have title attribute when isAuthorized is true", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("title", "Click to revoke grant completion")
    })

    it("should not have title attribute when isAuthorized is false", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={false}
        />
      )

      const button = screen.getByRole("button")
      expect(button).not.toHaveAttribute("title")
    })
  })

  describe("Props Combinations", () => {
    it("should handle all props correctly", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={true}
          isRevoking={true}
          isAuthorized={false}
        />
      )

      const button = screen.getByRole("button")
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute("aria-busy", "true")
      expect(button).toHaveAttribute("aria-disabled", "true")
      expect(button).not.toHaveAttribute("title")
      expect(screen.getByTestId("spinner")).toBeInTheDocument()
    })

    it("should handle authorized and not revoking state", () => {
      render(
        <GrantCompletedButton
          onClick={mockOnClick}
          disabled={false}
          isRevoking={false}
          isAuthorized={true}
        />
      )

      const button = screen.getByRole("button")
      expect(button).not.toBeDisabled()
      expect(button).toHaveAttribute("aria-busy", "false")
      expect(button).toHaveAttribute("title", "Click to revoke grant completion")
      expect(screen.getByText("Marked as complete")).toBeInTheDocument()
    })
  })
})
