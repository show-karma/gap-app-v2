/**
 * @file Bridge-push tests for PrivyWagmiProviders (GAP-FRONTEND-24N)
 * @description Asserts that `walletsReady` (from Privy's `useWallets().ready`)
 * is read and pushed into PrivyBridgeContext, and that a `ready` flip with an
 * unchanged wallet count still re-pushes the bridge value (the effect depends
 * on `walletsReady`, not just `walletCount`).
 *
 * Also covers the `login_completed` analytics event, which is emitted from
 * Privy's own `useLogin({ onComplete })` here because that callback is the only
 * place carrying the login method and the new-user / restored-session flags.
 */
import { act, render } from "@testing-library/react";

const mockSetBridge = vi.fn();

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridgeSetter: () => mockSetBridge,
}));

const mockUseWallets = vi.fn();
const mockUseLogin = vi.fn();
vi.mock("@privy-io/react-auth", () => ({
  PrivyProvider: ({ children }: { children: React.ReactNode }) => children,
  usePrivy: () => ({
    ready: true,
    authenticated: true,
    user: { id: "test-user", linkedAccounts: [] },
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn(),
    connectWallet: vi.fn(),
  }),
  useWallets: () => mockUseWallets(),
  useLogin: (callbacks: unknown) => mockUseLogin(callbacks),
}));

vi.mock("@/utilities/analytics/client", () => ({
  track: vi.fn(),
}));

vi.mock("@privy-io/react-auth/smart-wallets", () => ({
  useSmartWallets: () => ({ client: null }),
}));

vi.mock("@privy-io/wagmi", () => ({
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
  useSetActiveWallet: () => ({ setActiveWallet: vi.fn() }),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ isConnected: false, chainId: 10 }),
}));

vi.mock("@wagmi/core", () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("@/hooks/useEnsureEmbeddedWallet", () => ({
  useEnsureEmbeddedWallet: vi.fn(),
}));

vi.mock("@/utilities/auth/select-primary-wallet", () => ({
  selectPrimaryWallet: () => null,
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: { PRIVY_APP_ID: "test-app-id", PROJECT_ID: "test-project-id", APP_ORIGIN: "" },
}));

vi.mock("@/utilities/network", () => ({
  appNetwork: [{ id: 10, name: "Optimism" }],
}));

vi.mock("@/utilities/wagmi/privy-config", () => ({
  privyConfig: {},
  minimalWagmiConfig: {},
}));

vi.mock("@/constants/brand", () => ({
  PROJECT_NAME: "Karma",
}));

import PrivyWagmiProviders from "@/components/Utilities/PrivyWagmiProviders";
import { track } from "@/utilities/analytics/client";

type LoginCallbacks = {
  onComplete: (params: {
    isNewUser: boolean;
    wasAlreadyAuthenticated: boolean;
    loginMethod: string | null;
  }) => void;
};

describe("PrivyWagmiProviders — walletsReady bridge push (GAP-FRONTEND-24N)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWallets.mockReturnValue({ wallets: [], ready: true });
  });

  it("pushes walletsReady=true into the bridge once Privy's useWallets().ready is true", async () => {
    mockUseWallets.mockReturnValue({ wallets: [], ready: true });

    await act(async () => {
      render(<PrivyWagmiProviders />);
    });

    expect(mockSetBridge).toHaveBeenCalledWith(
      expect.objectContaining({ walletsReady: true, wallets: [] })
    );
  });

  it("pushes walletsReady=false while Privy is still hydrating wallets", async () => {
    mockUseWallets.mockReturnValue({ wallets: [], ready: false });

    await act(async () => {
      render(<PrivyWagmiProviders />);
    });

    expect(mockSetBridge).toHaveBeenCalledWith(
      expect.objectContaining({ walletsReady: false, wallets: [] })
    );
  });

  it("re-pushes the bridge when walletsReady flips even though wallet count is unchanged", async () => {
    mockUseWallets.mockReturnValue({ wallets: [], ready: false });

    const { rerender } = render(<PrivyWagmiProviders />);
    await act(async () => {});

    expect(mockSetBridge).toHaveBeenLastCalledWith(
      expect.objectContaining({ walletsReady: false })
    );

    mockUseWallets.mockReturnValue({ wallets: [], ready: true });
    await act(async () => {
      rerender(<PrivyWagmiProviders />);
    });

    expect(mockSetBridge).toHaveBeenLastCalledWith(expect.objectContaining({ walletsReady: true }));
  });
});

describe("PrivyWagmiProviders — login_completed", () => {
  const renderAndCompleteLogin = async (params: {
    isNewUser?: boolean;
    wasAlreadyAuthenticated?: boolean;
    loginMethod?: string | null;
  }) => {
    await act(async () => {
      render(<PrivyWagmiProviders />);
    });

    const callbacks = mockUseLogin.mock.calls.at(-1)?.[0] as LoginCallbacks;
    act(() => {
      callbacks.onComplete({
        isNewUser: params.isNewUser ?? false,
        wasAlreadyAuthenticated: params.wasAlreadyAuthenticated ?? false,
        loginMethod: params.loginMethod ?? null,
      });
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWallets.mockReturnValue({ wallets: [], ready: true });
  });

  it("does not fire until Privy reports the login complete", async () => {
    await act(async () => {
      render(<PrivyWagmiProviders />);
    });

    expect(mockUseLogin).toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("reports a first-time signup with the login method", async () => {
    await renderAndCompleteLogin({ isNewUser: true, loginMethod: "google" });

    expect(track).toHaveBeenCalledWith("login_completed", {
      auth_method: "google",
      is_new_user: true,
      was_already_authenticated: false,
    });
  });

  it("maps Privy's wallet-signature method onto the catalog's wallet method", async () => {
    await renderAndCompleteLogin({ loginMethod: "siwe" });

    expect(track).toHaveBeenCalledWith("login_completed", {
      auth_method: "wallet",
      is_new_user: false,
      was_already_authenticated: false,
    });
  });

  it("marks a restored session so it can be excluded from the activation funnel", async () => {
    await renderAndCompleteLogin({ wasAlreadyAuthenticated: true, loginMethod: "email" });

    expect(track).toHaveBeenCalledWith("login_completed", {
      auth_method: "email",
      is_new_user: false,
      was_already_authenticated: true,
    });
  });

  it("falls back to unknown when Privy reports no login method", async () => {
    await renderAndCompleteLogin({ loginMethod: null });

    expect(track).toHaveBeenCalledWith(
      "login_completed",
      expect.objectContaining({ auth_method: "unknown" })
    );
  });
});
