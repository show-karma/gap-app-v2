import toast from "react-hot-toast";
import { getGapClient } from "@/hooks/useGap";

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
 * This function handles the chain switching logic consistently across the app.
 * 
 * Key insight: After switchChainAsync, we don't wait for React hooks to update.
 * Instead, we trust the switch happened and use the target chain ID directly.
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
    
    // Small delay to ensure the switch completes
    // This is a pragmatic solution since wallet state updates are async
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Trust that the switch happened and use the target chain
    // Don't wait for React hooks to update
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