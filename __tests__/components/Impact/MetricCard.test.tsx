import { render, screen } from "@testing-library/react";
import { MetricCard } from "@/components/Pages/Project/Impact/MetricCard";
import "@testing-library/jest-dom";

describe("MetricCard", () => {
  const defaultProps = {
    title: "Total Impact",
    value: "42",
    icon: <svg data-testid="metric-icon" />,
  };

  describe("Rendering", () => {
    it("should render the title", () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText("Total Impact")).toBeInTheDocument();
    });

    it("should render the value", () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should render the icon", () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByTestId("metric-icon")).toBeInTheDocument();
    });

    it("should render tooltip when provided", () => {
      render(<MetricCard {...defaultProps} tooltip="Helpful info" />);
      expect(screen.getByTitle("Helpful info")).toBeInTheDocument();
    });
  });

  describe("Dark theme classes", () => {
    it("should have dark border class on the card container", () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("border-gray-200", "dark:border-zinc-700");
    });

    it("should have dark text class on the value", () => {
      render(<MetricCard {...defaultProps} />);
      const value = screen.getByText("42");
      expect(value).toHaveClass("text-gray-900", "dark:text-zinc-100");
    });
  });

  describe("Custom className", () => {
    it("should apply custom className to the card container", () => {
      const { container } = render(<MetricCard {...defaultProps} className="custom-class" />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("custom-class");
    });
  });
});
