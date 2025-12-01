import type { WalletClient } from "viem";

/**
 * Validates that the wallet client is properly synchronized with the expected chain
 * and throws descriptive errors if not
 */
export async function validateChainSync(
  walletClient: WalletClient | null | undefined,
  expectedChainId: number,
  operation: string = "transaction"
): Promise<void> {
  if (!walletClient) {
    throw new Error(
      `Wallet client is not available for ${operation}. Please ensure your wallet is connected.`
    );
  }

  if (!walletClient.account) {
    throw new Error(`No account connected to wallet for ${operation}. Please connect your wallet.`);
  }

  if (!walletClient.chain) {
    throw new Error(
      `Wallet client has no chain information for ${operation}. Please refresh and try again.`
    );
  }

  const currentChainId = walletClient.chain.id;

  if (currentChainId !== expectedChainId) {
    throw new Error(
      `Chain mismatch for ${operation}: Wallet is on chain ${currentChainId}, but ${operation} requires chain ${expectedChainId}. ` +
        `Please switch to the correct network in your wallet and try again.`
    );
  }
}

/**
 * Waits for the wallet client to sync to the expected chain with exponential backoff
 */
export async function waitForChainSync(
  getWalletClient: () => WalletClient | null | undefined,
  expectedChainId: number,
  maxWaitMs: number = 30000,
  operation: string = "transaction"
): Promise<WalletClient> {
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < maxWaitMs) {
    attempt++;
    const walletClient = getWalletClient();

    try {
      await validateChainSync(walletClient, expectedChainId, operation);
      return walletClient!;
    } catch (_error) {
      if (attempt === 1) {
      }

      // Exponential backoff: 500ms, 1s, 2s, 4s, etc.
      const delay = Math.min(500 * 2 ** (attempt - 1), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Final attempt with descriptive error
  const finalWalletClient = getWalletClient();
  try {
    await validateChainSync(finalWalletClient, expectedChainId, operation);
    return finalWalletClient!;
  } catch (error) {
    throw new Error(
      `Timed out waiting for wallet to sync to chain ${expectedChainId} for ${operation} after ${maxWaitMs}ms. ` +
        `${error instanceof Error ? error.message : "Please ensure your wallet is on the correct network and try again."}`
    );
  }
}

/**
 * Get the current chain ID from various sources (wallet client, window.ethereum, etc.)
 */
export async function getCurrentChainId(): Promise<number | null> {
  // Try window.ethereum first (most reliable)
  if (typeof window !== "undefined" && (window as any).ethereum) {
    try {
      const chainId = await (window as any).ethereum.request({ method: "eth_chainId" });
      return parseInt(chainId, 16);
    } catch (error) {
      console.warn("Failed to get chain ID from window.ethereum:", error);
    }
  }

  return null;
}
