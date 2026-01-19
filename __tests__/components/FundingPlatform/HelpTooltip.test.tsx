import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EMAIL_PLACEHOLDERS,
  HELP_CONTENT,
  HelpTooltip,
} from "@/components/FundingPlatform/HelpTooltip";

describe("HelpTooltip", () => {
  describe("rendering", () => {
    it("should render the help icon button", () => {
      render(<HelpTooltip content="Test content" />);

      const button = screen.getByRole("button", { name: "Help" });
      expect(button).toBeInTheDocument();
    });

    it("should render with custom aria-label when title is provided", () => {
      render(<HelpTooltip content="Test content" title="Custom Title" />);

      const button = screen.getByRole("button", { name: "Help: Custom Title" });
      expect(button).toBeInTheDocument();
    });

    it("should not show tooltip content by default", () => {
      render(<HelpTooltip content="Test content" />);

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(<HelpTooltip content="Test" className="custom-class" />);

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("tooltip visibility on hover", () => {
    it("should show tooltip on mouse enter", async () => {
      render(<HelpTooltip content="Tooltip content" />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      expect(screen.getByText("Tooltip content")).toBeInTheDocument();
    });

    it("should hide tooltip on mouse leave", async () => {
      render(<HelpTooltip content="Tooltip content" />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);
      expect(screen.getByRole("tooltip")).toBeInTheDocument();

      fireEvent.mouseLeave(button);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("tooltip visibility on focus", () => {
    it("should show tooltip on focus", async () => {
      render(<HelpTooltip content="Tooltip content" />);

      const button = screen.getByRole("button");
      fireEvent.focus(button);

      expect(screen.getByRole("tooltip")).toBeInTheDocument();
    });

    it("should hide tooltip on blur", async () => {
      render(<HelpTooltip content="Tooltip content" />);

      const button = screen.getByRole("button");
      fireEvent.focus(button);
      expect(screen.getByRole("tooltip")).toBeInTheDocument();

      fireEvent.blur(button);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("tooltip content", () => {
    it("should display title when provided", async () => {
      render(<HelpTooltip content="Content text" title="Title text" />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      expect(screen.getByText("Title text")).toBeInTheDocument();
      expect(screen.getByText("Content text")).toBeInTheDocument();
    });

    it("should not display title element when title is not provided", async () => {
      render(<HelpTooltip content="Content text" />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      const tooltip = screen.getByRole("tooltip");
      const semiboldElements = tooltip.querySelectorAll(".font-semibold");
      expect(semiboldElements.length).toBe(0);
    });

    it("should render ReactNode content", async () => {
      render(
        <HelpTooltip
          content={
            <div>
              <span data-testid="custom-content">Custom ReactNode</span>
            </div>
          }
        />
      );

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
    });
  });

  describe("positioning", () => {
    it("should default to top position", () => {
      render(<HelpTooltip content="Test" />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.className).toContain("bottom-full");
    });

    it("should apply bottom position classes", () => {
      render(<HelpTooltip content="Test" position="bottom" />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.className).toContain("top-full");
    });

    it("should apply left position classes", () => {
      render(<HelpTooltip content="Test" position="left" />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.className).toContain("right-full");
    });

    it("should apply right position classes", () => {
      render(<HelpTooltip content="Test" position="right" />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip.className).toContain("left-full");
    });
  });

  describe("keyboard accessibility", () => {
    it("should be focusable with Tab key", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>Previous</button>
          <HelpTooltip content="Test" />
        </div>
      );

      await user.tab(); // Focus "Previous" button
      await user.tab(); // Focus help tooltip

      const helpButton = screen.getByRole("button", { name: "Help" });
      expect(helpButton).toHaveFocus();
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
    });
  });
});

describe("HELP_CONTENT", () => {
  it("should have all required help sections", () => {
    const expectedKeys = [
      "applicationForm",
      "postApprovalForm",
      "reviewers",
      "emailTemplates",
      "aiConfig",
      "programDetails",
      "privacy",
    ];

    expectedKeys.forEach((key) => {
      expect(HELP_CONTENT).toHaveProperty(key);
      expect(HELP_CONTENT[key as keyof typeof HELP_CONTENT]).toHaveProperty("title");
      expect(HELP_CONTENT[key as keyof typeof HELP_CONTENT]).toHaveProperty("content");
    });
  });

  it("should have non-empty titles and content", () => {
    Object.values(HELP_CONTENT).forEach((helpItem) => {
      expect(helpItem.title.length).toBeGreaterThan(0);
      expect(helpItem.content.length).toBeGreaterThan(0);
    });
  });
});

describe("EMAIL_PLACEHOLDERS", () => {
  it("should have all required placeholders", () => {
    const expectedPlaceholders = [
      "{{applicantName}}",
      "{{applicantEmail}}",
      "{{programName}}",
      "{{referenceNumber}}",
      "{{reason}}",
      "{{dashboardLink}}",
      "{{projectTitle}}",
    ];

    const actualPlaceholders = EMAIL_PLACEHOLDERS.map((p) => p.placeholder);

    expectedPlaceholders.forEach((placeholder) => {
      expect(actualPlaceholders).toContain(placeholder);
    });
  });

  it("should have descriptions for all placeholders", () => {
    EMAIL_PLACEHOLDERS.forEach((item) => {
      expect(item.placeholder).toBeDefined();
      expect(item.description).toBeDefined();
      expect(item.description.length).toBeGreaterThan(0);
    });
  });

  it("should have valid placeholder format (double curly braces)", () => {
    EMAIL_PLACEHOLDERS.forEach((item) => {
      expect(item.placeholder).toMatch(/^\{\{[a-zA-Z]+\}\}$/);
    });
  });
});
