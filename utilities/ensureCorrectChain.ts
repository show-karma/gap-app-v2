import toast from "react-hot-toast";
import { getGapClient } from "@/utilities/gapClient";
import { retryUntilCondition } from "@/utilities/retry";

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
 * Verify the wallet provider is actually on the expected chain by querying
 * the provider directly (bypasses stale React/wagmi state).
 */
async function verifyProviderChain(expectedChainId: number): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) return true;

  try {
    const hexChainId = await (window as any).ethereum.request({
      method: "eth_chainId",
    });
    return parseInt(hexChainId, 16) === expectedChainId;
  } catch {
    return false;
  }
}

/**
 * Ensures the wallet is on the correct chain and returns the appropriate GAP client.
 * After switching, verifies the chain actually changed by polling the provider directly
 * rather than relying on a fixed delay (which causes race conditions with MetaMask).
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

    // Verify the provider actually switched by polling eth_chainId directly.
    // This avoids the race condition where wagmi's cached wallet client
    // hasn't updated yet after switchChainAsync resolves.
    const confirmed = await retryUntilCondition(() => verifyProviderChain(targetChainId), {
      maxRetries: 20,
      delayMs: 300,
    });

    if (!confirmed) {
      const errorMsg =
        "Chain switch was not confirmed. Please switch your wallet manually and try again.";
      toast.error(errorMsg);
      onError?.(new Error(errorMsg));
      return {
        success: false,
        chainId: currentChainId || targetChainId,
        gapClient: getGapClient(targetChainId),
        error: errorMsg,
      };
    }

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
