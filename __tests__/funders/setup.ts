/**
 * Global setup file for funders page tests
 * 
 * This file configures mocks and test utilities for the funders page test suite.
 * Following the pattern established in homepage tests to avoid global conflicts.
 */

import "@testing-library/jest-dom";
import React from "react";

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

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return React.createElement("img", props);
  },
}));

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return React.createElement(
      "a",
      { href, ...props },
      children
    );
  },
}));

// Mock InfiniteMovingCards component
jest.mock("@/src/components/ui/infinite-moving-cards", () => ({
  InfiniteMovingCards: ({ items }: any) => (
    React.createElement(
      "div",
      { "data-testid": "infinite-moving-cards" },
      items?.map((item: any, idx: number) =>
        React.createElement(
          "div",
          { key: idx, "data-testid": `carousel-item-${idx}` },
          item.text || item.name
        )
      )
    )
  ),
}));

// Mock ThemeImage component (renders light version for tests)
jest.mock("@/src/components/ui/theme-image", () => ({
  ThemeImage: ({ alt, src, className }: any) => {
    return React.createElement("img", {
      "data-testid": "theme-image",
      src,
      alt,
      className,
    });
  },
}));

// Mock chosenCommunities
export const mockChosenCommunities = jest.fn();
jest.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: (includeAll?: boolean) => mockChosenCommunities(includeAll),
}));

// Mock useAuth hook
export const mockAuthState = {
  current: {
    ready: true,
    authenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
  },
};

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState.current,
}));

// Mock useTheme hook
export const mockThemeState = {
  current: {
    theme: "light",
    setTheme: jest.fn(),
    resolvedTheme: "light",
  },
};

jest.mock("next-themes", () => ({
  useTheme: () => mockThemeState.current,
}));

// Mock Zustand stores (only the ones actually used by funders page)
jest.mock("@/store/owner", () => ({
  useOwnerStore: (selector?: any) => {
    const state = { isOwner: false };
    return selector ? selector(state) : state;
  },
}));

jest.mock("@/store/communities", () => ({
  useCommunitiesStore: () => ({
    communities: [],
    setCommunities: jest.fn(),
  }),
}));

// Export reset functions for test cleanup
export const resetMockAuthState = () => {
  mockAuthState.current = {
    ready: true,
    authenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
  };
};

export const resetMockThemeState = () => {
  mockThemeState.current = {
    theme: "light",
    setTheme: jest.fn(),
    resolvedTheme: "light",
  };
};

export const resetMockChosenCommunities = () => {
  mockChosenCommunities.mockReset();
};

