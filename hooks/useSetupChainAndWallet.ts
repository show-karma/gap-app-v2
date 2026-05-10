"use client";

import type { GAP } from "@show-karma/karma-gap-sdk";
import type { Signer } from "ethers";
import { useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import { useZeroDevSigner } from "./useZeroDevSigner";

interface SetupChainAndWalletParams {
  targetChainId: number;
  currentChainId?: number;
  switchChainAsync: (params: { chainId: number }) => Promise<void>;
}

interface SetupChainAndWalletResult {
  gapClient: GAP;
  walletSigner: Signer;
  chainId: number;
  isGasless: boolean;
}

interface UseSetupChainAndWalletResult {
  /** Sets up chain and wallet for attestations (gasless if available). */
  setupChainAndWallet: (
    params: SetupChainAndWalletParams
  ) => Promise<SetupChainAndWalletResult | null>;

  /** Whether gasless transactions are available (embedded wallet only). */
  isSmartWalletReady: boolean;

  /** The wallet address that will be used for attestations. */
  smartWalletAddress: string | null;

  /** Whether user has an embedded wallet (email/Google login) */
  hasEmbeddedWallet: boolean;

  /** Whether user has an external wallet (MetaMask, etc.) */
  hasExternalWallet: boolean;
}

function isNetworkChangedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorWithCode = error as Error & { code?: string };

  return (
    errorWithCode.code === "NETWORK_ERROR" || error.message.toLowerCase().includes("network changed")
  );
}

/**
 * Hook for setting up chain and wallet for attestation operations.
 *
 * Gasless transactions (EIP-7702) are only available for embedded wallet users
 * (email/Google/passkey login). MetaMask users pay their own gas.
 *
 * @example
 * const { setupChainAndWallet } = useSetupChainAndWallet();
 *
 * const setup = await setupChainAndWallet({
 *   targetChainId: project.chainID,
 *   currentChainId: chain?.id,
 *   switchChainAsync,
 * });
 *
 * if (!setup) return;
 * await entity.attest(setup.walletSigner, callback);
 */
export function useSetupChainAndWallet(): UseSetupChainAndWalletResult {
  const {
    getAttestationSigner,
    isGaslessAvailable,
    attestationAddress,
    hasEmbeddedWallet,
    hasExternalWallet,
  } = useZeroDevSigner();

  const setupChainAndWallet = useCallback(
    async ({
      targetChainId,
      currentChainId,
      switchChainAsync,
    }: SetupChainAndWalletParams): Promise<SetupChainAndWalletResult | null> => {
      const { success, chainId, gapClient } = await ensureCorrectChain({
        targetChainId,
        currentChainId,
        switchChainAsync,
      });

      if (!success || !gapClient) {
        return null;
      }

      try {
        const walletSigner = await getAttestationSigner(chainId);

        return {
          gapClient,
          walletSigner,
          chainId,
          isGasless: isGaslessAvailable,
        };
      } catch (error) {
        console.warn("Failed to prepare wallet signer:", error);

        toast.error(
          isNetworkChangedError(error)
            ? "Wallet network changed while preparing the transaction. Please try again."
            : "Failed to prepare wallet for this transaction. Please try again."
        );

        return null;
      }
    },
    [getAttestationSigner, isGaslessAvailable]
  );

  return useMemo(
    () => ({
      setupChainAndWallet,
      isSmartWalletReady: isGaslessAvailable,
      smartWalletAddress: attestationAddress,
      hasEmbeddedWallet,
      hasExternalWallet,
    }),
    [
      setupChainAndWallet,
      isGaslessAvailable,
      attestationAddress,
      hasEmbeddedWallet,
      hasExternalWallet,
    ]
  );
}
