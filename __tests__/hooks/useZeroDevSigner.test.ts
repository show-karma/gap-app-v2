import { renderHook } from "@testing-library/react";
import { useZeroDevSigner } from "@/hooks/useZeroDevSigner";

// Mock bridge
const mockUser: any = { linkedAccounts: [] };
let mockWallets: any[] = [];
jest.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => ({
    ready: true,
    user: mockUser,
    wallets: mockWallets,
    smartWalletClient: null,
  }),
}));

// Mock wagmi
jest.mock("wagmi", () => ({
  useChainId: () => 10,
}));

// Mock utilities
jest.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: jest.fn(),
}));
jest.mock("@/utilities/gasless", () => ({
  createGaslessClient: jest.fn(),
  createPrivySignerForGasless: jest.fn(),
  GaslessProviderError: class extends Error {},
  getGaslessSigner: jest.fn(),
  isChainSupportedForGasless: () => false,
}));
jest.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: jest.fn(),
}));

describe("useZeroDevSigner", () => {
  beforeEach(() => {
    mockUser.linkedAccounts = [];
    mockWallets = [];
  });

  it("detects embedded wallet for email login user", () => {
    mockUser.linkedAccounts = [{ type: "email", address: "test@example.com" }];
    mockWallets = [{ walletClientType: "privy", address: "0xEmbedded" }];

    const { result } = renderHook(() => useZeroDevSigner());

    expect(result.current.hasEmbeddedWallet).toBe(true);
    expect(result.current.attestationAddress).toBe("0xEmbedded");
  });

  it("detects embedded wallet for farcaster login user", () => {
    mockUser.linkedAccounts = [{ type: "farcaster", fid: 12345, ownerAddress: "0xCustody" }];
    mockWallets = [{ walletClientType: "privy", address: "0xEmbedded" }];

    const { result } = renderHook(() => useZeroDevSigner());

    expect(result.current.hasEmbeddedWallet).toBe(true);
    expect(result.current.attestationAddress).toBe("0xEmbedded");
  });

  it("returns null attestationAddress for farcaster user without embedded wallet", () => {
    mockUser.linkedAccounts = [{ type: "farcaster", fid: 12345, ownerAddress: "0xCustody" }];
    mockWallets = [];

    const { result } = renderHook(() => useZeroDevSigner());

    expect(result.current.hasEmbeddedWallet).toBe(false);
    expect(result.current.attestationAddress).toBeNull();
  });

  it("does not detect social login for wallet-only user", () => {
    mockUser.linkedAccounts = [{ type: "wallet", address: "0xExternal" }];
    mockWallets = [{ walletClientType: "metamask", address: "0xExternal" }];

    const { result } = renderHook(() => useZeroDevSigner());

    expect(result.current.hasEmbeddedWallet).toBe(false);
    expect(result.current.hasExternalWallet).toBe(true);
    expect(result.current.attestationAddress).toBe("0xExternal");
  });
});
