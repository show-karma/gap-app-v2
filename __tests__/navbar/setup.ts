/**
 * Test setup and configuration for navbar tests
 * Configures MSW, test environment, and global utilities
 */

import React from "react";
import { setupServer } from "msw/node";
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
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;

  // Mock scrollTo
  window.scrollTo = jest.fn();

  // Mock requestAnimationFrame
  global.requestAnimationFrame = jest.fn((cb) => {
    cb(0);
    return 0;
  });

  // Mock cancelAnimationFrame
  global.cancelAnimationFrame = jest.fn();

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
  jest.clearAllMocks();

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
  jest.restoreAllMocks();
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
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement("img", { ...props, alt: props.alt || "" });
  },
}));

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, onClick, ...props }: any) => 
    React.createElement("a", { href, onClick, ...props }, children),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: "/",
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
  useParams: jest.fn(() => ({})),
}));

// Mock lodash.debounce to use fake timers
jest.mock("lodash.debounce", () => {
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
jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(() => ({
    ready: true,
    authenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue("mock-token"),
  })),
  useWallets: jest.fn(() => ({
    wallets: [],
  })),
  PrivyProvider: ({ children }: { children: any }) => children,
}));

/**
 * Mock Wagmi
 */
jest.mock("wagmi", () => ({
  useAccount: jest.fn(() => ({
    address: undefined,
    isConnected: false,
  })),
  useDisconnect: jest.fn(() => ({
    disconnect: jest.fn(),
  })),
  WagmiProvider: ({ children }: { children: any }) => children,
}));

/**
 * Mock @wagmi/core
 */
jest.mock("@wagmi/core", () => ({
  createConfig: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({})),
  cookieStorage: {},
  http: jest.fn((url: string) => ({
    url,
    type: "http",
  })),
  getAccount: jest.fn(() => ({
    address: undefined,
    isConnected: false,
  })),
  getConnections: jest.fn(() => []),
  disconnect: jest.fn(),
  watchAccount: jest.fn(),
  reconnect: jest.fn(),
}));

/**
 * Mock @wagmi/core/chains
 */
jest.mock("@wagmi/core/chains", () => ({
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
jest.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: jest.fn(() => ({})),
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
    authenticate: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    disconnect: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue("mock-token"),
  }
};

jest.mock("@/hooks/useAuth", () => {
  // Import mockAuthState within the mock factory
  const setup = require("@/__tests__/navbar/setup");
  
  return {
    useAuth: jest.fn(() => {
      return setup.mockAuthState ? setup.mockAuthState.current : {
        ready: true,
        authenticated: false,
        isConnected: false,
      };
    }),
  };
});

jest.mock("@/store/communities", () => ({
  useCommunitiesStore: jest.fn(() => ({ communities: [] })),
}));

jest.mock("@/hooks/usePermissions", () => ({
  useReviewerPrograms: jest.fn(() => ({ isReviewerOfProgram: false, data: [] })),
}));

jest.mock("@/hooks/useStaff", () => ({
  useStaff: jest.fn(() => ({ isStaff: false })),
}));

jest.mock("@/store/owner", () => ({
  useOwnerStore: jest.fn(() => ({ isProjectOwner: false, isOwner: false })),
}));

// Mock @/store (index.ts) which re-exports from multiple stores
jest.mock("@/store", () => ({
  useOwnerStore: jest.fn(() => ({ isProjectOwner: false, isOwner: false })),
  useProjectStore: jest.fn(() => ({ projects: [] })),
  useDonationCartStore: jest.fn(() => ({ items: [] })),
}));

jest.mock("@/store/registry", () => ({
  useRegistryStore: jest.fn(() => ({ isPoolManager: false, isRegistryAdmin: false })),
}));

/**
 * Mock external link component
 */
jest.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, href, ...props }: any) => 
    React.createElement("a", { href, target: "_blank", rel: "noreferrer", ...props }, children),
}));

/**
 * Mock profile picture component
 */
jest.mock("@/components/Utilities/ProfilePicture", () => ({
  ProfilePicture: () => "ProfilePicture",
}));

/**
 * Mock error manager
 */
jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn((message, error) => {
    console.error(message, error);
  }),
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

