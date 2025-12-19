"use client";

import type { GAP } from "@show-karma/karma-gap-sdk";
import type { Signer } from "ethers";
import { useCallback, useMemo } from "react";
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

  /** Whether gasless transactions are available for the current user/chain. */
  isSmartWalletReady: boolean;

  /** The wallet address that will be used for attestations. */
  smartWalletAddress: string | null;
}

/**
 * Hook for setting up chain and wallet for attestation operations.
 *
 * Uses ZeroDev for gasless transactions when available:
 * - Email/Google/passkey users: Gasless via ZeroDev kernel accounts
 * - MetaMask users: Currently pays gas (EIP-7702 support coming soon)
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
  const { getAttestationSigner, isGaslessAvailable, attestationAddress } = useZeroDevSigner();

  const setupChainAndWallet = useCallback(
    async ({
      targetChainId,
      currentChainId,
      switchChainAsync,
    }: SetupChainAndWalletParams): Promise<SetupChainAndWalletResult | null> => {
      console.log("[setupChainAndWallet] Starting with:", { targetChainId, currentChainId });

      const { success, chainId, gapClient } = await ensureCorrectChain({
        targetChainId,
        currentChainId,
        switchChainAsync,
      });

      console.log("[setupChainAndWallet] ensureCorrectChain result:", { success, chainId, gapClient: !!gapClient });

      if (!success || !gapClient) {
        console.log("[setupChainAndWallet] Chain setup failed, returning null");
        return null;
      }

      console.log("[setupChainAndWallet] Calling getAttestationSigner...");
      const walletSigner = await getAttestationSigner(chainId);
      console.log("[setupChainAndWallet] Got signer:", !!walletSigner);

      // Try to verify the signer works
      try {
        const signerAddress = await walletSigner.getAddress();
        console.log("[setupChainAndWallet] Signer address verified:", signerAddress);
      } catch (e) {
        console.error("[setupChainAndWallet] Failed to get signer address:", e);
      }

      return {
        gapClient,
        walletSigner,
        chainId,
        isGasless: isGaslessAvailable,
      };
    },
    [getAttestationSigner, isGaslessAvailable]
  );

  return useMemo(
    () => ({
      setupChainAndWallet,
      isSmartWalletReady: isGaslessAvailable,
      smartWalletAddress: attestationAddress,
    }),
    [setupChainAndWallet, isGaslessAvailable, attestationAddress]
  );
}
