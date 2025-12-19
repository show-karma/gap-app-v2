"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import type { Signer } from "ethers";
import { BrowserProvider } from "ethers";
import { useCallback, useMemo } from "react";
import { useChainId } from "wagmi";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import {
  createKernelClientForEmbeddedWallet,
  createPrivySignerForZeroDev,
  isChainSupportedForGasless,
  kernelClientToEthersSigner,
} from "@/utilities/zerodev/create-kernel-client";

interface UseZeroDevSignerResult {
  /**
   * Gets a signer for attestations.
   * - For embedded wallet users: Uses ZeroDev kernel account (gasless)
   * - For external wallet users: Falls back to regular wallet (user pays gas)
   *
   * Note: EIP-7702 support for external wallets will be added in a future update.
   */
  getAttestationSigner: (chainId: number) => Promise<Signer>;

  /** Whether the current user can use gasless transactions */
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
 * Uses ZeroDev's kernel accounts for gasless transactions when:
 * - User logged in with email/Google/passkeys (embedded wallet)
 * - Chain is supported by ZeroDev
 *
 * Falls back to regular wallet when:
 * - User connected with MetaMask/external wallet
 * - Chain is not supported by ZeroDev
 */
export function useZeroDevSigner(): UseZeroDevSignerResult {
  const { ready: privyReady } = usePrivy();
  const { wallets } = useWallets();
  const chainId = useChainId();

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

  // Determine if gasless is available
  const isGaslessAvailable = useMemo(() => {
    // For now, only embedded wallet users get gasless
    // EIP-7702 support for external wallets will be added later
    return hasEmbeddedWallet && isChainSupportedForGasless(chainId);
  }, [hasEmbeddedWallet, chainId]);

  // Get the address that will be used for attestations
  const attestationAddress = useMemo(() => {
    // Prefer embedded wallet for gasless, otherwise external wallet
    if (embeddedWallet) {
      return embeddedWallet.address;
    }
    if (externalWallet) {
      return externalWallet.address;
    }
    return null;
  }, [embeddedWallet, externalWallet]);

  const getAttestationSigner = useCallback(
    async (targetChainId: number): Promise<Signer> => {
      // DEBUG: Log the state
      console.log("[ZeroDev Debug]", {
        targetChainId,
        hasEmbeddedWallet: !!embeddedWallet,
        embeddedWalletAddress: embeddedWallet?.address,
        isChainSupported: isChainSupportedForGasless(targetChainId),
        projectId: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID,
      });

      // Case 1: Embedded wallet user - try gasless via ZeroDev
      if (embeddedWallet && isChainSupportedForGasless(targetChainId)) {
        try {
          console.log("[ZeroDev] Step 1: Switching chain...");
          await embeddedWallet.switchChain(targetChainId);

          console.log("[ZeroDev] Step 2: Creating ZeroDev-compatible signer...");
          // Use our custom wrapper that properly handles raw bytes signing
          const zeroDevSigner = await createPrivySignerForZeroDev(embeddedWallet, targetChainId);
          console.log("[ZeroDev] Step 2 done:", zeroDevSigner.address);

          console.log("[ZeroDev] Step 3: Creating kernel client...");
          const kernelClient = await createKernelClientForEmbeddedWallet({
            chainId: targetChainId,
            signer: zeroDevSigner,
          });
          console.log("[ZeroDev] Step 3 done:", !!kernelClient);

          if (kernelClient) {
            console.log("[ZeroDev] Step 4: Converting to ethers signer...");
            const signer = await kernelClientToEthersSigner(kernelClient);
            console.log("[ZeroDev] Step 4 done - using gasless signer!");
            return signer;
          }
        } catch (error) {
          console.warn("[ZeroDev] Failed to create kernel client, falling back:", error);
        }
      }

      // Case 2: Embedded wallet exists but ZeroDev not available - use embedded wallet directly
      // This ensures we NEVER fall back to MetaMask when user logged in with email
      if (embeddedWallet) {
        try {
          await embeddedWallet.switchChain(targetChainId);
          const provider = await embeddedWallet.getEthereumProvider();
          const ethersProvider = new BrowserProvider(provider);
          const signer = await ethersProvider.getSigner();
          return signer;
        } catch (error) {
          console.warn("[ZeroDev] Failed to use embedded wallet directly:", error);
        }
      }

      // Case 3: External wallet only (MetaMask user) - use wagmi wallet
      // This is the ONLY case where we should use safeGetWalletClient
      if (externalWallet && !embeddedWallet) {
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
    [embeddedWallet, externalWallet]
  );

  return {
    getAttestationSigner,
    isGaslessAvailable,
    attestationAddress,
    hasEmbeddedWallet,
    hasExternalWallet,
  };
}
