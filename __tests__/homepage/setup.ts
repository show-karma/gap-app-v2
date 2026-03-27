/**
 * Domain-specific setup for homepage tests.
 *
 * Polyfills (matchMedia, IntersectionObserver, ResizeObserver, TextEncoder,
 * Fetch API) are handled by the global __tests__/setup.ts (registered in
 * vitest.config.ts setupFiles). Only homepage-specific module mocks live here.
 */

import React from "react";

// Hoisted mock state - accessible in vi.mock factories
const _h = vi.hoisted(() => ({
  authState: {
    current: {
      ready: true,
      authenticated: false,
      isConnected: false,
      address: undefined as string | undefined,
      user: null as unknown,
      authenticate: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      disconnect: vi.fn(),
      getAccessToken: vi.fn().mockResolvedValue("mock-token"),
    },
  },
}));
export const mockAuthState = _h.authState;

// Mock scrollTo (homepage-specific)
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

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

// Mock ExternalLink component
vi.mock("@/components/Utilities/ExternalLink", () => ({
  ExternalLink: ({ children, href, ...props }: any) =>
    React.createElement(
      "a",
      { href, target: "_blank", rel: "noopener noreferrer", ...props },
      children
    ),
}));

// Mock useAuth hook
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => _h.authState.current),
}));

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: "/",
    query: {},
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock wagmi hooks - required for components that use wallet functionality
vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: undefined,
    isConnected: false,
    isDisconnected: true,
  }),
  useChainId: () => 1,
  useSwitchChain: () => ({
    switchChainAsync: vi.fn(),
    isPending: false,
  }),
  useConnect: () => ({
    connect: vi.fn(),
    connectors: [],
    isPending: false,
  }),
  useDisconnect: () => ({
    disconnect: vi.fn(),
  }),
}));

// Mock infinite moving cards (community carousel)
vi.mock("@/src/components/ui/infinite-moving-cards", () => ({
  InfiniteMovingCards: ({ items }: any) =>
    React.createElement(
      "div",
      { "data-testid": "infinite-moving-cards" },
      items?.map((item: any, index: number) =>
        React.createElement(
          "div",
          { key: index, "data-testid": `carousel-item-${index}` },
          item.text
        )
      )
    ),
}));

// Mock theme image component
vi.mock("@/src/components/ui/theme-image", () => ({
  ThemeImage: ({ src, alt, ...props }: any) => React.createElement("img", { src, alt, ...props }),
}));

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

  // Trigger resize event
  window.dispatchEvent(new Event("resize"));
};
