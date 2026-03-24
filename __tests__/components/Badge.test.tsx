import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";
import "@testing-library/jest-dom/vitest";

describe("Badge", () => {
  describe("Rendering", () => {
    it("should render badge element", () => {
      render(<Badge>Test Badge</Badge>);

      expect(screen.getByText("Test Badge")).toBeInTheDocument();
    });

    it("should render as div element", () => {
      render(<Badge>Badge</Badge>);

      const badge = screen.getByText("Badge");
      expect(badge.tagName).toBe("DIV");
    });

    it("should render with JSX children", () => {
      render(
        <Badge>
          <span>Icon</span>
          <span>Label</span>
        </Badge>
      );

      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Label")).toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    it("should apply default variant by default", () => {
      render(<Badge>Badge</Badge>);

      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("bg-primary", "text-primary-foreground");
    });

    it("should apply secondary variant", () => {
      render(<Badge variant="secondary">Badge</Badge>);

      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("bg-secondary", "text-secondary-foreground");
    });

    it("should apply destructive variant", () => {
      render(<Badge variant="destructive">Badge</Badge>);

      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("bg-destructive", "text-destructive-foreground");
    });

    it("should apply outline variant", () => {
      render(<Badge variant="outline">Badge</Badge>);

      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("text-foreground");
    });
  });

  describe("Custom ClassName", () => {
    it("should accept custom className", () => {
      render(<Badge className="custom-class">Badge</Badge>);

      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("custom-class");
    });
  });

  describe("HTML Attributes", () => {
    it("should accept data attributes", () => {
      render(<Badge data-testid="custom-badge">Badge</Badge>);

      expect(screen.getByTestId("custom-badge")).toBeInTheDocument();
    });

    it("should accept aria-label attribute", () => {
      render(<Badge aria-label="Status badge">Badge</Badge>);

      expect(screen.getByLabelText("Status badge")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should render with empty children", () => {
      const { container } = render(<Badge />);

      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("should render with numeric children", () => {
      render(<Badge>{5}</Badge>);

      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  describe("Event Handlers", () => {
    it("should accept onClick handler", () => {
      const handleClick = vi.fn();

      render(<Badge onClick={handleClick}>Badge</Badge>);

      const badge = screen.getByText("Badge");
      badge.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("should be accessible with proper role", () => {
      render(<Badge role="status">Active</Badge>);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });
});
