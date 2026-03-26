/**
 * Domain-specific setup for funders page tests.
 *
 * Polyfills (matchMedia, IntersectionObserver, ResizeObserver, TextEncoder,
 * Fetch API) are handled by the global __tests__/setup.ts (registered in
 * vitest.config.ts setupFiles). Only funders-specific module mocks live here.
 */

import React from "react";

// Mock next/image
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return React.createElement("img", props);
  },
}));

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return React.createElement("a", { href, ...props }, children);
  },
}));

// Mock InfiniteMovingCards component
vi.mock("@/src/components/ui/infinite-moving-cards", () => ({
  InfiniteMovingCards: ({ items }: any) =>
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
    ),
}));

// Mock ThemeImage component (renders light version for tests)
vi.mock("@/src/components/ui/theme-image", () => ({
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
export const mockChosenCommunities = vi.fn();
vi.mock("@/utilities/chosenCommunities", () => ({
  chosenCommunities: (includeAll?: boolean) => mockChosenCommunities(includeAll),
}));

// Mock CustomerAvatar component
vi.mock("@/src/features/funders/components/customer-avatar", () => ({
  CustomerAvatar: ({ src, alt }: any) =>
    React.createElement("img", {
      "data-testid": "customer-avatar",
      src,
      alt,
      className: "customer-avatar",
    }),
}));

// Mock CommunityImage component
vi.mock("@/src/features/funders/components/community-image", () => ({
  CommunityImage: ({ src, alt }: any) =>
    React.createElement("img", {
      "data-testid": "community-image",
      src,
      alt,
      className: "community-image",
    }),
}));

// Mock FAQAccordion component
vi.mock("@/src/components/shared/faq-accordion", () => ({
  FAQAccordion: ({ items }: any) =>
    React.createElement(
      "div",
      { "data-testid": "faq-accordion" },
      items?.map((item: any, idx: number) =>
        React.createElement("div", { key: idx, "data-testid": `faq-item-${idx}` }, item.question)
      )
    ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Mail: (props: any) => React.createElement("svg", { ...props, "data-testid": "mail-icon" }),
  Zap: (props: any) => React.createElement("svg", { ...props, "data-testid": "zap-icon" }),
  BarChart2: (props: any) =>
    React.createElement("svg", { ...props, "data-testid": "barchart-icon" }),
  SquareCheckBig: (props: any) =>
    React.createElement("svg", { ...props, "data-testid": "check-icon" }),
}));

// Mock useAuth hook
export const mockAuthState = {
  current: {
    ready: true,
    authenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  },
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState.current,
}));

// Mock useTheme hook
export const mockThemeState = {
  current: {
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  },
};

vi.mock("next-themes", () => ({
  useTheme: () => mockThemeState.current,
}));

// Mock Zustand stores (only the ones actually used by funders page)
vi.mock("@/store/owner", () => ({
  useOwnerStore: (selector?: any) => {
    const state = { isOwner: false };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/store/communities", () => ({
  useCommunitiesStore: () => ({
    communities: [],
    setCommunities: vi.fn(),
  }),
}));

// Export reset functions for test cleanup
export const resetMockAuthState = () => {
  mockAuthState.current = {
    ready: true,
    authenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  };
};

export const resetMockThemeState = () => {
  mockThemeState.current = {
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  };
};

export const resetMockChosenCommunities = () => {
  mockChosenCommunities.mockReset();
};
