import { act, renderHook, waitFor } from "@testing-library/react";
import * as nextNavigation from "next/navigation";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseRouter = jest.spyOn(nextNavigation, "useRouter");
const mockUsePathname = jest.spyOn(nextNavigation, "usePathname");

const bridgeState = {
  ready: true,
  authenticated: false,
  user: { id: "user-1" } as any,
  login: jest.fn(),
  logout: jest.fn(),
  getAccessToken: jest.fn(),
  connectWallet: jest.fn(),
  wallets: [] as any[],
  isConnected: true,
};

jest.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => bridgeState,
  PrivyBridgeContext: {
    Provider: ({ children }: { children: any }) => children,
  },
  PRIVY_BRIDGE_DEFAULTS: {
    ready: false,
    authenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    getAccessToken: async () => null,
    connectWallet: jest.fn(),
    wallets: [],
    isConnected: false,
  },
}));

jest.mock("@wagmi/core", () => ({
  watchAccount: jest.fn(() => jest.fn()),
}));

jest.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  getPrivyWagmiConfig: jest.fn(() => ({})),
}));

const { useAuth } = jest.requireActual("@/hooks/useAuth") as typeof import("@/hooks/useAuth");

jest.mock("@/utilities/auth/cypress-auth", () => ({
  getCypressMockAuthState: () => null,
}));

jest.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: {
    setPrivyInstance: jest.fn(),
    getToken: jest.fn().mockResolvedValue("token"),
    clearCache: jest.fn(),
  },
}));

jest.mock("@/utilities/query-client", () => ({
  queryClient: { clear: jest.fn() },
}));

describe("useAuth post-login redirect", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      prefetch: jest.fn(),
      back: jest.fn(),
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
