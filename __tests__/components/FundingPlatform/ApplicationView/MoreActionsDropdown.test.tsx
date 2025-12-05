import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import MoreActionsDropdown from "@/components/FundingPlatform/ApplicationView/MoreActionsDropdown";

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock Headless UI
jest.mock("@headlessui/react", () => {
  const MockMenu = ({ children, as, ...props }: any) => {
    const Component = as || "div";
    return (
      <Component data-testid="menu" {...props}>
        {children}
      </Component>
    );
  };

  MockMenu.Button = ({ children, className, ...props }: any) => (
    <button data-testid="menu-button" className={className} {...props}>
      {children}
    </button>
  );

  MockMenu.Items = ({ children, className, ...props }: any) => (
    <div data-testid="menu-items" className={className} {...props}>
      {children}
    </div>
  );

  MockMenu.Item = ({ children }: any) => {
    // Call children with active: false to simulate the render prop
    return <>{typeof children === "function" ? children({ active: false }) : children}</>;
  };

  const MockTransition = ({ children, as, ...props }: any) => {
    const Component = as || "div";
    return <Component {...props}>{children}</Component>;
  };

  return {
    Menu: MockMenu,
    Transition: MockTransition,
    Fragment: ({ children }: any) => <>{children}</>,
  };
});

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  EllipsisHorizontalIcon: (props: any) => <svg data-testid="ellipsis-icon" {...props} />,
  LinkIcon: (props: any) => <svg data-testid="link-icon" {...props} />,
  TrashIcon: (props: any) => <svg data-testid="trash-icon" {...props} />,
}));

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn(),
};
Object.assign(navigator, {
  clipboard: mockClipboard,
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
    mockClipboard.writeText.mockResolvedValue(undefined);
  });

  describe("Rendering", () => {
    it("should render the menu button", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      expect(screen.getByTestId("menu-button")).toBeInTheDocument();
    });

    it("should render the ellipsis icon", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      expect(screen.getByTestId("ellipsis-icon")).toBeInTheDocument();
    });

    it("should have aria-label for accessibility", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      expect(screen.getByTestId("menu-button")).toHaveAttribute("aria-label", "More actions");
    });

    it("should render Copy Link option", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      expect(screen.getByText("Copy Link")).toBeInTheDocument();
      expect(screen.getByTestId("link-icon")).toBeInTheDocument();
    });
  });

  describe("Delete Option", () => {
    it("should render Delete Application option when canDelete is true", () => {
      render(<MoreActionsDropdown {...defaultProps} canDelete={true} />);

      expect(screen.getByText("Delete Application")).toBeInTheDocument();
      expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
    });

    it("should not render Delete Application option when canDelete is false", () => {
      render(<MoreActionsDropdown {...defaultProps} canDelete={false} />);

      expect(screen.queryByText("Delete Application")).not.toBeInTheDocument();
    });

    it("should call onDeleteClick when Delete Application is clicked", () => {
      const onDeleteClick = jest.fn();
      render(<MoreActionsDropdown {...defaultProps} onDeleteClick={onDeleteClick} />);

      fireEvent.click(screen.getByText("Delete Application"));

      expect(onDeleteClick).toHaveBeenCalledTimes(1);
    });

    it("should show Deleting... text when isDeleting is true", () => {
      render(<MoreActionsDropdown {...defaultProps} isDeleting={true} />);

      expect(screen.getByText("Deleting...")).toBeInTheDocument();
      expect(screen.queryByText("Delete Application")).not.toBeInTheDocument();
    });

    it("should disable delete button when isDeleting is true", () => {
      render(<MoreActionsDropdown {...defaultProps} isDeleting={true} />);

      const deleteButton = screen.getByText("Deleting...").closest("button");
      expect(deleteButton).toBeDisabled();
    });

    it("should have red text styling for delete option", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const deleteButton = screen.getByText("Delete Application").closest("button");
      expect(deleteButton?.className).toContain("text-red");
    });
  });

  describe("Copy Link", () => {
    it("should copy current URL to clipboard when Copy Link is clicked", async () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      fireEvent.click(screen.getByText("Copy Link"));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href);
      });
    });

    it("should show success toast when link is copied", async () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      fireEvent.click(screen.getByText("Copy Link"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Link copied to clipboard");
      });
    });

    it("should show error toast when clipboard fails", async () => {
      mockClipboard.writeText.mockRejectedValue(new Error("Clipboard error"));
      render(<MoreActionsDropdown {...defaultProps} />);

      fireEvent.click(screen.getByText("Copy Link"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to copy link");
      });
    });
  });

  describe("Separator", () => {
    it("should render separator before delete option when canDelete is true", () => {
      const { container } = render(<MoreActionsDropdown {...defaultProps} canDelete={true} />);

      const separator = container.querySelector(".border-t");
      expect(separator).toBeInTheDocument();
    });

    it("should not render separator when canDelete is false", () => {
      const { container } = render(<MoreActionsDropdown {...defaultProps} canDelete={false} />);

      const separator = container.querySelector(".border-t");
      expect(separator).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have hover styling classes", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const menuButton = screen.getByTestId("menu-button");
      expect(menuButton.className).toContain("hover:bg-gray-200");
    });

    it("should have dark mode classes", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const menuButton = screen.getByTestId("menu-button");
      expect(menuButton.className).toContain("dark:bg-zinc-700");
    });

    it("should have focus-visible ring classes", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const menuButton = screen.getByTestId("menu-button");
      expect(menuButton.className).toContain("focus-visible:ring-2");
    });
  });

  describe("Menu Items Container", () => {
    it("should have proper positioning classes", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const menuItems = screen.getByTestId("menu-items");
      expect(menuItems.className).toContain("absolute");
      expect(menuItems.className).toContain("right-0");
    });

    it("should have shadow and border classes", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const menuItems = screen.getByTestId("menu-items");
      expect(menuItems.className).toContain("shadow-lg");
      expect(menuItems.className).toContain("ring-1");
    });

    it("should have z-index for proper layering", () => {
      render(<MoreActionsDropdown {...defaultProps} />);

      const menuItems = screen.getByTestId("menu-items");
      expect(menuItems.className).toContain("z-50");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty reference number", () => {
      render(<MoreActionsDropdown {...defaultProps} referenceNumber="" />);

      expect(screen.getByTestId("menu-button")).toBeInTheDocument();
    });

    it("should not call onDeleteClick when delete button is disabled", () => {
      const onDeleteClick = jest.fn();
      render(
        <MoreActionsDropdown {...defaultProps} onDeleteClick={onDeleteClick} isDeleting={true} />
      );

      const deleteButton = screen.getByText("Deleting...").closest("button");
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      // Should not be called because button is disabled
      expect(onDeleteClick).not.toHaveBeenCalled();
    });
  });
});
