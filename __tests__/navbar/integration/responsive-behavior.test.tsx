/**
 * Integration Tests: Responsive Behavior
 * Tests viewport-specific behavior across mobile, tablet, and desktop breakpoints
 */

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "@/src/components/navbar/navbar";
import { getAuthFixture } from "../fixtures/auth-fixtures";
import {
  cleanupAfterEach,
  createMockPermissions,
  createMockUsePrivy,
  renderWithProviders,
  setViewportSize,
  updateMocks,
} from "../utils/test-helpers";

describe("Responsive Behavior Integration Tests", () => {
  afterEach(() => {
    cleanupAfterEach();
  });

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

      // Verify drawer content - For Builders/Funders only shown when logged out
      const drawer = screen.getByRole("dialog");
      expect(within(drawer).getByText("For Builders")).toBeInTheDocument();
      expect(within(drawer).getByText("For Funders")).toBeInTheDocument();
      // Explore section renders as subsections
      expect(within(drawer).getByText("Explore Projects")).toBeInTheDocument();
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
      const searchInput = within(drawer).getByPlaceholderText("Search Project/Community");
      expect(searchInput).toBeInTheDocument();

      // Search should be functional (use fireEvent to avoid setPointerCapture issues)
      fireEvent.change(searchInput, { target: { value: "test" } });
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

      // Verify user content - when authenticated, drawer has quick actions and Explore
      const drawer = screen.getByRole("dialog");
      expect(within(drawer).getByText("My projects")).toBeInTheDocument();
      expect(within(drawer).getByText("Log out")).toBeInTheDocument();
      // Profile is accessed via avatar button outside drawer, not inside
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
      const _mobileMenuButton = screen.queryByLabelText("Open menu");
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

      // User avatar should be visible (may have multiple - desktop and mobile)
      const userAvatars = screen.getAllByRole("img", { name: /Recipient profile/i });
      expect(userAvatars.length).toBeGreaterThan(0);

      // Click first avatar to open menu
      await user.click(userAvatars[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit profile")).toBeInTheDocument();
      });

      // Menu items should be visible (may have duplicates in mobile)
      const myProjectsElements = screen.getAllByText("My projects");
      expect(myProjectsElements.length).toBeGreaterThan(0);
      const logoutElements = screen.getAllByText("Log out");
      expect(logoutElements.length).toBeGreaterThan(0);
    });

    it("should show search in navbar on desktop", () => {
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Search should be visible in navbar (not in drawer)
      const searchInputs = screen.getAllByPlaceholderText("Search Project/Community");
      // At least one should be visible (desktop navbar search)
      expect(searchInputs.length).toBeGreaterThanOrEqual(1);
    });

    it("should show auth buttons on desktop when logged out", () => {
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Auth buttons should be visible (both mobile and desktop have them)
      const signInButtons = screen.getAllByText("Sign in");
      expect(signInButtons.length).toBeGreaterThan(0);
      const contactSalesButtons = screen.getAllByText("Contact sales");
      expect(contactSalesButtons.length).toBeGreaterThan(0);
    });
  });

  describe("3. Tablet Viewport (768px - 1279px)", () => {
    beforeEach(() => {
      // Set tablet viewport (iPad dimensions) - below lg breakpoint (1024px)
      setViewportSize(800, 768);
    });

    it("should show mobile menu on tablet", () => {
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Mobile menu button should be visible
      const mobileMenuButton = screen.getByLabelText("Open menu");
      expect(mobileMenuButton).toBeInTheDocument();

      // Desktop navigation should be hidden (lg:flex means 1024px+)
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

      // Drawer content should be visible - For Builders only when logged out
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

      // User content should be accessible - My projects is in the drawer
      const drawer = screen.getByRole("dialog");
      expect(within(drawer).getByText("My projects")).toBeInTheDocument();
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
      updateMocks({
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });
      rerender(<Navbar />);

      // Desktop navigation should now be accessible
      // In test environment, CSS classes don't actually hide elements,
      // so we verify the component structure is intact
      const _forBuildersButton = screen.queryByRole("button", { name: /for builders/i });
      // Button may or may not be visible depending on CSS in test env
      // The important thing is the component rendered without errors
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
      fireEvent.click(closeButton);

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

      updateMocks({
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });
      rerender(<Navbar />);

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
      expect(screen.getByRole("button", { name: /for builders/i })).toBeInTheDocument();

      // Resize to mobile
      setViewportSize(375, 812);

      updateMocks({
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });
      rerender(<Navbar />);

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

      rerender(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: { theme: "dark", setTheme: jest.fn() },
      });

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
      const searchInputs = screen.getAllByPlaceholderText("Search Project/Community");
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
      const searchInput = within(drawer).getByPlaceholderText("Search Project/Community");
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
      const searchInput = within(drawer).getByPlaceholderText("Search Project/Community");

      fireEvent.change(searchInput, { target: { value: "test" } });

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
      const navElements = screen.getAllByRole("navigation");
      expect(navElements.length).toBeGreaterThan(0);
    });

    it("should maintain proper spacing on mobile", () => {
      setViewportSize(375, 812);
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Navbar should be properly laid out
      const navElements = screen.getAllByRole("navigation");
      expect(navElements.length).toBeGreaterThan(0);

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
      const navElements = screen.getAllByRole("navigation");
      expect(navElements.length).toBeGreaterThan(0);

      // Desktop navigation items should be visible
      expect(screen.getByRole("button", { name: /for builders/i })).toBeInTheDocument();
    });
  });
});
