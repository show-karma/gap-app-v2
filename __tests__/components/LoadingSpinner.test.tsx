import { render, screen } from "@testing-library/react";
import { LoadingSpinner } from "@/components/Disbursement/components/LoadingSpinner";
import "@testing-library/jest-dom/vitest";

describe("LoadingSpinner", () => {
  describe("Rendering", () => {
    it("should render spinner element", () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Size Variants", () => {
    it("should apply medium size by default", () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector(".h-6.w-6");
      expect(spinner).toBeInTheDocument();
    });

    it("should apply small size", () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const spinner = container.querySelector(".h-4.w-4");
      expect(spinner).toBeInTheDocument();
    });

    it("should apply large size", () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      const spinner = container.querySelector(".h-8.w-8");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Message Display", () => {
    it("should not display message by default", () => {
      const { container } = render(<LoadingSpinner />);

      const wrapper = container.querySelector(".flex.items-center.justify-center.py-8");
      expect(wrapper).not.toBeInTheDocument();
    });

    it("should display message when provided", () => {
      render(<LoadingSpinner message="Loading..." />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should handle empty message", () => {
      const { container } = render(<LoadingSpinner message="" />);

      const wrapper = container.querySelector(".flex.items-center.justify-center.py-8");
      expect(wrapper).not.toBeInTheDocument();

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Structure", () => {
    it("should render simple spinner without wrapper when no message", () => {
      const { container } = render(<LoadingSpinner />);

      const directSpinner = container.firstChild;
      expect(directSpinner).toHaveClass("animate-spin");
    });

    it("should render wrapper div when message provided", () => {
      const { container } = render(<LoadingSpinner message="Loading" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("flex", "items-center", "justify-center", "py-8");
    });
  });
});
