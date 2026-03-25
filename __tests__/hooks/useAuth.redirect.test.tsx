import { act, renderHook, waitFor } from "@testing-library/react";
import * as nextNavigation from "next/navigation";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockUseRouter = vi.spyOn(nextNavigation, "useRouter");
const mockUsePathname = vi.spyOn(nextNavigation, "usePathname");

const bridgeState = {
  ready: true,
  authenticated: false,
  user: { id: "user-1" } as any,
  login: vi.fn(),
  logout: vi.fn(),
  getAccessToken: vi.fn(),
  connectWallet: vi.fn(),
  wallets: [] as any[],
  isConnected: true,
};

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => bridgeState,
  PrivyBridgeContext: {
    Provider: ({ children }: { children: any }) => children,
  },
  PRIVY_BRIDGE_DEFAULTS: {
    ready: false,
    authenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: async () => null,
    connectWallet: vi.fn(),
    wallets: [],
    isConnected: false,
  },
}));

vi.mock("@wagmi/core", () => ({
  watchAccount: vi.fn(() => vi.fn()),
}));

vi.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: vi.fn(() => ({})),
}));

const { useAuth } = vi.importActual("@/hooks/useAuth") as typeof import("@/hooks/useAuth");

vi.mock("@/utilities/auth/cypress-auth", () => ({
  getCypressMockAuthState: () => null,
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    setPrivyInstance: vi.fn(),
    getToken: vi.fn().mockResolvedValue("token"),
    clearCache: vi.fn(),
  },
}));

vi.mock("@/utilities/query-client", () => ({
  queryClient: { clear: vi.fn() },
}));

describe("useAuth post-login redirect", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      prefetch: vi.fn(),
      back: vi.fn(),
    } as any);
    mockUsePathname.mockReturnValue("/");

    bridgeState.authenticated = false;
    sessionStorage.clear();
  });

  it("redirects to /dashboard after login when on home page", async () => {
    const { rerender } = renderHook(() => useAuth());

    bridgeState.authenticated = true;

    await act(async () => {
      rerender();
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
