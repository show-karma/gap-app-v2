import { act, renderHook, waitFor } from "@testing-library/react";
import * as nextNavigation from "next/navigation";

<<<<<<< HEAD
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseRouter = jest.spyOn(nextNavigation, "useRouter");
const mockUsePathname = jest.spyOn(nextNavigation, "usePathname");
=======
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockUsePrivy = usePrivy as vi.Mock;
const mockUseWallets = useWallets as vi.Mock;
const mockUseAccount = useAccount as vi.Mock;
const mockWatchAccount = watchAccount as vi.Mock;
const mockUseRouter = vi.spyOn(nextNavigation, "useRouter");
const mockUsePathname = vi.spyOn(nextNavigation, "usePathname");
>>>>>>> 8322801b (test: migrate Jest to Vitest for unit/integration tests)

const bridgeState = {
  ready: true,
  authenticated: false,
<<<<<<< HEAD
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
=======
  user: { id: "user-1" },
  login: vi.fn(),
  logout: vi.fn(),
  getAccessToken: vi.fn(),
  connectWallet: vi.fn(),
};

const { useAuth } = vi.importActual("@/hooks/useAuth") as typeof import("@/hooks/useAuth");
>>>>>>> 8322801b (test: migrate Jest to Vitest for unit/integration tests)

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
