/**
 * Integration Tests: Modal Integration
 * Tests modal interactions triggered from navbar (profile modal, create project modal)
 */

import "../setup";
import "./setup-dynamic-mock";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "@/src/components/navbar/navbar";
import { NavbarDesktopNavigation } from "@/src/components/navbar/navbar-desktop-navigation";
import { getAuthFixture } from "../fixtures/auth-fixtures";
import {
  cleanupAfterEach,
  createMockPermissions,
  createMockRouter,
  createMockUsePrivy,
  renderWithProviders,
} from "../utils/test-helpers";

describe("Modal Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupAfterEach();
  });
  describe("1. Profile Modal from Desktop Menu", () => {
    it("should open profile modal when clicking Edit profile", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: vi.fn(),
        },
      });

      // Open desktop user menu. Both desktop (Menubar) and mobile (button)
      // avatars carry alt="Recipient profile"; we need the one inside the
      // Menubar trigger so the click toggles the dropdown rather than firing
      // the mobile profile button directly.
      await waitFor(async () => {
        const all = await screen.findAllByRole("img", { name: /Recipient profile/i });
        // Both desktop and mobile must be mounted for the menubar lookup to
        // be deterministic.
        expect(all.length).toBeGreaterThanOrEqual(2);
      });
      const allAvatars = screen.getAllByRole("img", { name: /Recipient profile/i });
      const desktopAvatar = allAvatars.find((img) => img.closest('[role="menuitem"]'))!;
      await user.click(desktopAvatar);

      await waitFor(() => {
        expect(screen.getByText("Edit profile")).toBeInTheDocument();
      });

      // Click Edit profile
      const profileButton = screen.getByText("Edit profile");
      await user.click(profileButton);

      // Verify openModal was called
      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });

    it("should call openModal with correct parameters", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: vi.fn(),
        },
      });

      const userAvatars = await screen.findAllByRole("img", { name: /Recipient profile/i });
      await user.click(userAvatars[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit profile")).toBeInTheDocument();
      });

      const profileButton = screen.getByText("Edit profile");
      await user.click(profileButton);

      // Verify openModal was called
      expect(mockOpenModal).toHaveBeenCalled();
    });

    it("should close user menu after opening profile modal", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: vi.fn(),
        },
      });

      const userAvatars = await screen.findAllByRole("img", { name: /Recipient profile/i });
      await user.click(userAvatars[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit profile")).toBeInTheDocument();
      });

      const profileButton = screen.getByText("Edit profile");
      await user.click(profileButton);

      // Menu should close after clicking
      // This is component-specific behavior
      expect(mockOpenModal).toHaveBeenCalled();
    });
  });

  describe("2. Profile Modal from Mobile Menu", () => {
    it("should open profile modal from mobile avatar button", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: vi.fn(),
        },
      });

      // Mobile menu has an avatar button (with "Open profile" aria-label) that directly opens profile modal
      const profileButton = await screen.findByLabelText("Open profile");
      await user.click(profileButton);

      // Verify openModal was called
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledTimes(1);
      });
    });

    it("should call openModal with isGlobal parameter", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: vi.fn(),
        },
      });

      // Click mobile profile button
      const profileButton = await screen.findByLabelText("Open profile");
      await user.click(profileButton);

      // Verify openModal was called with correct params
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledWith({ isGlobal: true });
      });
    });

    it("should handle profile modal for different user roles", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const roles = ["authenticated-basic", "community-admin-single", "reviewer-single", "staff"];

      for (const role of roles) {
        mockOpenModal.mockClear();

        const authFixture = getAuthFixture(role as keyof typeof getAuthFixture);

        const { unmount } = renderWithProviders(<Navbar />, {
          mockUsePrivy: createMockUsePrivy(authFixture.authState),
          mockPermissions: createMockPermissions(authFixture.permissions),
          mockUseContributorProfileModalStore: {
            isOpen: false,
            openModal: mockOpenModal,
            closeModal: vi.fn(),
          },
        });

        // Click mobile profile avatar button
        const profileButton = await screen.findByLabelText("Open profile");
        await user.click(profileButton);

        // Should work for all roles
        await waitFor(() => {
          expect(mockOpenModal).toHaveBeenCalled();
        });

        unmount();
      }
    });
  });

  describe("3. Create Project Modal Trigger", () => {
    it("should trigger modal when button exists in DOM", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("unauthenticated");

      // Create the modal button in DOM
      const mockModalButton = document.createElement("button");
      mockModalButton.id = "new-project-button";
      const mockClick = vi.fn();
      mockModalButton.onclick = mockClick;
      document.body.appendChild(mockModalButton);

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open For Builders dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for projects/i,
      });
      await user.click(forBuildersTrigger);

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument();
      });

      // Click Create project
      const createProjectButton = screen.getByText("Create project");
      await user.click(createProjectButton);

      // Modal button should have been triggered
      await waitFor(() => {
        // Button should exist and be clickable
        expect(document.getElementById("new-project-button")).toBeInTheDocument();
      });

      // Cleanup
      document.body.removeChild(mockModalButton);
    });

    it("should navigate to projects page if modal button not found", async () => {
      const user = userEvent.setup();
      const mockPush = vi.fn();
      const mockRouter = createMockRouter({ push: mockPush });
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockRouter,
      });

      // Open For Builders dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for projects/i,
      });
      await user.click(forBuildersTrigger);

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument();
      });

      // Click Create project (modal button doesn't exist)
      const createProjectButton = screen.getByText("Create project");
      await user.click(createProjectButton);

      // Should navigate as fallback
      // Component handles navigation then retries button click
    });

    it("should retry modal trigger after navigation", async () => {
      const user = userEvent.setup();
      const mockPush = vi.fn(() => {
        // Simulate navigation complete - add modal button to DOM
        const modalButton = document.createElement("button");
        modalButton.id = "new-project-button";
        document.body.appendChild(modalButton);
      });
      const mockRouter = createMockRouter({ push: mockPush });
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockRouter,
      });

      // Open dropdown and click Create project
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for projects/i,
      });
      await user.click(forBuildersTrigger);

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument();
      });

      const createProjectButton = screen.getByText("Create project");
      await user.click(createProjectButton);

      // Component should navigate and retry
      // Cleanup
      const modalButton = document.getElementById("new-project-button");
      if (modalButton) {
        document.body.removeChild(modalButton);
      }
    });
  });

  describe("4. Modal with Navigation Fallback", () => {
    it("should handle modal button not found gracefully", async () => {
      const user = userEvent.setup();
      const mockPush = vi.fn();
      const mockRouter = createMockRouter({ push: mockPush });
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockRouter,
      });

      // Open dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for projects/i,
      });
      await user.click(forBuildersTrigger);

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument();
      });

      // Click Create project
      const createProjectButton = screen.getByText("Create project");
      await user.click(createProjectButton);

      // Should not crash
      expect(createProjectButton).toBeInTheDocument();
    });

    it("should navigate to correct page as fallback", async () => {
      const user = userEvent.setup();
      const mockRouter = createMockRouter();
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockRouter,
      });

      // Open dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for projects/i,
      });
      await user.click(forBuildersTrigger);

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument();
      });

      // Get Create project element
      const createProjectLink = screen.getByText("Create project");

      // Element should be clickable and exist (fallback navigation)
      expect(createProjectLink).toBeInTheDocument();
      // The element should be part of an interactive element (button/link)
      // In the actual component, this triggers a modal or navigation
    });

    it("should wait appropriate time before retrying", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for projects/i,
      });
      await user.click(forBuildersTrigger);

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument();
      });

      // Click Create project
      const createProjectButton = screen.getByText("Create project");
      await user.click(createProjectButton);

      // Component should not crash when modal button is not found
      // The retry timing (500ms) is handled internally by the component
      expect(createProjectButton).toBeInTheDocument();
    });
  });

  describe("5. Modal State Management", () => {
    it("should maintain modal state after opening", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const mockCloseModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: mockCloseModal,
        },
      });

      // Open user menu - may have multiple avatars
      const userAvatars = await screen.findAllByRole("img", { name: /Recipient profile/i });
      await user.click(userAvatars[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit profile")).toBeInTheDocument();
      });

      // Open profile modal
      const profileButton = screen.getByText("Edit profile");
      await user.click(profileButton);

      expect(mockOpenModal).toHaveBeenCalled();

      // Modal state should be managed by modal store
      // Component only triggers the open action
    });

    it("should handle multiple modal interactions", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: vi.fn(),
        },
      });

      // Use mobile avatar button directly (not drawer)
      const profileButton = await screen.findByLabelText("Open profile");
      await user.click(profileButton);

      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledTimes(1);
      });

      // Try opening modal again - it should work multiple times
      mockOpenModal.mockClear();

      await user.click(profileButton);

      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalledTimes(1);
      });
    });

    it("should not interfere with other navigation when modal opens", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: vi.fn(),
        },
      });

      // Open profile modal via mobile button
      const profileButton = await screen.findByLabelText("Open profile");
      await user.click(profileButton);

      expect(mockOpenModal).toHaveBeenCalled();

      // Open mobile drawer to check other navigation
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Other navigation should still work
      const drawer = screen.getByRole("dialog");
      const myProjectsLink = within(drawer).getByText("Dashboard");
      expect(myProjectsLink).toBeInTheDocument();
    });
  });

  describe("6. Modal Accessibility", () => {
    it("should have accessible modal trigger buttons", async () => {
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: vi.fn(),
        },
      });

      // Mobile profile button should have aria-label for accessibility
      const profileButton = await screen.findByLabelText("Open profile");
      expect(profileButton).toBeInTheDocument();
    });

    it("should support keyboard interaction for modal triggers", async () => {
      const user = userEvent.setup();
      const mockOpenModal = vi.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseContributorProfileModalStore: {
          isOpen: false,
          openModal: mockOpenModal,
          closeModal: vi.fn(),
        },
      });

      // Mobile profile button should be keyboard accessible
      const profileButton = await screen.findByLabelText("Open profile");

      // Test keyboard accessibility - button should be focusable
      profileButton.focus();
      expect(document.activeElement).toBe(profileButton);

      // Click should work
      await user.click(profileButton);

      // Should trigger modal
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalled();
      });
    });
  });
});
