/**
 * @file Bridge-push tests for PrivyWagmiProviders (GAP-FRONTEND-24N)
 * @description Asserts that `walletsReady` (from Privy's `useWallets().ready`)
 * is read and pushed into PrivyBridgeContext, and that a `ready` flip with an
 * unchanged wallet count still re-pushes the bridge value (the effect depends
 * on `walletsReady`, not just `walletCount`).
 */
import { act, render } from "@testing-library/react";

const mockSetBridge = vi.fn();

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridgeSetter: () => mockSetBridge,
}));

const mockUseWallets = vi.fn();
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
}));

vi.mock("@privy-io/react-auth/smart-wallets", () => ({
  useSmartWallets: () => ({ client: null }),
}));

vi.mock("@privy-io/wagmi", () => ({
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
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
  envVars: { PRIVY_APP_ID: "test-app-id", PROJECT_ID: "test-project-id", VERCEL_URL: "" },
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

describe("PrivyWagmiProviders — walletsReady bridge push (GAP-FRONTEND-24N)", () => {
  beforeEach(() => {
    mockSetBridge.mockClear();
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
