/**
 * Test setup and configuration for Control Center tests.
 * Configures MSW, test environment, and global utilities.
 *
 * This file is automatically loaded by vitest.config.ts via setupFiles.
 * However, since it is in a separate directory, tests that need control-center-specific
 * mocks should import from this file directly.
 */

import { setupServer } from "msw/node";
import React from "react";
import { handlers } from "./handlers";
import "@testing-library/jest-dom/vitest";

/**
 * Setup MSW server for control center tests
 */
export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// ---- Mock holders for per-test overrides ----

export const mockAuthState = {
  current: {
    ready: true,
    authenticated: true,
    isConnected: true,
    address: "0xAdmin1234567890abcdef1234567890abcdef" as string | undefined,
    user: null,
    authenticate: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    disconnect: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue("mock-token"),
  },
};

export const mockCommunityAdminAccessState = {
  current: {
    hasAccess: true,
    isLoading: false,
    checks: {
      isCommunityAdmin: true,
      isOwner: false,
      isSuperAdmin: false,
      isRbacCommunityAdmin: false,
    },
  },
};

// ---- Module mocks ----

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => {
    const { mockAuthState } = require("@/__tests__/control-center/setup");
    return mockAuthState.current;
  }),
}));

vi.mock("@/hooks/communities/useCommunityAdminAccess", () => ({
  useCommunityAdminAccess: vi.fn(() => {
    const { mockCommunityAdminAccessState } = require("@/__tests__/control-center/setup");
    return mockCommunityAdminAccessState.current;
  }),
}));

vi.mock("@/hooks/communities/useCommunityDetails", () => ({
  useCommunityDetails: vi.fn(() => ({
    data: {
      uid: "community-uid-1",
      details: {
        name: "Test Community",
        slug: "test-community",
      },
    },
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/hooks/useKycStatus", () => ({
  useKycConfig: vi.fn(() => ({
    config: null,
    isEnabled: false,
  })),
  useKycBatchStatuses: vi.fn(() => ({
    statuses: new Map(),
    isLoading: false,
  })),
}));

// Mock the payout-disbursement hooks but keep types
vi.mock("@/src/features/payout-disbursement", () => {
  const actual = vi.importActual("@/src/features/payout-disbursement/types/payout-disbursement");
  return {
    ...actual,
    useCommunityPayouts: vi.fn(() => ({
      data: null,
      isLoading: false,
      invalidate: vi.fn(),
    })),
    usePayoutConfigsByCommunity: vi.fn(() => ({
      data: [],
    })),
    useToggleAgreement: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
    })),
    useSaveMilestoneInvoices: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
    })),
    getPaidAllocationIds: vi.fn(() => []),
    CreateDisbursementModal: () => null,
    PayoutConfigurationModal: () => null,
    PayoutHistoryDrawer: () => null,
    TokenBreakdown: ({ totalsByToken }: { totalsByToken: unknown[] }) =>
      React.createElement(
        "span",
        { "data-testid": "token-breakdown" },
        `${totalsByToken.length} tokens`
      ),
  };
});

// Mock components that aren't needed in control-center tests
vi.mock("@/components/Pages/Communities/Impact/ProgramFilter", () => ({
  ProgramFilter: ({ onChange }: { onChange: (v: string | null) => void }) =>
    React.createElement("div", { "data-testid": "program-filter" }, "ProgramFilter"),
}));

vi.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement("div", { "data-testid": "skeleton", className }),
}));

vi.mock("@/components/Utilities/Spinner", () => ({
  Spinner: ({ className }: { className?: string }) =>
    React.createElement("div", { "data-testid": "spinner", className }),
}));

vi.mock("@/components/Utilities/TablePagination", () => ({
  __esModule: true,
  default: () => React.createElement("div", { "data-testid": "table-pagination" }),
}));

vi.mock("@/components/KycStatusIcon", () => ({
  KycStatusBadge: () => React.createElement("span", { "data-testid": "kyc-badge" }),
}));

// Mock next/navigation for control center context
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: "/community/test-community/manage/control-center",
  })),
  usePathname: vi.fn(() => "/community/test-community/manage/control-center"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({
    communityId: "test-community",
  })),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock next/image
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => React.createElement("img", { ...props, alt: props.alt || "" }),
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  })),
  ThemeProvider: ({ children }: { children: any }) => children,
}));

// Mock viem
vi.mock("viem", () => ({
  formatUnits: vi.fn((value: bigint, decimals: number) => {
    return (Number(value) / 10 ** decimals).toString();
  }),
  isAddress: vi.fn((addr: string) => {
    return typeof addr === "string" && /^0x[0-9a-fA-F]{40}$/.test(addr);
  }),
}));

// Mock toast
vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Privy
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: vi.fn(() => ({
    ready: true,
    authenticated: true,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue("mock-token"),
  })),
  useWallets: vi.fn(() => ({ wallets: [] })),
  PrivyProvider: ({ children }: { children: any }) => children,
  useCreateWallet: jest.fn(() => ({ createWallet: jest.fn() })),
}));

// Mock Wagmi
vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: "0xAdmin1234567890abcdef1234567890abcdef",
    isConnected: true,
  })),
  useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
  WagmiProvider: ({ children }: { children: any }) => children,
}));

vi.mock("@wagmi/core", () => ({
  createConfig: vi.fn(() => ({})),
  createStorage: vi.fn(() => ({})),
  cookieStorage: {},
  http: vi.fn((url: string) => ({ url, type: "http" })),
  getAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
  getConnections: vi.fn(() => []),
  disconnect: vi.fn(),
  watchAccount: vi.fn(),
  reconnect: vi.fn(),
}));

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

vi.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: vi.fn(() => ({})),
}));

vi.mock("@/store", () => ({
  useOwnerStore: vi.fn((selector?: Function) => {
    const state = { isProjectOwner: false, isOwner: false, isOwnerLoading: false };
    return selector ? selector(state) : state;
  }),
  useProjectStore: vi.fn(() => ({ projects: [] })),
  useDonationCartStore: vi.fn(() => ({ items: [] })),
}));

vi.mock("@/store/owner", () => ({
  useOwnerStore: vi.fn((selector?: Function) => {
    const state = { isProjectOwner: false, isOwner: false, isOwnerLoading: false };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
  })),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

/**
 * Export server for test file usage
 */
export { server as mswServer };
