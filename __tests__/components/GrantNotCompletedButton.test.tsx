import { fireEvent, render, screen } from "@testing-library/react";
import { GrantNotCompletedButton } from "@/components/Pages/GrantMilestonesAndUpdates/GrantCompleteButton/GrantNotCompletedButton";
import "@testing-library/jest-dom";

// Mock Heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  CheckCircleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle-icon" className={className} />
  ),
}));

// Mock the grant completion store
const mockOpenGrantCompletionDialog = jest.fn();

jest.mock("@/store/modals/grantCompletion", () => ({
  useGrantCompletionStore: jest.fn((selector: any) => {
    const state = {
      openGrantCompletionDialog: mockOpenGrantCompletionDialog,
    };
    return selector(state);
  }),
}));

describe("GrantNotCompletedButton", () => {
  const mockProject = {
    uid: "project-456",
    details: {
      slug: "test-project",
    },
  } as any;

  const mockGrant = {
    uid: "grant-123",
    chainID: 42161,
    details: {
      title: "Test Grant",
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render button component", () => {
      render(<GrantNotCompletedButton project={mockProject} grant={mockGrant} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should show default 'Mark as Complete' text", () => {
      render(<GrantNotCompletedButton project={mockProject} grant={mockGrant} />);

      expect(screen.getByText("Mark as Complete")).toBeInTheDocument();
    });

    it("should show CheckCircleIcon", () => {
      render(<GrantNotCompletedButton project={mockProject} grant={mockGrant} />);

      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
    });

    it("should apply correct CSS classes", () => {
      render(<GrantNotCompletedButton project={mockProject} grant={mockGrant} />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass(
        "hover:opacity-75",
        "flex",
        "flex-row",
        "items-center",
        "justify-center",
        "gap-2",
        "rounded-md",
        "bg-green-600",
        "px-3.5",
        "py-2",
        "text-sm",
        "font-semibold",
        "text-white",
        "hover:bg-green-700"
      );
    });
  });

  describe("Dialog Opening", () => {
    it("should call openGrantCompletionDialog when clicked", () => {
      render(<GrantNotCompletedButton project={mockProject} grant={mockGrant} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockOpenGrantCompletionDialog).toHaveBeenCalledTimes(1);
      expect(mockOpenGrantCompletionDialog).toHaveBeenCalledWith(mockGrant, mockProject);
    });

    it("should pass correct grant and project to dialog", () => {
      const customProject = {
        uid: "custom-project",
        details: {
          slug: "custom-slug",
        },
      } as any;

      const customGrant = {
        uid: "custom-grant",
        chainID: 1,
        details: {
          title: "Custom Grant",
        },
      } as any;

      render(<GrantNotCompletedButton project={customProject} grant={customGrant} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockOpenGrantCompletionDialog).toHaveBeenCalledWith(customGrant, customProject);
    });
  });

  describe("Text Customization", () => {
    it("should use custom text prop when provided", () => {
      const customText = "Complete This Grant";

      render(<GrantNotCompletedButton project={mockProject} grant={mockGrant} text={customText} />);

      expect(screen.getByText(customText)).toBeInTheDocument();
      expect(screen.queryByText("Mark as Complete")).not.toBeInTheDocument();
    });

    it("should use default text when text prop is undefined", () => {
      render(<GrantNotCompletedButton project={mockProject} grant={mockGrant} text={undefined} />);

      expect(screen.getByText("Mark as Complete")).toBeInTheDocument();
    });

    it("should handle empty string text", () => {
      render(<GrantNotCompletedButton project={mockProject} grant={mockGrant} text="" />);

      const button = screen.getByRole("button");
      // Button should only contain the icon when text is empty
      expect(button.textContent).toBe("");
    });

    it("should handle various text values", () => {
      const { rerender } = render(
        <GrantNotCompletedButton project={mockProject} grant={mockGrant} text="First Text" />
      );

      expect(screen.getByText("First Text")).toBeInTheDocument();

      rerender(
        <GrantNotCompletedButton project={mockProject} grant={mockGrant} text="Second Text" />
      );

      expect(screen.getByText("Second Text")).toBeInTheDocument();
      expect(screen.queryByText("First Text")).not.toBeInTheDocument();
    });
  });

  describe("Icon Rendering", () => {
    it("should render CheckCircleIcon with correct className", () => {
      render(<GrantNotCompletedButton project={mockProject} grant={mockGrant} />);

      const icon = screen.getByTestId("check-circle-icon");
      expect(icon).toHaveClass("h-5", "w-5");
    });

    it("should render icon inside a div with h-5 w-5", () => {
      const { container } = render(
        <GrantNotCompletedButton project={mockProject} grant={mockGrant} />
      );

      const iconContainer = container.querySelector(".h-5.w-5");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("Props Combinations", () => {
    it("should handle all props correctly", () => {
      const customProject = {
        uid: "custom-project",
        details: {
          slug: "custom-slug",
        },
      } as any;

      const customGrant = {
        uid: "custom-grant",
        chainID: 42161,
        details: {
          title: "Custom Grant Title",
        },
      } as any;

      render(
        <GrantNotCompletedButton project={customProject} grant={customGrant} text="Custom Text" />
      );

      expect(screen.getByText("Custom Text")).toBeInTheDocument();
      expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockOpenGrantCompletionDialog).toHaveBeenCalledWith(customGrant, customProject);
    });
  });

  describe("Button Type", () => {
    it("should have type='button' to prevent form submission", () => {
      render(<GrantNotCompletedButton project={mockProject} grant={mockGrant} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
