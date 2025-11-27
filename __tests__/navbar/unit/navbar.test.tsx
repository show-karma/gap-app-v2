/**
 * Unit tests for main Navbar container component
 * Tests structural elements, child component integration, and context availability
 */

import React from "react";
import { screen } from "@testing-library/react";
import { Navbar } from "@/src/components/navbar/navbar";
import { renderWithProviders } from "../utils/test-helpers";
import { getAuthFixture } from "../fixtures/auth-fixtures";

// Mock child components to isolate container testing
jest.mock("@/src/components/navbar/navbar-desktop-navigation", () => ({
  NavbarDesktopNavigation: () => (
    <div data-testid="navbar-desktop-navigation">Desktop Navigation</div>
  ),
}));

jest.mock("@/src/components/navbar/navbar-mobile-menu", () => ({
  NavbarMobileMenu: () => (
    <div data-testid="navbar-mobile-menu">Mobile Menu</div>
  ),
}));

jest.mock("@/src/components/shared/logo", () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

describe("Navbar - Main Container", () => {
  describe("Structural Tests", () => {
    it("renders navigation element with correct role", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
    });

    it("applies correct structural classes", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      
      expect(nav).toHaveClass("flex");
      expect(nav).toHaveClass("bg-background");
      expect(nav).toHaveClass("w-full");
      expect(nav).toHaveClass("border-b");
      expect(nav).toHaveClass("border-border");
    });

    it("applies fixed positioning classes", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      
      expect(nav).toHaveClass("fixed");
      expect(nav).toHaveClass("top-0");
      expect(nav).toHaveClass("left-0");
      expect(nav).toHaveClass("right-0");
    });

    it("applies correct z-index for proper layering", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("z-50");
    });

    it("has proper container structure with inner div", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      const container = nav.querySelector("div");
      
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass("flex");
      expect(container).toHaveClass("justify-between");
      expect(container).toHaveClass("w-full");
    });

    it("applies responsive layout classes", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      
      expect(nav).toHaveClass("flex-row");
      expect(nav).toHaveClass("items-center");
      expect(nav).toHaveClass("justify-center");
    });

    it("has full width and min width constraints", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      
      expect(nav).toHaveClass("max-w-full");
      expect(nav).toHaveClass("min-w-min");
    });

    it("has consistent gap spacing", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("gap-8");
    });
  });

  describe("Child Component Integration", () => {
    it("renders desktop navigation component", () => {
      renderWithProviders(<Navbar />);
      expect(screen.getByTestId("navbar-desktop-navigation")).toBeInTheDocument();
    });

    it("renders mobile menu component", () => {
      renderWithProviders(<Navbar />);
      expect(screen.getByTestId("navbar-mobile-menu")).toBeInTheDocument();
    });

    it("renders both child components simultaneously", () => {
      renderWithProviders(<Navbar />);
      
      expect(screen.getByTestId("navbar-desktop-navigation")).toBeInTheDocument();
      expect(screen.getByTestId("navbar-mobile-menu")).toBeInTheDocument();
    });

    it("maintains proper component hierarchy", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      
      // Both components should be within the nav element
      expect(nav).toContainElement(screen.getByTestId("navbar-desktop-navigation"));
      expect(nav).toContainElement(screen.getByTestId("navbar-mobile-menu"));
    });
  });

  describe("Context Availability", () => {
    it("provides theme context to children when logged out", () => {
      const fixture = getAuthFixture("unauthenticated");
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
        theme: "light",
      });
      
      // Child components should render, indicating context is available
      expect(screen.getByTestId("navbar-desktop-navigation")).toBeInTheDocument();
      expect(screen.getByTestId("navbar-mobile-menu")).toBeInTheDocument();
    });

    it("provides auth context to children when logged in", () => {
      const fixture = getAuthFixture("authenticated-basic");
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
      });
      
      // Child components should render with auth context
      expect(screen.getByTestId("navbar-desktop-navigation")).toBeInTheDocument();
      expect(screen.getByTestId("navbar-mobile-menu")).toBeInTheDocument();
    });

    it("provides all contexts in dark theme", () => {
      const fixture = getAuthFixture("authenticated-basic");
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
        theme: "dark",
      });
      
      expect(screen.getByTestId("navbar-desktop-navigation")).toBeInTheDocument();
      expect(screen.getByTestId("navbar-mobile-menu")).toBeInTheDocument();
    });

    it("provides permission contexts for admin users", () => {
      const fixture = getAuthFixture("community-admin-single");
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
      });
      
      // Navbar should render with admin permission context
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("provides permission contexts for reviewer users", () => {
      const fixture = getAuthFixture("reviewer-single");
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
      });
      
      // Navbar should render with reviewer permission context
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("handles loading state gracefully", () => {
      const fixture = getAuthFixture("loading");
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions,
      });
      
      // Navbar should still render during loading
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });
  });

  describe("Border and Styling", () => {
    it("has bottom border for visual separation", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("border-b");
    });

    it("applies background color correctly", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("bg-background");
    });

    it("has correct border color class", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveClass("border-border");
    });
  });

  describe("Container Layout", () => {
    it("inner container has proper padding", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      const container = nav.querySelector("div");
      
      expect(container).toHaveClass("py-3");
    });

    it("inner container has max-width constraint", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      const container = nav.querySelector("div");
      
      expect(container).toHaveClass("max-w-[1920px]");
    });

    it("inner container has min-width constraint", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      const container = nav.querySelector("div");
      
      expect(container).toHaveClass("min-w-min");
    });

    it("inner container uses flexbox layout", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      const container = nav.querySelector("div");
      
      expect(container).toHaveClass("flex");
      expect(container).toHaveClass("flex-row");
    });

    it("inner container has space-between justification", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      const container = nav.querySelector("div");
      
      expect(container).toHaveClass("justify-between");
    });

    it("inner container aligns items center", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      const container = nav.querySelector("div");
      
      expect(container).toHaveClass("items-center");
    });

    it("inner container has consistent gap", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      const container = nav.querySelector("div");
      
      expect(container).toHaveClass("gap-8");
    });
  });

  describe("Accessibility", () => {
    it("uses semantic nav element", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      expect(nav.tagName).toBe("NAV");
    });

    it("is accessible to screen readers", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      
      // Should be visible to screen readers (not aria-hidden)
      expect(nav).not.toHaveAttribute("aria-hidden", "true");
    });

    it("has proper document flow", () => {
      renderWithProviders(<Navbar />);
      const nav = screen.getByRole("navigation");
      
      // Fixed positioning shouldn't remove from accessibility tree
      expect(nav).toBeVisible();
    });
  });
});

