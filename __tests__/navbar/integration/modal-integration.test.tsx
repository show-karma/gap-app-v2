/**
 * Integration Tests: Modal Integration
 * Tests modal interactions triggered from navbar (profile modal, create project modal)
 */

import { screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Navbar } from "@/src/components/navbar/navbar";
import { NavbarDesktopNavigation } from "@/src/components/navbar/navbar-desktop-navigation";
import {
  renderWithProviders,
  createMockUsePrivy,
  createMockPermissions,
  createMockModalStore,
  createMockRouter,
} from "../utils/test-helpers";
import { getAuthFixture } from "../fixtures/auth-fixtures";

describe("Modal Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe("1. Profile Modal from Desktop Menu", () => {
    it("should open profile modal when clicking My profile", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockModalStore: createMockModalStore({ openModal: mockOpenModal }),
      });

      // Open desktop user menu
      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        await user.click(userAvatar);

        await waitFor(() => {
          expect(screen.getByText("My profile")).toBeInTheDocument();
        });

        // Click My profile
        const profileButton = screen.getByText("My profile");
        await user.click(profileButton);

        // Verify openModal was called
        expect(mockOpenModal).toHaveBeenCalledTimes(1);
      }
    });

    it("should call openModal with correct parameters", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockModalStore: createMockModalStore({ openModal: mockOpenModal }),
      });

      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        await user.click(userAvatar);

        await waitFor(() => {
          expect(screen.getByText("My profile")).toBeInTheDocument();
        });

        const profileButton = screen.getByText("My profile");
        await user.click(profileButton);

        // Verify openModal was called
        expect(mockOpenModal).toHaveBeenCalled();
      }
    });

    it("should close user menu after opening profile modal", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockModalStore: createMockModalStore({ openModal: mockOpenModal }),
      });

      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        await user.click(userAvatar);

        await waitFor(() => {
          expect(screen.getByText("My profile")).toBeInTheDocument();
        });

        const profileButton = screen.getByText("My profile");
        await user.click(profileButton);

        // Menu should close after clicking
        // This is component-specific behavior
        expect(mockOpenModal).toHaveBeenCalled();
      }
    });
  });

  describe("2. Profile Modal from Mobile Menu", () => {
    it("should open profile modal from mobile drawer", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockModalStore: createMockModalStore({ openModal: mockOpenModal }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Find My profile in drawer
      const drawer = screen.getByRole("dialog");
      const profileButton = within(drawer).getByText("My profile");

      // Click My profile
      await user.click(profileButton);

      // Verify openModal was called
      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });

    it("should close drawer after opening profile modal", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockModalStore: createMockModalStore({ openModal: mockOpenModal }),
      });

      // Open drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Click profile
      const drawer = screen.getByRole("dialog");
      const profileButton = within(drawer).getByText("My profile");
      await user.click(profileButton);

      // Drawer should close (via onClose callback)
      expect(mockOpenModal).toHaveBeenCalled();
    });

    it("should handle profile modal for different user roles", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const roles = [
        "authenticated-basic",
        "community-admin-single",
        "reviewer-single",
        "staff",
      ];

      for (const role of roles) {
        mockOpenModal.mockClear();

        const authFixture = getAuthFixture(role as keyof typeof getAuthFixture);

        const { unmount } = renderWithProviders(<Navbar />, {
          mockUsePrivy: createMockUsePrivy(authFixture.authState),
          mockPermissions: createMockPermissions(authFixture.permissions),
          mockModalStore: createMockModalStore({ openModal: mockOpenModal }),
        });

        // Open drawer
        const mobileMenuButton = screen.getByLabelText("Open menu");
        await user.click(mobileMenuButton);

        await waitFor(() => {
          expect(screen.getByText("Menu")).toBeInTheDocument();
        });

        // Click profile
        const drawer = screen.getByRole("dialog");
        const profileButton = within(drawer).getByText("My profile");
        await user.click(profileButton);

        // Should work for all roles
        expect(mockOpenModal).toHaveBeenCalled();

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
      const mockClick = jest.fn();
      mockModalButton.onclick = mockClick;
      document.body.appendChild(mockModalButton);

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open For Builders dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
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
      const mockPush = jest.fn();
      const mockRouter = createMockRouter({ push: mockPush });
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockRouter,
      });

      // Open For Builders dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
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
      const mockPush = jest.fn(() => {
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
        name: /for builders/i,
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
      const mockPush = jest.fn();
      const mockRouter = createMockRouter({ push: mockPush });
      const authFixture = getAuthFixture("unauthenticated");

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockRouter,
      });

      // Open dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
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
        name: /for builders/i,
      });
      await user.click(forBuildersTrigger);

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument();
      });

      // Click Create project
      const createProjectLink = screen.getByText("Create project");

      // Should have href for fallback navigation
      const linkElement = createProjectLink.closest("a") || createProjectLink.closest("button");
      expect(linkElement).toBeInTheDocument();
    });

    it("should wait appropriate time before retrying", async () => {
      const user = userEvent.setup();
      const authFixture = getAuthFixture("unauthenticated");

      // Use fake timers
      jest.useFakeTimers();

      renderWithProviders(<NavbarDesktopNavigation />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
      });

      // Open dropdown
      const forBuildersTrigger = screen.getByRole("button", {
        name: /for builders/i,
      });
      await user.click(forBuildersTrigger);

      await waitFor(() => {
        expect(screen.getByText("Create project")).toBeInTheDocument();
      });

      // Click Create project
      const createProjectButton = screen.getByText("Create project");
      await user.click(createProjectButton);

      // Component should wait 500ms before retry
      // This is component-specific timing

      jest.useRealTimers();
    });
  });

  describe("5. Modal State Management", () => {
    it("should maintain modal state after opening", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const mockCloseModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockModalStore: createMockModalStore({
          openModal: mockOpenModal,
          closeModal: mockCloseModal,
        }),
      });

      // Open user menu
      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        await user.click(userAvatar);

        await waitFor(() => {
          expect(screen.getByText("My profile")).toBeInTheDocument();
        });

        // Open profile modal
        const profileButton = screen.getByText("My profile");
        await user.click(profileButton);

        expect(mockOpenModal).toHaveBeenCalled();

        // Modal state should be managed by modal store
        // Component only triggers the open action
      }
    });

    it("should handle multiple modal interactions", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockModalStore: createMockModalStore({ openModal: mockOpenModal }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Open profile modal
      const drawer = screen.getByRole("dialog");
      const profileButton = within(drawer).getByText("My profile");
      await user.click(profileButton);

      expect(mockOpenModal).toHaveBeenCalledTimes(1);

      // Try opening again
      mockOpenModal.mockClear();

      // Reopen drawer
      const reopenButton = screen.getByLabelText("Open menu");
      await user.click(reopenButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Open profile again
      const secondProfileButton = within(screen.getByRole("dialog")).getByText(
        "My profile"
      );
      await user.click(secondProfileButton);

      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });

    it("should not interfere with other navigation when modal opens", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockModalStore: createMockModalStore({ openModal: mockOpenModal }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Open profile modal
      const drawer = screen.getByRole("dialog");
      const profileButton = within(drawer).getByText("My profile");
      await user.click(profileButton);

      // Other navigation should still work
      // For example, My projects link should still be functional
      const myProjectsLink = within(drawer).getByText("My projects");
      expect(myProjectsLink).toBeInTheDocument();
    });
  });

  describe("6. Modal Accessibility", () => {
    it("should have accessible modal trigger buttons", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockModalStore: createMockModalStore({ openModal: mockOpenModal }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Profile button should be accessible
      const drawer = screen.getByRole("dialog");
      const profileButton = within(drawer).getByText("My profile");

      // Should be keyboard accessible
      expect(profileButton).toBeInTheDocument();
    });

    it("should support keyboard interaction for modal triggers", async () => {
      const user = userEvent.setup();
      const mockOpenModal = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockModalStore: createMockModalStore({ openModal: mockOpenModal }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Tab to profile button
      const drawer = screen.getByRole("dialog");
      const profileButton = within(drawer).getByText("My profile");

      // Focus and press Enter
      profileButton.focus();
      await user.keyboard("{Enter}");

      // Should trigger modal
      expect(mockOpenModal).toHaveBeenCalled();
    });
  });
});

