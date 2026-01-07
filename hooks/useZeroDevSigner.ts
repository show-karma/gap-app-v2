"use client";

import { type User, usePrivy, useWallets } from "@privy-io/react-auth";
import type { Signer } from "ethers";
import { BrowserProvider } from "ethers";
import { useCallback, useMemo } from "react";
import { useChainId } from "wagmi";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import {
  createGaslessClient,
  createPrivySignerForGasless,
  GaslessProviderError,
  getGaslessSigner,
  isChainSupportedForGasless,
} from "@/utilities/gasless";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

/**
 * Check if user logged in with email/Google (not wallet).
 * These users should use embedded wallet with gasless transactions.
 */
function didUserLoginWithEmailOrSocial(user: User | null): boolean {
  if (!user) return false;
  // Check linked accounts for email or Google OAuth
  return user.linkedAccounts.some(
    (account) => account.type === "email" || account.type === "google_oauth"
  );
}

interface UseZeroDevSignerResult {
  /**
   * Gets a signer for attestations.
   * - For embedded wallet users: Uses gasless transactions (SAME address via EIP-7702)
   * - For external wallet users: Regular wallet (user pays gas)
   */
  getAttestationSigner: (chainId: number) => Promise<Signer>;

  /** Whether the current user can use gasless transactions (embedded wallet only) */
  isGaslessAvailable: boolean;

  /** The wallet address that will be used for attestations */
  attestationAddress: string | null;

  /** Whether the user has an embedded wallet (email/Google/passkey login) */
  hasEmbeddedWallet: boolean;

  /** Whether the user has an external wallet (MetaMask, etc.) */
  hasExternalWallet: boolean;
}

/**
 * Hook that provides signers for attestations with gasless support.
 *
 * Architecture:
 * - Uses the gasless module which automatically selects the appropriate provider
 *   (ZeroDev, Alchemy, etc.) based on chain configuration.
 * - All EIP-7702 complexity is handled internally by the provider implementations.
 *
 * Behavior:
 * - For embedded wallet users (email/Google/passkey login):
 *   - On gasless-supported chains: Uses appropriate provider (gasless, user doesn't pay)
 *   - On unsupported chains: Uses embedded wallet directly (user pays gas)
 * - For external wallet users (MetaMask, etc.): User always pays gas
 */
export function useZeroDevSigner(): UseZeroDevSignerResult {
  const { ready: privyReady, user } = usePrivy();
  const { wallets } = useWallets();
  const chainId = useChainId();

  // Check if user logged in with email/Google (should use embedded wallet)
  const isEmailOrSocialLogin = useMemo(() => {
    return didUserLoginWithEmailOrSocial(user);
  }, [user]);

  // Find embedded wallet (Privy-managed wallet for email/Google/passkey users)
  const embeddedWallet = useMemo(() => {
    if (!privyReady || !wallets.length) return null;
    return wallets.find((wallet) => wallet.walletClientType === "privy") || null;
  }, [privyReady, wallets]);

  // Find external wallet (MetaMask, Coinbase, etc.)
  const externalWallet = useMemo(() => {
    if (!privyReady || !wallets.length) return null;
    return wallets.find((wallet) => wallet.walletClientType !== "privy") || null;
  }, [privyReady, wallets]);

  const hasEmbeddedWallet = !!embeddedWallet;
  const hasExternalWallet = !!externalWallet;

  // Gasless is available for email/Google users with embedded wallet
  const isGaslessAvailable = useMemo(() => {
    return isEmailOrSocialLogin && hasEmbeddedWallet && isChainSupportedForGasless(chainId);
  }, [isEmailOrSocialLogin, hasEmbeddedWallet, chainId]);

  // Get the address that will be used for attestations
  // Email/Google users use embedded wallet, others use external wallet
  const attestationAddress = useMemo(() => {
    if (isEmailOrSocialLogin && embeddedWallet) {
      return embeddedWallet.address;
    }
    if (externalWallet) {
      return externalWallet.address;
    }
    return null;
  }, [isEmailOrSocialLogin, embeddedWallet, externalWallet]);

  const getAttestationSigner = useCallback(
    async (targetChainId: number): Promise<Signer> => {
      // Case 1: Email/Google login with gasless support
      if (isEmailOrSocialLogin && embeddedWallet && isChainSupportedForGasless(targetChainId)) {
        try {
          await embeddedWallet.switchChain(targetChainId);

          // Create signer compatible with gasless providers
          const signer = await createPrivySignerForGasless(embeddedWallet, targetChainId);

          // Create gasless client (provider is selected automatically based on chain config)
          const client = await createGaslessClient(targetChainId, signer);

          if (client) {
            // Convert to ethers.js signer for GAP SDK compatibility
            const ethersSigner = await getGaslessSigner(client, targetChainId);
            return ethersSigner;
          }
        } catch (error) {
          // Don't fall back for gasless provider errors - show the actual error
          if (error instanceof GaslessProviderError) {
            console.error(`[Gasless] ${error.provider} provider failed:`, error);
            throw error;
          }

          // Log and fall back for other errors
          console.warn("[Gasless] Client creation failed, falling back to embedded wallet:", error);
        }
      }

      // Case 2: Email/Google login - use embedded wallet directly (user pays gas)
      // This handles: gasless fallback failures AND chains that don't support gasless
      if (isEmailOrSocialLogin && embeddedWallet) {
        try {
          await embeddedWallet.switchChain(targetChainId);
          const provider = await embeddedWallet.getEthereumProvider();
          const ethersProvider = new BrowserProvider(provider);
          return await ethersProvider.getSigner();
        } catch (error) {
          console.warn("[Gasless] Embedded wallet error:", error);
        }
      }

      // Case 3: Wallet login (MetaMask) - use external wallet directly, user pays gas
      if (externalWallet) {
        const { walletClient, error } = await safeGetWalletClient(targetChainId);

        if (error || !walletClient) {
          throw new Error(`Failed to get wallet client: ${error || "Unknown error"}`);
        }

        const signer = await walletClientToSigner(walletClient);

        if (!signer) {
          throw new Error("Failed to create signer from wallet client");
        }

        return signer;
      }

      throw new Error("No wallet available for signing");
    },
    [isEmailOrSocialLogin, embeddedWallet, externalWallet]
  );

  return {
    getAttestationSigner,
    isGaslessAvailable,
    attestationAddress,
    hasEmbeddedWallet,
    hasExternalWallet,
  };
}
