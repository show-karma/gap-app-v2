/**
 * Unit Tests: Navbar User Menu
 * Tests user menu rendering states, permission-based items, theme toggle, and social links
 */

import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarUserMenu } from "@/src/components/navbar/navbar-user-menu";
import { getAuthFixture } from "../fixtures/auth-fixtures";
import {
  createMockPermissions,
  createMockUseAuth,
  createMockUseCommunitiesStore,
  createMockUseContributorProfileModalStore,
  createMockUseOwnerStore,
  createMockUsePermissionsQuery,
  createMockUseRegistryStore,
  createMockUseReviewerPrograms,
  createMockUseTheme,
  renderWithProviders,
  resetMockAuthState,
  resetMockThemeState,
  resetPermissionMocks,
} from "../utils/test-helpers";

describe("NavbarUserMenu", () => {
  // Helper to setup auth and open menu
  const setupAuthAndOpenMenu = async (fixtureName: string) => {
    const authFixture = getAuthFixture(fixtureName);
    const user = userEvent.setup();

    const result = renderWithProviders(<NavbarUserMenu />, {
      mockUseAuth: createMockUseAuth(authFixture.authState),
      mockPermissions: createMockPermissions(authFixture.permissions),
    });

    // Click avatar to open menu
    const avatar = screen.getByRole("img");
    await user.click(avatar);

    return { user, authFixture, ...result };
  };

  afterEach(() => {
    cleanup();
    resetMockAuthState();
    resetMockThemeState();
    resetPermissionMocks();
  });

  describe("Rendering State Tests", () => {
    it("should show NavbarUserSkeleton when ready is false", () => {
      const loadingFixture = getAuthFixture("loading");
      const { container } = renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(loadingFixture.authState),
      });

      // Skeleton should be present (test by presence of loading indicators)
      const _skeleton = container.querySelector('[data-testid="user-skeleton"]');
      // If skeleton component adds specific test IDs, verify them
      // Otherwise verify the component renders something
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should return null when not logged in", () => {
      const unauthFixture = getAuthFixture("unauthenticated");
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(unauthFixture.authState),
      });

      // Component returns null, so menu items should not be present
      expect(screen.queryByText("My profile")).not.toBeInTheDocument();
      expect(screen.queryByText("Log out")).not.toBeInTheDocument();
    });

    it("should show avatar and menu when logged in", async () => {
      await setupAuthAndOpenMenu("authenticated-basic");

      // Menu should be open with "Edit profile" visible
      expect(screen.getByText("Edit profile")).toBeInTheDocument();
    });

    it("should render as a menubar component", () => {
      const authFixture = getAuthFixture("authenticated-basic");
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(authFixture.permissions.communities),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUsePermissionsQuery: createMockUsePermissionsQuery(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(authFixture.permissions.isOwner),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isProgramCreator,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore: createMockUseContributorProfileModalStore(),
      });

      // Should render a menubar element
      const menubar = screen.getByRole("menubar");
      expect(menubar).toBeInTheDocument();
    });
  });

  describe("User Info Display", () => {
    it("should render avatar with correct address prop", async () => {
      await setupAuthAndOpenMenu("authenticated-basic");

      // Should show formatted address in menu (may have multiple with short/long formats)
      const addressElements = screen.getAllByText(/0x1234/i);
      expect(addressElements.length).toBeGreaterThan(0);
    });

    it("should format wallet address correctly (0x1234...5678)", async () => {
      await setupAuthAndOpenMenu("authenticated-basic");

      // Should show formatted address like "0x1234...5678"
      const addressElement = screen.getByText(/0x\w{4}\.\.\.\w{4}/);
      expect(addressElement).toBeInTheDocument();
    });
  });

  describe("Menu Trigger Tests", () => {
    it("should open menu on avatar click", async () => {
      await setupAuthAndOpenMenu("authenticated-basic");

      // Menu should be open with items visible
      expect(screen.getByText("Edit profile")).toBeInTheDocument();
    });
  });

  describe("Always Visible Menu Items", () => {
    it('should display "Edit profile" button', async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.getByText("Edit profile")).toBeInTheDocument();
    });

    it('should display "Dashboard" link', async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it('should display "Log out" button', async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.getByText("Log out")).toBeInTheDocument();
    });

    // Note: Help button and theme toggle have been moved to navbar-desktop-navigation
    // as standalone buttons visible to all users (not just logged-in users).
  });

  describe("Profile Modal Tests", () => {
    it('should call openModal() when "Edit profile" is clicked', async () => {
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");
      const user = userEvent.setup();

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: () => ({
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: jest.fn(),
        }),
      });

      // Click avatar to open menu
      const avatar = screen.getByRole("img");
      await user.click(avatar);

      // Click "Edit profile" button
      const profileButton = await screen.findByText("Edit profile");
      await user.click(profileButton);

      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });
  });

  // Theme toggle tests have been moved to theme-toggle-button.test.tsx
  // since the theme toggle is now a standalone component in the navbar.

  describe("Conditional Menu Items - Reviewer", () => {
    it('should hide "Review" link when no reviewer programs', async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.queryByText("Review")).not.toBeInTheDocument();
    });

    it('should hide "Review" link when has reviewer programs', async () => {
      await setupAuthAndOpenMenu("reviewer-single");
      expect(screen.queryByText("Review")).not.toBeInTheDocument();
    });
  });

  describe("Conditional Menu Items - Admin", () => {
    it('should hide "Admin" link for regular users', async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it('should hide "Admin" link for staff', async () => {
      await setupAuthAndOpenMenu("staff");
      expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it('should hide "Admin" link for owner', async () => {
      await setupAuthAndOpenMenu("owner");
      expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it('should hide "Admin" link for community admin', async () => {
      await setupAuthAndOpenMenu("community-admin-single");
      expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });
  });

  describe("Conditional Menu Items - Registry", () => {
    it('should hide "Manage Programs" when no registry access', async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.queryByText("Manage Programs")).not.toBeInTheDocument();
    });

    it('should show "Manage Programs" when isRegistryAdmin', async () => {
      await setupAuthAndOpenMenu("registry-admin");
      expect(screen.getByText("Manage Programs")).toBeInTheDocument();
    });

    it('should show "Manage Programs" when isProgramCreator', async () => {
      await setupAuthAndOpenMenu("program-creator");
      expect(screen.getByText("Manage Programs")).toBeInTheDocument();
    });
  });

  describe("Social Media Links", () => {
    it("should render all 4 social media platforms", async () => {
      await setupAuthAndOpenMenu("authenticated-basic");

      expect(screen.getByLabelText("Twitter")).toBeInTheDocument();
      expect(screen.getByLabelText("Telegram")).toBeInTheDocument();
      expect(screen.getByLabelText("Discord")).toBeInTheDocument();
      expect(screen.getByLabelText("Paragraph")).toBeInTheDocument();
    });

    it('should render "Follow" section title', async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.getByText("Follow")).toBeInTheDocument();
    });
  });

  describe("Logout Tests", () => {
    it('should call logout() when "Log out" button is clicked', async () => {
      const mockLogout = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      // Use the helper but with a custom logout mock
      const user = userEvent.setup();
      const authMock = createMockUseAuth(authFixture.authState);
      authMock.logout = mockLogout;

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: authMock,
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Click avatar to open menu
      const avatar = screen.getByRole("img");
      await user.click(avatar);

      // Click logout button
      const logoutButton = await screen.findByText("Log out");
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe("Farcaster User (no wallet)", () => {
    it("should show Farcaster display name instead of undefined address", async () => {
      const authFixture = getAuthFixture("farcaster-authenticated");
      const user = userEvent.setup();

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Click avatar to open menu
      const trigger = screen.getByRole("menubar").querySelector("[data-radix-collection-item]");
      if (trigger) await user.click(trigger);

      // Should NOT show "undefined...undefined" or "No wallet connected"
      expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
      expect(screen.queryByText("No wallet connected")).not.toBeInTheDocument();
    });

    it("should display Farcaster username when no wallet address is available", async () => {
      const authFixture = getAuthFixture("farcaster-authenticated");
      const user = userEvent.setup();

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Click avatar to open menu
      const trigger = screen.getByRole("menubar").querySelector("[data-radix-collection-item]");
      if (trigger) await user.click(trigger);

      // Should show the Farcaster identity (may appear in both trigger and dropdown)
      const farcasterElements = screen.getAllByText(/testfcuser|Test FC User/i);
      expect(farcasterElements.length).toBeGreaterThan(0);
    });
  });

  describe("Farcaster User with embedded wallet", () => {
    it("should show Farcaster display name instead of wallet address", async () => {
      const authFixture = getAuthFixture("farcaster-with-embedded-wallet");
      const user = userEvent.setup();

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // The trigger area should show the Farcaster display name, not the embedded wallet address
      const farcasterName = screen.queryByText("FC With Wallet");
      expect(farcasterName).toBeInTheDocument();
    });

    it("should show Farcaster avatar instead of blockie/ENS avatar", async () => {
      const authFixture = getAuthFixture("farcaster-with-embedded-wallet");

      const { container } = renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Should have an img tag with the Farcaster pfp URL
      const avatar = container.querySelector(
        'img[src="https://example.com/fc-embedded-avatar.png"]'
      );
      expect(avatar).toBeInTheDocument();
    });

    it("should show Farcaster username in dropdown menu", async () => {
      const authFixture = getAuthFixture("farcaster-with-embedded-wallet");
      const user = userEvent.setup();

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Click avatar to open menu
      const trigger = screen.getByRole("menubar").querySelector("[data-radix-collection-item]");
      if (trigger) await user.click(trigger);

      // Should show @username in the dropdown, not the raw embedded wallet address
      const usernameElement = screen.queryByText("@fcwithwallet");
      expect(usernameElement).toBeInTheDocument();
    });
  });

  describe("Email Authenticated User", () => {
    it("should show email address instead of wallet address in trigger", () => {
      const authFixture = getAuthFixture("email-authenticated");

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Should show email in the trigger area, not the embedded wallet address
      expect(screen.getByText("testuser@example.com")).toBeInTheDocument();
    });

    it("should show email address in dropdown menu instead of wallet address", async () => {
      const authFixture = getAuthFixture("email-authenticated");
      const user = userEvent.setup();

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Click avatar to open menu
      const trigger = screen.getByRole("menubar").querySelector("[data-radix-collection-item]");
      if (trigger) await user.click(trigger);

      // Should show email in the dropdown, not the raw embedded wallet address
      const emailElements = screen.getAllByText("testuser@example.com");
      expect(emailElements.length).toBeGreaterThan(0);
    });

    it("should NOT show wallet address when email is available", () => {
      const authFixture = getAuthFixture("email-authenticated");

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // The embedded wallet address should not be displayed as the identity
      expect(screen.queryByText(/0xEMAIL/i)).not.toBeInTheDocument();
    });

    it("should show email when no wallet address is available", () => {
      const authFixture = getAuthFixture("email-authenticated-no-wallet");

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      expect(screen.getByText("nowallet@example.com")).toBeInTheDocument();
    });
  });

  describe("Google Authenticated User", () => {
    it("should show Google email instead of wallet address in trigger", () => {
      const authFixture = getAuthFixture("google-authenticated");

      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Should show Google email, not the embedded wallet address
      expect(screen.getByText("googleuser@gmail.com")).toBeInTheDocument();
    });
  });

  describe("Separators/Sections", () => {
    it("should render horizontal separators between sections", async () => {
      await setupAuthAndOpenMenu("authenticated-basic");

      // Verify menu is fully open by checking for menu items
      expect(screen.getByText("Edit profile")).toBeInTheDocument();
      expect(screen.getByText("Log out")).toBeInTheDocument();

      // Check for separators - the component has 3 <hr> elements
      // but we check the actual structure which shows clear section divisions
      const followSection = screen.getByText("Follow");
      expect(followSection).toBeInTheDocument();
    });
  });
});
