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
vi.mock("until-async");

// Import MSW setup AFTER polyfills are configured
require("@/__tests__/utils/msw/setup");

// Increase timeout for slower tests
vi.setConfig({ testTimeout: 30000 });

// Suppress noisy React warnings during tests (act() warnings, async component warnings, etc.)
// These are framework-level warnings that don't indicate test issues.
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const SUPPRESSED_ERROR_PATTERNS = [
  /not wrapped in act/,
  /A suspended resource finished loading inside a test/,
  /A component suspended inside an `act` scope/,
  /Received .* for a non-boolean attribute/,
  /is an async Client Component/,
  /Feature Flags unavailable/,
  /Invalid prop .* supplied to `React\.Fragment`/,
  /You provided a `value` prop to a form field without an `onChange` handler/,
  /Not implemented: navigation/,
  /Unknown event handler property/,
  /was suspended by an uncached promise/,
  /React does not recognize the .* prop on a DOM element/,
  /Received NaN for the .* attribute/,
  /Query data cannot be undefined/,
];

const SUPPRESSED_WARN_PATTERNS = [
  /Failed to get chain ID from window\.ethereum/,
  /Headless UI has polyfilled/,
  /Missing `Description` or `aria-describedby/,
  /NEXT_PUBLIC_RPC_MAINNET is not set/,
  /timers APIs are not replaced with fake timers/,
];

console.error = (...args) => {
  const message = args.map((a) => (typeof a === "string" ? a : a?.message || String(a))).join(" ");
  if (SUPPRESSED_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  const message = args.map((a) => (typeof a === "string" ? a : a?.message || String(a))).join(" ");
  if (SUPPRESSED_WARN_PATTERNS.some((pattern) => pattern.test(message))) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
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
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
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
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

// Mock Privy authentication
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: vi.fn(() => ({
    ready: true,
    authenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    user: null,
    getAccessToken: vi.fn(),
  })),
  useWallets: vi.fn(() => ({
    wallets: [],
    ready: true,
  })),
  useLogin: () => ({
    login: vi.fn(),
  }),
  useLogout: () => ({
    logout: vi.fn(),
  }),
  PrivyProvider: ({ children }) => children,
}));

// Mock Wagmi
vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: undefined,
    isConnected: false,
    connector: null,
  })),
  useChainId: () => 1,
  useBalance: () => ({
    data: undefined,
    isLoading: false,
  }),
  useConnect: () => ({
    connect: vi.fn(),
    connectors: [],
  }),
  useDisconnect: () => ({
    disconnect: vi.fn(),
  }),
  useSwitchChain: () => ({
    switchChain: vi.fn(),
    chains: [],
  }),
  useWalletClient: () => ({
    data: null,
  }),
  usePublicClient: () => ({
    data: null,
  }),
  WagmiProvider: ({ children }) => children,
  createConfig: vi.fn(),
}));

// Mock @wagmi/core
vi.mock("@wagmi/core", () => ({
  getAccount: vi.fn(),
  getBalance: vi.fn(),
  switchChain: vi.fn(),
  readContract: vi.fn(),
  writeContract: vi.fn(),
  createConfig: vi.fn(() => ({})),
  createStorage: vi.fn(() => ({})),
  cookieStorage: {},
  http: vi.fn((url) => ({
    url,
    type: "http",
  })),
  getConnections: vi.fn(() => []),
  disconnect: vi.fn(),
  watchAccount: vi.fn(),
  reconnect: vi.fn(),
}));

// Mock @wagmi/core/chains
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

// Mock privy-config
vi.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: vi.fn(() => ({})),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback) => callback({ setExtras: vi.fn() })),
}));

// Mock rehype-sanitize to avoid ESM parsing issues
vi.mock("rehype-sanitize", () => ({
  __esModule: true,
  default: () => (tree) => tree, // Pass-through plugin for testing
  defaultSchema: {
    tagNames: [],
    attributes: {},
  },
}));

// Mock rehype-external-links
vi.mock("rehype-external-links", () => ({
  __esModule: true,
  default: () => (tree) => tree, // Pass-through plugin for testing
}));

// Mock remark-gfm to avoid ESM parsing issues
vi.mock("remark-gfm", () => ({
  __esModule: true,
  default: () => (tree) => tree, // Pass-through plugin for testing
}));

// Mock remark-breaks to avoid ESM parsing issues
vi.mock("remark-breaks", () => ({
  __esModule: true,
  default: () => (tree) => tree, // Pass-through plugin for testing
}));

// NOTE: The gasless module is mocked via jest-resolver.js which redirects all gasless
// imports to __mocks__/utilities/gasless/index.ts. This provides proper vi.fn() mocks
// that can be configured in tests. We don't use vi.mock() here because the resolver
// handles it more reliably (catches relative paths like ../../../../utilities/gasless).

// Mock ProjectOptionsMenu to avoid deep dependency chain with gasless utilities
vi.mock("@/components/Pages/Project/ProjectOptionsMenu", () => ({
  __esModule: true,
  ProjectOptionsMenu: () => null,
  ProjectOptionsDialogs: () => null,
  default: () => null,
}));
