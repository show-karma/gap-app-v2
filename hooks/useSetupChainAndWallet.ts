"use client";

import { useCallback, useMemo } from "react";
import type { GAP } from "@show-karma/karma-gap-sdk";
import type { Signer } from "ethers";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import { useGaslessSigner } from "./useGaslessSigner";

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
  /**
   * Sets up the chain and wallet for attestation operations.
   * Uses gasless smart wallet if available, otherwise falls back to regular wallet.
   */
  setupChainAndWallet: (
    params: SetupChainAndWalletParams
  ) => Promise<SetupChainAndWalletResult | null>;

  /**
   * Whether the smart wallet is ready for gasless transactions.
   */
  isSmartWalletReady: boolean;

  /**
   * The smart wallet address if available.
   */
  smartWalletAddress: string | null;
}

/**
 * Hook that provides chain and wallet setup for attestation operations.
 *
 * Uses gasless smart wallet when available, falls back to regular wallet.
 *
 * @example
 * const { setupChainAndWallet, isSmartWalletReady } = useSetupChainAndWallet();
 *
 * const handleAttest = async () => {
 *   const setup = await setupChainAndWallet({
 *     targetChainId: project.chainID,
 *     currentChainId: chain?.id,
 *     switchChainAsync,
 *   });
 *
 *   if (!setup) return;
 *
 *   const { gapClient, walletSigner, isGasless } = setup;
 *   await entity.attest(walletSigner, data);
 *
 *   if (isGasless) {
 *     console.log('Transaction was gasless!');
 *   }
 * };
 */
export function useSetupChainAndWallet(): UseSetupChainAndWalletResult {
  const {
    getAttestationSigner,
    isSmartWalletReady,
    smartWalletAddress,
  } = useGaslessSigner();

  const setupChainAndWallet = useCallback(
    async ({
      targetChainId,
      currentChainId,
      switchChainAsync,
    }: SetupChainAndWalletParams): Promise<SetupChainAndWalletResult | null> => {
      console.log("[SetupChainAndWallet] Starting setup...");
      console.log("[SetupChainAndWallet] Target chain:", targetChainId);
      console.log("[SetupChainAndWallet] Current chain:", currentChainId);

      // Step 1: Ensure correct chain (for UI/wagmi state)
      try {
        const { success, chainId, gapClient } = await ensureCorrectChain({
          targetChainId,
          currentChainId,
          switchChainAsync,
        });

        console.log("[SetupChainAndWallet] ensureCorrectChain result:", { success, chainId, hasGapClient: !!gapClient });

        if (!success || !gapClient) {
          console.error("[SetupChainAndWallet] Chain setup failed or gapClient missing");
          return null;
        }

        // Step 2: Get signer (gasless if available, otherwise regular)
        console.log("[SetupChainAndWallet] Getting attestation signer...");
        const walletSigner = await getAttestationSigner(chainId);
        console.log("[SetupChainAndWallet] Got signer, isGasless:", isSmartWalletReady);

        return {
          gapClient,
          walletSigner,
          chainId,
          isGasless: isSmartWalletReady,
        };
      } catch (error) {
        console.error("[SetupChainAndWallet] Error during setup:", error);
        throw error;
      }
    },
    [getAttestationSigner, isSmartWalletReady]
  );

  return useMemo(
    () => ({
      setupChainAndWallet,
      isSmartWalletReady,
      smartWalletAddress,
    }),
    [setupChainAndWallet, isSmartWalletReady, smartWalletAddress]
  );
}
