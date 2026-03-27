import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Next.js Link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { Search } from "lucide-react";
import { EmptyState } from "@/src/components/ui/EmptyState";

describe("EmptyState", () => {
  describe("required props", () => {
    it("renders title", () => {
      render(<EmptyState title="No results found" />);
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    it("renders title as h3 element", () => {
      render(<EmptyState title="No results found" />);
      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("No results found");
    });
  });

  describe("optional description", () => {
    it("renders description when provided", () => {
      render(<EmptyState title="No results" description="Try adjusting your filters." />);
      expect(screen.getByText("Try adjusting your filters.")).toBeInTheDocument();
    });

    it("does not render description element when not provided", () => {
      render(<EmptyState title="No results" />);
      // No <p> element for description
      const p = document.querySelector("p");
      expect(p).not.toBeInTheDocument();
    });
  });

  describe("optional icon", () => {
    it("renders icon when provided", () => {
      render(<EmptyState title="No results" icon={Search} />);
      // The icon is rendered inside the component
      const iconWrapper = document.querySelector(".rounded-full");
      expect(iconWrapper).toBeInTheDocument();
    });

    it("does not render icon wrapper when no icon provided", () => {
      render(<EmptyState title="No results" />);
      const iconWrapper = document.querySelector(".rounded-full");
      expect(iconWrapper).not.toBeInTheDocument();
    });
  });

  describe("action button", () => {
    it("renders action button when action is provided", () => {
      const handleClick = vi.fn();
      render(
        <EmptyState title="No results" action={{ label: "Create one", onClick: handleClick }} />
      );
      expect(screen.getByRole("button", { name: "Create one" })).toBeInTheDocument();
    });

    it("calls onClick when action button is clicked", () => {
      const handleClick = vi.fn();
      render(
        <EmptyState title="No results" action={{ label: "Add item", onClick: handleClick }} />
      );
      fireEvent.click(screen.getByRole("button", { name: "Add item" }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("renders action as link when href is provided", () => {
      render(<EmptyState title="No results" action={{ label: "Browse all", href: "/explore" }} />);
      const link = screen.getByRole("link", { name: "Browse all" });
      expect(link).toHaveAttribute("href", "/explore");
    });

    it("does not render action button when action is not provided", () => {
      render(<EmptyState title="No results" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("no HeroUI tokens in rendered output", () => {
    it("does not use HeroUI-specific class names", () => {
      const { container } = render(
        <EmptyState
          title="No items"
          description="Nothing here yet."
          action={{ label: "Add", onClick: vi.fn() }}
        />
      );
      const html = container.innerHTML;
      // HeroUI tokens look like "nextui-*" or "heroui-*"
      expect(html).not.toMatch(/heroui/i);
      expect(html).not.toMatch(/nextui/i);
    });

    it("uses standard Tailwind classes only", () => {
      const { container } = render(<EmptyState title="No items" description="Empty." />);
      const html = container.innerHTML;
      // Ensure we're using Tailwind (not HeroUI) utilities
      expect(html).toMatch(/flex/);
      expect(html).toMatch(/text-/);
    });
  });

  describe("className prop", () => {
    it("applies custom className to the Card wrapper", () => {
      const { container } = render(
        <EmptyState title="No results" className="custom-empty-state" />
      );
      expect(container.firstElementChild).toHaveClass("custom-empty-state");
    });
  });
});
