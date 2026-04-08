import { renderHook } from "@testing-library/react";
import { useZeroDevSigner } from "../useZeroDevSigner";

// Mock dependencies
vi.mock("wagmi", () => ({
  useChainId: vi.fn(() => 137),
}));

const mockSafeGetWalletClient = vi.fn();
vi.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: (...args: any[]) => mockSafeGetWalletClient(...args),
}));

const mockWalletClientToSigner = vi.fn();
vi.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: (...args: any[]) => mockWalletClientToSigner(...args),
}));

vi.mock("@/utilities/gasless", () => ({
  createGaslessClient: vi.fn(),
  createPrivySignerForGasless: vi.fn(),
  GaslessProviderError: class GaslessProviderError extends Error {
    provider = "test";
  },
  getGaslessSigner: vi.fn(),
  isChainSupportedForGasless: vi.fn(() => false),
}));

vi.mock("@/utilities/network", () => ({
  appNetwork: [{ id: 137, name: "Polygon" }],
}));

const mockCreateWalletClient = vi.fn();
vi.mock("viem", () => ({
  createWalletClient: (...args: any[]) => mockCreateWalletClient(...args),
  custom: vi.fn((provider: any) => ({ type: "custom", provider })),
}));

const mockGetEthereumProvider = vi.fn();
const mockSwitchChain = vi.fn();

const mockExternalWallet = {
  walletClientType: "metamask",
  address: "0x9b750f08b73D7441d4A0eFF112648764613019A4",
  switchChain: mockSwitchChain,
  getEthereumProvider: mockGetEthereumProvider,
};

const mockUsePrivyBridge = vi.fn();
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => mockUsePrivyBridge(),
}));

vi.mock("ethers", () => ({
  BrowserProvider: vi.fn(() => ({
    getSigner: vi.fn(),
  })),
}));

describe("useZeroDevSigner", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: external wallet user (MetaMask), NOT email/social login
    mockUsePrivyBridge.mockReturnValue({
      ready: true,
      user: {
        linkedAccounts: [{ type: "wallet" }],
      },
      wallets: [mockExternalWallet],
    });
  });

  describe("getAttestationSigner - external wallet (Case 3)", () => {
    it("creates viem WalletClient from Privy provider and converts to signer", async () => {
      const mockProvider = { request: vi.fn() };
      mockGetEthereumProvider.mockResolvedValue(mockProvider);

      const mockViemClient = { account: mockExternalWallet.address };
      mockCreateWalletClient.mockReturnValue(mockViemClient);

      const mockSigner = { _isSigner: true, address: "0x123" };
      mockWalletClientToSigner.mockResolvedValue(mockSigner);

      const { result } = renderHook(() => useZeroDevSigner());
      const signer = await result.current.getAttestationSigner(137);

      expect(signer).toBe(mockSigner);
      expect(mockSwitchChain).toHaveBeenCalledWith(137);
      expect(mockGetEthereumProvider).toHaveBeenCalled();
      expect(mockCreateWalletClient).toHaveBeenCalledWith(
        expect.objectContaining({
          account: mockExternalWallet.address,
          chain: { id: 137, name: "Polygon" },
        })
      );
      expect(mockWalletClientToSigner).toHaveBeenCalledWith(mockViemClient);
    });

    it("does not call wagmi getWalletClient when Privy provider succeeds", async () => {
      const mockProvider = { request: vi.fn() };
      mockGetEthereumProvider.mockResolvedValue(mockProvider);
      mockCreateWalletClient.mockReturnValue({});
      mockWalletClientToSigner.mockResolvedValue({ _isSigner: true });

      const { result } = renderHook(() => useZeroDevSigner());
      await result.current.getAttestationSigner(137);

      expect(mockSafeGetWalletClient).not.toHaveBeenCalled();
    });

    it("falls back to wagmi wallet client when Privy provider fails", async () => {
      mockGetEthereumProvider.mockRejectedValue(new Error("Provider not available"));

      // wagmi fallback also fails
      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: null,
        error: "Failed to connect to wallet. Please try again.",
      });

      const { result } = renderHook(() => useZeroDevSigner());

      await expect(result.current.getAttestationSigner(137)).rejects.toThrow(
        "Failed to get wallet client"
      );
      expect(mockSafeGetWalletClient).toHaveBeenCalledWith(137);
    });

    it("returns signer from wagmi fallback when Privy fails but wagmi succeeds", async () => {
      mockGetEthereumProvider.mockRejectedValue(new Error("Provider not available"));

      const mockViemClient = { account: "0x123" };
      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: mockViemClient,
        error: null,
      });

      const mockSigner = { _isSigner: true };
      mockWalletClientToSigner.mockResolvedValue(mockSigner);

      const { result } = renderHook(() => useZeroDevSigner());
      const signer = await result.current.getAttestationSigner(137);

      expect(signer).toBe(mockSigner);
      expect(mockSafeGetWalletClient).toHaveBeenCalledWith(137);
      expect(mockWalletClientToSigner).toHaveBeenCalledWith(mockViemClient);
    });
  });
});
