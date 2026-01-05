"use client";

import { type User, usePrivy, useWallets } from "@privy-io/react-auth";
import type { Signer } from "ethers";
import { BrowserProvider } from "ethers";
import { useCallback, useMemo } from "react";
import { useChainId } from "wagmi";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import {
  createKernelClientWithEIP7702,
  createPrivySignerForZeroDev,
  isChainSupportedForGasless,
  kernelClientToEthersSigner,
} from "@/utilities/zerodev/create-kernel-client";

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
   * - For embedded wallet users: Uses EIP-7702 (gasless, SAME address)
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
 * Hook that provides signers for attestations with ZeroDev gasless support.
 *
 * - For embedded wallet users (email/Google/passkey login):
 *   - On gasless-supported chains: Uses EIP-7702 (gasless, user doesn't pay gas)
 *   - On unsupported chains (e.g., Lisk): Uses embedded wallet directly (user pays gas)
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
      // DEBUG: Log the state
      console.log("[ZeroDev Debug]", {
        targetChainId,
        isEmailOrSocialLogin,
        hasEmbeddedWallet: !!embeddedWallet,
        hasExternalWallet: !!externalWallet,
        embeddedWalletAddress: embeddedWallet?.address,
        externalWalletAddress: externalWallet?.address,
        isChainSupported: isChainSupportedForGasless(targetChainId),
      });

      // Case 1: Email/Google login with gasless support - try EIP-7702 gasless first
      if (isEmailOrSocialLogin && embeddedWallet && isChainSupportedForGasless(targetChainId)) {
        try {
          console.log("[ZeroDev] Email/Google login - using EIP-7702 gasless...");
          await embeddedWallet.switchChain(targetChainId);

          const zeroDevSigner = await createPrivySignerForZeroDev(embeddedWallet, targetChainId);
          const kernelClient = await createKernelClientWithEIP7702({
            chainId: targetChainId,
            signer: zeroDevSigner,
          });

          if (kernelClient) {
            const signer = await kernelClientToEthersSigner(kernelClient);
            console.log("[ZeroDev] EIP-7702 gasless signer ready");
            return signer;
          }
        } catch (error) {
          console.warn("[ZeroDev] Failed to create EIP-7702 kernel client, falling back:", error);
        }
      }

      // Case 2: Email/Google login - use embedded wallet directly (user pays gas)
      // This handles: gasless fallback failures AND chains that don't support gasless
      if (isEmailOrSocialLogin && embeddedWallet) {
        try {
          console.log("[ZeroDev] Using embedded wallet directly (user pays gas)...");
          await embeddedWallet.switchChain(targetChainId);
          const provider = await embeddedWallet.getEthereumProvider();
          const ethersProvider = new BrowserProvider(provider);
          return await ethersProvider.getSigner();
        } catch (error) {
          console.warn("[ZeroDev] Failed to use embedded wallet:", error);
        }
      }

      // Case 3: Wallet login (MetaMask) - use external wallet directly, user pays gas
      if (externalWallet) {
        console.log("[ZeroDev] Wallet login - using external wallet (user pays gas)...");
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
