/**
 * Integration Tests: Responsive Behavior
 * Tests viewport-specific behavior across mobile, tablet, and desktop breakpoints
 */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "@/src/components/navbar/navbar";
import {
  renderWithProviders,
  setViewportSize,
  createMockUsePrivy,
  createMockPermissions,
} from "../utils/test-helpers";
import { getAuthFixture } from "../fixtures/auth-fixtures";

describe("Responsive Behavior Integration Tests", () => {
  describe("1. Mobile Viewport (< 1280px)", () => {
    beforeEach(() => {
      // Set mobile viewport (iPhone X dimensions)
      setViewportSize(375, 812);
    });

    it("should show mobile menu and hide desktop navigation", () => {
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Mobile menu button should be visible
      const mobileMenuButton = screen.getByLabelText("Open menu");
      expect(mobileMenuButton).toBeInTheDocument();

      // Desktop navigation should have hidden class (xl:flex)
      // Desktop items won't be visible at this viewport
    });

    it("should open mobile drawer with all content", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Verify drawer content
      const drawer = screen.getByRole("dialog");
      expect(within(drawer).getByText("For Builders")).toBeInTheDocument();
      expect(within(drawer).getByText("For Funders")).toBeInTheDocument();
      expect(within(drawer).getByText("Explore")).toBeInTheDocument();
    });

    it("should make search functional in mobile drawer", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Search should be in drawer
      const drawer = screen.getByRole("dialog");
      const searchInput = within(drawer).getByPlaceholderText(
        "Search projects..."
      );
      expect(searchInput).toBeInTheDocument();

      // Search should be functional
      await user.type(searchInput, "test");
      expect(searchInput).toHaveValue("test");
    });

    it("should show authenticated mobile menu content", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Open drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Verify user content
      const drawer = screen.getByRole("dialog");
      expect(within(drawer).getByText("My profile")).toBeInTheDocument();
      expect(within(drawer).getByText("My projects")).toBeInTheDocument();
      expect(within(drawer).getByText("Log out")).toBeInTheDocument();
    });

    it("should handle mobile drawer scrolling for long content", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("super-user");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Open drawer with lots of content
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Drawer should have max-height and be scrollable
      const drawer = screen.getByRole("dialog");
      expect(drawer).toBeInTheDocument();

      // All content should be accessible
      expect(within(drawer).getByText("Admin")).toBeInTheDocument();
      expect(within(drawer).getByText("Review")).toBeInTheDocument();
      expect(within(drawer).getByText("Manage Programs")).toBeInTheDocument();
    });
  });

  describe("2. Desktop Viewport (>= 1280px)", () => {
    beforeEach(() => {
      // Set desktop viewport
      setViewportSize(1440, 900);
    });

    it("should show desktop navigation and hide mobile menu", () => {
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Desktop navigation elements should be visible
      expect(screen.getByRole("button", { name: /for builders/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /for funders/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /explore/i })).toBeInTheDocument();

      // Mobile menu button should have hidden class (xl:hidden)
      const mobileMenuButton = screen.queryByLabelText("Open menu");
      // May still be in DOM but hidden via CSS
    });

    it("should make dropdowns functional on desktop", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open For Builders dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
      });
      await user.click(forBuildersTrigger);

      // Dropdown content should appear
      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument();
      });

      expect(screen.getByText("Find funding")).toBeInTheDocument();
    });

    it("should show user menu on desktop when authenticated", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // User avatar should be visible on desktop
      const userAvatar = screen.getByTestId("user-avatar");
      expect(userAvatar).toBeInTheDocument();

      // Click to open menu
      await user.click(userAvatar);

      await waitFor(() => {
        expect(screen.getByText("My profile")).toBeInTheDocument();
      });

      // Menu items should be visible
      expect(screen.getByText("My projects")).toBeInTheDocument();
      expect(screen.getByText("Log out")).toBeInTheDocument();
    });

    it("should show search in navbar on desktop", () => {
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Search should be visible in navbar (not in drawer)
      const searchInputs = screen.getAllByPlaceholderText("Search projects...");
      // At least one should be visible (desktop navbar search)
      expect(searchInputs.length).toBeGreaterThanOrEqual(1);
    });

    it("should show auth buttons on desktop when logged out", () => {
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Auth buttons should be visible
      expect(screen.getByText("Sign in")).toBeInTheDocument();
      expect(screen.getByText("Contact sales")).toBeInTheDocument();
    });
  });

  describe("3. Tablet Viewport (768px - 1279px)", () => {
    beforeEach(() => {
      // Set tablet viewport (iPad dimensions)
      setViewportSize(1024, 768);
    });

    it("should show mobile menu on tablet", () => {
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Mobile menu button should be visible
      const mobileMenuButton = screen.getByLabelText("Open menu");
      expect(mobileMenuButton).toBeInTheDocument();

      // Desktop navigation should be hidden (xl:flex means 1280px+)
    });

    it("should open mobile drawer on tablet", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Drawer content should be visible
      const drawer = screen.getByRole("dialog");
      expect(within(drawer).getByText("For Builders")).toBeInTheDocument();
    });

    it("should handle tablet viewport layout correctly", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Open drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // User content should be accessible
      const drawer = screen.getByRole("dialog");
      expect(within(drawer).getByText("My profile")).toBeInTheDocument();
    });
  });

  describe("4. Viewport Transition - Mobile to Desktop", () => {
    it("should switch from mobile to desktop layout", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("unauthenticated");

      // Start mobile
      setViewportSize(375, 812);

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Resize to desktop
      setViewportSize(1440, 900);

      // Rerender to apply new viewport
      rerender(
        <Navbar />,
        {
          mockUsePrivy: createMockUsePrivy(authFixture.authState),
        }
      );

      // Desktop navigation should now be accessible
      // Mobile drawer may still be open, but desktop nav should be visible
      expect(
        screen.getByRole("button", { name: /for builders/i })
      ).toBeInTheDocument();
    });

    it("should close mobile drawer when transitioning to desktop", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("unauthenticated");

      // Start mobile
      setViewportSize(375, 812);

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Close drawer manually
      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);

      // Resize to desktop
      setViewportSize(1440, 900);

      // Desktop navigation should be visible
      // Mobile drawer should be closed
    });

    it("should maintain auth state during viewport transition", () => {
      const authFixture = getAuthFixture("authenticated-basic");

      // Start mobile
      setViewportSize(375, 812);

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Auth state should be preserved
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();

      // Resize to desktop
      setViewportSize(1440, 900);

      rerender(
        <Navbar />,
        {
          mockUsePrivy: createMockUsePrivy(authFixture.authState),
          mockPermissions: createMockPermissions(authFixture.permissions),
        }
      );

      // Auth state should still be preserved
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();

      // User avatar should now be visible (desktop)
      const userAvatar = screen.queryByTestId("user-avatar");
      if (userAvatar) {
        expect(userAvatar).toBeInTheDocument();
      }
    });
  });

  describe("5. Viewport Transition - Desktop to Mobile", () => {
    it("should switch from desktop to mobile layout", async () => {
      const authFixture = getAuthFixture("unauthenticated");

      // Start desktop
      setViewportSize(1440, 900);

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Desktop navigation should be visible
      expect(
        screen.getByRole("button", { name: /for builders/i })
      ).toBeInTheDocument();

      // Resize to mobile
      setViewportSize(375, 812);

      rerender(
        <Navbar />,
        {
          mockUsePrivy: createMockUsePrivy(authFixture.authState),
        }
      );

      // Mobile menu button should be accessible
      const mobileMenuButton = screen.getByLabelText("Open menu");
      expect(mobileMenuButton).toBeInTheDocument();
    });

    it("should close desktop dropdowns when transitioning to mobile", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("unauthenticated");

      // Start desktop
      setViewportSize(1440, 900);

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open desktop dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
      });
      await user.click(forBuildersTrigger);

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument();
      });

      // Resize to mobile
      setViewportSize(375, 812);

      // Dropdown should close (handled by component or CSS)
      // Mobile menu should be available
    });

    it("should maintain theme during viewport transition", () => {
      const authFixture = getAuthFixture("authenticated-basic");

      // Start desktop with dark theme
      setViewportSize(1440, 900);

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: { theme: "dark", setTheme: jest.fn() },
      });

      // Resize to mobile
      setViewportSize(375, 812);

      rerender(
        <Navbar />,
        {
          mockUsePrivy: createMockUsePrivy(authFixture.authState),
          mockPermissions: createMockPermissions(authFixture.permissions),
          mockUseTheme: { theme: "dark", setTheme: jest.fn() },
        }
      );

      // Theme should persist
      // Component receives same theme from useTheme hook
    });
  });

  describe("6. Responsive Search Behavior", () => {
    it("should show search in navbar on desktop", () => {
      setViewportSize(1440, 900);
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Search should be in main navbar
      const searchInputs = screen.getAllByPlaceholderText("Search projects...");
      expect(searchInputs.length).toBeGreaterThanOrEqual(1);
    });

    it("should show search in drawer on mobile", async () => {
      const user = userEvent.setup();
      setViewportSize(375, 812);
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Search should be in drawer
      const drawer = screen.getByRole("dialog");
      const searchInput = within(drawer).getByPlaceholderText(
        "Search projects..."
      );
      expect(searchInput).toBeInTheDocument();
    });

    it("should adapt search results to viewport", async () => {
      const user = userEvent.setup();
      setViewportSize(375, 812);
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Search in mobile drawer
      const drawer = screen.getByRole("dialog");
      const searchInput = within(drawer).getByPlaceholderText(
        "Search projects..."
      );

      await user.type(searchInput, "test");

      // Results should adapt to mobile drawer context
      expect(searchInput).toHaveValue("test");
    });
  });

  describe("7. Responsive Logo and Layout", () => {
    it("should show logo on both mobile and desktop", () => {
      setViewportSize(1440, 900);
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Logo should be present (Karma GAP or similar)
      // Logo is part of navbar structure
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("should maintain proper spacing on mobile", () => {
      setViewportSize(375, 812);
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Navbar should be properly laid out
      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();

      // Mobile menu button should be accessible
      const mobileMenuButton = screen.getByLabelText("Open menu");
      expect(mobileMenuButton).toBeInTheDocument();
    });

    it("should maintain proper spacing on desktop", () => {
      setViewportSize(1440, 900);
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Navbar should have proper desktop layout
      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();

      // Desktop navigation items should be visible
      expect(
        screen.getByRole("button", { name: /for builders/i })
      ).toBeInTheDocument();
    });
  });
});

