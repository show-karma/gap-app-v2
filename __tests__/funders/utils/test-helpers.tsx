/**
 * Test utilities for funders page tests
 *
 * This file provides reusable testing utilities including:
 * - Custom render function with providers
 * - Mock factories for various hooks and stores
 * - Viewport simulation helpers
 * - Timer control utilities
 */

// Import funders setup to ensure mocks are loaded
import "../setup";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, type RenderResult, render } from "@testing-library/react";
import type React from "react";
import { mockAuthState, mockChosenCommunities, mockThemeState } from "../setup";

// ============================================================================
// Types
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  auth?: {
    ready?: boolean;
    authenticated?: boolean;
    user?: any;
    login?: jest.Mock;
    logout?: jest.Mock;
  };
  theme?: {
    theme?: string;
    setTheme?: jest.Mock;
    resolvedTheme?: string;
  };
  chosenCommunities?: any[];
}

// ============================================================================
// Render Utilities
// ============================================================================

/**
 * Custom render function that wraps components with necessary providers
 * and sets up mocks based on provided options.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
    auth,
    theme,
    chosenCommunities,
    ...renderOptions
  } = options;

  // Update auth mock if provided
  if (auth) {
    mockAuthState.current = {
      ready: auth.ready ?? true,
      authenticated: auth.authenticated ?? false,
      user: auth.user ?? null,
      login: auth.login ?? jest.fn(),
      logout: auth.logout ?? jest.fn(),
    };
  }

  // Update theme mock if provided
  if (theme) {
    mockThemeState.current = {
      theme: theme.theme ?? "light",
      setTheme: theme.setTheme ?? jest.fn(),
      resolvedTheme: theme.resolvedTheme ?? theme.theme ?? "light",
    };
  }

  // Update chosenCommunities mock if provided
  if (chosenCommunities) {
    mockChosenCommunities.mockReturnValue(chosenCommunities);
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Creates a mock useAuth hook return value
 */
export function createMockUseAuth(
  overrides: Partial<ReturnType<typeof mockAuthState.current>> = {}
) {
  return {
    ready: true,
    authenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

/**
 * Creates a mock useTheme hook return value
 */
export function createMockUseTheme(
  themeOrOptions:
    | string
    | { theme?: string; setTheme?: jest.Mock; resolvedTheme?: string } = "light"
) {
  if (typeof themeOrOptions === "string") {
    return {
      theme: themeOrOptions,
      setTheme: jest.fn(),
      resolvedTheme: themeOrOptions,
    };
  }

  return {
    theme: themeOrOptions.theme ?? "light",
    setTheme: themeOrOptions.setTheme ?? jest.fn(),
    resolvedTheme: themeOrOptions.resolvedTheme ?? themeOrOptions.theme ?? "light",
  };
}

/**
 * Creates a mock router object
 */
export function createMockRouter(overrides: any = {}) {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
    ...overrides,
  };
}

// ============================================================================
// Viewport Utilities
// ============================================================================

export const VIEWPORTS = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 768, height: 1024 },
  DESKTOP: { width: 1440, height: 900 },
  LARGE_DESKTOP: { width: 1920, height: 1080 },
};

/**
 * Sets the viewport size for responsive testing
 */
export function setViewportSize(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });

  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: height,
  });

  // Update matchMedia to reflect viewport
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes(`${width}px`) || (query.includes("min-width") && width >= 768),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  window.dispatchEvent(new Event("resize"));
}

// ============================================================================
// Timer Utilities
// ============================================================================

/**
 * Sets up fake timers for testing time-dependent code
 */
export function setupFakeTimers() {
  jest.useFakeTimers();
}

/**
 * Cleans up fake timers
 */
export function cleanupFakeTimers() {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
}

/**
 * Advances timers by the specified time
 */
export function advanceTimersByTime(ms: number) {
  jest.advanceTimersByTime(ms);
}

/**
 * Runs all pending timers
 */
export function runAllTimers() {
  jest.runAllTimers();
}

/**
 * Waits for debounce to complete (300ms default)
 */
export async function waitForDebounce(ms: number = 300) {
  jest.advanceTimersByTime(ms);
  await Promise.resolve();
}

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Resets all mocks to their initial state
 */
export function resetAllMocks() {
  mockAuthState.current = {
    ready: true,
    authenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
  };

  mockThemeState.current = {
    theme: "light",
    setTheme: jest.fn(),
    resolvedTheme: "light",
  };

  mockChosenCommunities.mockReset();
  jest.clearAllMocks();
}
