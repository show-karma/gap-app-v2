import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import "@testing-library/jest-dom/vitest";

// Mock Spinner
vi.mock("@/components/ui/spinner", () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

describe("Button", () => {
  describe("Rendering", () => {
    it("should render button element", () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should render children text", () => {
      render(<Button>Test Button</Button>);

      expect(screen.getByText("Test Button")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<Button className="custom-class">Button</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("Loading State", () => {
    it("should show spinner when isLoading is true", () => {
      render(<Button isLoading>Button</Button>);

      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });

    it("should not show button when loading", () => {
      render(<Button isLoading>Button</Button>);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("should show button when isLoading is false", () => {
      render(<Button isLoading={false}>Button</Button>);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should not show spinner by default", () => {
      render(<Button>Button</Button>);

      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("should apply disabled attribute", () => {
      render(<Button disabled>Button</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should not trigger onClick when disabled", () => {
      const handleClick = vi.fn();

      render(
        <Button disabled onClick={handleClick}>
          Button
        </Button>
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Events", () => {
    it("should handle onClick event", () => {
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should handle onMouseEnter event", () => {
      const handleMouseEnter = vi.fn();

      render(<Button onMouseEnter={handleMouseEnter}>Button</Button>);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      expect(handleMouseEnter).toHaveBeenCalledTimes(1);
    });

    it("should handle onFocus event", () => {
      const handleFocus = vi.fn();

      render(<Button onFocus={handleFocus}>Button</Button>);

      const button = screen.getByRole("button");
      fireEvent.focus(button);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard accessible", () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole("button");
      button.focus();

      expect(button).toHaveFocus();
    });

    it("should support aria-label", () => {
      render(<Button aria-label="Close dialog">X</Button>);

      expect(screen.getByLabelText("Close dialog")).toBeInTheDocument();
    });

    it("should support type attribute", () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });
  });

  describe("Children", () => {
    it("should render JSX children", () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );

      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Text")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty children", () => {
      const { container } = render(<Button />);

      expect(container.querySelector("button")).toBeInTheDocument();
    });

    it("should toggle loading state", () => {
      const { rerender } = render(<Button isLoading={false}>Button</Button>);

      expect(screen.getByRole("button")).toBeInTheDocument();

      rerender(<Button isLoading={true}>Button</Button>);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });
});
