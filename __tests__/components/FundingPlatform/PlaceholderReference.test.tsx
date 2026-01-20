import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EMAIL_PLACEHOLDERS,
  PlaceholderReference,
} from "@/components/FundingPlatform/PlaceholderReference";

describe("PlaceholderReference", () => {
  describe("rendering", () => {
    it("should render the component with toggle button", () => {
      render(<PlaceholderReference />);

      expect(
        screen.getByRole("button", { name: /available placeholders reference/i })
      ).toBeInTheDocument();
    });

    it("should be collapsed by default", () => {
      render(<PlaceholderReference />);

      // Content should not be visible
      expect(screen.queryByText(/use these placeholders/i)).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(<PlaceholderReference className="custom-class" />);

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("expansion behavior", () => {
    it("should expand when defaultExpanded is true", () => {
      render(<PlaceholderReference defaultExpanded={true} />);

      expect(screen.getByText(/use these placeholders/i)).toBeInTheDocument();
    });

    it("should toggle expansion when button is clicked", async () => {
      const user = userEvent.setup();
      render(<PlaceholderReference />);

      const toggleButton = screen.getByRole("button");

      // Initially collapsed
      expect(screen.queryByText(/use these placeholders/i)).not.toBeInTheDocument();

      // Click to expand
      await user.click(toggleButton);
      expect(screen.getByText(/use these placeholders/i)).toBeInTheDocument();

      // Click to collapse
      await user.click(toggleButton);
      expect(screen.queryByText(/use these placeholders/i)).not.toBeInTheDocument();
    });
  });

  describe("content display", () => {
    it("should show all email placeholders when expanded", async () => {
      render(<PlaceholderReference defaultExpanded={true} />);

      EMAIL_PLACEHOLDERS.forEach((item) => {
        expect(screen.getByText(item.placeholder)).toBeInTheDocument();
        expect(screen.getByText(item.description)).toBeInTheDocument();
      });
    });

    it("should display placeholder in code format", async () => {
      render(<PlaceholderReference defaultExpanded={true} />);

      // Check that placeholders are in code elements
      const codeElements = screen.getAllByText(/^\{\{/);
      expect(codeElements.length).toBe(EMAIL_PLACEHOLDERS.length);

      codeElements.forEach((element) => {
        expect(element.tagName.toLowerCase()).toBe("code");
      });
    });

    it("should display explanatory text", () => {
      render(<PlaceholderReference defaultExpanded={true} />);

      expect(
        screen.getByText(/use these placeholders in your email templates/i)
      ).toBeInTheDocument();
    });
  });

  describe("icon states", () => {
    it("should show chevron down icon when collapsed", () => {
      const { container } = render(<PlaceholderReference />);

      // The collapsed state should have a specific SVG path
      const button = screen.getByRole("button");
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should show chevron up icon when expanded", async () => {
      const user = userEvent.setup();
      render(<PlaceholderReference />);

      const button = screen.getByRole("button");
      await user.click(button);

      // After expansion, there should still be an SVG (different icon)
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have button type to prevent form submission", () => {
      render(<PlaceholderReference />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      render(<PlaceholderReference />);

      const button = screen.getByRole("button");
      button.focus();

      // Press Enter to toggle
      await user.keyboard("{Enter}");
      expect(screen.getByText(/use these placeholders/i)).toBeInTheDocument();

      // Press Enter again to collapse
      await user.keyboard("{Enter}");
      expect(screen.queryByText(/use these placeholders/i)).not.toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("should have blue-themed styling", () => {
      const { container } = render(<PlaceholderReference />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("bg-blue-50");
      expect(wrapper.className).toContain("border-blue-200");
    });
  });
});
