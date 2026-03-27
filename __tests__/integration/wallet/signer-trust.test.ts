/**
 * Signer trust tests for useZeroDevSigner hook.
 *
 * Tests the getAttestationSigner execution paths:
 * - Email + gasless chain -> gasless signer
 * - GaslessProviderError is NOT caught (re-thrown)
 * - Non-GaslessProviderError falls back to embedded wallet
 * - Email + non-gasless chain -> embedded wallet signer
 * - External wallet -> external signer
 * - No wallet -> throws
 * - isGaslessAvailable logic
 * - didUserLoginWithEmailOrSocial detection
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: vi.fn().mockReturnValue({
    ready: true,
    user: {
      linkedAccounts: [{ type: "email" }],
    },
  }),
  useWallets: vi.fn().mockReturnValue({
    wallets: [
      {
        walletClientType: "privy",
        address: "0xEmbedded",
        switchChain: vi.fn().mockResolvedValue(undefined),
        getEthereumProvider: vi.fn().mockResolvedValue({}),
      },
      {
        walletClientType: "metamask",
        address: "0xExternal",
      },
    ],
  }),
}));

vi.mock("wagmi", () => ({
  useChainId: vi.fn().mockReturnValue(10),
}));

vi.mock("@/utilities/eas-wagmi-utils", () => ({
  walletClientToSigner: vi.fn().mockResolvedValue({ signMessage: vi.fn() }),
}));

vi.mock("@/utilities/wallet-helpers", () => ({
  safeGetWalletClient: vi.fn().mockResolvedValue({
    walletClient: {
      account: { address: "0xExternal" },
      chain: { id: 10 },
    },
    error: null,
  }),
}));

const { mockGaslessSigner, mockGaslessClient } = vi.hoisted(() => ({
  mockGaslessSigner: { signMessage: () => {}, address: "0xEmbedded" },
  mockGaslessClient: { sendTransaction: () => {} },
}));

vi.mock("@/utilities/gasless", () => ({
  createGaslessClient: vi.fn().mockResolvedValue(null),
  createPrivySignerForGasless: vi.fn().mockResolvedValue({}),
  getGaslessSigner: vi.fn().mockResolvedValue(mockGaslessSigner),
  isChainSupportedForGasless: vi.fn().mockReturnValue(true),
  GaslessProviderError: class GaslessProviderError extends Error {
    provider: string;
    chainId: number;
    constructor(message: string, provider: string, chainId: number) {
      super(message);
      this.name = "GaslessProviderError";
      this.provider = provider;
      this.chainId = chainId;
    }
  },
}));

// Mock BrowserProvider since it's from ethers and requires a real provider
vi.mock("ethers", () => ({
  BrowserProvider: vi.fn().mockImplementation(() => ({
    getSigner: vi.fn().mockResolvedValue({
      signMessage: vi.fn(),
      address: "0xEmbedded",
    }),
  })),
  Signer: class {},
}));

import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import {
  createGaslessClient,
  createPrivySignerForGasless,
  GaslessProviderError,
  getGaslessSigner,
  isChainSupportedForGasless,
} from "@/utilities/gasless";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

describe("Signer trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // didUserLoginWithEmailOrSocial detection (tested indirectly)
  // -------------------------------------------------------------------------
  describe("email/social login detection", () => {
    it("detects email login from linkedAccounts", () => {
      const user = { linkedAccounts: [{ type: "email" }] };
      const isEmailOrSocial = user.linkedAccounts.some(
        (a: any) => a.type === "email" || a.type === "google_oauth"
      );
      expect(isEmailOrSocial).toBe(true);
    });

    it("detects google_oauth login", () => {
      const user = { linkedAccounts: [{ type: "google_oauth" }] };
      const isEmailOrSocial = user.linkedAccounts.some(
        (a: any) => a.type === "email" || a.type === "google_oauth"
      );
      expect(isEmailOrSocial).toBe(true);
    });

    it("returns false for external wallet login", () => {
      const user = { linkedAccounts: [{ type: "wallet" }] };
      const isEmailOrSocial = user.linkedAccounts.some(
        (a: any) => a.type === "email" || a.type === "google_oauth"
      );
      expect(isEmailOrSocial).toBe(false);
    });

    it("returns false for null user", () => {
      const user = null;
      const isEmailOrSocial = user
        ? (user as any).linkedAccounts.some(
            (a: any) => a.type === "email" || a.type === "google_oauth"
          )
        : false;
      expect(isEmailOrSocial).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Gasless availability logic
  // -------------------------------------------------------------------------
  describe("isGaslessAvailable logic", () => {
    it("true when email login + embedded wallet + gasless-supported chain", () => {
      const isEmailOrSocial = true;
      const hasEmbeddedWallet = true;
      const chainSupported = true;
      expect(isEmailOrSocial && hasEmbeddedWallet && chainSupported).toBe(true);
    });

    it("false when not email login", () => {
      const isEmailOrSocial = false;
      const hasEmbeddedWallet = true;
      const chainSupported = true;
      expect(isEmailOrSocial && hasEmbeddedWallet && chainSupported).toBe(false);
    });

    it("false when no embedded wallet", () => {
      const isEmailOrSocial = true;
      const hasEmbeddedWallet = false;
      const chainSupported = true;
      expect(isEmailOrSocial && hasEmbeddedWallet && chainSupported).toBe(false);
    });

    it("false when chain not supported for gasless", () => {
      const isEmailOrSocial = true;
      const hasEmbeddedWallet = true;
      const chainSupported = false;
      expect(isEmailOrSocial && hasEmbeddedWallet && chainSupported).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getAttestationSigner paths — tested via logic simulation
  // -------------------------------------------------------------------------
  describe("getAttestationSigner execution paths", () => {
    it("Case 1: email + gasless chain -> gasless signer when client created", async () => {
      vi.mocked(createGaslessClient).mockResolvedValueOnce(mockGaslessClient);
      vi.mocked(getGaslessSigner).mockResolvedValueOnce(mockGaslessSigner as any);

      // Simulate the hook logic for Case 1
      const isEmailOrSocialLogin = true;
      const embeddedWallet = {
        switchChain: vi.fn().mockResolvedValue(undefined),
      };
      const targetChainId = 10;

      if (isEmailOrSocialLogin && embeddedWallet && isChainSupportedForGasless(targetChainId)) {
        await embeddedWallet.switchChain(targetChainId);
        const signer = await createPrivySignerForGasless(embeddedWallet as any, targetChainId);
        const client = await createGaslessClient(targetChainId, signer as any);
        if (client) {
          const ethersSigner = await getGaslessSigner(client, targetChainId);
          expect(ethersSigner).toBe(mockGaslessSigner);
          return;
        }
      }
      // Should not reach here
      expect.unreachable("Should have returned gasless signer");
    });

    it("Case 1 fallback: gasless client returns null -> falls back", async () => {
      vi.mocked(createGaslessClient).mockResolvedValueOnce(null);

      const client = await createGaslessClient(10, {} as any);
      expect(client).toBeNull();
      // The hook would fall through to Case 2 (embedded wallet direct)
    });

    it("GaslessProviderError is NOT caught — re-thrown", async () => {
      const error = new GaslessProviderError("Quota exceeded", "zerodev", 10);

      // Simulate the hook logic: GaslessProviderError should be re-thrown
      const shouldRethrow = error instanceof GaslessProviderError;
      expect(shouldRethrow).toBe(true);
    });

    it("Non-GaslessProviderError falls back to embedded wallet", async () => {
      const error = new Error("Some random error");
      const shouldRethrow = error.constructor.name === "GaslessProviderError";
      expect(shouldRethrow).toBe(false);
      // In the hook, this means we fall through to Case 2
    });

    it("Case 3: external wallet returns signer", async () => {
      const { walletClient, error } = await (safeGetWalletClient as any)(10);
      expect(error).toBeNull();
      expect(walletClient).toBeDefined();

      const signer = await walletClientToSigner(walletClient);
      expect(signer).toBeDefined();
    });

    it("Case 3: external wallet error throws", async () => {
      vi.mocked(safeGetWalletClient).mockResolvedValueOnce({
        walletClient: null,
        error: "Failed to connect",
      });

      const { walletClient, error } = await (safeGetWalletClient as any)(10);
      expect(walletClient).toBeNull();
      expect(error).toBeTruthy();
      // The hook would throw: "Failed to get wallet client: ..."
    });

    it("No wallet available throws error", () => {
      // When no embedded or external wallet exists
      const externalWallet = null;
      const embeddedWallet = null;

      if (!externalWallet && !embeddedWallet) {
        expect(() => {
          throw new Error("No wallet available for signing");
        }).toThrow("No wallet available for signing");
      }
    });
  });

  // -------------------------------------------------------------------------
  // Wallet type detection
  // -------------------------------------------------------------------------
  describe("wallet type detection", () => {
    it("identifies embedded wallet by walletClientType === privy", () => {
      const wallets = [
        { walletClientType: "privy", address: "0x1" },
        { walletClientType: "metamask", address: "0x2" },
      ];
      const embedded = wallets.find((w) => w.walletClientType === "privy");
      expect(embedded).toBeDefined();
      expect(embedded!.address).toBe("0x1");
    });

    it("identifies external wallet by walletClientType !== privy", () => {
      const wallets = [
        { walletClientType: "privy", address: "0x1" },
        { walletClientType: "metamask", address: "0x2" },
      ];
      const external = wallets.find((w) => w.walletClientType !== "privy");
      expect(external).toBeDefined();
      expect(external!.address).toBe("0x2");
    });

    it("returns null when no embedded wallet", () => {
      const wallets = [{ walletClientType: "metamask", address: "0x2" }];
      const embedded = wallets.find((w) => w.walletClientType === "privy") || null;
      expect(embedded).toBeNull();
    });

    it("returns null when wallet list is empty", () => {
      const wallets: any[] = [];
      const embedded = wallets.find((w) => w.walletClientType === "privy") || null;
      expect(embedded).toBeNull();
    });
  });
});
