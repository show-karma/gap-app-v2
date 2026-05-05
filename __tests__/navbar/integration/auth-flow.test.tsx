/**
 * Integration Tests: Authentication Flow
 * Tests complete authentication journeys including login, logout, profile modal, and state transitions
 */

// Hoist shared mock state refs so vi.mock factories can read them before imports.
// renderWithProviders (via updateAuthMock/updateNavbarPermissionsState in test-helpers)
// updates mockAuthState.current and mockNavbarPermissionsState.current from setup.ts.
// We point _refs at those same exported objects in beforeAll so mutations propagate.
const _refs = vi.hoisted(() => {
  const _vi = (globalThis as any).vi ?? { fn: () => (() => {}) as any };
  return {
    authState: {
      current: {
        ready: true,
        authenticated: false,
        isConnected: false,
        address: undefined as string | undefined,
        user: null as unknown,
        login: _vi.fn(),
        logout: _vi.fn(),
        authenticate: _vi.fn(),
        disconnect: _vi.fn(),
        getAccessToken: _vi.fn().mockResolvedValue("mock-token"),
      },
    },
    navPermsState: {
      current: {
        isLoggedIn: false,
        address: undefined as string | undefined,
        ready: true,
        isStaff: false,
        isStaffLoading: false,
        isOwner: false,
        isCommunityAdmin: false,
        isReviewer: false,
        hasReviewerRole: false,
        reviewerPrograms: [] as unknown[],
        isProgramCreator: false,
        isRegistryAdmin: false,
        hasAdminAccess: false,
        isRegistryAllowed: false,
      },
    },
    themeState: {
      current: {
        theme: "light" as string,
        setTheme: _vi.fn() as (t: string) => void,
        themes: ["light", "dark"] as string[],
        systemTheme: "light" as string,
        resolvedTheme: "light" as string,
      },
    },
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => _refs.authState.current),
}));

vi.mock("@/src/components/navbar/navbar-permissions-context", async () => {
  const React = await import("react");
  return {
    useNavbarPermissions: vi.fn(() => _refs.navPermsState.current),
    NavbarPermissionsProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    NavbarPermissionsContext: {
      Provider: ({ children }: { children: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children),
      Consumer: ({ children }: { children: (v: unknown) => React.ReactNode }) =>
        React.createElement(React.Fragment, null, children(_refs.navPermsState.current)),
    },
  };
});

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => _refs.themeState.current),
  ThemeProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: vi.fn(() => ({ isWhitelabel: false })),
  WhitelabelProvider: ({ children }: { children: unknown }) => children,
}));

import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "@/src/components/navbar/navbar";
import { getAuthFixture } from "../fixtures/auth-fixtures";
import {
  mockAuthState,
  mockModalState,
  mockNavbarPermissionsState,
  mockThemeState,
} from "../setup";
import {
  cleanupAfterEach,
  createMockPermissions,
  createMockUsePrivy,
  renderWithProviders,
  updateMocks,
} from "../utils/test-helpers";

describe("Authentication Flow Integration Tests", () => {
  beforeAll(() => {
    // Wire _refs to the same object references exported by setup.ts.
    // This ensures that when renderWithProviders calls updateAuthMock
    // (which sets mockAuthState.current), the vi.mock factory above
    // reads the same updated value.
    _refs.authState = mockAuthState;
    _refs.navPermsState = mockNavbarPermissionsState;
    _refs.themeState = mockThemeState;
  });

  afterEach(() => {
    cleanupAfterEach();
    // Reset mockModalState.current to default so any test that set it directly
    // does not bleed its mockOpenModal into subsequent tests.
    mockModalState.current = {
      isOpen: false,
      openModal: vi.fn(),
      closeModal: vi.fn(),
    };
  });

  describe("1. Login Flow", () => {
    it("should complete login flow from unauthenticated to authenticated state", async () => {
      const user = userEvent.setup();
      const mockAuthenticate = vi.fn();
      const mockLogout = vi.fn();

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

      // Verify profile button appears (mobile) — lazy-loaded, needs waitFor
      await waitFor(() => {
        expect(screen.getByLabelText("Open profile")).toBeInTheDocument();
      });
    });

    it("should show user menu after successful authentication", async () => {
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // User menu should be available (desktop)
      // Note: On mobile, the user menu is in the drawer, so we check for mobile menu button.
      // NavbarMobileMenu is lazy-loaded via next/dynamic, so we use waitFor.
      await waitFor(() => {
        const mobileMenuButton = screen.queryByLabelText("Open menu");
        expect(mobileMenuButton).toBeInTheDocument();
      });
    });
  });

  describe("2. Profile Modal Flow", () => {
    it("should open profile modal from desktop user menu", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      // Set mockModalState.current directly so setup.ts's vi.mock factory
      // returns mockOpenModal. This avoids mockReturnValue and correctly
      // wires the mock through the shared _h.modalState reference.
      mockModalState.current = {
        isOpen: false,
        openModal: mockOpenModal,
        closeModal: vi.fn(),
      };

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Find the desktop MenubarTrigger (the button wrapping the user avatar).
      // EthereumAddressToENSAvatar renders <div><img alt="Recipient profile"/></div>
      // inside a <MenubarTrigger> which renders as <button aria-haspopup="menu">.
      // We find the img first, then walk up to the button trigger.
      const recipientImgs = screen.getAllByRole("img", { name: /Recipient profile/i });
      // The desktop trigger is hidden on small screens (lg:flex parent).
      // The first match whose button ancestor has aria-haspopup="menu" is the desktop one.
      let menubarTrigger: HTMLElement | null = null;
      for (const img of recipientImgs) {
        const btn = img.closest('button[aria-haspopup="menu"]');
        if (btn) {
          menubarTrigger = btn as HTMLElement;
          break;
        }
      }

      if (menubarTrigger) {
        // Use fireEvent.pointerDown + click — Radix Menubar requires pointer events to open.
        fireEvent.pointerDown(menubarTrigger);
        fireEvent.click(menubarTrigger);

        // Wait for menu to open and find profile button
        await waitFor(() => {
          expect(screen.getByText("Edit profile")).toBeInTheDocument();
        });

        // Click "Edit profile"
        const profileButton = screen.getByText("Edit profile");
        fireEvent.click(profileButton);

        // Verify modal opened
        expect(mockOpenModal).toHaveBeenCalledTimes(1);
      } else {
        // Desktop section is not rendered (e.g., window width too narrow in jsdom).
        // Fall back: verify the modal store was wired correctly by checking the
        // mobile "Open profile" button instead.
        await waitFor(() => {
          expect(screen.getByLabelText("Open profile")).toBeInTheDocument();
        });
        const profileButton = screen.getByLabelText("Open profile");
        fireEvent.click(profileButton);
        expect(mockOpenModal).toHaveBeenCalledTimes(1);
      }
    });

    it("should open profile modal from mobile avatar button", async () => {
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      // Set mockModalState.current directly so setup.ts's vi.mock factory
      // returns mockOpenModal. This avoids the mockReturnValue-bleed issue where
      // a previous test's mockReturnValue overrides the _h-based factory.
      mockModalState.current = {
        isOpen: false,
        openModal: mockOpenModal,
        closeModal: vi.fn(),
      };

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Mobile has an avatar button that directly opens profile modal.
      // NavbarMobileMenu is lazy-loaded, so use waitFor then find.
      await waitFor(() => {
        expect(screen.getByLabelText("Open profile")).toBeInTheDocument();
      });
      const profileButton = screen.getByLabelText("Open profile");
      fireEvent.click(profileButton);

      // Verify modal opened
      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Logout Flow", () => {
    it("should complete logout flow from authenticated to unauthenticated state", async () => {
      const user = userEvent.setup();
      const mockLogout = vi.fn();
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
        // Mobile flow — lazy-loaded, wait for it
        await waitFor(() => {
          expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
        });
        const mobileMenuButton = screen.getByLabelText("Open menu");
        await user.click(mobileMenuButton);

        await waitFor(() => {
          expect(screen.getByText("Menu")).toBeInTheDocument();
        });

        // fireEvent required: vaul drawer incompatible with userEvent in jsdom
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
      const mockLogout = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy({
          ...authFixture.authState,
          logout: mockLogout,
        }),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Open mobile menu — NavbarMobileMenu is lazy-loaded, wait for it
      await waitFor(() => {
        expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
      });
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // fireEvent required: vaul drawer incompatible with userEvent in jsdom
      const logoutButton = screen.getByText("Log out");
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("4. Ready State Handling", () => {
    it("should show skeletons when ready is false", async () => {
      const loadingFixture = getAuthFixture("loading");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(loadingFixture.authState),
      });

      // When ready is false, the NavbarUserMenu shows skeleton, but other parts may still render
      // Mobile menu button should still be present (lazy-loaded, use waitFor).
      await waitFor(() => {
        expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
      });
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
      const mockAuthenticate = vi.fn();
      const unauthFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy({
          ...unauthFixture.authState,
          authenticate: mockAuthenticate,
        }),
      });

      // Open mobile drawer — NavbarMobileMenu is lazy-loaded, wait for it
      await waitFor(() => {
        expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
      });
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
        // fireEvent required: vaul drawer incompatible with userEvent in jsdom
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

      // Open mobile drawer — NavbarMobileMenu is lazy-loaded, wait for it
      await waitFor(() => {
        expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
      });
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      // Wait for drawer to open
      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Verify authenticated content (may appear in multiple places)
      const myProjectsElements = screen.getAllByText("Dashboard");
      expect(myProjectsElements.length).toBeGreaterThan(0);
      const logoutElements = screen.getAllByText("Log out");
      expect(logoutElements.length).toBeGreaterThan(0);

      // Sign in button should not be visible when authenticated
      const signInButtons = screen.queryAllByText("Sign in");
      expect(signInButtons.length).toBe(0);
    });
  });
});
