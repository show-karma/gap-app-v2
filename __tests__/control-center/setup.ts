/**
 * Test setup and configuration for Control Center tests.
 * Configures MSW, test environment, and global utilities.
 *
 * This file is automatically loaded by jest.config.ts via setupFilesAfterEnv.
 * However, since it is in a separate directory, tests that need control-center-specific
 * mocks should import from this file directly.
 */

import { setupServer } from "msw/node";
import React from "react";
import { handlers } from "./handlers";
import "@testing-library/jest-dom";

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
    authenticate: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    disconnect: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue("mock-token"),
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

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(() => {
    const { mockAuthState } = require("@/__tests__/control-center/setup");
    return mockAuthState.current;
  }),
}));

jest.mock("@/hooks/communities/useCommunityAdminAccess", () => ({
  useCommunityAdminAccess: jest.fn(() => {
    const { mockCommunityAdminAccessState } = require("@/__tests__/control-center/setup");
    return mockCommunityAdminAccessState.current;
  }),
}));

jest.mock("@/hooks/communities/useCommunityDetails", () => ({
  useCommunityDetails: jest.fn(() => ({
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

jest.mock("@/hooks/useKycStatus", () => ({
  useKycConfig: jest.fn(() => ({
    config: null,
    isEnabled: false,
  })),
  useKycBatchStatuses: jest.fn(() => ({
    statuses: new Map(),
    isLoading: false,
  })),
}));

// Mock the payout-disbursement hooks but keep types
jest.mock("@/src/features/payout-disbursement", () => {
  const actual = jest.requireActual("@/src/features/payout-disbursement/types/payout-disbursement");
  return {
    ...actual,
    useCommunityPayouts: jest.fn(() => ({
      data: null,
      isLoading: false,
      invalidate: jest.fn(),
    })),
    usePayoutConfigsByCommunity: jest.fn(() => ({
      data: [],
    })),
    useToggleAgreement: jest.fn(() => ({
      mutate: jest.fn(),
      isPending: false,
    })),
    useSaveMilestoneInvoices: jest.fn(() => ({
      mutate: jest.fn(),
      isPending: false,
    })),
    getPaidAllocationIds: jest.fn(() => []),
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
jest.mock("@/components/Pages/Communities/Impact/ProgramFilter", () => ({
  ProgramFilter: ({ onChange }: { onChange: (v: string | null) => void }) =>
    React.createElement("div", { "data-testid": "program-filter" }, "ProgramFilter"),
}));

jest.mock("@/components/Utilities/Skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement("div", { "data-testid": "skeleton", className }),
}));

jest.mock("@/components/Utilities/Spinner", () => ({
  Spinner: ({ className }: { className?: string }) =>
    React.createElement("div", { "data-testid": "spinner", className }),
}));

jest.mock("@/components/Utilities/TablePagination", () => ({
  __esModule: true,
  default: () => React.createElement("div", { "data-testid": "table-pagination" }),
}));

jest.mock("@/components/KycStatusIcon", () => ({
  KycStatusBadge: () => React.createElement("span", { "data-testid": "kyc-badge" }),
}));

// Mock next/navigation for control center context
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: "/community/test-community/manage/control-center",
  })),
  usePathname: jest.fn(() => "/community/test-community/manage/control-center"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({
    communityId: "test-community",
  })),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => React.createElement("img", { ...props, alt: props.alt || "" }),
}));

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({
    theme: "light",
    setTheme: jest.fn(),
    resolvedTheme: "light",
  })),
  ThemeProvider: ({ children }: { children: any }) => children,
}));

// Mock viem
jest.mock("viem", () => ({
  formatUnits: jest.fn((value: bigint, decimals: number) => {
    return (Number(value) / 10 ** decimals).toString();
  }),
  isAddress: jest.fn((addr: string) => {
    return typeof addr === "string" && /^0x[0-9a-fA-F]{40}$/.test(addr);
  }),
}));

// Mock toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Privy
jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(() => ({
    ready: true,
    authenticated: true,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue("mock-token"),
  })),
  useWallets: jest.fn(() => ({ wallets: [] })),
  PrivyProvider: ({ children }: { children: any }) => children,
}));

// Mock Wagmi
jest.mock("wagmi", () => ({
  useAccount: jest.fn(() => ({
    address: "0xAdmin1234567890abcdef1234567890abcdef",
    isConnected: true,
  })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn() })),
  WagmiProvider: ({ children }: { children: any }) => children,
}));

jest.mock("@wagmi/core", () => ({
  createConfig: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({})),
  cookieStorage: {},
  http: jest.fn((url: string) => ({ url, type: "http" })),
  getAccount: jest.fn(() => ({ address: undefined, isConnected: false })),
  getConnections: jest.fn(() => []),
  disconnect: jest.fn(),
  watchAccount: jest.fn(),
  reconnect: jest.fn(),
}));

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

jest.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: jest.fn(() => ({})),
}));

jest.mock("@/store", () => ({
  useOwnerStore: jest.fn((selector?: Function) => {
    const state = { isProjectOwner: false, isOwner: false, isOwnerLoading: false };
    return selector ? selector(state) : state;
  }),
  useProjectStore: jest.fn(() => ({ projects: [] })),
  useDonationCartStore: jest.fn(() => ({ items: [] })),
}));

jest.mock("@/store/owner", () => ({
  useOwnerStore: jest.fn((selector?: Function) => {
    const state = { isProjectOwner: false, isOwner: false, isOwnerLoading: false };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
  })),
}));

jest.mock("@/components/Utilities/errorManager", () => ({
  errorManager: jest.fn(),
}));

/**
 * Export server for test file usage
 */
export { server as mswServer };
