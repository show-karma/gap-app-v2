import { renderHook } from "@testing-library/react";
import { useZeroDevSigner } from "@/hooks/useZeroDevSigner";

// Mock bridge
const mockUser: any = { linkedAccounts: [] };
let mockWallets: any[] = [];
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => ({
    ready: true,
    user: mockUser,
    wallets: mockWallets,
    smartWalletClient: null,
  }),
}));

// Mock wagmi
vi.mock("wagmi", () => ({
  useChainId: () => 10,
}));

// Mock utilities
vi.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: vi.fn(),
}));
vi.mock("@/utilities/gasless", () => ({
  createGaslessClient: vi.fn(),
  createPrivySignerForGasless: vi.fn(),
  GaslessProviderError: class extends Error {},
  getGaslessSigner: vi.fn(),
  isChainSupportedForGasless: () => false,
}));
vi.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: vi.fn(),
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
