import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

vi.unmock("@/hooks/useAuth");

const mockPush = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn(async () => {});
const mockGetAccessToken = vi.fn(async () => null);
const mockLoadPrivy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/programs/1045/apply",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => ({
    isWhitelabel: false,
    whitelabelConfig: null,
  }),
}));

vi.mock("@/store/modals/projectCreate", () => ({
  useProjectCreateModalStore: {
    getState: () => ({ isProjectCreateModalOpen: false }),
  },
}));

vi.mock("@/utilities/auth/compare-all-wallets", () => ({
  compareAllWallets: vi.fn(() => true),
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    DASHBOARD: "/dashboard",
  },
}));

const mockBridgeState = {
  ready: false,
  authenticated: false,
  user: null as any,
  login: mockLogin,
  logout: mockLogout,
  getAccessToken: mockGetAccessToken,
  connectWallet: vi.fn(),
  wallets: [] as any[],
  isConnected: false,
};

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => mockBridgeState,
  useLoadPrivy: () => mockLoadPrivy,
}));

vi.mock("@wagmi/core", () => ({
  watchAccount: vi.fn(() => vi.fn()),
}));

vi.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: vi.fn(() => ({})),
}));

vi.mock("@/utilities/query-client", () => ({
  queryClient: {
    clear: vi.fn(),
  },
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    getToken: vi.fn(async () => null),
    setPrivyInstance: vi.fn(),
    clearCache: vi.fn(),
  },
}));

function setBridgeState(overrides: Partial<typeof mockBridgeState>) {
  Object.assign(mockBridgeState, overrides);
}

function resetBridgeState() {
  Object.assign(mockBridgeState, {
    ready: false,
    authenticated: false,
    user: null,
    login: mockLogin,
    logout: mockLogout,
    getAccessToken: mockGetAccessToken,
    connectWallet: vi.fn(),
    wallets: [],
    isConnected: false,
  });
}

describe("useAuth deferred Privy loading", () => {
  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    resetBridgeState();
    window.history.replaceState({}, "", "/programs/1045/apply");
  });

  it("requests Privy load instead of calling login when SDK is not ready", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login();
    });

    expect(mockLoadPrivy).toHaveBeenCalledTimes(1);
    expect(mockLogin).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("postLoginRedirect")).toBe("/programs/1045/apply");
  });

  it("retries login after Privy finishes loading", async () => {
    const { result, rerender } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login();
    });

    expect(mockLoadPrivy).toHaveBeenCalledTimes(1);
    expect(mockLogin).not.toHaveBeenCalled();

    setBridgeState({ ready: true });

    await act(async () => {
      rerender();
    });

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});
