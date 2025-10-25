import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Increase timeout for slower tests
jest.setTimeout(30000);

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
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
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: "/",
      query: {},
      asPath: "/",
    };
  },
  usePathname() {
    return "/";
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  useParams() {
    return {};
  },
  notFound: jest.fn(),
  redirect: jest.fn(),
}));

// Mock Privy authentication
jest.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
    user: null,
    getAccessToken: jest.fn(),
  }),
  useWallets: () => ({
    wallets: [],
    ready: true,
  }),
  useLogin: () => ({
    login: jest.fn(),
  }),
  useLogout: () => ({
    logout: jest.fn(),
  }),
  PrivyProvider: ({ children }) => children,
}));

// Mock Wagmi
jest.mock("wagmi", () => ({
  useAccount: () => ({
    address: undefined,
    isConnected: false,
    connector: null,
  }),
  useBalance: () => ({
    data: undefined,
    isLoading: false,
  }),
  useConnect: () => ({
    connect: jest.fn(),
    connectors: [],
  }),
  useDisconnect: () => ({
    disconnect: jest.fn(),
  }),
  useSwitchChain: () => ({
    switchChain: jest.fn(),
    chains: [],
  }),
  useWalletClient: () => ({
    data: null,
  }),
  usePublicClient: () => ({
    data: null,
  }),
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(),
}));

// Mock @wagmi/core
jest.mock("@wagmi/core", () => ({
  getAccount: jest.fn(),
  getBalance: jest.fn(),
  switchChain: jest.fn(),
  readContract: jest.fn(),
  writeContract: jest.fn(),
}));

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) => callback({ setExtras: jest.fn() })),
}));
