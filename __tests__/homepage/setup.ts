/**
 * Global Setup for Homepage Tests
 * Following the same patterns as navbar test suite
 */

import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";
import React from "react";

// Polyfill TextEncoder/TextDecoder for Node environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock window.matchMedia
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

// Mock useAuth hook - homepage doesn't require complex auth mocking initially
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
    const { mockAuthState } = require("@/__tests__/homepage/setup");
    return mockAuthState.current;
  }),
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
