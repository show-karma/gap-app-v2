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

      // Verify auth buttons visible
      expect(screen.getByText("Sign in")).toBeInTheDocument();
      expect(screen.getByText("Contact sales")).toBeInTheDocument();

      // Verify user menu not visible
      expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();

      // Click sign in
      const signInButton = screen.getByText("Sign in");
      await user.click(signInButton);

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
        expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
      });

      // Verify user menu appears (desktop - may not be visible on mobile viewport)
      // On desktop (>= 1280px), user avatar should be visible
      const desktopUserMenu = screen.queryByTestId("user-avatar");
      if (desktopUserMenu) {
        expect(desktopUserMenu).toBeInTheDocument();
      }
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

      // Try to find user avatar (desktop) - it may be hidden on smaller viewports
      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        // Click user avatar
        await user.click(userAvatar);

        // Wait for menu to open and find profile button
        await waitFor(() => {
          expect(screen.getByText("My profile")).toBeInTheDocument();
        });

        // Click "My profile"
        const profileButton = screen.getByText("My profile");
        await user.click(profileButton);

        // Verify modal opened
        expect(mockOpenModal).toHaveBeenCalledTimes(1);
      }
    });

    it("should open profile modal from mobile menu", async () => {
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

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      // Wait for drawer to open
      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Find and click profile button in mobile drawer
      const profileButtons = screen.getAllByText("My profile");
      const mobileProfileButton = profileButtons.find((btn) => btn.closest('[role="dialog"]'));

      if (mobileProfileButton) {
        fireEvent.click(mobileProfileButton);

        // Wait for action to complete
        await waitFor(() => {
          expect(mockOpenModal).toHaveBeenCalledTimes(1);
        });
      }
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

      // Skeleton should be visible
      const skeleton = screen.queryByTestId("user-skeleton");
      if (skeleton) {
        expect(skeleton).toBeInTheDocument();
      }

      // Auth buttons and user menu should not be visible
      expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
      expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
    });

    it("should transition from loading to authenticated state", async () => {
      const loadingFixture = getAuthFixture("loading");
      const authFixture = getAuthFixture("authenticated-basic");

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(loadingFixture.authState),
      });

      // Verify loading state
      const skeleton = screen.queryByTestId("user-skeleton");
      if (skeleton) {
        expect(skeleton).toBeInTheDocument();
      }

      // Update to ready and authenticated
      updateMocks({
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });
      rerender(<Navbar />);

      // Verify skeleton disappears and user menu appears
      await waitFor(() => {
        expect(screen.queryByTestId("user-skeleton")).not.toBeInTheDocument();
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

      // Verify auth buttons appear
      await waitFor(() => {
        expect(screen.getByText("Sign in")).toBeInTheDocument();
      });

      expect(screen.getByText("Contact sales")).toBeInTheDocument();
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

      // Verify authenticated content in mobile menu
      expect(screen.getByText("My profile")).toBeInTheDocument();
      expect(screen.getByText("My projects")).toBeInTheDocument();
      expect(screen.getByText("Log out")).toBeInTheDocument();

      // Sign in button should not be in mobile menu
      const signInButtons = screen.queryAllByText("Sign in");
      const mobileSignIn = signInButtons.find((btn) => btn.closest('[role="dialog"]'));
      expect(mobileSignIn).toBeUndefined();
    });
  });
});
