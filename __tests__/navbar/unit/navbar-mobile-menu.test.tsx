/**
 * Unit tests for NavbarMobileMenu component - Refactored to focus on behavior
 * Tests: Drawer behavior, authentication states, navigation structure
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarMobileMenu } from "@/src/components/navbar/navbar-mobile-menu";
import { getAuthFixture } from "../fixtures/auth-fixtures";
import {
  createMockPermissions,
  createMockUseAuth,
  renderWithProviders,
} from "../utils/test-helpers";

describe("NavbarMobileMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Drawer Behavior", () => {
    it("renders hamburger icon", () => {
      renderWithProviders(<NavbarMobileMenu />);

      const hamburgerButton = screen.getByLabelText(/open menu/i);
      expect(hamburgerButton).toBeInTheDocument();
    });

    it("drawer is closed by default", () => {
      renderWithProviders(<NavbarMobileMenu />);

      const drawerTitle = screen.queryByText("Menu");
      expect(drawerTitle).not.toBeInTheDocument();
    });

    it("opens drawer on hamburger button click", async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavbarMobileMenu />);

      const hamburgerButton = screen.getByLabelText(/open menu/i);
      await user.click(hamburgerButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });
    });

    it("close button appears when drawer is open", async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavbarMobileMenu />);

      const hamburgerButton = screen.getByLabelText(/open menu/i);
      await user.click(hamburgerButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/close menu/i)).toBeInTheDocument();
      });
    });
  });

  describe("Unauthenticated State", () => {
    it("shows Sign in button when unauthenticated", async () => {
      const user = userEvent.setup();
      const fixture = getAuthFixture("unauthenticated");

      renderWithProviders(<NavbarMobileMenu />, {
        mockUseAuth: createMockUseAuth(fixture.authState),
      });

      await user.click(screen.getByLabelText(/open menu/i));

      await waitFor(() => {
        expect(screen.getByText("Sign in")).toBeInTheDocument();
      });
    });

    it("shows Contact sales button", async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavbarMobileMenu />);

      await user.click(screen.getByLabelText(/open menu/i));

      await waitFor(() => {
        expect(screen.getByText("Contact sales")).toBeInTheDocument();
      });
    });

    it("shows navigation sections", async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavbarMobileMenu />);

      await user.click(screen.getByLabelText(/open menu/i));

      await waitFor(() => {
        expect(screen.getByText("For Builders")).toBeInTheDocument();
        expect(screen.getByText("For Funders")).toBeInTheDocument();
        // Explore section renders as "Explore Projects" and "Explore Communities" subsections
        expect(screen.getByText("Explore Projects")).toBeInTheDocument();
      });
    });

    it("shows Resources section", async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavbarMobileMenu />);

      await user.click(screen.getByLabelText(/open menu/i));

      await waitFor(() => {
        expect(screen.getByText("Resources")).toBeInTheDocument();
      });
    });
  });

  describe("Authenticated State", () => {
    it("shows Explore section and quick actions when authenticated", async () => {
      const user = userEvent.setup();
      const fixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<NavbarMobileMenu />, {
        mockUseAuth: createMockUseAuth(fixture.authState),
        mockPermissions: createMockPermissions(fixture.permissions),
      });

      await user.click(screen.getByLabelText(/open menu/i));

      await waitFor(() => {
        // When logged in, For Builders/Funders are hidden
        expect(screen.queryByText("For Builders")).not.toBeInTheDocument();
        expect(screen.queryByText("For Funders")).not.toBeInTheDocument();
        // Explore section renders as subsections
        expect(screen.getByText("Explore Projects")).toBeInTheDocument();
        // Quick actions appear instead
        expect(screen.getByText("My projects")).toBeInTheDocument();
      });
    });

    it("shows search bar when authenticated", async () => {
      const user = userEvent.setup();
      const fixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<NavbarMobileMenu />, {
        mockUseAuth: createMockUseAuth(fixture.authState),
        mockPermissions: createMockPermissions(fixture.permissions),
      });

      await user.click(screen.getByLabelText(/open menu/i));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search project\/community/i)).toBeInTheDocument();
      });
    });
  });

  describe("Search Functionality", () => {
    it("search bar present in drawer", async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavbarMobileMenu />);

      await user.click(screen.getByLabelText(/open menu/i));

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search project\/community/i);
        expect(searchInput).toBeInTheDocument();
      });
    });
  });

  describe("Social Links", () => {
    it("shows social links section", async () => {
      const user = userEvent.setup();
      renderWithProviders(<NavbarMobileMenu />);

      await user.click(screen.getByLabelText(/open menu/i));

      await waitFor(() => {
        expect(screen.getByText("Follow")).toBeInTheDocument();
      });
    });
  });

  describe("Responsive Display", () => {
    it("only visible on mobile/tablet (lg:hidden class)", () => {
      const { container } = renderWithProviders(<NavbarMobileMenu />);

      const mobileWrapper = container.querySelector(".lg\\:hidden");
      expect(mobileWrapper).toBeInTheDocument();
    });
  });
});
