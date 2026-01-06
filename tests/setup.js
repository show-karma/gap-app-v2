import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";

// Polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Fetch API polyfills for MSW (Jest jsdom environment doesn't expose Node's native fetch)
// MUST be set up BEFORE importing MSW setup
// Node.js 18+ has native fetch, but Jest's jsdom environment doesn't expose it to the global scope
if (typeof globalThis.Response === "undefined") {
  globalThis.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || "OK";
      this.headers = new Map(Object.entries(init.headers || {}));
      this.ok = this.status >= 200 && this.status < 300;
    }
    async text() {
      return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
    }
    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }
  };
}

if (typeof globalThis.Request === "undefined") {
  globalThis.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === "string" ? input : input.url;
      this.method = init.method || "GET";
      this.headers = new Map(Object.entries(init.headers || {}));
    }
  };
}

if (typeof globalThis.Headers === "undefined") {
  globalThis.Headers = class Headers extends Map {};
}

// Mock until-async before importing MSW (it's an ESM-only package that Jest can't transform)
// The manual mock in __mocks__/until-async.js will be used automatically
jest.mock("until-async");

// Import MSW setup AFTER polyfills are configured
require("@/__tests__/utils/msw/setup");

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
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
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
  useChainId: () => 1,
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
  createConfig: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({})),
  cookieStorage: {},
  http: jest.fn((url) => ({
    url,
    type: "http",
  })),
  getConnections: jest.fn(() => []),
  disconnect: jest.fn(),
  watchAccount: jest.fn(),
  reconnect: jest.fn(),
}));

// Mock @wagmi/core/chains
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

// Mock privy-config
jest.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: jest.fn(() => ({})),
}));

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) => callback({ setExtras: jest.fn() })),
}));

// Mock rehype-sanitize to avoid ESM parsing issues
jest.mock("rehype-sanitize", () => ({
  __esModule: true,
  default: () => (tree) => tree, // Pass-through plugin for testing
}));

// Mock rehype-external-links
jest.mock("rehype-external-links", () => ({
  __esModule: true,
  default: () => (tree) => tree, // Pass-through plugin for testing
}));

// Mock remark-gfm to avoid ESM parsing issues
jest.mock("remark-gfm", () => ({
  __esModule: true,
  default: () => (tree) => tree, // Pass-through plugin for testing
}));

// Mock remark-breaks to avoid ESM parsing issues
jest.mock("remark-breaks", () => ({
  __esModule: true,
  default: () => (tree) => tree, // Pass-through plugin for testing
}));
