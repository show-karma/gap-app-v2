/**
 * @file Tests for MarkdownEditor component
 * @description Comprehensive tests covering rendering, user interactions,
 * character limits, preview mode, and content validation
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light" }),
}));

// Mock the dynamic import of MDEditor
jest.mock("next/dynamic", () => {
  return function mockDynamic(
    importFn: () => Promise<{ default: React.ComponentType }>,
    options?: { loading?: () => React.ReactNode }
  ) {
    // Return a mock MDEditor component
    const MockMDEditor = ({
      value,
      onChange,
      onBlur,
      height,
      minHeight,
      preview,
      textareaProps,
      className,
    }: {
      value?: string;
      onChange?: (val?: string) => void;
      onBlur?: () => void;
      height?: number;
      minHeight?: number;
      preview?: string;
      textareaProps?: {
        placeholder?: string;
        disabled?: boolean;
        id?: string;
        maxLength?: number;
      };
      className?: string;
    }) => (
      <div data-testid="md-editor" className={className} style={{ height, minHeight }}>
        <textarea
          data-testid="md-editor-textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          placeholder={textareaProps?.placeholder}
          disabled={textareaProps?.disabled}
          id={textareaProps?.id}
          maxLength={textareaProps?.maxLength}
        />
        {preview === "preview" && (
          <div data-testid="md-editor-preview">
            <p>Preview: {value}</p>
          </div>
        )}
      </div>
    );

    return MockMDEditor;
  };
});

// Import after mocks are set up
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";

describe("MarkdownEditor", () => {
  describe("Rendering", () => {
    it("should render with label", () => {
      render(<MarkdownEditor label="Test Label" id="test-editor" />);

      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("should show required indicator when isRequired is true", () => {
      render(<MarkdownEditor label="Test Label" isRequired id="test-editor" />);

      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("should render description when provided", () => {
      render(<MarkdownEditor description="This is a description" id="test-editor" />);

      expect(screen.getByText("This is a description")).toBeInTheDocument();
    });

    it("should render error message when error is provided", () => {
      render(<MarkdownEditor error="This field is required" id="test-editor" />);

      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("should render preview toggle button by default", () => {
      render(<MarkdownEditor label="Test" id="test-editor" />);

      expect(screen.getByRole("button", { name: /preview/i })).toBeInTheDocument();
    });

    it("should not render preview toggle when enablePreviewToggle is false", () => {
      render(<MarkdownEditor label="Test" id="test-editor" enablePreviewToggle={false} />);

      expect(screen.queryByRole("button", { name: /preview/i })).not.toBeInTheDocument();
    });

    it("should not render preview toggle when disabled", () => {
      render(<MarkdownEditor label="Test" id="test-editor" isDisabled />);

      expect(screen.queryByRole("button", { name: /preview/i })).not.toBeInTheDocument();
    });
  });

  describe("Character Limits", () => {
    it("should show character count when showCharacterCount is true", () => {
      render(
        <MarkdownEditor value="Hello World" showCharacterCount maxLength={100} id="test-editor" />
      );

      expect(screen.getByText("11/100")).toBeInTheDocument();
    });

    it("should not show character count when showCharacterCount is false", () => {
      render(
        <MarkdownEditor
          value="Hello World"
          showCharacterCount={false}
          maxLength={100}
          id="test-editor"
        />
      );

      expect(screen.queryByText("11/100")).not.toBeInTheDocument();
    });

    it("should enforce maxLength on change", async () => {
      const handleChange = jest.fn();
      render(<MarkdownEditor value="" onChange={handleChange} maxLength={10} id="test-editor" />);

      const textarea = screen.getByTestId("md-editor-textarea");
      fireEvent.change(textarea, { target: { value: "12345678901234567890" } });

      // Should truncate to maxLength
      expect(handleChange).toHaveBeenCalledWith("1234567890");
    });

    it("should show warning style when near character limit", () => {
      render(
        <MarkdownEditor
          value={"a".repeat(95)}
          showCharacterCount
          maxLength={100}
          id="test-editor"
        />
      );

      const countElement = screen.getByText("95/100");
      expect(countElement).toHaveClass("text-yellow-600");
    });

    it("should show error style when at character limit", () => {
      render(
        <MarkdownEditor
          value={"a".repeat(100)}
          showCharacterCount
          maxLength={100}
          id="test-editor"
        />
      );

      const countElement = screen.getByText("100/100");
      expect(countElement).toHaveClass("text-red-500");
    });
  });

  describe("Preview Mode Toggle", () => {
    it("should toggle to preview mode when clicking preview button", async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor label="Test" value="# Hello" id="test-editor" />);

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByTestId("md-editor-preview")).toBeInTheDocument();
      });
    });

    it("should toggle back to edit mode when clicking edit button", async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor label="Test" value="# Hello" id="test-editor" />);

      // Toggle to preview
      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      // Wait for preview mode
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      });

      // Toggle back to edit
      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /preview/i })).toBeInTheDocument();
      });
    });
  });

  describe("Content Validation", () => {
    it("should show warning for suspicious content patterns", () => {
      render(<MarkdownEditor value="Check this link: javascript:alert('xss')" id="test-editor" />);

      expect(screen.getByText(/content contains potentially unsafe patterns/i)).toBeInTheDocument();
    });

    it("should show warning for script tags", () => {
      render(<MarkdownEditor value="<script>alert('xss')</script>" id="test-editor" />);

      expect(screen.getByText(/content contains potentially unsafe patterns/i)).toBeInTheDocument();
    });

    it("should show warning for event handlers", () => {
      render(<MarkdownEditor value='<img src="x" onerror="alert(1)">' id="test-editor" />);

      expect(screen.getByText(/content contains potentially unsafe patterns/i)).toBeInTheDocument();
    });

    it("should not show warning for safe content", () => {
      render(
        <MarkdownEditor value="# Hello World\n\nThis is safe markdown content." id="test-editor" />
      );

      expect(
        screen.queryByText(/content contains potentially unsafe patterns/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should call onChange when typing", async () => {
      const handleChange = jest.fn();
      render(<MarkdownEditor value="" onChange={handleChange} id="test-editor" />);

      const textarea = screen.getByTestId("md-editor-textarea");
      fireEvent.change(textarea, { target: { value: "Hello" } });

      expect(handleChange).toHaveBeenCalledWith("Hello");
    });

    it("should call onBlur when losing focus", async () => {
      const handleBlur = jest.fn();
      render(<MarkdownEditor value="" onBlur={handleBlur} id="test-editor" />);

      const textarea = screen.getByTestId("md-editor-textarea");
      fireEvent.blur(textarea);

      expect(handleBlur).toHaveBeenCalled();
    });

    it("should be disabled when isDisabled is true", () => {
      render(<MarkdownEditor value="" isDisabled id="test-editor" />);

      const textarea = screen.getByTestId("md-editor-textarea");
      expect(textarea).toBeDisabled();
    });

    it("should be disabled when disabled prop is true (legacy)", () => {
      render(<MarkdownEditor value="" disabled id="test-editor" />);

      const textarea = screen.getByTestId("md-editor-textarea");
      expect(textarea).toBeDisabled();
    });

    it("should show placeholder text", () => {
      render(<MarkdownEditor placeholder="Enter your content..." id="test-editor" />);

      const textarea = screen.getByTestId("md-editor-textarea");
      expect(textarea).toHaveAttribute("placeholder", "Enter your content...");
    });

    it("should use placeholderText prop (legacy) when provided", () => {
      render(<MarkdownEditor placeholderText="Legacy placeholder" id="test-editor" />);

      const textarea = screen.getByTestId("md-editor-textarea");
      expect(textarea).toHaveAttribute("placeholder", "Legacy placeholder");
    });
  });

  describe("Error States", () => {
    it("should apply error styling when error is provided", () => {
      const { container } = render(<MarkdownEditor error="Required field" id="test-editor" />);

      const wrapper = container.querySelector(".markdown-editor-wrapper");
      expect(wrapper).toHaveClass("border-red-500");
    });

    it("should not apply error styling when no error", () => {
      const { container } = render(<MarkdownEditor id="test-editor" />);

      const wrapper = container.querySelector(".markdown-editor-wrapper");
      expect(wrapper).toHaveClass("border-gray-200");
      expect(wrapper).not.toHaveClass("border-red-500");
    });
  });

  describe("Accessibility", () => {
    it("should associate label with editor via htmlFor", () => {
      render(<MarkdownEditor label="Description" id="description-editor" />);

      const label = screen.getByText("Description");
      expect(label).toHaveAttribute("for", "description-editor");
    });

    it("should have accessible preview toggle button", () => {
      render(<MarkdownEditor label="Test" id="test-editor" />);

      const button = screen.getByRole("button", { name: /preview/i });
      expect(button).toHaveAttribute("aria-label", "Show preview");
    });
  });
});
