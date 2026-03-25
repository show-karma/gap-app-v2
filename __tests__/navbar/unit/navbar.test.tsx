/**
 * Unit tests for the main Navbar container component.
 *
 * Tests behavioral concerns:
 * - Renders a semantic nav element accessible to screen readers
 * - Contains both desktop navigation and mobile menu child components
 * - Is fixed-positioned for persistent visibility during scrolling
 * - Renders correctly across different auth states (unauthenticated, basic, admin, loading)
 * - Child components receive context (they render without errors)
 */

import { screen } from "@testing-library/react";
import { Navbar } from "@/src/components/navbar/navbar";
import { getAuthFixture } from "../fixtures/auth-fixtures";
import { renderWithProviders } from "../utils/test-helpers";

// Mock child components to isolate container testing
vi.mock("@/src/components/navbar/navbar-desktop-navigation", () => ({
  NavbarDesktopNavigation: () => (
    <div data-testid="navbar-desktop-navigation">Desktop Navigation</div>
  ),
}));

vi.mock("@/src/components/navbar/navbar-mobile-menu", () => ({
  NavbarMobileMenu: () => <div data-testid="navbar-mobile-menu">Mobile Menu</div>,
}));

vi.mock("@/src/components/shared/logo", () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

describe("Navbar - Main Container", () => {
  describe("semantic structure and accessibility", () => {
    it("renders a <nav> element with the navigation role", () => {
      renderWithProviders(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav.tagName).toBe("NAV");
    });

    it("is visible and not hidden from screen readers", () => {
      renderWithProviders(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toBeVisible();
      expect(nav).not.toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("child component composition", () => {
    it("renders both desktop navigation and mobile menu within the nav", () => {
      renderWithProviders(<Navbar />);

      const nav = screen.getByRole("navigation");
      const desktopNav = screen.getByTestId("navbar-desktop-navigation");
      const mobileMenu = screen.getByTestId("navbar-mobile-menu");

      expect(nav).toContainElement(desktopNav);
      expect(nav).toContainElement(mobileMenu);
    });
  });

  describe("fixed positioning for scroll persistence", () => {
    it("is fixed to the top of the viewport with high z-index", () => {
      renderWithProviders(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("fixed");
      expect(nav).toHaveClass("top-0");
      expect(nav).toHaveClass("z-50");
    });
  });

  describe("layout structure", () => {
    it("has a full-width nav with a constrained inner container", () => {
      renderWithProviders(<Navbar />);

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("w-full");

      const container = nav.querySelector("div");
      expect(container).toHaveClass("max-w-[1920px]");
      expect(container).toHaveClass("justify-between");
    });
  });

  describe("renders across auth states", () => {
    it("renders for unauthenticated users", () => {
      const fixture = getAuthFixture("unauthenticated");
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
        theme: "light",
      });

      expect(screen.getByRole("navigation")).toBeInTheDocument();
      expect(screen.getByTestId("navbar-desktop-navigation")).toBeInTheDocument();
      expect(screen.getByTestId("navbar-mobile-menu")).toBeInTheDocument();
    });

    it("renders for authenticated users with admin permissions", () => {
      const fixture = getAuthFixture("community-admin-single");
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
      });

      expect(screen.getByRole("navigation")).toBeInTheDocument();
      expect(screen.getByTestId("navbar-desktop-navigation")).toBeInTheDocument();
    });

    it("renders during authentication loading state", () => {
      const fixture = getAuthFixture("loading");
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
      });

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("renders in dark theme without errors", () => {
      const fixture = getAuthFixture("authenticated-basic");
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
        theme: "dark",
      });

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });
  });
});
