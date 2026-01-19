/**
 * @file Tests for Breadcrumbs component
 * @description Tests the breadcrumb navigation component
 */

import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "@/components/FundingPlatform/Breadcrumbs";
import "@testing-library/jest-dom";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("Breadcrumbs", () => {
  describe("rendering", () => {
    it("should render all breadcrumb items", () => {
      const items = [
        { label: "Dashboard", href: "/" },
        { label: "Programs", href: "/programs" },
        { label: "My Program" },
      ];

      render(<Breadcrumbs items={items} />);

      expect(screen.getByText("Programs")).toBeInTheDocument();
      expect(screen.getByText("My Program")).toBeInTheDocument();
    });

    it("should render links for items with href", () => {
      const items = [
        { label: "Dashboard", href: "/" },
        { label: "Programs", href: "/programs" },
        { label: "My Program" },
      ];

      render(<Breadcrumbs items={items} />);

      const programsLink = screen.getByRole("link", { name: "Programs" });
      expect(programsLink).toHaveAttribute("href", "/programs");
    });

    it("should not render link for the last item", () => {
      const items = [
        { label: "Dashboard", href: "/" },
        { label: "Programs", href: "/programs" },
        { label: "My Program", href: "/programs/my-program" },
      ];

      render(<Breadcrumbs items={items} />);

      // Last item should not be a link even if href is provided
      const lastItem = screen.getByText("My Program");
      expect(lastItem.tagName).toBe("SPAN");
    });

    it("should render home icon for first item", () => {
      const items = [{ label: "Home", href: "/" }, { label: "Programs" }];

      render(<Breadcrumbs items={items} />);

      // First item should have an icon but the text is in sr-only
      const srOnlyText = screen.getByText("Home");
      expect(srOnlyText).toHaveClass("sr-only");
    });
  });

  describe("separators", () => {
    it("should render chevron separators between items", () => {
      const items = [
        { label: "Dashboard", href: "/" },
        { label: "Programs", href: "/programs" },
        { label: "My Program" },
      ];

      const { container } = render(<Breadcrumbs items={items} />);

      // Should have 2 separator icons (between 3 items)
      const separators = container.querySelectorAll("svg");
      // First item has home icon, plus 2 chevron separators
      expect(separators.length).toBe(3);
    });

    it("should not render separator before first item", () => {
      const items = [{ label: "Dashboard", href: "/" }, { label: "Programs" }];

      const { container } = render(<Breadcrumbs items={items} />);

      // Get all list items
      const listItems = container.querySelectorAll("li");
      expect(listItems.length).toBe(2);
    });
  });

  describe("styling", () => {
    it("should apply custom className", () => {
      const items = [{ label: "Dashboard", href: "/" }];

      const { container } = render(<Breadcrumbs items={items} className="custom-class" />);

      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("custom-class");
    });

    it("should style last item differently from other items", () => {
      const items = [{ label: "Dashboard", href: "/" }, { label: "My Program" }];

      render(<Breadcrumbs items={items} />);

      const lastItem = screen.getByText("My Program");
      expect(lastItem).toHaveClass("text-gray-900", "font-medium");
    });

    it("should render intermediate items as links", () => {
      const items = [
        { label: "Dashboard", href: "/" },
        { label: "Programs", href: "/programs" },
        { label: "My Program" },
      ];

      render(<Breadcrumbs items={items} />);

      const programsLink = screen.getByRole("link", { name: "Programs" });
      expect(programsLink).toBeInTheDocument();
      expect(programsLink).toHaveAttribute("href", "/programs");
    });
  });

  describe("accessibility", () => {
    it("should have navigation role with aria-label", () => {
      const items = [{ label: "Dashboard", href: "/" }];

      render(<Breadcrumbs items={items} />);

      const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(nav).toBeInTheDocument();
    });

    it("should render as an ordered list", () => {
      const items = [{ label: "Dashboard", href: "/" }, { label: "Programs" }];

      render(<Breadcrumbs items={items} />);

      const list = screen.getByRole("list");
      expect(list.tagName).toBe("OL");
    });
  });

  describe("edge cases", () => {
    it("should handle single item", () => {
      const items = [{ label: "Dashboard" }];

      render(<Breadcrumbs items={items} />);

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("should handle items without href", () => {
      const items = [{ label: "Dashboard" }, { label: "Programs" }, { label: "My Program" }];

      render(<Breadcrumbs items={items} />);

      // All items should be spans since none have href
      const links = screen.queryAllByRole("link");
      expect(links.length).toBe(0);
    });
  });
});
