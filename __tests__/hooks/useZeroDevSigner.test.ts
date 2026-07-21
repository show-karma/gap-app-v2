import { renderHook } from "@testing-library/react";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
// Import the real implementation directly (bypassing the unit-test alias that
// redirects @/hooks/useZeroDevSigner to the __mocks__ stub)
import { useZeroDevSigner, WALLET_READY_TIMEOUT_MS } from "../../hooks/useZeroDevSigner";

// Mock bridge
const mockUser: any = { linkedAccounts: [] };
let mockWallets: any[] = [];
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => ({
    ready: true,
    walletsReady: true,
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

  // Embedded-mode users without an embedded wallet (Farcaster users — whose
  // linked ownerAddress suppresses embedded-wallet creation — and hybrid
  // email+wallet accounts) must fall back to their LINKED external wallet
  // instead of being permanently locked out, while UNLINKED (foreign) wallets
  // stay excluded (issue #1574 invariant).
  describe("embedded mode without embedded wallet", () => {
    const LINKED_ADDRESS = "0x1111111111111111111111111111111111111111";
    const FOREIGN_ADDRESS = "0x2222222222222222222222222222222222222222";

    it("uses the linked external wallet identity for a farcaster user without embedded wallet", () => {
      mockUser.linkedAccounts = [{ type: "farcaster", fid: 12345, ownerAddress: LINKED_ADDRESS }];
      mockWallets = [{ walletClientType: "metamask", address: LINKED_ADDRESS }];

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.hasEmbeddedWallet).toBe(false);
      expect(result.current.hasExternalWallet).toBe(true);
      expect(result.current.attestationAddress).toBe(LINKED_ADDRESS);
    });

    it("uses the linked external wallet identity for a hybrid email+wallet user", () => {
      mockUser.linkedAccounts = [
        { type: "email", address: "test@example.com" },
        { type: "wallet", address: LINKED_ADDRESS },
      ];
      mockWallets = [{ walletClientType: "metamask", address: LINKED_ADDRESS }];

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.hasEmbeddedWallet).toBe(false);
      expect(result.current.attestationAddress).toBe(LINKED_ADDRESS);
    });

    it("never exposes a foreign (unlinked) wallet as identity for an email user", () => {
      mockUser.linkedAccounts = [{ type: "email", address: "test@example.com" }];
      mockWallets = [{ walletClientType: "metamask", address: FOREIGN_ADDRESS }];

      const { result } = renderHook(() => useZeroDevSigner());

      expect(result.current.hasExternalWallet).toBe(false);
      expect(result.current.attestationAddress).toBeNull();
    });

    it("signs with the linked external wallet for a farcaster user without embedded wallet", async () => {
      mockUser.linkedAccounts = [{ type: "farcaster", fid: 12345, ownerAddress: LINKED_ADDRESS }];
      mockWallets = [
        {
          walletClientType: "metamask",
          address: LINKED_ADDRESS,
          switchChain: vi.fn().mockResolvedValue(undefined),
          getEthereumProvider: vi.fn().mockResolvedValue({ request: vi.fn() }),
        },
      ];
      const fakeSigner = { fake: true };
      vi.mocked(walletClientToSigner).mockResolvedValue(fakeSigner as never);

      const { result } = renderHook(() => useZeroDevSigner());

      await expect(result.current.getAttestationSigner(10)).resolves.toBe(fakeSigner);
    });

    it("still refuses to sign when only a foreign wallet is connected (typed provisioning error after the bounded wait)", async () => {
      vi.useFakeTimers();
      mockUser.linkedAccounts = [{ type: "email", address: "test@example.com" }];
      const foreign = {
        walletClientType: "metamask",
        address: FOREIGN_ADDRESS,
        switchChain: vi.fn(),
        getEthereumProvider: vi.fn(),
      };
      mockWallets = [foreign];

      const { result } = renderHook(() => useZeroDevSigner());

      const assertion = expect(result.current.getAttestationSigner(10)).rejects.toMatchObject({
        name: "SignerUnavailableError",
        reason: "embedded-wallet-provisioning",
        expected: true,
      });
      await vi.advanceTimersByTimeAsync(WALLET_READY_TIMEOUT_MS + 500);
      await assertion;

      expect(foreign.getEthereumProvider).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
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
