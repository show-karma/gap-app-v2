/**
 * Test setup and configuration for navbar tests
 * Configures MSW, test environment, and global utilities
 */

import { setupServer } from "msw/node";
import React from "react";
import { handlers } from "./mocks/handlers";
import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";

/**
 * Setup MSW (Mock Service Worker) server
 */
export const server = setupServer(...handlers);

/**
 * Global test setup
 */
beforeAll(() => {
  // Start MSW server
  server.listen({
    onUnhandledRequest: "warn",
  });

  // Setup window.matchMedia mock
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;

  // Mock scrollTo
  window.scrollTo = vi.fn();

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => {
    cb(0);
    return 0;
  });

  // Mock cancelAnimationFrame
  global.cancelAnimationFrame = vi.fn();

  // Setup environment variables
  process.env.NEXT_PUBLIC_GAP_INDEXER_URL = "https://gap-indexer.vercel.app";
  process.env.NEXT_PUBLIC_PRIVY_APP_ID = "test-privy-app-id";

  // Extend Jest matchers with jest-axe
  expect.extend(toHaveNoViolations);
});

/**
 * Reset handlers after each test
 */
afterEach(() => {
  // Reset handlers to initial state
  server.resetHandlers();

  // Clear all mocks
  vi.clearAllMocks();

  // Clear timers
  jest.clearAllTimers();
});

/**
 * Cleanup after all tests
 */
afterAll(() => {
  // Close MSW server
  server.close();

  // Restore all mocks
  vi.restoreAllMocks();
});

/**
 * Custom matchers for navbar tests
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}

/**
 * Mock Next.js modules
 */

// Mock next/image
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement("img", { ...props, alt: props.alt || "" });
  },
}));

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, onClick, ...props }: any) =>
    React.createElement("a", { href, onClick, ...props }, children),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: "/",
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
  useParams: vi.fn(() => ({})),
}));

// Mock lodash.debounce to use fake timers
vi.mock("lodash.debounce", () => {
  return (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    const debounced = (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
    debounced.cancel = () => clearTimeout(timeoutId);
    return debounced;
  };
});

/**
 * Mock Privy
 */
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: vi.fn(() => ({
    ready: true,
    authenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue("mock-token"),
  })),
  useWallets: vi.fn(() => ({
    wallets: [],
  })),
  PrivyProvider: ({ children }: { children: any }) => children,
  useCreateWallet: vi.fn(() => ({ createWallet: vi.fn() })),
}));

/**
 * Mock Wagmi
 */
vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: undefined,
    isConnected: false,
  })),
  useDisconnect: vi.fn(() => ({
    disconnect: vi.fn(),
  })),
  WagmiProvider: ({ children }: { children: any }) => children,
}));

/**
 * Mock next-themes
 */
export const mockThemeState = {
  current: {
    theme: "light",
    setTheme: vi.fn(),
    themes: ["light", "dark"],
    systemTheme: "light",
    resolvedTheme: "light",
  },
};

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => {
    const { mockThemeState } = require("@/__tests__/navbar/setup");
    return mockThemeState.current;
  }),
  ThemeProvider: ({ children }: { children: any }) => children,
}));

/**
 * Mock @wagmi/core
 */
vi.mock("@wagmi/core", () => ({
  createConfig: vi.fn(() => ({})),
  createStorage: vi.fn(() => ({})),
  cookieStorage: {},
  http: vi.fn((url: string) => ({
    url,
    type: "http",
  })),
  getAccount: vi.fn(() => ({
    address: undefined,
    isConnected: false,
  })),
  getConnections: vi.fn(() => []),
  disconnect: vi.fn(),
  watchAccount: vi.fn(),
  reconnect: vi.fn(),
}));

/**
 * Mock @wagmi/core/chains
 */
vi.mock("@wagmi/core/chains", () => ({
  optimism: { id: 10, name: "Optimism" },
  arbitrum: { id: 42161, name: "Arbitrum" },
  baseSepolia: { id: 84532, name: "Base Sepolia" },
  base: { id: 8453, name: "Base" },
  optimismSepolia: { id: 11155420, name: "Optimism Sepolia" },
  celo: { id: 42220, name: "Celo" },
  sei: { id: 1329, name: "Sei" },
  sepolia: { id: 11155111, name: "Sepolia" },
  lisk: { id: 1135, name: "Lisk" },
  scroll: { id: 534352, name: "Scroll" },
}));

/**
 * Mock privy-config
 */
vi.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: vi.fn(() => ({})),
}));

// Mock authentication and permission hooks
// Create a holder for the current auth mock state
export const mockAuthState = {
  current: {
    ready: true,
    authenticated: false,
    isConnected: false,
    address: undefined,
    user: null,
    authenticate: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    disconnect: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue("mock-token"),
  },
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => {
    const { mockAuthState } = require("@/__tests__/navbar/setup");
    return mockAuthState.current;
  }),
}));

vi.mock("@/store/communities", () => ({
  useCommunitiesStore: vi.fn(() => ({ communities: [] })),
}));

vi.mock("@/hooks/usePermissions", () => ({
  useReviewerPrograms: vi.fn(() => ({ isReviewerOfProgram: false, data: [] })),
}));

// Mock RBAC permissions hook (replaces legacy useStaff)
vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
  })),
}));

vi.mock("@/store/owner", () => ({
  useOwnerStore: vi.fn((selector?: Function) => {
    const state = { isProjectOwner: false, isOwner: false };
    return selector ? selector(state) : state;
  }),
}));

// Mock @/store (index.ts) which re-exports from multiple stores
vi.mock("@/store", () => ({
  useOwnerStore: vi.fn((selector?: Function) => {
    const state = { isProjectOwner: false, isOwner: false };
    return selector ? selector(state) : state;
  }),
  useProjectStore: vi.fn(() => ({ projects: [] })),
  useDonationCartStore: vi.fn(() => ({ items: [] })),
}));

vi.mock("@/store/registry", () => ({
  useRegistryStore: vi.fn(() => ({ isProgramCreator: false, isRegistryAdmin: false })),
}));

vi.mock("@/store/modals/contributorProfile", () => ({
  useContributorProfileModalStore: vi.fn(() => ({
    isOpen: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
  })),
}));

vi.mock("@/store/modals/apiKeyManagement", () => ({
  useApiKeyManagementModalStore: vi.fn(() => ({
    isModalOpen: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
  })),
}));

// Mock the NavbarPermissionsContext - this is needed because NavbarDesktopNavigation
// uses useNavbarPermissions() which reads from context, not from individual hooks directly
export const mockNavbarPermissionsState = {
  current: {
    isLoggedIn: false,
    address: undefined,
    ready: true,
    isStaff: false,
    isStaffLoading: false,
    isOwner: false,
    isCommunityAdmin: false,
    isReviewer: false,
    hasReviewerRole: false,
    reviewerPrograms: [],
    isProgramCreator: false,
    isRegistryAdmin: false,
    hasAdminAccess: false,
    isRegistryAllowed: false,
  },
};

vi.mock("@/src/components/navbar/navbar-permissions-context", () => ({
  useNavbarPermissions: vi.fn(() => {
    const { mockNavbarPermissionsState } = require("@/__tests__/navbar/setup");
    return mockNavbarPermissionsState.current;
  }),
  NavbarPermissionsProvider: ({ children }: { children: any }) => children,
  NavbarPermissionsContext: {
    Provider: ({ children }: { children: any }) => children,
    Consumer: ({ children }: { children: any }) => children(mockNavbarPermissionsState.current),
  },
}));

// Mock unified search service for search functionality
// This mock will be controlled by tests via module mocking
export const mockSearchFunction = vi.fn();

vi.mock("@/services/unified-search.service", () => ({
  unifiedSearch: (...args: any[]) => {
    const { mockSearchFunction } = require("@/__tests__/navbar/setup");
    return mockSearchFunction(...args);
  },
}));

/**
 * Mock external link component
 */
vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, href, ...props }: any) =>
    React.createElement(
      "a",
      { href, target: "_blank", rel: "noopener noreferrer", ...props },
      children
    ),
}));

/**
 * Mock profile picture component
 */
vi.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: () => "ProfilePicture",
}));

/**
 * Mock error manager
 */
vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

/**
 * Helper functions for tests
 */

/**
 * Setup fake timers for debounce tests
 */
export const setupFakeTimers = () => {
  jest.useFakeTimers();
};

/**
 * Cleanup fake timers
 */
export const cleanupFakeTimers = () => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
};

/**
 * Advance timers by specific amount
 */
export const advanceTimersByTime = (ms: number) => {
  jest.advanceTimersByTime(ms);
};

/**
 * Run all pending timers
 */
export const runAllTimers = () => {
  jest.runAllTimers();
};

/**
 * Viewport sizes for responsive testing
 */
export const VIEWPORTS = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 1024, height: 768 },
  DESKTOP: { width: 1440, height: 900 },
  WIDE: { width: 1920, height: 1080 },
};

/**
 * Set viewport size
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

  // Trigger resize event
  window.dispatchEvent(new Event("resize"));
};

/**
 * Export server for test file usage
 */
export { server as mswServer };
