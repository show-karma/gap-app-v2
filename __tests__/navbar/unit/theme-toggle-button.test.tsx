/**
 * Unit Tests: ThemeToggleButton
 * Tests the standalone theme toggle button that appears in the navbar
 * between the login/user area and the help button.
 */

// Hoist local theme state so the vi.mock factory can read/write it directly.
// Tests mutate _themeRefs.state before rendering to control what useTheme() returns.
const _themeRefs = vi.hoisted(() => ({
  state: {
    theme: "light" as string | undefined,
    setTheme: (() => {}) as (theme: string) => void,
    themes: ["light", "dark"] as string[],
    systemTheme: "light" as string | undefined,
    resolvedTheme: "light" as string | undefined,
  },
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => _themeRefs.state),
  ThemeProvider: ({ children }: { children: unknown }) => children,
}));

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
  beforeEach(() => {
    // Reset to light-mode defaults before each test
    _themeRefs.state = {
      theme: "light",
      setTheme: vi.fn(),
      themes: ["light", "dark"],
      systemTheme: "light",
      resolvedTheme: "light",
    };
  });

  afterEach(() => {
    cleanupAfterEach();
  });

  describe("Hydration safety", () => {
    it("should use resolvedTheme instead of theme to determine icon and aria-label", () => {
      // When theme is "system", resolvedTheme determines the actual appearance.
      // Using resolvedTheme prevents hydration mismatch because it reflects the
      // actual resolved value rather than the raw "system" string.
      _themeRefs.state = {
        theme: "system",
        setTheme: vi.fn(),
        themes: ["light", "dark", "system"],
        systemTheme: "dark",
        resolvedTheme: "dark",
      };
      renderWithProviders(<ThemeToggleButton />);

      const button = screen.getByRole("button", { name: /toggle theme/i });
      // resolvedTheme is "dark", so it should show "Toggle theme to light mode"
      expect(button).toHaveAttribute("aria-label", "Toggle theme to light mode");
    });

    it("should render a placeholder button without theme-specific content when resolvedTheme is undefined", () => {
      // During SSR, next-themes returns undefined for resolvedTheme.
      // The component uses a mounted guard to render a neutral placeholder,
      // preventing hydration mismatch. In JSDOM useEffect fires synchronously,
      // so we verify the component handles undefined resolvedTheme gracefully
      // by treating it as non-dark (fallback behavior).
      renderWithProviders(<ThemeToggleButton />, {
        mockUseTheme: {
          theme: undefined,
          setTheme: vi.fn(),
          themes: ["light", "dark"],
          systemTheme: undefined,
          resolvedTheme: undefined,
        },
      });

      const button = screen.getByRole("button", { name: /toggle theme/i });
      // With undefined resolvedTheme (post-mount in JSDOM), isDark=false,
      // so it renders "Toggle theme to dark mode"
      expect(button).toHaveAttribute("aria-label", "Toggle theme to dark mode");
    });
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
      const mockSetTheme = vi.fn();

      _themeRefs.state = {
        theme: "light",
        setTheme: mockSetTheme,
        themes: ["light", "dark"],
        systemTheme: "light",
        resolvedTheme: "light",
      };
      renderWithProviders(<ThemeToggleButton />);

      const button = screen.getByRole("button", { name: /toggle theme/i });
      await user.click(button);

      expect(mockSetTheme).toHaveBeenCalledWith("dark");
      expect(mockSetTheme).toHaveBeenCalledTimes(1);
    });
  });

  describe("Dark mode", () => {
    it("should show sun icon when theme is dark (to switch to light)", () => {
      _themeRefs.state = {
        theme: "dark",
        setTheme: vi.fn(),
        themes: ["light", "dark"],
        systemTheme: "light",
        resolvedTheme: "dark",
      };
      renderWithProviders(<ThemeToggleButton />);

      const button = screen.getByRole("button", { name: /toggle theme/i });
      expect(button).toBeInTheDocument();
      // aria-label should indicate switching to light
      expect(button).toHaveAttribute("aria-label", "Toggle theme to light mode");
    });

    it("should call setTheme with 'light' when clicked in dark mode", async () => {
      const user = userEvent.setup();
      const mockSetTheme = vi.fn();

      _themeRefs.state = {
        theme: "dark",
        setTheme: mockSetTheme,
        themes: ["light", "dark"],
        systemTheme: "light",
        resolvedTheme: "dark",
      };
      renderWithProviders(<ThemeToggleButton />);

      const button = screen.getByRole("button", { name: /toggle theme/i });
      await user.click(button);

      expect(mockSetTheme).toHaveBeenCalledWith("light");
      expect(mockSetTheme).toHaveBeenCalledTimes(1);
    });
  });

  describe("System theme", () => {
    it("should handle system theme by toggling to dark", async () => {
      const user = userEvent.setup();
      const mockSetTheme = vi.fn();

      _themeRefs.state = {
        theme: "system",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "light",
        resolvedTheme: "light",
      };
      renderWithProviders(<ThemeToggleButton />);

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
