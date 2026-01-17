import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import "@testing-library/jest-dom";

describe("ExternalLink", () => {
  describe("Rendering", () => {
    it("should render an anchor element", () => {
      render(<ExternalLink href="https://example.com">Click me</ExternalLink>);

      const link = screen.getByText("Click me");
      expect(link.tagName).toBe("A");
    });

    it("should render children correctly", () => {
      render(<ExternalLink href="https://example.com">Test Link</ExternalLink>);

      expect(screen.getByText("Test Link")).toBeInTheDocument();
    });

    it("should render with complex children", () => {
      render(
        <ExternalLink href="https://example.com">
          <span>Icon</span>
          <span>Text</span>
        </ExternalLink>
      );

      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Text")).toBeInTheDocument();
    });

    it("should render with JSX children", () => {
      render(
        <ExternalLink href="https://example.com">
          <div data-testid="custom-content">Custom Content</div>
        </ExternalLink>
      );

      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
    });
  });

  describe("External Link Attributes", () => {
    it('should have target="_blank" attribute', () => {
      render(<ExternalLink href="https://example.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("target", "_blank");
    });

    it('should have rel="noopener noreferrer" attribute', () => {
      render(<ExternalLink href="https://example.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should have href attribute", () => {
      render(<ExternalLink href="https://example.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("href", "https://example.com");
    });

    it("should accept different href values", () => {
      render(<ExternalLink href="https://different.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("href", "https://different.com");
    });
  });

  describe("Custom Attributes", () => {
    it("should accept className prop", () => {
      render(
        <ExternalLink href="https://example.com" className="custom-class">
          Link
        </ExternalLink>
      );

      const link = screen.getByText("Link");
      expect(link).toHaveClass("custom-class");
    });

    it("should accept aria-label prop", () => {
      render(
        <ExternalLink href="https://example.com" aria-label="External link">
          Link
        </ExternalLink>
      );

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("aria-label", "External link");
    });

    it("should accept id prop", () => {
      render(
        <ExternalLink href="https://example.com" id="my-link">
          Link
        </ExternalLink>
      );

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("id", "my-link");
    });

    it("should accept data attributes", () => {
      render(
        <ExternalLink href="https://example.com" data-testid="external-link">
          Link
        </ExternalLink>
      );

      expect(screen.getByTestId("external-link")).toBeInTheDocument();
    });

    it("should accept title prop", () => {
      render(
        <ExternalLink href="https://example.com" title="Link title">
          Link
        </ExternalLink>
      );

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("title", "Link title");
    });
  });

  describe("Multiple Classes", () => {
    it("should accept multiple className values", () => {
      render(
        <ExternalLink href="https://example.com" className="class1 class2 class3">
          Link
        </ExternalLink>
      );

      const link = screen.getByText("Link");
      expect(link).toHaveClass("class1", "class2", "class3");
    });
  });

  describe("Event Handlers", () => {
    it("should accept onClick handler", () => {
      const handleClick = jest.fn();

      render(
        <ExternalLink href="https://example.com" onClick={handleClick}>
          Link
        </ExternalLink>
      );

      const link = screen.getByText("Link");
      link.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should accept onMouseEnter handler", () => {
      const handleMouseEnter = jest.fn();

      render(
        <ExternalLink href="https://example.com" onMouseEnter={handleMouseEnter}>
          Link
        </ExternalLink>
      );

      const link = screen.getByText("Link");
      // Using fireEvent for React synthetic events
      require("@testing-library/react").fireEvent.mouseEnter(link);

      expect(handleMouseEnter).toHaveBeenCalledTimes(1);
    });
  });

  describe("Security", () => {
    it("should have noreferrer for security", () => {
      render(<ExternalLink href="https://example.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link.getAttribute("rel")).toContain("noreferrer");
    });

    it('should open in new tab with target="_blank"', () => {
      render(<ExternalLink href="https://example.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty href", () => {
      render(<ExternalLink href="">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("href", "");
    });

    it("should handle undefined className", () => {
      render(<ExternalLink href="https://example.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toBeInTheDocument();
    });

    it("should render with only required props", () => {
      render(<ExternalLink href="https://example.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://example.com");
    });

    it("should handle numeric children", () => {
      render(<ExternalLink href="https://example.com">{123}</ExternalLink>);

      expect(screen.getByText("123")).toBeInTheDocument();
    });

    it("should handle boolean children (React ignores false/true)", () => {
      render(
        <ExternalLink href="https://example.com">
          {false}Text{true}
        </ExternalLink>
      );

      expect(screen.getByText("Text")).toBeInTheDocument();
    });
  });

  describe("Href Variations", () => {
    it("should handle https URLs", () => {
      render(<ExternalLink href="https://secure.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("href", "https://secure.com");
    });

    it("should handle http URLs", () => {
      render(<ExternalLink href="http://unsecure.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("href", "http://unsecure.com");
    });

    it("should handle URLs with paths", () => {
      render(<ExternalLink href="https://example.com/path/to/page">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("href", "https://example.com/path/to/page");
    });

    it("should handle URLs with query parameters", () => {
      render(<ExternalLink href="https://example.com?param=value">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("href", "https://example.com?param=value");
    });

    it("should handle URLs with hash fragments", () => {
      render(<ExternalLink href="https://example.com#section">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("href", "https://example.com#section");
    });
  });

  describe("Accessibility", () => {
    it("should be focusable", () => {
      render(<ExternalLink href="https://example.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      link.focus();

      expect(link).toHaveFocus();
    });

    it("should support aria-label for screen readers", () => {
      render(
        <ExternalLink href="https://example.com" aria-label="Opens in new tab">
          Link
        </ExternalLink>
      );

      const link = screen.getByLabelText("Opens in new tab");
      expect(link).toBeInTheDocument();
    });

    it("should be keyboard accessible", () => {
      render(<ExternalLink href="https://example.com">Link</ExternalLink>);

      const link = screen.getByText("Link");
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href");
    });
  });

  describe("Props Spreading", () => {
    it("should spread all anchor props correctly", () => {
      render(
        <ExternalLink
          href="https://example.com"
          className="custom"
          id="link-id"
          title="Link title"
          aria-label="Aria label"
          data-custom="value"
        >
          Link
        </ExternalLink>
      );

      const link = screen.getByText("Link");
      expect(link).toHaveAttribute("href", "https://example.com");
      expect(link).toHaveClass("custom");
      expect(link).toHaveAttribute("id", "link-id");
      expect(link).toHaveAttribute("title", "Link title");
      expect(link).toHaveAttribute("aria-label", "Aria label");
      expect(link).toHaveAttribute("data-custom", "value");
    });
  });
});
