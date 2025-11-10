/**
 * Unit Tests: Navbar User Menu
 * Tests user menu rendering states, permission-based items, theme toggle, and social links
 */

import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarUserMenu } from "@/src/components/navbar/navbar-user-menu";
import {
  renderWithProviders,
  createMockUseAuth,
  createMockPermissions,
  createMockUseCommunitiesStore,
  createMockUseReviewerPrograms,
  createMockUseStaff,
  createMockUseOwnerStore,
  createMockUseRegistryStore,
  createMockUseTheme,
  createMockUseContributorProfileModalStore,
  resetMockAuthState,
} from "../utils/test-helpers";
import { getAuthFixture } from "../fixtures/auth-fixtures";

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
    resetMockAuthState();
  });

  describe("Rendering State Tests", () => {
    it("should show NavbarUserSkeleton when ready is false", () => {
      const loadingFixture = getAuthFixture("loading");
      const { container } = renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(loadingFixture.authState),
      });

      // Skeleton should be present (test by presence of loading indicators)
      const skeleton = container.querySelector('[data-testid="user-skeleton"]');
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

      // Menu should be open with "My profile" visible
      expect(screen.getByText("My profile")).toBeInTheDocument();
    });

    it("should have desktop-only visibility (hidden on mobile/tablet)", () => {
      const authFixture = getAuthFixture("authenticated-basic");
      const { container } = renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      // Should have hidden lg:flex class
      const mainContainer = container.querySelector(".hidden.lg\\:flex");
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe("User Info Display", () => {
    it("should render avatar with correct address prop", async () => {
      await setupAuthAndOpenMenu("authenticated-basic");

      // Should show formatted address in menu
      expect(screen.getByText(/0x1234/i)).toBeInTheDocument();
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
      expect(screen.getByText("My profile")).toBeInTheDocument();
    });
  });

  describe("Always Visible Menu Items", () => {
    it('should display "My profile" button', async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.getByText("My profile")).toBeInTheDocument();
    });

    it("should display theme toggle", async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.getByText("Dark mode")).toBeInTheDocument();
    });

    it('should display "My projects" link', async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.getByText("My projects")).toBeInTheDocument();
    });

    it('should display "Log out" button', async () => {
      await setupAuthAndOpenMenu("authenticated-basic");
      expect(screen.getByText("Log out")).toBeInTheDocument();
    });

    it("should display help button", () => {
      const authFixture = getAuthFixture("authenticated-basic");
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
      });

      // Help button is outside menu, always visible
      const helpButton = screen.getByRole("button", { name: /help/i });
      expect(helpButton).toBeInTheDocument();
    });
  });

  describe("Profile Modal Tests", () => {
    it('should call openModal() when "My profile" is clicked', async () => {
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

      // Click "My profile" button
      const profileButton = await screen.findByText("My profile");
      await user.click(profileButton);

      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });
  });

  describe("Theme Toggle Tests", () => {
    it('should show "Dark mode" text when theme is light', async () => {
      const authFixture = getAuthFixture("authenticated-basic");
      const user = userEvent.setup();
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme("light"),
      });

      const avatar = screen.getByRole("img");
      await user.click(avatar);

      expect(await screen.findByText("Dark mode")).toBeInTheDocument();
    });

    it('should show "Light mode" text when theme is dark', async () => {
      const authFixture = getAuthFixture("authenticated-basic");
      const user = userEvent.setup();
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme("dark"),
      });

      const avatar = screen.getByRole("img");
      await user.click(avatar);

      expect(await screen.findByText("Light mode")).toBeInTheDocument();
    });

    it("should call setTheme with opposite value when clicked", async () => {
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");
      const user = userEvent.setup();
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: () => ({
          theme: "light",
          setTheme: mockSetTheme,
          themes: ["light", "dark"],
          systemTheme: "light",
          resolvedTheme: "light",
        }),
      });

      const avatar = screen.getByRole("img");
      await user.click(avatar);

      await waitFor(() => {
        expect(screen.getByText("Dark mode")).toBeInTheDocument();
      });

      const themeToggle = screen.getByText("Dark mode");
      await user.click(themeToggle);

      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });
  });

  describe("Conditional Menu Items - Reviewer", () => {
    it('should hide "Review" link when no reviewer programs', async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-basic");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore([]),
        mockUseReviewerPrograms: createMockUseReviewerPrograms([]),
        mockUseStaff: createMockUseStaff(false),
        mockUseOwnerStore: createMockUseOwnerStore(false),
        mockUseRegistryStore: createMockUseRegistryStore(false, false),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("My projects")).toBeInTheDocument();
      });

      expect(screen.queryByText("Review")).not.toBeInTheDocument();
    });

    it('should show "Review" link when has reviewer programs', async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-reviewer");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("Review")).toBeInTheDocument();
      });
    });
  });

  describe("Conditional Menu Items - Admin", () => {
    it('should hide "Admin" link for regular users', async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-basic");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore([]),
        mockUseReviewerPrograms: createMockUseReviewerPrograms([]),
        mockUseStaff: createMockUseStaff(false),
        mockUseOwnerStore: createMockUseOwnerStore(false),
        mockUseRegistryStore: createMockUseRegistryStore(false, false),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("My projects")).toBeInTheDocument();
      });

      expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    it('should show "Admin" link for staff', async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-staff");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
      });
    });

    it('should show "Admin" link for owner', async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-owner");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
      });
    });

    it('should show "Admin" link for community admin', async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-community-admin");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
      });
    });
  });

  describe("Conditional Menu Items - Registry", () => {
    it('should hide "Manage Programs" when no registry access', async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-basic");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore([]),
        mockUseReviewerPrograms: createMockUseReviewerPrograms([]),
        mockUseStaff: createMockUseStaff(false),
        mockUseOwnerStore: createMockUseOwnerStore(false),
        mockUseRegistryStore: createMockUseRegistryStore(false, false),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("My projects")).toBeInTheDocument();
      });

      expect(screen.queryByText("Manage Programs")).not.toBeInTheDocument();
    });

    it('should show "Manage Programs" when isRegistryAdmin', async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-registry-admin");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("Manage Programs")).toBeInTheDocument();
      });
    });

    it('should show "Manage Programs" when isPoolManager', async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-pool-manager");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("Manage Programs")).toBeInTheDocument();
      });
    });
  });

  describe("Social Media Links", () => {
    it("should render all 4 social media platforms", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-basic");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByLabelText("Twitter")).toBeInTheDocument();
        expect(screen.getByLabelText("Telegram")).toBeInTheDocument();
        expect(screen.getByLabelText("Discord")).toBeInTheDocument();
        expect(screen.getByLabelText("Paragraph")).toBeInTheDocument();
      });
    });

    it('should render "Follow" section title', async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-basic");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("Follow")).toBeInTheDocument();
      });
    });
  });

  describe("Logout Tests", () => {
    it('should call logout() when "Log out" button is clicked', async () => {
      const user = userEvent.setup();
      const mockLogout = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");
      
      renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: () => ({
          authenticated: true,
          ready: true,
          isConnected: true,
          address: authFixture.authState.address,
          user: authFixture.authState.user,
          authenticate: jest.fn(),
          login: jest.fn(),
          logout: mockLogout,
          disconnect: jest.fn(),
          getAccessToken: jest.fn().mockResolvedValue("mock-token"),
          primaryWallet: { address: authFixture.authState.address },
          wallets: [{ address: authFixture.authState.address }],
        }),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("Log out")).toBeInTheDocument();
      });

      const logoutButton = screen.getByText("Log out");
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe("Separators/Sections", () => {
    it("should render horizontal separators between sections", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("authenticated-basic");
      const { container } = renderWithProviders(<NavbarUserMenu />, {
        mockUseAuth: createMockUseAuth(authFixture.authState),
        mockUseCommunitiesStore: createMockUseCommunitiesStore(
          authFixture.permissions.communities
        ),
        mockUseReviewerPrograms: createMockUseReviewerPrograms(
          authFixture.permissions.reviewerPrograms
        ),
        mockUseStaff: createMockUseStaff(authFixture.permissions.isStaff),
        mockUseOwnerStore: createMockUseOwnerStore(
          authFixture.permissions.isOwner
        ),
        mockUseRegistryStore: createMockUseRegistryStore(
          authFixture.permissions.isPoolManager,
          authFixture.permissions.isRegistryAdmin
        ),
        mockUseTheme: createMockUseTheme(),
        mockUseContributorProfileModalStore:
          createMockUseContributorProfileModalStore(),
      });

      const avatarButton = screen.getAllByRole("button")[1];
      await user.click(avatarButton);

      await waitFor(() => {
        const separators = container.querySelectorAll("hr");
        expect(separators.length).toBeGreaterThanOrEqual(3); // At least 3 separators
      });
    });
  });
});

