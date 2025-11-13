/**
 * Test Helper Utilities for Homepage Tests
 * Provides render utilities, mock factories, and test helpers
 */

// Import homepage setup to ensure mocks are loaded
import "../setup";

import React from "react";
import { render, RenderResult, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockAuthState } from "../setup";

/**
 * Custom render options
 */
export interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  mockUseAuth?: any;
  mockRouter?: any;
  initialRoute?: string;
}

/**
 * Create a QueryClient for testing
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

/**
 * Wrapper component with all providers
 */
const AllProviders: React.FC<{
  children: React.ReactNode;
  queryClient?: QueryClient;
}> = ({ children, queryClient }) => {
  const testQueryClient = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
};

/**
 * Enhanced render function with providers
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult => {
  const {
    queryClient,
    mockUseAuth,
    mockRouter,
    ...renderOptions
  } = options;

  // Setup mocks if provided
  if (mockUseAuth) {
    mockAuthState.current = mockUseAuth;
  }

  if (mockRouter) {
    const navigationModule = require("next/navigation");
    if (navigationModule.useRouter && jest.isMockFunction(navigationModule.useRouter)) {
      navigationModule.useRouter.mockReturnValue(mockRouter);
    }
  }

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllProviders queryClient={queryClient}>{children}</AllProviders>
  );

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  // Create custom rerender that accepts options
  const customRerender = (ui: React.ReactElement, options?: Partial<CustomRenderOptions>) => {
    if (options?.mockUseAuth) {
      mockAuthState.current = options.mockUseAuth;
    }
    if (options?.mockRouter) {
      const navigationModule = require("next/navigation");
      if (navigationModule.useRouter && jest.isMockFunction(navigationModule.useRouter)) {
        navigationModule.useRouter.mockReturnValue(options.mockRouter);
      }
    }
    return renderResult.rerender(ui);
  };

  return {
    ...renderResult,
    rerender: customRerender,
  };
};

/**
 * Create mock auth state
 */
export const createMockAuth = (overrides: any = {}) => ({
  ready: true,
  authenticated: overrides.authenticated || false,
  isConnected: overrides.isConnected || false,
  address: overrides.address,
  user: overrides.user || null,
  authenticate: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  disconnect: jest.fn(),
  getAccessToken: jest.fn().mockResolvedValue("mock-token"),
  ...overrides,
});

/**
 * Create mock router
 */
export const createMockRouter = (overrides: any = {}) => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: "/",
  query: {},
  ...overrides,
});

/**
 * Reset mock auth state
 */
export const resetMockAuthState = () => {
  mockAuthState.current = {
    ready: true,
    authenticated: false,
    isConnected: false,
    address: undefined,
    user: null,
    authenticate: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    disconnect: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue("mock-token"),
  };
};

/**
 * Wait for debounce (useful for search/input interactions)
 */
export const waitForDebounce = (ms: number = 600) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Set viewport size for responsive testing
 */
export const setViewportSize = (width: number, height: number) => {
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

  window.dispatchEvent(new Event("resize"));
};

/**
 * Accessibility helper: check for axe violations
 */
export const expectNoA11yViolations = async (container: HTMLElement) => {
  const { axe } = await import("jest-axe");
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

/**
 * Re-export commonly used testing utilities
 */
export {
  screen,
  waitFor,
  within,
  fireEvent,
  act,
  cleanup,
} from "@testing-library/react";

export { default as userEvent } from "@testing-library/user-event";

