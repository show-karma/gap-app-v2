/**
 * @file Tests for setupChainAndWallet utility
 * @description Tests chain switching and wallet connection for attestation operations
 */

// Mock dependencies BEFORE importing anything else
jest.mock("@/utilities/ensureCorrectChain");
jest.mock("@/utilities/wallet-helpers");
jest.mock("@/utilities/eas-wagmi-utils");

import { setupChainAndWallet } from "@/utilities/chain-wallet-setup";
import * as ensureCorrectChainModule from "@/utilities/ensureCorrectChain";
import * as walletHelpersModule from "@/utilities/wallet-helpers";
import * as easWagmiUtilsModule from "@/utilities/eas-wagmi-utils";

const mockEnsureCorrectChain = ensureCorrectChainModule.ensureCorrectChain as jest.MockedFunction<
  typeof ensureCorrectChainModule.ensureCorrectChain
>;
const mockSafeGetWalletClient = walletHelpersModule.safeGetWalletClient as jest.MockedFunction<
  typeof walletHelpersModule.safeGetWalletClient
>;
const mockWalletClientToSigner = easWagmiUtilsModule.walletClientToSigner as jest.MockedFunction<
  typeof easWagmiUtilsModule.walletClientToSigner
>;

describe("setupChainAndWallet", () => {
  const mockGapClient = { fetch: { projectById: jest.fn() } } as any;
  const mockWalletClient = { account: { address: "0x123" } } as any;
  const mockWalletSigner = { getAddress: jest.fn() } as any;
  const mockSwitchChainAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Setup", () => {
    it("should successfully setup chain and wallet", async () => {
      mockEnsureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: mockGapClient,
      });

      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: mockWalletClient,
        error: null,
      });

      mockWalletClientToSigner.mockResolvedValue(mockWalletSigner);

      const result = await setupChainAndWallet({
        targetChainId: 42161,
        currentChainId: 1,
        switchChainAsync: mockSwitchChainAsync,
      });

      expect(mockEnsureCorrectChain).toHaveBeenCalledWith({
        targetChainId: 42161,
        currentChainId: 1,
        switchChainAsync: mockSwitchChainAsync,
      });

      expect(mockSafeGetWalletClient).toHaveBeenCalledWith(42161);
      expect(mockWalletClientToSigner).toHaveBeenCalledWith(mockWalletClient);

      expect(result).toEqual({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 42161,
      });
    });

    it("should work without currentChainId", async () => {
      mockEnsureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 10,
        gapClient: mockGapClient,
      });

      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: mockWalletClient,
        error: null,
      });

      mockWalletClientToSigner.mockResolvedValue(mockWalletSigner);

      const result = await setupChainAndWallet({
        targetChainId: 10,
        switchChainAsync: mockSwitchChainAsync,
      });

      expect(result).toEqual({
        gapClient: mockGapClient,
        walletSigner: mockWalletSigner,
        chainId: 10,
      });
    });
  });

  describe("Chain Switch Failures", () => {
    it("should return null when chain switch fails", async () => {
      mockEnsureCorrectChain.mockResolvedValue({
        success: false,
        chainId: 1,
        gapClient: null,
      });

      const result = await setupChainAndWallet({
        targetChainId: 42161,
        currentChainId: 1,
        switchChainAsync: mockSwitchChainAsync,
      });

      expect(result).toBeNull();
      expect(mockSafeGetWalletClient).not.toHaveBeenCalled();
      expect(mockWalletClientToSigner).not.toHaveBeenCalled();
    });

    it("should return null when gapClient is null", async () => {
      mockEnsureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: null,
      });

      const result = await setupChainAndWallet({
        targetChainId: 42161,
        currentChainId: 1,
        switchChainAsync: mockSwitchChainAsync,
      });

      expect(result).toBeNull();
    });
  });

  describe("Wallet Connection Failures", () => {
    it("should throw error when wallet client retrieval fails", async () => {
      mockEnsureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: mockGapClient,
      });

      const walletError = new Error("Wallet not connected");
      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: null,
        error: walletError,
      });

      await expect(
        setupChainAndWallet({
          targetChainId: 42161,
          currentChainId: 1,
          switchChainAsync: mockSwitchChainAsync,
        })
      ).rejects.toThrow("Failed to connect to wallet");

      expect(mockWalletClientToSigner).not.toHaveBeenCalled();
    });

    it("should throw error when wallet client is null", async () => {
      mockEnsureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: mockGapClient,
      });

      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: null,
        error: null,
      });

      await expect(
        setupChainAndWallet({
          targetChainId: 42161,
          currentChainId: 1,
          switchChainAsync: mockSwitchChainAsync,
        })
      ).rejects.toThrow("Failed to connect to wallet");
    });
  });

  describe("Signer Creation Failures", () => {
    it("should throw error when signer creation fails", async () => {
      mockEnsureCorrectChain.mockResolvedValue({
        success: true,
        chainId: 42161,
        gapClient: mockGapClient,
      });

      mockSafeGetWalletClient.mockResolvedValue({
        walletClient: mockWalletClient,
        error: null,
      });

      mockWalletClientToSigner.mockResolvedValue(null as any);

      await expect(
        setupChainAndWallet({
          targetChainId: 42161,
          currentChainId: 1,
          switchChainAsync: mockSwitchChainAsync,
        })
      ).rejects.toThrow("Failed to create wallet signer");
    });
  });

  describe("Different Chain IDs", () => {
    const testChains = [
      { chainId: 1, name: "Ethereum Mainnet" },
      { chainId: 10, name: "Optimism" },
      { chainId: 42161, name: "Arbitrum One" },
      { chainId: 8453, name: "Base" },
    ];

    testChains.forEach(({ chainId, name }) => {
      it(`should work with ${name} (chainId: ${chainId})`, async () => {
        mockEnsureCorrectChain.mockResolvedValue({
          success: true,
          chainId,
          gapClient: mockGapClient,
        });

        mockSafeGetWalletClient.mockResolvedValue({
          walletClient: mockWalletClient,
          error: null,
        });

        mockWalletClientToSigner.mockResolvedValue(mockWalletSigner);

        const result = await setupChainAndWallet({
          targetChainId: chainId,
          currentChainId: 1,
          switchChainAsync: mockSwitchChainAsync,
        });

        expect(result?.chainId).toBe(chainId);
      });
    });
  });
});
