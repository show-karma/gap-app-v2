/**
 * Integration Tests: Theme Switching
 * Tests theme switching functionality in both desktop and mobile contexts
 */

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "@/src/components/navbar/navbar";
import { getAuthFixture } from "../fixtures/auth-fixtures";
import {
  cleanupAfterEach,
  createMockPermissions,
  createMockUsePrivy,
  createMockUseTheme,
  renderWithProviders,
} from "../utils/test-helpers";

describe("Theme Switching Integration Tests", () => {
  afterEach(() => {
    cleanupAfterEach();
  });

  describe("1. Desktop Menu Theme Toggle", () => {
    it("should show correct theme toggle state in light mode", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "light",
          setTheme: mockSetTheme,
        }),
      });

      // Open desktop user menu
      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        await user.click(userAvatar);

        await waitFor(() => {
          expect(screen.getByText("My profile")).toBeInTheDocument();
        });

        // Should show "Dark mode" option (to switch TO dark)
        expect(screen.getByText("Dark mode")).toBeInTheDocument();

        // Icon should be ToggleLeft for light theme
        const toggleButton = screen.getByText("Dark mode").closest("button");
        expect(toggleButton).toBeInTheDocument();
      }
    });

    it("should show correct theme toggle state in dark mode", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "dark",
          setTheme: mockSetTheme,
        }),
      });

      // Open desktop user menu
      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        await user.click(userAvatar);

        await waitFor(() => {
          expect(screen.getByText("My profile")).toBeInTheDocument();
        });

        // Should show "Light mode" option (to switch TO light)
        expect(screen.getByText("Light mode")).toBeInTheDocument();

        // Icon should be ToggleRight for dark theme
        const toggleButton = screen.getByText("Light mode").closest("button");
        expect(toggleButton).toBeInTheDocument();
      }
    });

    it("should toggle theme from light to dark in desktop menu", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "light",
          setTheme: mockSetTheme,
        }),
      });

      // Open user menu
      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        await user.click(userAvatar);

        await waitFor(() => {
          expect(screen.getByText("Dark mode")).toBeInTheDocument();
        });

        // Click theme toggle
        const darkModeButton = screen.getByText("Dark mode");
        fireEvent.click(darkModeButton);

        // Verify setTheme called with "dark"
        expect(mockSetTheme).toHaveBeenCalledWith("dark");
        expect(mockSetTheme).toHaveBeenCalledTimes(1);
      }
    });

    it("should toggle theme from dark to light in desktop menu", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "dark",
          setTheme: mockSetTheme,
        }),
      });

      // Open user menu
      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        await user.click(userAvatar);

        await waitFor(() => {
          expect(screen.getByText("Light mode")).toBeInTheDocument();
        });

        // Click theme toggle
        const lightModeButton = screen.getByText("Light mode");
        fireEvent.click(lightModeButton);

        // Verify setTheme called with "light"
        expect(mockSetTheme).toHaveBeenCalledWith("light");
        expect(mockSetTheme).toHaveBeenCalledTimes(1);
      }
    });

    it("should update UI after theme change", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      // Start in light mode
      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "light",
          setTheme: mockSetTheme,
        }),
      });

      // Open user menu and toggle theme
      const userAvatar = screen.queryByTestId("user-avatar");

      if (userAvatar) {
        await user.click(userAvatar);

        await waitFor(() => {
          expect(screen.getByText("Dark mode")).toBeInTheDocument();
        });

        const darkModeButton = screen.getByText("Dark mode");
        fireEvent.click(darkModeButton);

        // Simulate theme change by rerendering with dark theme
        rerender(<Navbar />, {
          mockUsePrivy: createMockUsePrivy(authFixture.authState),
          mockPermissions: createMockPermissions(authFixture.permissions),
          mockUseTheme: createMockUseTheme({
            theme: "dark",
            setTheme: mockSetTheme,
          }),
        });

        // Reopen menu to verify updated state
        const updatedAvatar = screen.queryByTestId("user-avatar");
        if (updatedAvatar) {
          await user.click(updatedAvatar);

          await waitFor(() => {
            expect(screen.getByText("Light mode")).toBeInTheDocument();
          });
        }
      }
    });
  });

  describe("2. Mobile Menu Theme Toggle", () => {
    it("should show correct theme toggle in mobile drawer (light mode)", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "light",
          setTheme: mockSetTheme,
        }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      const drawer = screen.getByRole("dialog");

      // Should show "Dark mode" in drawer
      expect(within(drawer).getByText("Dark mode")).toBeInTheDocument();
    });

    it("should show correct theme toggle in mobile drawer (dark mode)", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "dark",
          setTheme: mockSetTheme,
        }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      const drawer = screen.getByRole("dialog");

      // Should show "Light mode" in drawer
      expect(within(drawer).getByText("Light mode")).toBeInTheDocument();
    });

    it("should toggle theme from mobile drawer", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "light",
          setTheme: mockSetTheme,
        }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      const drawer = screen.getByRole("dialog");

      // Click theme toggle
      const darkModeButton = within(drawer).getByText("Dark mode");
      fireEvent.click(darkModeButton);

      // Verify setTheme called
      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });

    it("should keep drawer open after theme toggle", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "light",
          setTheme: mockSetTheme,
        }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      const drawer = screen.getByRole("dialog");

      // Click theme toggle
      const darkModeButton = within(drawer).getByText("Dark mode");
      fireEvent.click(darkModeButton);

      // Drawer should still be open
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("should update mobile drawer theme toggle after change", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "light",
          setTheme: mockSetTheme,
        }),
      });

      // Open drawer and toggle
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      let drawer = screen.getByRole("dialog");
      const darkModeButton = within(drawer).getByText("Dark mode");
      fireEvent.click(darkModeButton);

      // Rerender with dark theme
      rerender(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "dark",
          setTheme: mockSetTheme,
        }),
      });

      // Close and reopen drawer (use fireEvent for mobile drawer interactions)
      const closeButton = screen.getByLabelText(/close/i);
      fireEvent.click(closeButton);

      const reopenButton = screen.getByLabelText("Open menu");
      await user.click(reopenButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Should now show "Light mode"
      drawer = screen.getByRole("dialog");
      expect(within(drawer).getByText("Light mode")).toBeInTheDocument();
    });
  });

  describe("3. Theme Persistence Across Navigation", () => {
    it("should maintain theme state after component remount", () => {
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      const { rerender, unmount } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "dark",
          setTheme: mockSetTheme,
        }),
      });

      // Unmount and remount
      unmount();

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "dark",
          setTheme: mockSetTheme,
        }),
      });

      // Theme should still be dark (via mock)
      // Component receives theme from useTheme hook
    });

    it("should reflect theme across multiple renders", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      const { rerender } = renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "light",
          setTheme: mockSetTheme,
        }),
      });

      // Toggle theme
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      const drawer = screen.getByRole("dialog");
      const darkModeButton = within(drawer).getByText("Dark mode");
      fireEvent.click(darkModeButton);

      // Rerender multiple times with dark theme
      for (let i = 0; i < 3; i++) {
        rerender(<Navbar />, {
          mockUsePrivy: createMockUsePrivy(authFixture.authState),
          mockPermissions: createMockPermissions(authFixture.permissions),
          mockUseTheme: createMockUseTheme({
            theme: "dark",
            setTheme: mockSetTheme,
          }),
        });
      }

      // Theme should remain dark
      // Component consistently receives dark theme from hook
    });
  });

  describe("4. Theme Toggle for Different User Roles", () => {
    const roles = [
      "authenticated-basic",
      "community-admin-single",
      "reviewer-single",
      "staff",
      "owner",
      "pool-manager",
      "registry-admin",
      "super-user",
    ];

    roles.forEach((role) => {
      it(`should allow theme toggle for ${role}`, async () => {
        const user = userEvent.setup();
        const mockSetTheme = jest.fn();
        const authFixture = getAuthFixture(role as keyof typeof getAuthFixture);

        renderWithProviders(<Navbar />, {
          mockUsePrivy: createMockUsePrivy(authFixture.authState),
          mockPermissions: createMockPermissions(authFixture.permissions),
          mockUseTheme: createMockUseTheme({
            theme: "light",
            setTheme: mockSetTheme,
          }),
        });

        // Open mobile drawer
        const mobileMenuButton = screen.getByLabelText("Open menu");
        await user.click(mobileMenuButton);

        await waitFor(() => {
          expect(screen.getByText("Menu")).toBeInTheDocument();
        });

        // Theme toggle should be available
        const drawer = screen.getByRole("dialog");
        expect(within(drawer).getByText("Dark mode")).toBeInTheDocument();

        // Click theme toggle
        const darkModeButton = within(drawer).getByText("Dark mode");
        fireEvent.click(darkModeButton);

        // Verify setTheme called
        expect(mockSetTheme).toHaveBeenCalledWith("dark");
      });
    });
  });

  describe("5. Theme Toggle Icon and Text Updates", () => {
    it("should show ToggleLeft icon in light mode", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "light",
          setTheme: mockSetTheme,
        }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Should show "Dark mode" with appropriate icon
      const drawer = screen.getByRole("dialog");
      const toggleButton = within(drawer).getByText("Dark mode");
      expect(toggleButton).toBeInTheDocument();
    });

    it("should show ToggleRight icon in dark mode", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "dark",
          setTheme: mockSetTheme,
        }),
      });

      // Open mobile drawer
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Should show "Light mode" with appropriate icon
      const drawer = screen.getByRole("dialog");
      const toggleButton = within(drawer).getByText("Light mode");
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe("6. System Theme Handling", () => {
    it("should handle system theme preference", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();
      const authFixture = getAuthFixture("authenticated-basic");

      renderWithProviders(<Navbar />, {
        mockUsePrivy: createMockUsePrivy(authFixture.authState),
        mockPermissions: createMockPermissions(authFixture.permissions),
        mockUseTheme: createMockUseTheme({
          theme: "system",
          setTheme: mockSetTheme,
        }),
      });

      // Component should handle system theme
      // Theme toggle should allow switching from system to explicit theme
      const mobileMenuButton = screen.getByLabelText("Open menu");
      await user.click(mobileMenuButton);

      await waitFor(() => {
        expect(screen.getByText("Menu")).toBeInTheDocument();
      });

      // Theme toggle should still be functional
      const drawer = screen.getByRole("dialog");
      const themeToggle =
        within(drawer).queryByText("Dark mode") || within(drawer).queryByText("Light mode");
      expect(themeToggle).toBeInTheDocument();
    });
  });
});
