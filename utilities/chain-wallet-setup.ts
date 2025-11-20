import type { GAP } from "@show-karma/karma-gap-sdk";
import type { Signer } from "ethers";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";

interface SetupChainAndWalletParams {
  targetChainId: number;
  currentChainId?: number;
  switchChainAsync: any;
}

interface SetupChainAndWalletResult {
  gapClient: GAP;
  walletSigner: Signer;
  chainId: number;
}

/**
 * Setup chain and wallet for attestation operations
 * Reusable across grant completion, milestone verification, etc.
 *
 * @param params - Chain and wallet setup parameters
 * @returns GAP client, wallet signer, and chain ID, or null if setup fails
 *
 * @example
 * ```typescript
 * const setup = await setupChainAndWallet({
 *   targetChainId: grant.chainID,
 *   currentChainId: chain?.id,
 *   switchChainAsync,
 * });
 *
 * if (!setup) {
 *   // Handle failure (user may have cancelled chain switch)
 *   return;
 * }
 *
 * const { gapClient, walletSigner } = setup;
 * // Use gapClient and walletSigner for attestations
 * ```
 */
export const setupChainAndWallet = async ({
  targetChainId,
  currentChainId,
  switchChainAsync,
}: SetupChainAndWalletParams): Promise<SetupChainAndWalletResult | null> => {
  // Step 1: Ensure correct chain
  const { success, chainId, gapClient } = await ensureCorrectChain({
    targetChainId,
    currentChainId,
    switchChainAsync,
  });

  if (!success || !gapClient) {
    return null;
  }

  // Step 2: Get wallet client
  const { walletClient, error: walletError } = await safeGetWalletClient(chainId);
  if (walletError || !walletClient) {
    throw new Error("Failed to connect to wallet", { cause: walletError });
  }

  // Step 3: Create signer
  const walletSigner = await walletClientToSigner(walletClient);
  if (!walletSigner) {
    throw new Error("Failed to create wallet signer");
  }

  return { gapClient, walletSigner, chainId };
};
