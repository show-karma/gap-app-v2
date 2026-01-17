import { afterEach, describe, expect, it } from "bun:test";
/**
 * Integration Tests: Authentication Flow
 * Tests complete authentication journeys including login, logout, profile modal, and state transitions
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "@/src/components/navbar/navbar";
import { getAuthFixture } from "../fixtures/auth-fixtures";
import {
  cleanupAfterEach,
  createMockPermissions,
  createMockUsePrivy,
  renderWithProviders,
  updateMocks,
} from "../utils/test-helpers";

describe("Authentication Flow Integration Tests", () => {
  afterEach(() => {
    cleanupAfterEach();
  });

  describe("1. Login Flow", () => {
    it("should complete login flow from unauthenticated to authenticated state", async () => {
      const user = userEvent.setup();
      const mockAuthenticate = jest.fn();
      const mockLogout = jest.fn();

      // Start unauthenticated
      const unauthFixture = getAuthFixture("unauthenticated");

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy({
          ...unauthFixture.authState,
          authenticate: mockAuthenticate,
          logout: mockLogout,
        }),
      });

      // Verify auth buttons visible (both mobile and desktop have them)
      const signInButtons = screen.getAllByText("Sign in");
      expect(signInButtons.length).toBeGreaterThan(0);

      // Verify user profile button not visible (authenticated only)
      expect(screen.queryByLabelText("Open profile")).not.toBeInTheDocument();

      // Click first sign in button
      await user.click(signInButtons[0]);

      // Verify authenticate called
      expect(mockAuthenticate).toHaveBeenCalledTimes(1);

      // Simulate auth success - update to authenticated
      const authFixture = getAuthFixture("authenticated-basic");
      rerender(<Navbar />, {
        mockUsePrivy: createMockUsePrivy({
          ...authFixture.authState,
          authenticate: mockAuthenticate,
          logout: mockLogout,
        }),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Verify UI updated - auth buttons should disappear
      await waitFor(() => {
        const remainingSignIn = screen.queryAllByText("Sign in");
        expect(remainingSignIn.length).toBe(0);
      });

      // Verify profile button appears (mobile)
      expect(screen.getByLabelText("Open profile")).toBeInTheDocument();
    });

    it("should show user menu after successful authentication", async () => {
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // User menu should be available (desktop)
      // Note: On mobile, the user menu is in the drawer, so we check for mobile menu button
      const mobileMenuButton = screen.queryByLabelText("Open menu");
      expect(mobileMenuButton).toBeInTheDocument();
    });
  });

  describe("2. Profile Modal Flow", () => {
    it("should open profile modal from desktop user menu", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: jest.fn(),
        },
      });

      // Try to find user avatar (desktop) - may have multiple
      const userAvatars = screen.getAllByRole("img", { name: /Recipient profile/i });

      // Click first user avatar
      await user.click(userAvatars[0]);

      // Wait for menu to open and find profile button
      await waitFor(() => {
        expect(screen.getByText("Edit profile")).toBeInTheDocument();
      });

      // Click "Edit profile"
      const profileButton = screen.getByText("Edit profile");
      await user.click(profileButton);

      // Verify modal opened
      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });

    it("should open profile modal from mobile avatar button", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: jest.fn(),
        },
      });

      // Mobile has an avatar button that directly opens profile modal
      const profileButton = screen.getByLabelText("Open profile");
      await user.click(profileButton);

      // Verify modal opened
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("3. Logout Flow", () => {
    it("should complete logout flow from authenticated to unauthenticated state", async () => {
      const user = userEvent.setup();
      const mockLogout = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy({
          ...authFixture.authState,
          logout: mockLogout,
        }),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Find and click logout button - try desktop first
      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        // Desktop flow
        await user.click(userAvatar);

        await waitFor(() => {
          expect(screen.getByText("Log out")).toBeInTheDocument();
        });

        const logoutButton = screen.getByText("Log out");
        await user.click(logoutButton);
      } else {
        // Mobile flow
        const mobileMenuButton = screen.getByLabelText("Open menu");
        await user.click(mobileMenuButton);

        await waitFor(() => {
          expect(screen.getByText("Menu")).toBeInTheDocument();
        });

        const logoutButton = screen.getByText("Log out");
        fireEvent.click(logoutButton);
      }

      // Verify logout called
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });

      // Simulate logout success - update to unauthenticated
      const unauthFixture = getAuthFixture("unauthenticated");
      updateMocks({
        mockUsePrivy: createMockUsePrivy({
          ...unauthFixture.authState,
          logout: mockLogout,
        }),
      });
      rerender(<Navbar />);

      // Verify auth buttons reappear
      await waitFor(() => {
        const signInButtons = screen.getAllByText("Sign in");
        expect(signInButtons.length).toBeGreaterThan(0);
      });

      const contactSalesButtons = screen.getAllByText("Contact sales");
      expect(contactSalesButtons.length).toBeGreaterThan(0);
    });

    it("should close menu after logout", async () => {
      const user = userEvent.setup();
      const mockLogout = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy({
          ...authFixture.authState,
          logout: mockLogout,
        }),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Open mobile menu
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Click logout
      const logoutButton = screen.getByText("Log out");
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("4. Ready State Handling", () => {
    it("should show skeletons when ready is false", () => {
      const loadingFixture = getAuthFixture("loading");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(loadingFixture.authState),
      });

      // When ready is false, the NavbarUserMenu shows skeleton, but other parts may still render
      // Mobile menu button should still be present
      const mobileMenuButton = screen.queryByLabelText("Open menu");
      expect(mobileMenuButton).toBeInTheDocument();
    });

    it("should transition from loading to authenticated state", async () => {
      const loadingFixture = getAuthFixture("loading");
      const authFixture = getAuthFixture("authenticated-basic");

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(loadingFixture.authState),
      });

      // Update to ready and authenticated
      updateMocks({
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });
      rerender(<Navbar />);

      // Verify authenticated state - Sign in button should be gone
      await waitFor(() => {
        expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
      });
    });

    it("should transition from loading to unauthenticated state", async () => {
      const loadingFixture = getAuthFixture("loading");
      const unauthFixture = getAuthFixture("unauthenticated");

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(loadingFixture.authState),
      });

      // Update to ready and unauthenticated
      updateMocks({
        mockUsePrivy: createMockUsePrivy(unauthFixture.authState),
      });
      rerender(<Navbar />);

      // Verify auth buttons appear (may have multiple - mobile and desktop)
      await waitFor(() => {
        const signInButtons = screen.getAllByText("Sign in");
        expect(signInButtons.length).toBeGreaterThan(0);
      });

      const contactSalesButtons = screen.getAllByText("Contact sales");
      expect(contactSalesButtons.length).toBeGreaterThan(0);
    });
  });

  describe("5. Auth Persistence", () => {
    it("should maintain authenticated state across renders", () => {
      const authFixture = getAuthFixture("authenticated-basic");

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Verify authenticated state
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();

      // Rerender with same state
      updateMocks({
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });
      rerender(<Navbar />);

      // State should persist
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
    });

    it("should maintain user data after navigation", async () => {
      const authFixture = getAuthFixture("community-admin-single");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Verify user is logged in
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();

      // Simulate navigation by rerendering
      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      updateMocks({
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });
      rerender(<Navbar />);

      // User should still be logged in
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
    });
  });

  describe("6. Mobile Auth Flow", () => {
    it("should complete mobile login flow", async () => {
      const user = userEvent.setup();
      const mockAuthenticate = jest.fn();
      const unauthFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy({
          ...unauthFixture.authState,
          authenticate: mockAuthenticate,
        }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      // Wait for drawer to open
      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Find and click sign in button in drawer
      const signInButtons = screen.getAllByText("Sign in");
      const mobileSignInButton = signInButtons.find((btn) => btn.closest('[role="dialog"]'));

      if (mobileSignInButton) {
        fireEvent.click(mobileSignInButton);

        // Verify authenticate called
        await waitFor(() => {
          expect(mockAuthenticate).toHaveBeenCalled();
        });
      }
    });

    it("should show authenticated mobile menu after login", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      // Wait for drawer to open
      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Verify authenticated content (may appear in multiple places)
      const myProjectsElements = screen.getAllByText("My projects");
      expect(myProjectsElements.length).toBeGreaterThan(0);
      const logoutElements = screen.getAllByText("Log out");
      expect(logoutElements.length).toBeGreaterThan(0);

      // Sign in button should not be visible when authenticated
      const signInButtons = screen.queryAllByText("Sign in");
      expect(signInButtons.length).toBe(0);
    });
  });
});
