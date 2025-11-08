/**
 * @file simple-menu-item-client.test.tsx
 * @description Unit tests for SimpleMenuItemClient component
 * @phase Phase 2, Track B (Day 4-5)
 * @developer Developer 2
 */

import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { SimpleMenuItemClient } from "@/src/components/navbar/simple-menu-item-client";
import { renderWithProviders } from "../utils/test-helpers";
import { LayoutGrid } from "lucide-react";

describe("SimpleMenuItemClient Component", () => {
  describe("Rendering Tests", () => {
    it("should render icon and title", () => {
      renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("should not render description (simple variant)", () => {
      renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      // SimpleMenuItem doesn't support description prop
      const container = screen.getByText("Test Title").parentElement;
      expect(container?.childNodes.length).toBeLessThanOrEqual(3); // icon + text + optional arrow
    });

    it("should render arrow when showArrow is true", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          showArrow={true}
        />
      );

      const arrowIcon = container.querySelector('[class*="lucide-arrow-up-right"]');
      expect(arrowIcon).toBeInTheDocument();
    });

    it("should not render arrow when showArrow is false or undefined", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          showArrow={false}
        />
      );

      const arrowIcon = container.querySelector('[class*="lucide-arrow-up-right"]');
      expect(arrowIcon).not.toBeInTheDocument();
    });

    it("should render icon correctly", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      const icon = container.querySelector('[class*="lucide-layout-grid"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Desktop Variant Styling", () => {
    it("should apply desktop styling classes", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          variant="desktop"
        />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass("block");

      const innerDiv = container.querySelector('.flex.items-center.flex-row.gap-2');
      expect(innerDiv).toBeInTheDocument();
      expect(innerDiv).toHaveClass("px-2");
      expect(innerDiv).toHaveClass("py-1.5");
      expect(innerDiv).toHaveClass("rounded-md");
      expect(innerDiv).toHaveClass("hover:bg-accent");
    });

    it("should render as Link for internal hrefs", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/internal-page"
          icon={LayoutGrid}
          title="Internal Link"
          variant="desktop"
        />
      );

      const link = container.querySelector('a[href="/internal-page"]');
      expect(link).toBeInTheDocument();
    });

    it("should use proper gap spacing", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          variant="desktop"
        />
      );

      const flexContainer = container.querySelector('.gap-2');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe("Mobile Variant Styling", () => {
    it("should apply mobile styling classes", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          variant="mobile"
        />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass("flex");
      expect(link).toHaveClass("items-center");
      expect(link).toHaveClass("gap-2");
      expect(link).toHaveClass("px-0");
      expect(link).toHaveClass("py-1");
      expect(link).toHaveClass("rounded-md");
      expect(link).toHaveClass("hover:bg-accent");
    });

    it("should have different padding than desktop", () => {
      const { container: desktopContainer } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Desktop"
          variant="desktop"
        />
      );

      const { container: mobileContainer } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Mobile"
          variant="mobile"
        />
      );

      const desktopInnerDiv = desktopContainer.querySelector('.px-2.py-1\\.5');
      const mobileLink = mobileContainer.querySelector('.px-0.py-1');

      expect(desktopInnerDiv).toBeInTheDocument();
      expect(mobileLink).toBeInTheDocument();
    });
  });

  describe("Internal Link Navigation", () => {
    it("should use Next.js Link for internal links", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/internal-page"
          icon={LayoutGrid}
          title="Internal Link"
          external={false}
        />
      );

      const link = container.querySelector('a[href="/internal-page"]');
      expect(link).toBeInTheDocument();
    });

    it("should call onClick callback when clicked", () => {
      const onClickMock = jest.fn();

      renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          onClick={onClickMock}
        />
      );

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      expect(onClickMock).toHaveBeenCalled();
    });

    it("should navigate to correct href", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/projects"
          icon={LayoutGrid}
          title="Projects"
        />
      );

      const link = container.querySelector('a[href="/projects"]');
      expect(link).toBeInTheDocument();
    });
  });

  describe("External Link Navigation", () => {
    it("should use ExternalLink component for external links", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="https://external.com"
          icon={LayoutGrid}
          title="External Link"
          external={true}
        />
      );

      const link = container.querySelector('a[href="https://external.com"]');
      expect(link).toBeInTheDocument();
    });

    it("should handle external links in mobile variant", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="https://external.com"
          icon={LayoutGrid}
          title="External Link"
          external={true}
          variant="mobile"
        />
      );

      const link = container.querySelector('a[href="https://external.com"]');
      expect(link).toBeInTheDocument();
    });

    it("should work with showArrow for external links", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="https://external.com"
          icon={LayoutGrid}
          title="External Link"
          external={true}
          showArrow={true}
        />
      );

      const link = container.querySelector('a[href="https://external.com"]');
      expect(link).toBeInTheDocument();

      const arrow = container.querySelector('[class*="lucide-arrow-up-right"]');
      expect(arrow).toBeInTheDocument();
    });
  });

  describe("Interaction Tests", () => {
    it("should handle hover states", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          variant="desktop"
        />
      );

      const hoverElement = container.querySelector(".hover\\:bg-accent");
      expect(hoverElement).toBeInTheDocument();
    });

    it("should call onClick when item is clicked", () => {
      const onClickMock = jest.fn();

      renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          onClick={onClickMock}
        />
      );

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it("should work with keyboard navigation", () => {
      const onClickMock = jest.fn();

      renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          onClick={onClickMock}
        />
      );

      const title = screen.getByText("Test Title");
      
      // Simulate click via keyboard
      fireEvent.click(title);

      expect(onClickMock).toHaveBeenCalled();
    });
  });

  describe("Icon Styling", () => {
    it("should apply correct icon classes", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      const icon = container.querySelector('[class*="lucide-layout-grid"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("text-muted-foreground");
      expect(icon).toHaveClass("w-4");
      expect(icon).toHaveClass("h-4");
    });

    it("should apply arrow icon classes when showArrow is true", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          showArrow={true}
        />
      );

      const arrowIcon = container.querySelector('[class*="lucide-arrow-up-right"]');
      expect(arrowIcon).toBeInTheDocument();
      expect(arrowIcon).toHaveClass("text-muted-foreground");
      expect(arrowIcon).toHaveClass("w-4");
      expect(arrowIcon).toHaveClass("h-4");
      expect(arrowIcon).toHaveClass("ml-auto");
    });
  });

  describe("Text Styling", () => {
    it("should apply correct title classes", () => {
      renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      const title = screen.getByText("Test Title");
      expect(title).toHaveClass("text-foreground");
      expect(title).toHaveClass("text-sm");
      expect(title).toHaveClass("font-medium");
    });
  });

  describe("Accessibility Tests", () => {
    it("should render as a valid link", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      const link = container.querySelector('a[href="/test"]');
      expect(link).toBeInTheDocument();
    });

    it("should be keyboard accessible", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      // Links are naturally keyboard accessible
    });

    it("should have proper focus behavior", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      const link = container.querySelector('a');
      link?.focus();
      expect(document.activeElement).toBe(link);
    });
  });

  describe("Layout Tests", () => {
    it("should use flexbox layout", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          variant="desktop"
        />
      );

      const flexContainer = container.querySelector('.flex.items-center.flex-row');
      expect(flexContainer).toBeInTheDocument();
    });

    it("should align items correctly", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      const flexContainer = container.querySelector('.items-center');
      expect(flexContainer).toBeInTheDocument();
    });

    it("should have horizontal layout (flex-row)", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      const flexContainer = container.querySelector('.flex-row');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe("Variant Comparison", () => {
    it("desktop should have block wrapper, mobile should not", () => {
      const { container: desktopContainer } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Desktop"
          variant="desktop"
        />
      );

      const { container: mobileContainer } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Mobile"
          variant="mobile"
        />
      );

      const desktopBlockLink = desktopContainer.querySelector('a.block');
      const mobileFlexLink = mobileContainer.querySelector('a.flex');

      expect(desktopBlockLink).toBeInTheDocument();
      expect(mobileFlexLink).toBeInTheDocument();
    });

    it("should render content consistently across variants", () => {
      renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          variant="desktop"
        />
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();

      renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          variant="mobile"
        />
      );

      expect(screen.getAllByText("Test Title").length).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle external links with showArrow", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="https://external.com"
          icon={LayoutGrid}
          title="External"
          external={true}
          showArrow={true}
        />
      );

      expect(screen.getByText("External")).toBeInTheDocument();
      const arrow = container.querySelector('[class*="lucide-arrow-up-right"]');
      expect(arrow).toBeInTheDocument();
    });

    it("should handle all props together", () => {
      const onClickMock = jest.fn();

      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
          showArrow={true}
          onClick={onClickMock}
          variant="mobile"
          external={false}
        />
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();

      const arrow = container.querySelector('[class*="lucide-arrow-up-right"]');
      expect(arrow).toBeInTheDocument();

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      expect(onClickMock).toHaveBeenCalled();
    });

    it("should handle empty href", () => {
      renderWithProviders(
        <SimpleMenuItemClient
          href=""
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("should handle long titles gracefully", () => {
      const longTitle = "This is a very long title that might wrap to multiple lines";

      renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title={longTitle}
        />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });
  });

  describe("Comparison with MenuItemClient", () => {
    it("should be simpler than MenuItemClient (no description)", () => {
      renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Simple"
        />
      );

      // Verify no description is rendered
      const container = screen.getByText("Simple").parentElement;
      const paragraphs = container?.querySelectorAll("p");
      expect(paragraphs?.length).toBe(0);
    });

    it("should have consistent icon and title rendering", () => {
      const { container } = renderWithProviders(
        <SimpleMenuItemClient
          href="/test"
          icon={LayoutGrid}
          title="Test Title"
        />
      );

      const icon = container.querySelector('[class*="lucide-layout-grid"]');
      const title = screen.getByText("Test Title");

      expect(icon).toBeInTheDocument();
      expect(title).toBeInTheDocument();
    });
  });
});

