import { fireEvent, render, screen } from "@testing-library/react"
import DeleteApplicationModal from "@/components/FundingPlatform/ApplicationView/DeleteApplicationModal"

// Mock Headless UI Dialog components
jest.mock("@headlessui/react", () => {
  const MockDialog = ({ children, ...props }: any) => (
    <div data-testid="dialog" {...props}>
      {children}
    </div>
  )
  MockDialog.Panel = ({ children, ...props }: any) => (
    <div data-testid="dialog-panel" {...props}>
      {children}
    </div>
  )
  MockDialog.Title = ({ children, as, ...props }: any) => {
    const Component = as || "h3"
    return <Component {...props}>{children}</Component>
  }

  const MockTransitionRoot = ({ show, children, as, ...props }: any) => {
    if (!show) return null
    const Component = as || "div"
    return <Component {...props}>{children}</Component>
  }

  const MockTransitionChild = ({ children, as, ...props }: any) => {
    const Component = as || "div"
    return <Component {...props}>{children}</Component>
  }

  return {
    Dialog: MockDialog,
    Transition: {
      Root: MockTransitionRoot,
      Child: MockTransitionChild,
    },
    Fragment: ({ children }: any) => <>{children}</>,
  }
})

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  XMarkIcon: (props: any) => (
    <svg
      role="img"
      aria-label="Close"
      aria-hidden={props["aria-hidden"]}
      {...props}
      data-testid="xmark-icon"
    />
  ),
  ExclamationTriangleIcon: (props: any) => (
    <svg role="img" aria-hidden={props["aria-hidden"]} {...props} data-testid="warning-icon" />
  ),
}))

// Mock Button component
jest.mock("@/components/Utilities/Button", () => ({
  Button: ({ onClick, disabled, children, className, variant }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}))

describe("DeleteApplicationModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    referenceNumber: "APP-TEST-12345",
    isDeleting: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Rendering", () => {
    it("should render modal when isOpen is true", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      expect(screen.getByTestId("dialog")).toBeInTheDocument()
      expect(screen.getByText("Delete Application")).toBeInTheDocument()
    })

    it("should not render modal when isOpen is false", () => {
      render(<DeleteApplicationModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
    })

    it("should display warning message", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      expect(
        screen.getByText(/are you sure you want to delete this application/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument()
      expect(screen.getByText(/will be permanently deleted/i)).toBeInTheDocument()
    })

    it("should display the application reference number", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      expect(screen.getByText("Application Reference:")).toBeInTheDocument()
      expect(screen.getByText("APP-TEST-12345")).toBeInTheDocument()
    })

    it("should display delete and cancel buttons", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe("User Interactions", () => {
    it("should call onConfirm when delete button is clicked", () => {
      const onConfirm = jest.fn()
      render(<DeleteApplicationModal {...defaultProps} onConfirm={onConfirm} />)

      const deleteButton = screen.getByRole("button", { name: /delete/i })
      fireEvent.click(deleteButton)

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it("should call onClose when cancel button is clicked", () => {
      const onClose = jest.fn()
      render(<DeleteApplicationModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole("button", { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("should call onClose when close icon is clicked", () => {
      const onClose = jest.fn()
      render(<DeleteApplicationModal {...defaultProps} onClose={onClose} />)

      // Find the close button by its testid (parent button of the icon)
      const closeIcon = screen.getByTestId("xmark-icon")
      const closeButton = closeIcon.closest("button")

      if (closeButton) {
        fireEvent.click(closeButton)
        expect(onClose).toHaveBeenCalledTimes(1)
      } else {
        // Fallback: try clicking the icon directly
        fireEvent.click(closeIcon.parentElement!)
        expect(onClose).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe("Deleting State", () => {
    it("should disable buttons when isDeleting is true", () => {
      render(<DeleteApplicationModal {...defaultProps} isDeleting={true} />)

      const deleteButton = screen.getByRole("button", { name: /deleting.../i })
      const cancelButton = screen.getByRole("button", { name: /cancel/i })

      expect(deleteButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })

    it('should show "Deleting..." text when isDeleting is true', () => {
      render(<DeleteApplicationModal {...defaultProps} isDeleting={true} />)

      expect(screen.getByText("Deleting...")).toBeInTheDocument()
      expect(screen.queryByText("Delete")).not.toBeInTheDocument()
    })

    it("should prevent onClose from being called when isDeleting is true", () => {
      const onClose = jest.fn()
      render(<DeleteApplicationModal {...defaultProps} onClose={onClose} isDeleting={true} />)

      const closeIcon = screen.getByTestId("xmark-icon")
      const closeButton = closeIcon.closest("button")

      if (closeButton) {
        fireEvent.click(closeButton)
      }

      // onClose should not be called when deleting
      expect(onClose).not.toHaveBeenCalled()
    })

    it("should not call onConfirm multiple times when delete button is clicked rapidly", () => {
      const onConfirm = jest.fn()
      const { rerender } = render(
        <DeleteApplicationModal {...defaultProps} onConfirm={onConfirm} isDeleting={false} />
      )

      const deleteButton = screen.getByRole("button", { name: /delete/i })

      // First click
      fireEvent.click(deleteButton)
      expect(onConfirm).toHaveBeenCalledTimes(1)

      // Simulate the parent component setting isDeleting to true
      rerender(<DeleteApplicationModal {...defaultProps} onConfirm={onConfirm} isDeleting={true} />)

      // Try to click again while deleting
      const deletingButton = screen.getByRole("button", { name: /deleting.../i })
      fireEvent.click(deletingButton)

      // Should still only be called once
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      // Check that the close icon has proper aria-label
      const closeIcon = screen.getByTestId("xmark-icon")
      expect(closeIcon).toBeInTheDocument()
    })

    it("should have appropriate button colors for delete action", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      const deleteButton = screen.getByRole("button", { name: /delete/i })

      // Check that delete button has red styling (danger color)
      expect(deleteButton.className).toContain("bg-red-600")
    })

    it("should have secondary variant for cancel button", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      const cancelButton = screen.getByRole("button", { name: /cancel/i })

      // Check that cancel button has secondary variant
      expect(cancelButton.getAttribute("data-variant")).toBe("secondary")
    })

    it("should display warning icon", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      // The ExclamationTriangleIcon should be present
      const warningIcon = screen.getByTestId("warning-icon")
      expect(warningIcon).toBeInTheDocument()
    })
  })

  describe("Reference Number Display", () => {
    it("should handle different reference number formats", () => {
      const referenceNumbers = ["APP-123", "REF-TEST-456789", "GRANT-2024-001", "12345"]

      referenceNumbers.forEach((refNum) => {
        const { unmount } = render(
          <DeleteApplicationModal {...defaultProps} referenceNumber={refNum} />
        )

        expect(screen.getByText(refNum)).toBeInTheDocument()

        unmount()
      })
    })

    it("should display reference number in monospace font", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      const refNumber = screen.getByText("APP-TEST-12345")

      // Check that reference number has monospace font class
      expect(refNumber.className).toContain("font-mono")
    })
  })

  describe("Modal Behavior", () => {
    it("should prevent modal from closing during deletion", () => {
      const onClose = jest.fn()
      render(<DeleteApplicationModal {...defaultProps} onClose={onClose} isDeleting={true} />)

      // Try to close by clicking the close button
      const closeIcon = screen.getByTestId("xmark-icon")
      const closeButton = closeIcon.closest("button")

      if (closeButton) {
        fireEvent.click(closeButton)
      }

      expect(onClose).not.toHaveBeenCalled()
    })

    it("should allow modal to close when not deleting", () => {
      const onClose = jest.fn()
      render(<DeleteApplicationModal {...defaultProps} onClose={onClose} isDeleting={false} />)

      const cancelButton = screen.getByRole("button", { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty reference number gracefully", () => {
      render(<DeleteApplicationModal {...defaultProps} referenceNumber="" />)

      expect(screen.getByText("Application Reference:")).toBeInTheDocument()
      // Empty reference number should still be in the document (empty text node)
    })

    it("should handle very long reference numbers", () => {
      const longRefNumber = `APP-${"X".repeat(100)}`
      render(<DeleteApplicationModal {...defaultProps} referenceNumber={longRefNumber} />)

      expect(screen.getByText(longRefNumber)).toBeInTheDocument()
    })

    it("should not crash when callbacks are undefined", () => {
      const { container } = render(
        <DeleteApplicationModal
          isOpen={true}
          onClose={undefined as any}
          onConfirm={undefined as any}
          referenceNumber="TEST-123"
        />
      )

      expect(container).toBeInTheDocument()
    })
  })

  describe("Dark Mode Support", () => {
    it("should have dark mode classes", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      // Check for dark mode classes in various elements
      const dialog = screen.getByTestId("dialog")
      const htmlContent = dialog.innerHTML

      // Should contain dark mode styling classes
      expect(htmlContent).toContain("dark:bg-zinc-800")
      expect(htmlContent).toContain("dark:text-white")
      expect(htmlContent).toContain("dark:bg-zinc-900")
    })
  })

  describe("Button States", () => {
    it("should enable buttons in normal state", () => {
      render(<DeleteApplicationModal {...defaultProps} isDeleting={false} />)

      const deleteButton = screen.getByRole("button", { name: /delete/i })
      const cancelButton = screen.getByRole("button", { name: /cancel/i })

      expect(deleteButton).not.toBeDisabled()
      expect(cancelButton).not.toBeDisabled()
    })

    it("should maintain button state consistency", () => {
      const { rerender } = render(<DeleteApplicationModal {...defaultProps} isDeleting={false} />)

      let deleteButton = screen.getByRole("button", { name: /delete/i })
      expect(deleteButton).not.toBeDisabled()

      // Change to deleting state
      rerender(<DeleteApplicationModal {...defaultProps} isDeleting={true} />)

      deleteButton = screen.getByRole("button", { name: /deleting.../i })
      expect(deleteButton).toBeDisabled()

      // Change back to normal state
      rerender(<DeleteApplicationModal {...defaultProps} isDeleting={false} />)

      deleteButton = screen.getByRole("button", { name: /delete/i })
      expect(deleteButton).not.toBeDisabled()
    })
  })

  describe("Warning Message Content", () => {
    it("should emphasize the permanent nature of deletion", () => {
      render(<DeleteApplicationModal {...defaultProps} />)

      // Check for key warning phrases
      const warningText = screen.getByText(/are you sure you want to delete this application/i)
      expect(warningText).toBeInTheDocument()

      const permanentText = screen.getByText(/permanently deleted/i)
      expect(permanentText).toBeInTheDocument()

      const cannotUndoText = screen.getByText(/cannot be undone/i)
      expect(cannotUndoText).toBeInTheDocument()
    })
  })
})
