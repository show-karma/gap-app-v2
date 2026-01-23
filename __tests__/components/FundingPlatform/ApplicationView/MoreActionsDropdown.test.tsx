import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import MoreActionsDropdown from "@/components/FundingPlatform/ApplicationView/MoreActionsDropdown";

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  EllipsisHorizontalIcon: (props: any) => <svg data-testid="ellipsis-icon" {...props} />,
  LinkIcon: (props: any) => <svg data-testid="link-icon" {...props} />,
  PencilSquareIcon: (props: any) => <svg data-testid="pencil-icon" {...props} />,
  TrashIcon: (props: any) => <svg data-testid="trash-icon" {...props} />,
}));

// Mock clipboard API - store reference to mock for assertions
const mockWriteText = jest.fn();

// Mock ResizeObserver for Radix UI
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// Setup clipboard and pointer events before all tests
beforeAll(() => {
  // Mock PointerEvent for Radix UI
  Object.defineProperty(window, "PointerEvent", {
    writable: true,
    value: class PointerEvent extends MouseEvent {
      constructor(type: string, props: PointerEventInit) {
        super(type, props);
      }
    },
  });

  // Setup clipboard mock
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: mockWriteText,
      readText: jest.fn(),
    },
    writable: true,
    configurable: true,
  });
});

describe("MoreActionsDropdown", () => {
  const defaultProps = {
    referenceNumber: "APP-TEST-12345",
    onDeleteClick: jest.fn(),
    canDelete: true,
    isDeleting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  describe("Rendering", () => {
    it("should render the menu trigger button", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const button = screen.getByRole("button", { name: /more actions/i });
      expect(button).toBeInTheDocument();
    });

    it("should render the ellipsis icon", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      expect(screen.getByTestId("ellipsis-icon")).toBeInTheDocument();
    });

    it("should have aria-label for accessibility", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const button = screen.getByRole("button", { name: /more actions/i });
      expect(button).toHaveAttribute("aria-label", "More actions");
    });
  });

  describe("Menu Content", () => {
    it("should show menu items when clicked", async () => {
      const user = userEvent.setup();
      render(<MoreActionsDropdown {...defaultProps} />);

      const button = screen.getByRole("button", { name: /more actions/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Copy Link")).toBeInTheDocument();
      });
    });

    it("should render Delete Application option when canDelete is true", async () => {
      const user = userEvent.setup();
      render(<MoreActionsDropdown {...defaultProps} canDelete={true} />);

      await user.click(screen.getByRole("button", { name: /more actions/i }));

      await waitFor(() => {
        expect(screen.getByText("Delete Application")).toBeInTheDocument();
      });
    });

    it("should not render Delete Application option when canDelete is false", async () => {
      const user = userEvent.setup();
      render(<MoreActionsDropdown {...defaultProps} canDelete={false} />);

      await user.click(screen.getByRole("button", { name: /more actions/i }));

      await waitFor(() => {
        expect(screen.getByText("Copy Link")).toBeInTheDocument();
      });

      expect(screen.queryByText("Delete Application")).not.toBeInTheDocument();
    });

    it("should render Edit Application option when canEdit is true", async () => {
      const user = userEvent.setup();
      const onEditClick = jest.fn();
      render(<MoreActionsDropdown {...defaultProps} canEdit={true} onEditClick={onEditClick} />);

      await user.click(screen.getByRole("button", { name: /more actions/i }));

      await waitFor(() => {
        expect(screen.getByText("Edit Application")).toBeInTheDocument();
      });
    });

    it("should not render Edit Application option when canEdit is false", async () => {
      const user = userEvent.setup();
      render(<MoreActionsDropdown {...defaultProps} canEdit={false} />);

      await user.click(screen.getByRole("button", { name: /more actions/i }));

      await waitFor(() => {
        expect(screen.getByText("Copy Link")).toBeInTheDocument();
      });

      expect(screen.queryByText("Edit Application")).not.toBeInTheDocument();
    });
  });

  describe("Delete Option", () => {
    it("should call onDeleteClick when Delete Application is clicked", async () => {
      const user = userEvent.setup();
      const onDeleteClick = jest.fn();
      render(<MoreActionsDropdown {...defaultProps} onDeleteClick={onDeleteClick} />);

      await user.click(screen.getByRole("button", { name: /more actions/i }));

      await waitFor(() => {
        expect(screen.getByText("Delete Application")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Delete Application"));

      expect(onDeleteClick).toHaveBeenCalledTimes(1);
    });

    it("should show Deleting... text when isDeleting is true", async () => {
      const user = userEvent.setup();
      render(<MoreActionsDropdown {...defaultProps} isDeleting={true} />);

      await user.click(screen.getByRole("button", { name: /more actions/i }));

      await waitFor(() => {
        expect(screen.getByText("Deleting...")).toBeInTheDocument();
      });

      expect(screen.queryByText("Delete Application")).not.toBeInTheDocument();
    });

    it("should have red text styling for delete option", async () => {
      const user = userEvent.setup();
      render(<MoreActionsDropdown {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /more actions/i }));

      await waitFor(() => {
        expect(screen.getByText("Delete Application")).toBeInTheDocument();
      });

      const deleteItem = screen.getByText("Delete Application").closest('[role="menuitem"]');
      expect(deleteItem?.className).toContain("text-red");
    });
  });

  describe("Copy Link", () => {
    it("should show success toast when link is copied", async () => {
      const user = userEvent.setup();
      render(<MoreActionsDropdown {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /more actions/i }));

      await waitFor(() => {
        expect(screen.getByText("Copy Link")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Copy Link"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Link copied to clipboard");
      });
    });

    it("should show error toast when clipboard fails", async () => {
      // Temporarily replace navigator.clipboard.writeText to simulate failure
      const originalWriteText = navigator.clipboard.writeText;
      const failingWriteText = jest.fn().mockRejectedValue(new Error("Clipboard error"));
      Object.defineProperty(navigator.clipboard, "writeText", {
        value: failingWriteText,
        writable: true,
        configurable: true,
      });

      const user = userEvent.setup();
      render(<MoreActionsDropdown {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /more actions/i }));

      await waitFor(() => {
        expect(screen.getByText("Copy Link")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Copy Link"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to copy link");
      });

      // Restore original
      Object.defineProperty(navigator.clipboard, "writeText", {
        value: originalWriteText,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("Styling", () => {
    it("should have hover styling classes on trigger button", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const button = screen.getByRole("button", { name: /more actions/i });
      expect(button.className).toContain("hover:bg-gray-200");
    });

    it("should have dark mode classes on trigger button", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const button = screen.getByRole("button", { name: /more actions/i });
      expect(button.className).toContain("dark:bg-zinc-700");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty reference number", () => {
      render(<MoreActionsDropdown {...defaultProps} referenceNumber="" />);

      expect(screen.getByRole("button", { name: /more actions/i })).toBeInTheDocument();
    });

    it("should call onEditClick when Edit Application is clicked", async () => {
      const user = userEvent.setup();
      const onEditClick = jest.fn();
      render(<MoreActionsDropdown {...defaultProps} canEdit={true} onEditClick={onEditClick} />);

      await user.click(screen.getByRole("button", { name: /more actions/i }));

      await waitFor(() => {
        expect(screen.getByText("Edit Application")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Edit Application"));

      expect(onEditClick).toHaveBeenCalledTimes(1);
    });
  });
});
