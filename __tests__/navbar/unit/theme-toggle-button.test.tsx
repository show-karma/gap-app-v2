/**
 * Unit Tests: ThemeToggleButton
 * Tests the standalone theme toggle button that appears in the navbar
 * between the login/user area and the help button.
 */

import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggleButton } from "@/src/components/navbar/theme-toggle-button";
import {
  cleanupAfterEach,
  createMockUseTheme,
  renderWithProviders,
  resetMockThemeState,
} from "../utils/test-helpers";

describe("ThemeToggleButton", () => {
  afterEach(() => {
    cleanupAfterEach();
  });

  describe("Rendering", () => {
    it("should render as a button element", () => {
      renderWithProviders(<ThemeToggleButton />);

      const button = screen.getByRole("button", { name: /toggle theme/i });
      expect(button).toBeInTheDocument();
    });

    it("should have an accessible aria-label", () => {
      renderWithProviders(<ThemeToggleButton />);

      const button = screen.getByRole("button", { name: /toggle theme/i });
      expect(button).toHaveAttribute("aria-label");
    });

    it("should render with correct base styling classes", () => {
      renderWithProviders(<ThemeToggleButton />);

      const button = screen.getByRole("button", { name: /toggle theme/i });
      expect(button).toBeInTheDocument();
      // Should be an icon-only button with hover state
      expect(button.className).toContain("p-2");
    });
  });

  describe("Light mode", () => {
    it("should show moon icon when theme is light (to switch to dark)", () => {
      renderWithProviders(<ThemeToggleButton />, {
        mockUseTheme: createMockUseTheme("light"),
      });

      const button = screen.getByRole("button", { name: /toggle theme/i });
      expect(button).toBeInTheDocument();
      // aria-label should indicate switching to dark
      expect(button).toHaveAttribute("aria-label", "Toggle theme to dark mode");
    });

    it("should call setTheme with 'dark' when clicked in light mode", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();

      renderWithProviders(<ThemeToggleButton />, {
        mockUseTheme: {
          theme: "light",
          setTheme: mockSetTheme,
          themes: ["light", "dark"],
          systemTheme: "light",
          resolvedTheme: "light",
        },
      });

      const button = screen.getByRole("button", { name: /toggle theme/i });
      await user.click(button);

      expect(mockSetTheme).toHaveBeenCalledWith("dark");
      expect(mockSetTheme).toHaveBeenCalledTimes(1);
    });
  });

  describe("Dark mode", () => {
    it("should show sun icon when theme is dark (to switch to light)", () => {
      renderWithProviders(<ThemeToggleButton />, {
        mockUseTheme: createMockUseTheme("dark"),
      });

      const button = screen.getByRole("button", { name: /toggle theme/i });
      expect(button).toBeInTheDocument();
      // aria-label should indicate switching to light
      expect(button).toHaveAttribute("aria-label", "Toggle theme to light mode");
    });

    it("should call setTheme with 'light' when clicked in dark mode", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();

      renderWithProviders(<ThemeToggleButton />, {
        mockUseTheme: {
          theme: "dark",
          setTheme: mockSetTheme,
          themes: ["light", "dark"],
          systemTheme: "light",
          resolvedTheme: "dark",
        },
      });

      const button = screen.getByRole("button", { name: /toggle theme/i });
      await user.click(button);

      expect(mockSetTheme).toHaveBeenCalledWith("light");
      expect(mockSetTheme).toHaveBeenCalledTimes(1);
    });
  });

  describe("System theme", () => {
    it("should handle system theme by toggling to dark", async () => {
      const user = userEvent.setup();
      const mockSetTheme = jest.fn();

      renderWithProviders(<ThemeToggleButton />, {
        mockUseTheme: {
          theme: "system",
          setTheme: mockSetTheme,
          themes: ["light", "dark", "system"],
          systemTheme: "light",
          resolvedTheme: "light",
        },
      });

      const button = screen.getByRole("button", { name: /toggle theme/i });
      await user.click(button);

      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });
  });

  describe("Accessibility", () => {
    it("should be focusable via keyboard", () => {
      renderWithProviders(<ThemeToggleButton />);

      const button = screen.getByRole("button", { name: /toggle theme/i });
      button.focus();
      expect(button).toHaveFocus();
    });

    it("should have type='button' to prevent form submission", () => {
      renderWithProviders(<ThemeToggleButton />);

      const button = screen.getByRole("button", { name: /toggle theme/i });
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
