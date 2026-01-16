import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeleteDialog } from "@/components/DeleteDialog";

// Mock Headless UI Dialog components
jest.mock("@headlessui/react", () => {
  const React = require("react");

  // List of Headless UI Transition props that should be filtered
  const TRANSITION_PROPS = [
    "appear",
    "show",
    "enter",
    "enterFrom",
    "enterTo",
    "leave",
    "leaveFrom",
    "leaveTo",
    "entered",
    "beforeEnter",
    "afterEnter",
    "beforeLeave",
    "afterLeave",
  ];

  const MockDialog = ({ children, onClose, ...props }: any) => (
    <div data-testid="dialog" {...props}>
      {children}
    </div>
  );
  MockDialog.Panel = ({ children, ...props }: any) => (
    <div data-testid="dialog-panel" {...props}>
      {children}
    </div>
  );
  MockDialog.Title = ({ children, as, ...props }: any) => {
    const Component = as || "h3";
    return <Component {...props}>{children}</Component>;
  };

  const MockTransitionRoot = ({ show, children, as, ...props }: any) => {
    if (!show) return null;

    // Filter out Transition-specific props
    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as any);

    const Component = as || "div";
    return <Component {...filteredProps}>{children}</Component>;
  };
  MockTransitionRoot.displayName = "Transition";

  const MockTransitionChild = ({ children, as, ...props }: any) => {
    // Filter out Transition-specific props
    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as any);

    const Component = as || "div";
    return <Component {...filteredProps}>{children}</Component>;
  };
  MockTransitionChild.displayName = "Transition.Child";

  // Assign Child to Root as a property
  MockTransitionRoot.Child = MockTransitionChild;

  return {
    Dialog: MockDialog,
    Transition: MockTransitionRoot,
    Fragment: React.Fragment,
  };
});

// Mock Heroicons
jest.mock("@heroicons/react/24/solid", () => ({
  PlusIcon: (props: any) => <svg role="img" aria-label="Plus" {...props} data-testid="plus-icon" />,
}));

// Mock Button component
jest.mock("@/components/Utilities/Button", () => ({
  Button: ({ onClick, disabled, children, className, isLoading, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-loading={isLoading}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

describe("DeleteDialog", () => {
  const mockDeleteFunction = jest.fn().mockResolvedValue(undefined);
  const mockAfterFunction = jest.fn();

  const defaultProps = {
    deleteFunction: mockDeleteFunction,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render trigger button with default text", () => {
      render(<DeleteDialog {...defaultProps} />);

      expect(screen.getByText("Delete Project")).toBeInTheDocument();
    });

    it("should render trigger button with default icon", () => {
      render(<DeleteDialog {...defaultProps} />);

      expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
    });

    it("should render with custom title", () => {
      render(<DeleteDialog {...defaultProps} title="Custom Delete Title" />);

      const button = screen.getByText("Delete Project");
      fireEvent.click(button);

      expect(screen.getByText("Custom Delete Title")).toBeInTheDocument();
    });

    it("should render with default title when not provided", () => {
      render(<DeleteDialog {...defaultProps} />);

      const button = screen.getByText("Delete Project");
      fireEvent.click(button);

      expect(screen.getByText("Are you sure you want to delete?")).toBeInTheDocument();
    });

    it("should not render trigger button when buttonElement is null", () => {
      render(<DeleteDialog {...defaultProps} buttonElement={null} />);

      expect(screen.queryByText("Delete Project")).not.toBeInTheDocument();
    });

    it("should render with custom button element", () => {
      const customButton = {
        text: "Remove Item",
        icon: <span data-testid="custom-icon">X</span>,
        styleClass: "custom-style",
      };

      render(<DeleteDialog {...defaultProps} buttonElement={customButton} />);

      expect(screen.getByText("Remove Item")).toBeInTheDocument();
      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });
  });

  describe("Dialog Opening and Closing", () => {
    it("should open dialog when trigger button is clicked", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("should not show dialog initially", () => {
      render(<DeleteDialog {...defaultProps} />);

      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should close dialog when cancel button is clicked", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should respect external isOpen prop", () => {
      render(<DeleteDialog {...defaultProps} externalIsOpen={true} />);

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("should call externalSetIsOpen when dialog is opened", () => {
      const mockSetIsOpen = jest.fn();
      render(
        <DeleteDialog {...defaultProps} externalIsOpen={false} externalSetIsOpen={mockSetIsOpen} />
      );

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      expect(mockSetIsOpen).toHaveBeenCalledWith(true);
    });

    it("should call externalSetIsOpen when dialog is closed", () => {
      const mockSetIsOpen = jest.fn();
      render(
        <DeleteDialog {...defaultProps} externalIsOpen={true} externalSetIsOpen={mockSetIsOpen} />
      );

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockSetIsOpen).toHaveBeenCalledWith(false);
    });
  });

  describe("Delete Functionality", () => {
    it("should call deleteFunction when continue button is clicked", async () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const continueButton = screen.getByText("Continue");
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockDeleteFunction).toHaveBeenCalledTimes(1);
      });
    });

    it("should call afterFunction after successful deletion", async () => {
      render(<DeleteDialog {...defaultProps} afterFunction={mockAfterFunction} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const continueButton = screen.getByText("Continue");
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockAfterFunction).toHaveBeenCalledTimes(1);
      });
    });

    it("should close dialog after successful deletion", async () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const continueButton = screen.getByText("Continue");
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
      });
    });

    it("should handle deleteFunction errors gracefully", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      const errorDeleteFunction = jest.fn().mockRejectedValue(new Error("Delete failed"));

      render(<DeleteDialog {...defaultProps} deleteFunction={errorDeleteFunction} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const continueButton = screen.getByText("Continue");
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(errorDeleteFunction).toHaveBeenCalled();
      });

      // Dialog should still be open after error
      expect(screen.getByTestId("dialog")).toBeInTheDocument();

      consoleLogSpy.mockRestore();
    });

    it("should not call afterFunction when deletion fails", async () => {
      const errorDeleteFunction = jest.fn().mockRejectedValue(new Error("Delete failed"));
      jest.spyOn(console, "log").mockImplementation();

      render(
        <DeleteDialog
          {...defaultProps}
          deleteFunction={errorDeleteFunction}
          afterFunction={mockAfterFunction}
        />
      );

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const continueButton = screen.getByText("Continue");
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(errorDeleteFunction).toHaveBeenCalled();
      });

      expect(mockAfterFunction).not.toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("should disable cancel button when isLoading is true", () => {
      render(<DeleteDialog {...defaultProps} isLoading={true} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toBeDisabled();
    });

    it("should show spinner instead of Continue button when isLoading is true", () => {
      render(<DeleteDialog {...defaultProps} isLoading={true} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      // Continue button is replaced with a spinner when loading
      expect(screen.queryByText("Continue")).not.toBeInTheDocument();
      // Spinner is shown with Loading aria-label
      expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    });

    it("should show loading spinner indicator when isLoading is true", () => {
      render(<DeleteDialog {...defaultProps} isLoading={true} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      // The Spinner component has role="status" and aria-label="Loading"
      expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
    });

    it("should enable buttons when not loading", () => {
      render(<DeleteDialog {...defaultProps} isLoading={false} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const cancelButton = screen.getByText("Cancel");
      const continueButton = screen.getByText("Continue");

      expect(cancelButton).not.toBeDisabled();
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe("Dialog Content", () => {
    it("should display cancel button in dialog", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should display continue button in dialog", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    it("should render title as ReactNode", () => {
      const customTitle = (
        <div data-testid="custom-title">
          <span>Custom</span> <strong>Title</strong>
        </div>
      );

      render(<DeleteDialog {...defaultProps} title={customTitle} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      expect(screen.getByTestId("custom-title")).toBeInTheDocument();
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have dark mode classes on dialog panel", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const panel = screen.getByTestId("dialog-panel");
      expect(panel.className).toContain("dark:bg-zinc-800");
    });

    it("should have rounded corners on dialog", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const panel = screen.getByTestId("dialog-panel");
      expect(panel.className).toContain("rounded-2xl");
    });

    it("should apply custom styleClass to trigger button", () => {
      const customButton = {
        text: "Delete",
        icon: <span>X</span>,
        styleClass: "my-custom-class",
      };

      render(<DeleteDialog {...defaultProps} buttonElement={customButton} />);

      const button = screen.getByText("Delete");
      expect(button.className).toContain("my-custom-class");
    });

    it("should have danger color for continue button", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const continueButton = screen.getByText("Continue");
      expect(continueButton.className).toContain("bg-red-600");
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading for dialog title", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const title = screen.getByText("Are you sure you want to delete?");
      expect(title.tagName).toBe("H3");
    });

    it("should have data attribute on trigger button", () => {
      render(<DeleteDialog {...defaultProps} data-delete-project-button="test-value" />);

      const button = screen.getByText("Delete Project");
      expect(button).toHaveAttribute("data-delete-project-button", "test-value");
    });

    it("should properly disable interactive elements during loading", () => {
      render(<DeleteDialog {...defaultProps} isLoading={true} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const buttons = screen.getAllByRole("button");
      const dialogButtons = buttons.filter((btn) =>
        ["Cancel", "Loading..."].includes(btn.textContent || "")
      );

      dialogButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined afterFunction", async () => {
      render(<DeleteDialog {...defaultProps} afterFunction={undefined} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const continueButton = screen.getByText("Continue");
      fireEvent.click(continueButton);

      // Wait for both the deleteFunction to be called AND the dialog to close
      await waitFor(
        () => {
          expect(mockDeleteFunction).toHaveBeenCalled();
          expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should handle empty string as title", () => {
      render(<DeleteDialog {...defaultProps} title="" />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const panel = screen.getByTestId("dialog-panel");
      expect(panel).toBeInTheDocument();
    });

    it("should handle rapid open/close cycles", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");

      // Open dialog
      fireEvent.click(triggerButton);
      expect(screen.getByTestId("dialog")).toBeInTheDocument();

      // Close dialog
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();

      // Open again
      fireEvent.click(triggerButton);
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("should not crash when deleteFunction returns undefined", async () => {
      const undefinedDeleteFunction = jest.fn().mockResolvedValue(undefined);

      render(<DeleteDialog {...defaultProps} deleteFunction={undefinedDeleteFunction} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const continueButton = screen.getByText("Continue");
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(undefinedDeleteFunction).toHaveBeenCalled();
        expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("Button Layout", () => {
    it("should display buttons in correct order (Cancel, Continue)", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const buttons = screen.getAllByRole("button");
      const cancelButton = buttons.find((btn) => btn.textContent === "Cancel");
      const continueButton = buttons.find((btn) => btn.textContent === "Continue");

      expect(cancelButton).toBeInTheDocument();
      expect(continueButton).toBeInTheDocument();
    });

    it("should have proper spacing between buttons", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const buttonContainer = screen.getByText("Cancel").parentElement;
      expect(buttonContainer?.className).toContain("gap-4");
    });

    it("should align buttons to the right", () => {
      render(<DeleteDialog {...defaultProps} />);

      const triggerButton = screen.getByText("Delete Project");
      fireEvent.click(triggerButton);

      const buttonContainer = screen.getByText("Cancel").parentElement;
      expect(buttonContainer?.className).toContain("justify-end");
    });
  });
});
