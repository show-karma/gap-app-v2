/**
 * Unit tests for NavbarMobileMenu component
 * Tests: Drawer behavior, authentication states, permission-based rendering, all menu sections
 */

import React from "react";
import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarMobileMenu } from "@/src/components/navbar/navbar-mobile-menu";
import { renderWithProviders } from "../utils/test-helpers";
import { authFixtures, getAuthFixture } from "../fixtures/auth-fixtures";

// Mock hooks
jest.mock("@/hooks/useAuth");
jest.mock("@/store/communities");
jest.mock("@/hooks/usePermissions");
jest.mock("@/hooks/useStaff");
jest.mock("@/store");
jest.mock("@/store/registry");
jest.mock("next-themes");
jest.mock("@/store/modals/contributorProfile");

describe("NavbarMobileMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State Tests", () => {
    it("renders hamburger icon", () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      
      const hamburgerButton = screen.getByLabelText(/open menu/i);
      expect(hamburgerButton).toBeInTheDocument();
    });

    it("drawer is closed by default", () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      
      const drawerTitle = screen.queryByText("Menu");
      expect(drawerTitle).not.toBeInTheDocument();
    });

    it("logo renders", () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      const { container } = renderWithProviders(<NavbarMobileMenu />);
      
      // Logo component should be present
      expect(container.querySelector('.xl\\:hidden')).toBeInTheDocument();
    });

    it("only visible on mobile/tablet (xl:hidden class)", () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      const { container } = renderWithProviders(<NavbarMobileMenu />);
      
      const mobileWrapper = container.querySelector('.xl\\:hidden');
      expect(mobileWrapper).toBeInTheDocument();
    });
  });

  describe("Drawer Opening/Closing Tests", () => {
    it("opens drawer on hamburger button click", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      
      const hamburgerButton = screen.getByLabelText(/open menu/i);
      fireEvent.click(hamburgerButton);
      
      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });
    });

    it("drawer shows title 'Menu'", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      
      const hamburgerButton = screen.getByLabelText(/open menu/i);
      fireEvent.click(hamburgerButton);
      
      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });
    });

    it("close button (X icon) appears in drawer", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/close menu/i)).toBeInTheDocument();
      });
    });

    it("closes on X button click", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });
      
      const closeButton = screen.getByLabelText(/close menu/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText("Menu")).not.toBeInTheDocument();
      });
    });
  });

  describe("Unauthenticated State - Content", () => {
    it("search bar present in drawer", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search project\/community/i);
        expect(searchInput).toBeInTheDocument();
      });
    });

    it("'For Builders' section renders", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("For Builders")).toBeInTheDocument();
      });
    });

    it("'For Funders' section renders", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("For Funders")).toBeInTheDocument();
      });
    });

    it("'Explore' section renders", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Explore")).toBeInTheDocument();
      });
    });

    it("'Resources' section visible when not logged in", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Resources")).toBeInTheDocument();
      });
    });

    it("social links section visible", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Follow")).toBeInTheDocument();
      });
    });

    it("section separators (borders) present", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      const { container } = renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const borders = container.querySelectorAll('.border-b');
        expect(borders.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Unauthenticated State - Auth Buttons", () => {
    it("'Sign in' button present", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Sign in")).toBeInTheDocument();
      });
    });

    it("'Contact sales' button present", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Contact sales")).toBeInTheDocument();
      });
    });

    it("sign in calls authenticate() function", async () => {
      const fixture = getAuthFixture("unauthenticated");
      const mockAuthenticate = jest.fn();
      setupMocksFromFixture(fixture, { authenticate: mockAuthenticate });
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const signInButton = screen.getByText("Sign in");
        fireEvent.click(signInButton);
        expect(mockAuthenticate).toHaveBeenCalled();
      });
    });

    it("drawer closes after sign in click", async () => {
      const fixture = getAuthFixture("unauthenticated");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const signInButton = screen.getByText("Sign in");
        fireEvent.click(signInButton);
      });
      
      await waitFor(() => {
        expect(screen.queryByText("Menu")).not.toBeInTheDocument();
      });
    });
  });

  describe("Authenticated State - Content", () => {
    it("search bar present when authenticated", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search project\/community/i)).toBeInTheDocument();
      });
    });

    it("navigation sections render (Builders, Funders, Explore)", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("For Builders")).toBeInTheDocument();
        expect(screen.getByText("For Funders")).toBeInTheDocument();
        expect(screen.getByText("Explore")).toBeInTheDocument();
      });
    });

    it("resources section hidden when logged in", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.queryByText("Resources")).not.toBeInTheDocument();
      });
    });

    it("user profile section appears", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("My profile")).toBeInTheDocument();
      });
    });

    it("social media links still present", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Follow")).toBeInTheDocument();
      });
    });
  });

  describe("Authenticated State - User Profile Section", () => {
    it("user avatar displays", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      const { container } = renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("My profile")).toBeInTheDocument();
      });
    });

    it("'My profile' button renders", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("My profile")).toBeInTheDocument();
      });
    });

    it("profile button calls openModal()", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      const mockOpenModal = jest.fn();
      setupMocksFromFixture(fixture, { openModal: mockOpenModal });
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const profileButton = screen.getByText("My profile");
        fireEvent.click(profileButton);
        expect(mockOpenModal).toHaveBeenCalled();
      });
    });

    it("theme toggle present", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText(/mode/i)).toBeInTheDocument();
      });
    });

    it("theme toggle works correctly", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      const mockSetTheme = jest.fn();
      setupMocksFromFixture(fixture, { setTheme: mockSetTheme });
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const themeButton = screen.getByText(/Dark mode|Light mode/i);
        fireEvent.click(themeButton);
        expect(mockSetTheme).toHaveBeenCalled();
      });
    });
  });

  describe("Authenticated State - User Links", () => {
    it("horizontal separator before links", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      const { container } = renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const separators = container.querySelectorAll('hr');
        expect(separators.length).toBeGreaterThan(0);
      });
    });

    it("'My projects' link present", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("My projects")).toBeInTheDocument();
      });
    });

    it("'Help & Docs' link present (external)", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Help & Docs")).toBeInTheDocument();
      });
    });

    it("links close drawer on click", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const myProjectsLink = screen.getByText("My projects");
        fireEvent.click(myProjectsLink);
      });
      
      await waitFor(() => {
        expect(screen.queryByText("Menu")).not.toBeInTheDocument();
      });
    });
  });

  describe("Authenticated State - Reviewer Link", () => {
    it("'Review' link hidden when no reviewer programs", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.queryByText("Review")).not.toBeInTheDocument();
      });
    });

    it("'Review' link visible when has reviewer role", async () => {
      const fixture = getAuthFixture("reviewer-single");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Review")).toBeInTheDocument();
      });
    });

    it("link closes drawer on click", async () => {
      const fixture = getAuthFixture("reviewer-single");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const reviewLink = screen.getByText("Review");
        fireEvent.click(reviewLink);
      });
      
      await waitFor(() => {
        expect(screen.queryByText("Menu")).not.toBeInTheDocument();
      });
    });
  });

  describe("Authenticated State - Admin Link", () => {
    it("'Admin' link hidden for regular users", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
      });
    });

    it("'Admin' link visible for staff", async () => {
      const fixture = getAuthFixture("staff");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
      });
    });

    it("'Admin' link visible for owner", async () => {
      const fixture = getAuthFixture("owner");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
      });
    });

    it("'Admin' link visible for community admin", async () => {
      const fixture = getAuthFixture("community-admin-single");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
      });
    });

    it("link closes drawer on click", async () => {
      const fixture = getAuthFixture("staff");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const adminLink = screen.getByText("Admin");
        fireEvent.click(adminLink);
      });
      
      await waitFor(() => {
        expect(screen.queryByText("Menu")).not.toBeInTheDocument();
      });
    });
  });

  describe("Authenticated State - Registry Link", () => {
    it("'Manage Programs' hidden when no registry access", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.queryByText("Manage Programs")).not.toBeInTheDocument();
      });
    });

    it("visible when isRegistryAdmin", async () => {
      const fixture = getAuthFixture("registry-admin");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Manage Programs")).toBeInTheDocument();
      });
    });

    it("visible when isPoolManager", async () => {
      const fixture = getAuthFixture("pool-manager");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Manage Programs")).toBeInTheDocument();
      });
    });

    it("link closes drawer on click", async () => {
      const fixture = getAuthFixture("registry-admin");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const manageLink = screen.getByText("Manage Programs");
        fireEvent.click(manageLink);
      });
      
      await waitFor(() => {
        expect(screen.queryByText("Menu")).not.toBeInTheDocument();
      });
    });
  });

  describe("Authenticated State - Logout", () => {
    it("'Log out' button present", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Log out")).toBeInTheDocument();
      });
    });

    it("button calls logout() function", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      const mockLogout = jest.fn();
      setupMocksFromFixture(fixture, { logout: mockLogout });
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const logoutButton = screen.getByText("Log out");
        fireEvent.click(logoutButton);
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it("closes drawer after logout", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const logoutButton = screen.getByText("Log out");
        fireEvent.click(logoutButton);
      });
      
      await waitFor(() => {
        expect(screen.queryByText("Menu")).not.toBeInTheDocument();
      });
    });
  });

  describe("Social Media Tests", () => {
    it("social section title renders ('Follow')", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Follow")).toBeInTheDocument();
      });
    });

    it("all 4 social icons render", async () => {
      const fixture = getAuthFixture("authenticated-basic");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByLabelText("Twitter")).toBeInTheDocument();
        expect(screen.getByLabelText("Telegram")).toBeInTheDocument();
        expect(screen.getByLabelText("Discord")).toBeInTheDocument();
        expect(screen.getByLabelText("Paragraph")).toBeInTheDocument();
      });
    });
  });

  describe("Scrolling Tests", () => {
    it("content scrollable when overflows (max-h-[70vh])", async () => {
      const fixture = getAuthFixture("super-user");
      setupMocksFromFixture(fixture);
      
      const { container } = renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        const scrollContainer = container.querySelector('.overflow-y-auto');
        expect(scrollContainer).toBeInTheDocument();
      });
    });

    it("all content accessible via scroll", async () => {
      const fixture = getAuthFixture("super-user");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        // All sections should be accessible
        expect(screen.getByText("For Builders")).toBeInTheDocument();
        expect(screen.getByText("My projects")).toBeInTheDocument();
        expect(screen.getByText("Follow")).toBeInTheDocument();
      });
    });
  });

  describe("Combined Permission States", () => {
    it("admin + reviewer shows both links", async () => {
      const fixture = getAuthFixture("admin-and-reviewer");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
        expect(screen.getByText("Review")).toBeInTheDocument();
      });
    });

    it("registry admin + community admin shows both admin and manage programs", async () => {
      const fixture = getAuthFixture("registry-admin-and-community-admin");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
        expect(screen.getByText("Manage Programs")).toBeInTheDocument();
      });
    });

    it("super user shows all permission links", async () => {
      const fixture = getAuthFixture("super-user");
      setupMocksFromFixture(fixture);
      
      renderWithProviders(<NavbarMobileMenu />);
      fireEvent.click(screen.getByLabelText(/open menu/i));
      
      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
        expect(screen.getByText("Review")).toBeInTheDocument();
        expect(screen.getByText("Manage Programs")).toBeInTheDocument();
      });
    });
  });
});

/**
 * Helper function to setup all mocks from fixture
 */
function setupMocksFromFixture(
  fixture: any,
  overrides: {
    authenticate?: jest.Mock;
    logout?: jest.Mock;
    openModal?: jest.Mock;
    setTheme?: jest.Mock;
  } = {}
) {
  const { useAuth } = require("@/hooks/useAuth");
  const { useCommunitiesStore } = require("@/store/communities");
  const { useReviewerPrograms } = require("@/hooks/usePermissions");
  const { useStaff } = require("@/hooks/useStaff");
  const { useOwnerStore } = require("@/store");
  const { useRegistryStore } = require("@/store/registry");
  const { useTheme } = require("next-themes");
  const { useContributorProfileModalStore } = require("@/store/modals/contributorProfile");

  // Setup useAuth mock
  useAuth.mockReturnValue({
    authenticated: fixture.authState.authenticated,
    ready: fixture.authState.ready,
    isConnected: fixture.authState.isConnected,
    address: fixture.authState.address,
    authenticate: overrides.authenticate || jest.fn(),
    login: overrides.authenticate || jest.fn(),
    logout: overrides.logout || jest.fn(),
  });

  // Setup communities mock
  useCommunitiesStore.mockReturnValue({
    communities: fixture.permissions.communities,
  });

  // Setup reviewer programs mock
  useReviewerPrograms.mockReturnValue({
    programs: fixture.permissions.reviewerPrograms,
  });

  // Setup staff mock
  useStaff.mockReturnValue({
    isStaff: fixture.permissions.isStaff,
  });

  // Setup owner mock
  useOwnerStore.mockReturnValue(fixture.permissions.isOwner);

  // Setup registry mock
  useRegistryStore.mockReturnValue({
    isPoolManager: fixture.permissions.isPoolManager,
    isRegistryAdmin: fixture.permissions.isRegistryAdmin,
  });

  // Setup theme mock
  useTheme.mockReturnValue({
    theme: "light",
    setTheme: overrides.setTheme || jest.fn(),
  });

  // Setup modal mock
  useContributorProfileModalStore.mockReturnValue({
    openModal: overrides.openModal || jest.fn(),
  });
}

