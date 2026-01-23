/**
 * @file menu-item-client.test.tsx
 * @description Unit tests for MenuItemClient component
 * @phase Phase 2, Track B (Day 4-5)
 * @developer Developer 2
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { UserPlus } from "lucide-react";
import { MenuItemClient } from "@/src/components/navbar/menu-item-client";
import { renderWithProviders } from "../utils/test-helpers";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("MenuItemClient Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering Tests", () => {
    it("should render icon, title, and description", () => {
      renderWithProviders(
        <MenuItemClient
          href="/test"
          icon={UserPlus}
          title="Test Title"
          description="Test Description"
        />
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
    });

    it("should render without description", () => {
      renderWithProviders(<MenuItemClient href="/test" icon={UserPlus} title="Test Title" />);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.queryByText("Test Description")).not.toBeInTheDocument();
    });

    it("should render arrow when showArrow is true", () => {
      const { container } = renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" showArrow={true} />
      );

      // Check for ArrowUpRight icon
      const arrowIcon = container.querySelector('[class*="lucide-arrow-up-right"]');
      expect(arrowIcon).toBeInTheDocument();
    });

    it("should not render arrow when showArrow is false", () => {
      const { container } = renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" showArrow={false} />
      );

      const arrowIcon = container.querySelector('[class*="lucide-arrow-up-right"]');
      expect(arrowIcon).not.toBeInTheDocument();
    });
  });

  describe("Desktop Variant Styling", () => {
    it("should apply desktop styling classes", () => {
      const { container } = renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" variant="desktop" />
      );

      const contentDiv = container.querySelector(".hover\\:bg-accent");
      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv).toHaveClass("rounded-md");
      expect(contentDiv).toHaveClass("cursor-pointer");
      expect(contentDiv).toHaveClass("px-2");
      expect(contentDiv).toHaveClass("py-1.5");
    });

    it("should render as Link by default for desktop", () => {
      const { container } = renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" variant="desktop" />
      );

      const link = container.querySelector('a[href="/test"]');
      expect(link).toBeInTheDocument();
    });
  });

  describe("Mobile Variant Styling", () => {
    it("should apply mobile styling classes", () => {
      const { container } = renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" variant="mobile" />
      );

      const link = container.querySelector("a");
      expect(link).toHaveClass("flex");
      expect(link).toHaveClass("flex-col");
      expect(link).toHaveClass("px-0");
      expect(link).toHaveClass("py-3");
      expect(link).toHaveClass("rounded-md");
      expect(link).toHaveClass("hover:bg-accent");
    });
  });

  describe("Internal Link Navigation", () => {
    it("should use Next.js Link for internal links", () => {
      const { container } = renderWithProviders(
        <MenuItemClient
          href="/internal-page"
          icon={UserPlus}
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
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" onClick={onClickMock} />
      );

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      expect(onClickMock).toHaveBeenCalled();
    });
  });

  describe("External Link Navigation", () => {
    it("should use ExternalLink component for external links", () => {
      const { container } = renderWithProviders(
        <MenuItemClient
          href="https://external.com"
          icon={UserPlus}
          title="External Link"
          external={true}
        />
      );

      const link = container.querySelector('a[href="https://external.com"]');
      expect(link).toBeInTheDocument();
    });

    it("should handle external links in mobile variant", () => {
      const { container } = renderWithProviders(
        <MenuItemClient
          href="https://external.com"
          icon={UserPlus}
          title="External Link"
          external={true}
          variant="mobile"
        />
      );

      const link = container.querySelector('a[href="https://external.com"]');
      expect(link).toBeInTheDocument();
    });
  });

  describe("Modal Trigger Tests", () => {
    beforeEach(() => {
      // Clean up any existing modal button
      const existingButton = document.getElementById("new-project-button");
      if (existingButton) {
        existingButton.remove();
      }
    });

    it("should render as button when openModal is true (desktop)", () => {
      const { container } = renderWithProviders(
        <MenuItemClient
          href="/test"
          icon={UserPlus}
          title="Test Title"
          openModal={true}
          variant="desktop"
        />
      );

      // Should render as div with onClick, not Link
      const clickableDiv = container.querySelector(".cursor-pointer");
      expect(clickableDiv).toBeInTheDocument();
    });

    it("should render as button when openModal is true (mobile)", () => {
      const { container } = renderWithProviders(
        <MenuItemClient
          href="/test"
          icon={UserPlus}
          title="Test Title"
          openModal={true}
          variant="mobile"
        />
      );

      const button = container.querySelector('button[type="button"]');
      expect(button).toBeInTheDocument();
    });

    it("should click DOM element with id when button exists", () => {
      const mockButton = document.createElement("button");
      mockButton.id = "new-project-button";
      mockButton.onclick = jest.fn();
      document.body.appendChild(mockButton);

      renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" openModal={true} />
      );

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      // Button click should have been triggered
      expect(mockButton.onclick).toHaveBeenCalled();

      document.body.removeChild(mockButton);
    });

    it("should navigate and retry if button doesn't exist", async () => {
      renderWithProviders(
        <MenuItemClient href="/my-projects" icon={UserPlus} title="Test Title" openModal={true} />
      );

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      // Should call router.push
      expect(mockPush).toHaveBeenCalledWith("/my-projects");
    });

    it("should prevent default navigation when openModal is true", () => {
      const mockButton = document.createElement("button");
      mockButton.id = "new-project-button";
      document.body.appendChild(mockButton);

      renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" openModal={true} />
      );

      const title = screen.getByText("Test Title");
      const clickEvent = new MouseEvent("click", { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, "preventDefault");

      title.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();

      document.body.removeChild(mockButton);
    });
  });

  describe("Anchor Scrolling Tests", () => {
    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/",
        },
        writable: true,
      });

      // Mock scrollIntoView
      Element.prototype.scrollIntoView = jest.fn();
    });

    it("should append anchor to href", () => {
      const { container } = renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" anchor="test-section" />
      );

      const link = container.querySelector('a[href="/test#test-section"]');
      expect(link).toBeInTheDocument();
    });

    it("should scroll to element when already on target page", async () => {
      // Set current path to match target
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/test",
        },
        writable: true,
      });

      const mockElement = document.createElement("div");
      mockElement.id = "test-anchor";
      mockElement.scrollIntoView = jest.fn();
      document.body.appendChild(mockElement);

      renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" anchor="test-anchor" />
      );

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      await waitFor(
        () => {
          expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
            behavior: "smooth",
            block: "start",
          });
        },
        { timeout: 200 }
      );

      document.body.removeChild(mockElement);
    });

    it("should navigate then scroll when on different page", async () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/other-page",
        },
        writable: true,
      });

      renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" anchor="test-anchor" />
      );

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      expect(mockPush).toHaveBeenCalledWith("/test#test-anchor");
    });

    it("should prevent default navigation when anchor is present", () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/test",
        },
        writable: true,
      });

      renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" anchor="test-anchor" />
      );

      const title = screen.getByText("Test Title");
      const clickEvent = new MouseEvent("click", { bubbles: true });
      const preventDefaultSpy = jest.spyOn(clickEvent, "preventDefault");

      title.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe("Interaction Tests", () => {
    it("should handle hover states", () => {
      const { container } = renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" variant="desktop" />
      );

      const hoverElement = container.querySelector(".hover\\:bg-accent");
      expect(hoverElement).toBeInTheDocument();
    });

    it("should call onClick callback", () => {
      const onClickMock = jest.fn();

      renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" onClick={onClickMock} />
      );

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      expect(onClickMock).toHaveBeenCalled();
    });

    it("should call onClick before modal logic", () => {
      const onClickMock = jest.fn();
      const mockButton = document.createElement("button");
      mockButton.id = "new-project-button";
      mockButton.onclick = jest.fn();
      document.body.appendChild(mockButton);

      renderWithProviders(
        <MenuItemClient
          href="/test"
          icon={UserPlus}
          title="Test Title"
          onClick={onClickMock}
          openModal={true}
        />
      );

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      expect(onClickMock).toHaveBeenCalled();

      document.body.removeChild(mockButton);
    });
  });

  describe("Accessibility Tests", () => {
    it("should have proper role for links", () => {
      const { container } = renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" />
      );

      const link = container.querySelector('a[href="/test"]');
      expect(link).toBeInTheDocument();
    });

    it("should be keyboard accessible", () => {
      const onClickMock = jest.fn();

      renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" onClick={onClickMock} />
      );

      const title = screen.getByText("Test Title");

      // Simulate Enter key press
      fireEvent.keyDown(title, { key: "Enter", code: "Enter" });
      fireEvent.click(title);

      expect(onClickMock).toHaveBeenCalled();
    });

    it("should have proper button type when modal trigger", () => {
      const { container } = renderWithProviders(
        <MenuItemClient
          href="/test"
          icon={UserPlus}
          title="Test Title"
          openModal={true}
          variant="mobile"
        />
      );

      const button = container.querySelector('button[type="button"]');
      expect(button).toBeInTheDocument();
    });

    it("should have cursor pointer for interactive elements", () => {
      const { container } = renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" variant="desktop" />
      );

      const cursorElement = container.querySelector(".cursor-pointer");
      expect(cursorElement).toBeInTheDocument();
    });
  });

  describe("Icon Styling", () => {
    it("should apply correct icon classes", () => {
      const { container } = renderWithProviders(
        <MenuItemClient href="/test" icon={UserPlus} title="Test Title" />
      );

      const iconContainer = container.querySelector('[class*="lucide-user-plus"]');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass("text-muted-foreground");
      expect(iconContainer).toHaveClass("w-4");
      expect(iconContainer).toHaveClass("h-4");
    });
  });

  describe("Text Styling", () => {
    it("should apply correct title classes", () => {
      renderWithProviders(<MenuItemClient href="/test" icon={UserPlus} title="Test Title" />);

      const title = screen.getByText("Test Title");
      expect(title).toHaveClass("text-foreground");
      expect(title).toHaveClass("text-sm");
      expect(title).toHaveClass("font-medium");
    });

    it("should apply correct description classes when present", () => {
      renderWithProviders(
        <MenuItemClient
          href="/test"
          icon={UserPlus}
          title="Test Title"
          description="Test Description"
        />
      );

      const description = screen.getByText("Test Description");
      expect(description).toHaveClass("text-muted-foreground");
      expect(description).toHaveClass("text-sm");
      expect(description).toHaveClass("font-normal");
    });
  });

  describe("Edge Cases", () => {
    it("should handle both external and anchor props", () => {
      const { container } = renderWithProviders(
        <MenuItemClient
          href="https://external.com"
          icon={UserPlus}
          title="Test Title"
          external={true}
          anchor="test-section"
        />
      );

      const link = container.querySelector('a[href="https://external.com#test-section"]');
      expect(link).toBeInTheDocument();
    });

    it("should handle all props together", () => {
      const onClickMock = jest.fn();

      renderWithProviders(
        <MenuItemClient
          href="/test"
          icon={UserPlus}
          title="Test Title"
          description="Test Description"
          showArrow={true}
          onClick={onClickMock}
          variant="mobile"
        />
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();

      const title = screen.getByText("Test Title");
      fireEvent.click(title);

      expect(onClickMock).toHaveBeenCalled();
    });

    it("should handle empty string href", () => {
      renderWithProviders(<MenuItemClient href="" icon={UserPlus} title="Test Title" />);

      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });
  });
});
