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
  /** Sets up chain and wallet for attestations (gasless if available). */
  setupChainAndWallet: (
    params: SetupChainAndWalletParams
  ) => Promise<SetupChainAndWalletResult | null>;

  /** Whether the smart wallet is ready for gasless transactions. */
  isSmartWalletReady: boolean;

  /** The smart wallet address if available. */
  smartWalletAddress: string | null;
}

/**
 * Hook for setting up chain and wallet for attestation operations.
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
  const { getAttestationSigner, isSmartWalletReady, smartWalletAddress } =
    useGaslessSigner();

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

      const walletSigner = await getAttestationSigner(chainId);

      return {
        gapClient,
        walletSigner,
        chainId,
        isGasless: isSmartWalletReady,
      };
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
