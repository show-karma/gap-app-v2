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

  /** Signing readiness for UI gating — see useZeroDevSigner's signerStatus. */
  signerStatus: "initializing" | "ready" | "no-wallet";
}

function isNetworkChangedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  // ethers v6 emits `code: "NETWORK_ERROR"` for this case. The message check
  // is defense in depth for wrappers that strip the code but preserve the text.
  return (
    ("code" in error && (error as { code: unknown }).code === "NETWORK_ERROR") ||
    error.message.toLowerCase().includes("network changed")
  );
}

// Wallet providers can briefly report the old chain right after a switch,
// which trips ethers' NETWORK_ERROR guard. A short pause + single retry
// handles the transient race without bothering the user.
const NETWORK_CHANGED_RETRY_DELAY_MS = 250;

async function getSignerWithNetworkChangeRetry(
  getSigner: (chainId: number) => Promise<Signer>,
  chainId: number
): Promise<Signer> {
  try {
    return await getSigner(chainId);
  } catch (error) {
    if (!isNetworkChangedError(error)) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, NETWORK_CHANGED_RETRY_DELAY_MS));
    return await getSigner(chainId);
  }
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
    signerStatus,
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
        const walletSigner = await getSignerWithNetworkChangeRetry(getAttestationSigner, chainId);

        return {
          gapClient,
          walletSigner,
          chainId,
          isGasless: isGaslessAvailable,
        };
      } catch (error) {
        // Only swallow NETWORK_ERROR here — everything else propagates typed.
        // A SignerUnavailableError is an expected wallet-lifecycle state (no
        // wallet yet / still hydrating); callers show guidance and skip
        // Sentry. Other failures (unsupported chain, signer construction)
        // are real bugs and must surface to Sentry instead of being hidden
        // behind a generic toast.
        if (!isNetworkChangedError(error)) {
          throw error;
        }

        toast.error("Wallet network changed while preparing the transaction. Please try again.");

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
      signerStatus,
    }),
    [
      setupChainAndWallet,
      isGaslessAvailable,
      attestationAddress,
      hasEmbeddedWallet,
      hasExternalWallet,
      signerStatus,
    ]
  );
}
