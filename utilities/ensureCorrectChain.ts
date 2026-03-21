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
  gapClient: ReturnType<typeof getGapClient>;
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
  // If we're already on the correct chain, just return the client
  if (currentChainId === targetChainId) {
    return {
      success: true,
      chainId: targetChainId,
      gapClient: getGapClient(targetChainId),
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
      gapClient: getGapClient(targetChainId),
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
      gapClient: getGapClient(targetChainId),
    };
  } catch (switchError) {
    console.error("Failed to switch chain:", switchError);
    const errorMsg = `Failed to switch to network. Please switch manually and try again.`;
    toast.error(errorMsg);
    onError?.(switchError);

    return {
      success: false,
      chainId: currentChainId || targetChainId,
      gapClient: getGapClient(targetChainId),
      error: errorMsg,
    };
  }
}
