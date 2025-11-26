import { fireEvent, render, screen } from "@testing-library/react";
import { ReasonsModal } from "@/components/Dialogs/ReasonsModal";

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

  // Assign Child as a property of the MockTransitionRoot function
  MockTransitionRoot.Child = MockTransitionChild;

  return {
    Dialog: MockDialog,
    Transition: MockTransitionRoot,
    Fragment: React.Fragment,
  };
});

// Mock Heroicons
jest.mock("@heroicons/react/24/solid", () => ({
  CheckIcon: (props: any) => (
    <svg role="img" aria-label="Check" {...props} data-testid="check-icon" />
  ),
  XMarkIcon: (props: any) => (
    <svg role="img" aria-label="X Mark" {...props} data-testid="xmark-icon" />
  ),
}));

// Mock Button component
jest.mock("@/components/Utilities/Button", () => ({
  Button: ({ onClick, children, className }: any) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

describe("ReasonsModal", () => {
  const mockReasonsInclude = [
    "Strong development activity on GitHub",
    "Clear roadmap and milestones",
    "Active community engagement",
  ];

  const mockReasonsExclude = [
    "Lack of recent updates",
    "Unclear project goals",
    "No proof of work provided",
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering - Include Button", () => {
    it("should render Include button with correct text", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      expect(screen.getByText("Include")).toBeInTheDocument();
    });

    it("should render Include button with check icon", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });

    it("should have green styling for Include button", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      expect(button?.className).toContain("text-green-800");
      expect(button?.className).toContain("bg-green-100");
      expect(button?.className).toContain("hover:bg-green-200");
      expect(button?.className).toContain("border-green-200");
    });
  });

  describe("Rendering - Exclude Button", () => {
    it("should render Exclude button with correct text", () => {
      render(<ReasonsModal text="Exclude" reasons={mockReasonsExclude} />);

      expect(screen.getByText("Exclude")).toBeInTheDocument();
    });

    it("should render Exclude button with X mark icon", () => {
      render(<ReasonsModal text="Exclude" reasons={mockReasonsExclude} />);

      expect(screen.getByTestId("xmark-icon")).toBeInTheDocument();
    });

    it("should have red styling for Exclude button", () => {
      render(<ReasonsModal text="Exclude" reasons={mockReasonsExclude} />);

      const button = screen.getByText("Exclude").closest("button");
      expect(button?.className).toContain("text-red-800");
      expect(button?.className).toContain("bg-red-100");
      expect(button?.className).toContain("hover:bg-red-200");
      expect(button?.className).toContain("border-red-200");
    });
  });

  describe("Modal Opening and Closing", () => {
    it("should not show modal initially", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should open modal when button is clicked", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("should close modal when Close button is clicked", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const openButton = screen.getByText("Include").closest("button");
      if (openButton) fireEvent.click(openButton);

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Modal Content - Include", () => {
    it("should display correct title for Include", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      expect(screen.getByText("Reasons to include this project")).toBeInTheDocument();
    });

    it("should display AI evaluation note", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      expect(screen.getByText("*as evaluated by Karma AI")).toBeInTheDocument();
    });

    it("should display all Include reasons", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      mockReasonsInclude.forEach((reason) => {
        expect(screen.getByText(reason)).toBeInTheDocument();
      });
    });

    it("should display milestone numbers for each reason", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      expect(screen.getByText("Milestone #1")).toBeInTheDocument();
      expect(screen.getByText("Milestone #2")).toBeInTheDocument();
      expect(screen.getByText("Milestone #3")).toBeInTheDocument();
    });
  });

  describe("Modal Content - Exclude", () => {
    it("should display correct title for Exclude", () => {
      render(<ReasonsModal text="Exclude" reasons={mockReasonsExclude} />);

      const button = screen.getByText("Exclude").closest("button");
      if (button) fireEvent.click(button);

      expect(screen.getByText("Reasons to exclude this project")).toBeInTheDocument();
    });

    it("should display all Exclude reasons", () => {
      render(<ReasonsModal text="Exclude" reasons={mockReasonsExclude} />);

      const button = screen.getByText("Exclude").closest("button");
      if (button) fireEvent.click(button);

      mockReasonsExclude.forEach((reason) => {
        expect(screen.getByText(reason)).toBeInTheDocument();
      });
    });
  });

  describe("Empty Reasons", () => {
    it('should display "No reasons provided" when reasons array is empty', () => {
      render(<ReasonsModal text="Include" reasons={[]} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      expect(screen.getByText("No reasons provided.")).toBeInTheDocument();
    });

    it("should display fallback message with proper styling", () => {
      render(<ReasonsModal text="Include" reasons={[]} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      const message = screen.getByText("No reasons provided.");
      expect(message.className).toContain("text-gray-500");
      expect(message.className).toContain("dark:text-gray-400");
      expect(message.className).toContain("italic");
    });
  });

  describe("Styling", () => {
    it("should have dark mode classes on dialog panel", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      const panel = screen.getByTestId("dialog-panel");
      expect(panel.className).toContain("dark:bg-zinc-800");
    });

    it("should have large max-width for modal", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      const panel = screen.getByTestId("dialog-panel");
      expect(panel.className).toContain("max-w-7xl");
    });

    it("should have scrollable content area", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      const contentArea = screen.getByText(mockReasonsInclude[0]).closest(".max-h-\\[60vh\\]");
      expect(contentArea?.className).toContain("overflow-y-auto");
    });

    it("should have proper spacing between reasons", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      const reasonsContainer = screen.getByText(mockReasonsInclude[0]).closest(".space-y-3");
      expect(reasonsContainer).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      const heading = screen.getByText("Reasons to include this project");
      expect(heading.tagName).toBe("H2");
    });

    it("should have semantic font weight for milestone labels", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      const milestoneLabel = screen.getByText("Milestone #1");
      expect(milestoneLabel.className).toContain("font-semibold");
    });

    it("should have proper color contrast for reasons text", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      const reasonElement = screen.getByText(mockReasonsInclude[0]).parentElement;
      expect(reasonElement?.className).toContain("text-gray-700");
      expect(reasonElement?.className).toContain("dark:text-gray-300");
    });

    it("should have button with proper interactive styling", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      expect(button?.className).toContain("hover:bg-green-200");
    });
  });

  describe("Dark Mode Support", () => {
    it("should have dark mode classes for trigger button", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      expect(button?.className).toContain("dark:bg-primary-900/50");
      expect(button?.className).toContain("dark:text-zinc-100");
    });

    it("should have dark mode classes for title", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      const titleContainer = screen.getByText("Reasons to include this project").parentElement;
      expect(titleContainer?.className).toContain("dark:text-zinc-100");
    });

    it("should have dark mode classes for close button", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const openButton = screen.getByText("Include").closest("button");
      if (openButton) fireEvent.click(openButton);

      const closeButton = screen.getByText("Close");
      expect(closeButton.className).toContain("dark:text-zinc-100");
      expect(closeButton.className).toContain("dark:border-zinc-100");
    });
  });

  describe("Multiple Reasons", () => {
    it("should handle single reason", () => {
      const singleReason = ["Only one reason"];
      render(<ReasonsModal text="Include" reasons={singleReason} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      expect(screen.getByText("Only one reason")).toBeInTheDocument();
      expect(screen.getByText("Milestone #1")).toBeInTheDocument();
      expect(screen.queryByText("Milestone #2")).not.toBeInTheDocument();
    });

    it("should handle many reasons", () => {
      const manyReasons = Array.from({ length: 10 }, (_, i) => `Reason ${i + 1}`);
      render(<ReasonsModal text="Include" reasons={manyReasons} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      manyReasons.forEach((reason) => {
        expect(screen.getByText(reason)).toBeInTheDocument();
      });

      expect(screen.getByText("Milestone #1")).toBeInTheDocument();
      expect(screen.getByText("Milestone #10")).toBeInTheDocument();
    });

    it("should correctly index milestones starting from 1", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      expect(screen.getByText("Milestone #1")).toBeInTheDocument();
      expect(screen.queryByText("Milestone #0")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long reason text", () => {
      const longReason = "A".repeat(500);
      render(<ReasonsModal text="Include" reasons={[longReason]} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      expect(screen.getByText(longReason)).toBeInTheDocument();
    });

    it("should handle special characters in reasons", () => {
      const specialReasons = [
        'Reason with "quotes"',
        "Reason with 'apostrophes'",
        "Reason with <html> tags",
        "Reason with & ampersand",
      ];
      render(<ReasonsModal text="Include" reasons={specialReasons} />);

      const button = screen.getByText("Include").closest("button");
      if (button) fireEvent.click(button);

      specialReasons.forEach((reason) => {
        expect(screen.getByText(reason)).toBeInTheDocument();
      });
    });

    it("should handle rapid open/close cycles", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const openButton = screen.getByText("Include").closest("button");

      // Open
      if (openButton) fireEvent.click(openButton);
      expect(screen.getByTestId("dialog")).toBeInTheDocument();

      // Close
      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();

      // Open again
      if (openButton) fireEvent.click(openButton);
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });
  });

  describe("Button Content", () => {
    it("should have icon before text in trigger button", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      expect(button?.firstChild).toMatchSnapshot();
    });

    it("should have proper gap between icon and text", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      expect(button?.className).toContain("gap-x-1");
    });

    it("should have rounded button styling", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const button = screen.getByText("Include").closest("button");
      expect(button?.className).toContain("rounded-md");
    });
  });

  describe("Close Button", () => {
    it("should render Close button in modal footer", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const openButton = screen.getByText("Include").closest("button");
      if (openButton) fireEvent.click(openButton);

      expect(screen.getByText("Close")).toBeInTheDocument();
    });

    it("should have proper styling for Close button", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const openButton = screen.getByText("Include").closest("button");
      if (openButton) fireEvent.click(openButton);

      const closeButton = screen.getByText("Close");
      expect(closeButton.className).toContain("bg-transparent");
      expect(closeButton.className).toContain("border-black");
      expect(closeButton.className).toContain("hover:bg-zinc-900");
    });

    it("should have Close button aligned to the right", () => {
      render(<ReasonsModal text="Include" reasons={mockReasonsInclude} />);

      const openButton = screen.getByText("Include").closest("button");
      if (openButton) fireEvent.click(openButton);

      const buttonContainer = screen.getByText("Close").parentElement;
      expect(buttonContainer?.className).toContain("justify-end");
    });
  });
});
