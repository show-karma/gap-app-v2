/**
 * Domain-specific setup for navbar tests.
 *
 * Polyfills (matchMedia, IntersectionObserver, ResizeObserver, TextEncoder,
 * Fetch API) are handled by the global __tests__/setup.ts (registered in
 * vitest.config.ts setupFiles). Only navbar-specific module mocks and MSW
 * server lifecycle live here.
 */

import { toHaveNoViolations } from "jest-axe";
import { setupServer } from "msw/node";
import React from "react";
import { handlers } from "./mocks/handlers";

// ---- Hoisted mock state (available in vi.mock factories) ----
// vi.hoisted runs before vi.mock factories, making these variables
// available without require() self-references.
const _h = vi.hoisted(() => {
  const _vi = globalThis.vi ?? { fn: () => (() => {}) as any };
  return {
    themeState: {
      current: {
        theme: "light" as string,
        setTheme: _vi.fn(),
        themes: ["light", "dark"] as string[],
        systemTheme: "light" as string,
        resolvedTheme: "light" as string,
      },
    },
    authState: {
      current: {
        ready: true,
        authenticated: false,
        isConnected: false,
        address: undefined as string | undefined,
        user: null as unknown,
        authenticate: _vi.fn(),
        login: _vi.fn(),
        logout: _vi.fn(),
        disconnect: _vi.fn(),
        getAccessToken: _vi.fn().mockResolvedValue("mock-token"),
      },
    },
    navPermsState: {
      current: {
        isLoggedIn: false,
        address: undefined as string | undefined,
        ready: true,
        isStaff: false,
        isStaffLoading: false,
        isOwner: false,
        isCommunityAdmin: false,
        isReviewer: false,
        hasReviewerRole: false,
        reviewerPrograms: [] as unknown[],
        isProgramCreator: false,
        isRegistryAdmin: false,
        hasAdminAccess: false,
        isRegistryAllowed: false,
      },
    },
    modalState: {
      current: {
        isOpen: false,
        openModal: _vi.fn() as (...args: unknown[]) => void,
        closeModal: _vi.fn() as () => void,
      },
    },
    searchFn: _vi.fn(),
  };
});

// Public exports that reference the hoisted objects
export const mockThemeState = _h.themeState;
export const mockAuthState = _h.authState;
export const mockNavbarPermissionsState = _h.navPermsState;
export const mockModalState = _h.modalState;
export const mockSearchFunction = _h.searchFn;

/**
 * Setup MSW (Mock Service Worker) server for navbar tests
 */
export const server = setupServer(...handlers);

/**
 * Global test setup
 */
beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });

  // Navbar-specific browser API mocks
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  global.requestAnimationFrame = vi.fn((cb) => {
    cb(0);
    return 0;
  }) as unknown as typeof global.requestAnimationFrame;
  global.cancelAnimationFrame = vi.fn() as unknown as typeof global.cancelAnimationFrame;

  // Setup environment variables
  process.env.NEXT_PUBLIC_GAP_INDEXER_URL = "https://gap-indexer.vercel.app";
  process.env.NEXT_PUBLIC_PRIVY_APP_ID = "test-privy-app-id";

  // Extend matchers with jest-axe
  expect.extend(toHaveNoViolations);
});

/**
 * Reset handlers after each test
 */
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

/**
 * Cleanup after all tests
 */
afterAll(() => {
  server.close();
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

// Mock next/dynamic so that components loaded with ssr:false are rendered
// synchronously in tests instead of showing the loading skeleton.
// Without this, NavbarMobileMenu (which uses dynamic() with ssr:false) renders
// the loading skeleton in jsdom and "Open menu" / "Sign in" buttons are absent.
//
// Strategy: use React.lazy() with the import factory. Wrap the component tree
// in a React.Suspense boundary so that when the lazy component suspends, it
// resolves its promise (which is immediate in Vitest since vi.mock makes all
// imports synchronous), and the actual component renders on the next tick.
// Tests that need the component to appear synchronously should use waitFor().
vi.mock("next/dynamic", () => ({
  default: (fn: () => Promise<any>, _opts?: any) => {
    // React.lazy wraps the factory; in Vitest the import resolves immediately.
    const LazyComponent = React.lazy(() =>
      fn().then((mod: any) => ({
        default: mod.default || Object.values(mod)[0],
      }))
    );
    const DynamicWrapper = (props: any) =>
      React.createElement(
        React.Suspense,
        { fallback: null },
        React.createElement(LazyComponent, props)
      );
    DynamicWrapper.displayName = "DynamicMock";
    return DynamicWrapper;
  },
}));

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
vi.mock("lodash.debounce", () => ({
  default: (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    const debounced = (...args: unknown[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
    debounced.cancel = () => clearTimeout(timeoutId);
    return debounced;
  },
}));

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
vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => _h.themeState.current),
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
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => _h.authState.current),
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
  useContributorProfileModalStore: vi.fn(() => _h.modalState.current),
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
vi.mock("@/src/components/navbar/navbar-permissions-context", () => ({
  useNavbarPermissions: vi.fn(() => _h.navPermsState.current),
  NavbarPermissionsProvider: ({ children }: { children: any }) => children,
  NavbarPermissionsContext: {
    Provider: ({ children }: { children: any }) => children,
    Consumer: ({ children }: { children: any }) => children(_h.navPermsState.current),
  },
}));

// Mock unified search service for search functionality
vi.mock("@/services/unified-search.service", () => ({
  unifiedSearch: _h.searchFn,
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
  vi.useFakeTimers();
};

/**
 * Cleanup fake timers
 */
export const cleanupFakeTimers = () => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
};

/**
 * Advance timers by specific amount
 */
export const advanceTimersByTime = (ms: number) => {
  vi.advanceTimersByTime(ms);
};

/**
 * Run all pending timers
 */
export const runAllTimers = () => {
  vi.runAllTimers();
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
