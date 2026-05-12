import toast from "react-hot-toast";
import { getGapClient } from "@/utilities/gapClient";

interface EnsureCorrectChainParams {
  targetChainId: number;
  currentChainId?: number;
  switchChainAsync?: (params: { chainId: number }) => Promise<any>;
  onError?: (error: any) => void;
}

interface EnsureCorrectChainResult {
  success: boolean;
  chainId: number;
  gapClient: ReturnType<typeof getGapClient> | null;
  error?: string;
}

/**
 * Ensures the wallet is on the correct chain and returns the appropriate GAP client.
 *
 * After switchChainAsync resolves, the wallet has confirmed the switch.
 * The wallet client cache (wagmi) may still be stale at this point —
 * safeGetWalletClient handles that with chain-verified retries.
 *
 * @param params - The parameters for chain switching
 * @returns Result object with success status, chain ID, and GAP client
 */
export async function ensureCorrectChain({
  targetChainId,
  currentChainId,
  switchChainAsync,
  onError,
}: EnsureCorrectChainParams): Promise<EnsureCorrectChainResult> {
  // Resolve the SDK client up front. If the chain isn't supported by the
  // SDK at all, surface that *once* with a friendly toast and bail —
  // there's no point trying to switch the wallet to a chain we can't
  // attest against. Returning `gapClient: null` on failure (instead of
  // calling `getGapClient` again in the catch path) prevents the
  // double-toast we used to see: one from the wagmi switch failure plus
  // a second from a re-thrown SDK error.
  let resolvedGapClient: ReturnType<typeof getGapClient> | null;
  try {
    resolvedGapClient = getGapClient(targetChainId);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : `This network (chain ID ${targetChainId}) is not supported yet.`;
    toast.error(message);
    onError?.(e);
    return {
      success: false,
      chainId: currentChainId || targetChainId,
      gapClient: null,
      error: message,
    };
  }

  // If we're already on the correct chain, just return the client
  if (currentChainId === targetChainId) {
    return {
      success: true,
      chainId: targetChainId,
      gapClient: resolvedGapClient,
    };
  }

  // Need to switch chains
  if (!switchChainAsync) {
    const error = "Wallet switch function not available";
    toast.error(error);
    onError?.(new Error(error));
    return {
      success: false,
      chainId: currentChainId || targetChainId,
      gapClient: resolvedGapClient,
      error,
    };
  }

  try {
    await switchChainAsync({ chainId: targetChainId });

    // switchChainAsync resolved — the wallet confirmed the switch.
    // Use the target chain ID directly; safeGetWalletClient will
    // retry if wagmi's cached wallet client is still stale.
    return {
      success: true,
      chainId: targetChainId,
      gapClient: resolvedGapClient,
    };
  } catch (switchError) {
    console.error("Failed to switch chain:", switchError);
    const errorMsg = `Failed to switch to network. Please switch manually and try again.`;
    toast.error(errorMsg);
    onError?.(switchError);

    return {
      success: false,
      chainId: currentChainId || targetChainId,
      gapClient: resolvedGapClient,
      error: errorMsg,
    };
  }
}
