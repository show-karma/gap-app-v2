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
window.scrollTo = jest.fn();

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

// Mock ExternalLink component
jest.mock("@/components/Utilities/ExternalLink", () => ({
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
    authenticate: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    disconnect: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue("mock-token"),
  },
};

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(() => {
    const { mockAuthState } = require("@/__tests__/homepage/setup");
    return mockAuthState.current;
  }),
}));

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: "/",
    query: {},
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock infinite moving cards (community carousel)
jest.mock("@/src/components/ui/infinite-moving-cards", () => ({
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
jest.mock("@/src/components/ui/theme-image", () => ({
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
