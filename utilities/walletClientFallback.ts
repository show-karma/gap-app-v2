import { WalletClient } from "viem";

/**
 * Enhanced wallet client fallback with retry mechanism
 */
export async function getWalletClientWithFallback(
  primaryWalletClient: WalletClient | null | undefined,
  expectedChainId: number,
  refetchWalletClient?: () => Promise<{ data: WalletClient | null }>
): Promise<WalletClient | null> {
  console.log(`🔄 Getting wallet client for chain ${expectedChainId}...`);

  // Step 1: Check if primary wallet client is usable
  if (primaryWalletClient && primaryWalletClient.account) {
    if (primaryWalletClient.chain?.id === expectedChainId) {
      console.log(`✅ Primary wallet client is ready for chain ${expectedChainId}`);
      return primaryWalletClient;
    } else {
      console.log(`⚠️ Primary wallet client is on chain ${primaryWalletClient.chain?.id}, expected ${expectedChainId}`);
    }
  } else {
    console.log(`❌ Primary wallet client not available or no account connected`);
  }

  // Step 2: Try to refetch wallet client if available
  if (refetchWalletClient) {
    console.log(`🔄 Attempting to refetch wallet client...`);
    try {
      const { data: refreshedClient } = await refetchWalletClient();
      if (refreshedClient && refreshedClient.account) {
        if (refreshedClient.chain?.id === expectedChainId) {
          console.log(`✅ Refreshed wallet client is ready for chain ${expectedChainId}`);
          return refreshedClient;
        } else {
          console.log(`⚠️ Refreshed wallet client is on chain ${refreshedClient.chain?.id}, expected ${expectedChainId}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to refetch wallet client:`, error);
    }
  }

  // Step 3: Progressive fallback strategy
  console.log(`🔄 Attempting progressive fallback for chain ${expectedChainId}...`);

  // Wait a bit and check primary again
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (primaryWalletClient && primaryWalletClient.account) {
    console.log(`⚠️ Using primary wallet client as fallback (may be on wrong chain)`);
    return primaryWalletClient;
  }

  // Last resort: try refetch one more time
  if (refetchWalletClient) {
    try {
      const { data: lastResortClient } = await refetchWalletClient();
      if (lastResortClient && lastResortClient.account) {
        console.log(`⚠️ Using last resort wallet client (may be on wrong chain)`);
        return lastResortClient;
      }
    } catch (error) {
      console.warn(`❌ Last resort wallet client fetch failed:`, error);
    }
  }

  console.error(`❌ No usable wallet client found for chain ${expectedChainId}`);
  return null;
}

/**
 * Check if wallet client is "good enough" for transaction execution
 */
export function isWalletClientGoodEnough(
  walletClient: WalletClient | null | undefined,
  expectedChainId?: number
): boolean {
  if (!walletClient) return false;
  if (!walletClient.account) return false;

  // If we have a specific chain requirement, check it
  if (expectedChainId && walletClient.chain?.id !== expectedChainId) {
    console.warn(`⚠️ Wallet client chain mismatch: ${walletClient.chain?.id} vs ${expectedChainId}`);
    return false;
  }

  return true;
}

/**
 * Try to execute a transaction with fallback wallet clients
 */
export async function executeWithWalletClientFallback<T>(
  execution: (walletClient: WalletClient) => Promise<T>,
  primaryWalletClient: WalletClient | null | undefined,
  expectedChainId: number,
  refetchWalletClient?: () => Promise<{ data: WalletClient | null }>
): Promise<T> {
  const walletClient = await getWalletClientWithFallback(
    primaryWalletClient,
    expectedChainId,
    refetchWalletClient
  );

  if (!walletClient) {
    throw new Error(`No wallet client available for chain ${expectedChainId}. Please ensure your wallet is connected and on the correct network.`);
  }

  try {
    return await execution(walletClient);
  } catch (error) {
    // If execution fails and it's a chain mismatch, provide helpful error
    if (walletClient.chain?.id !== expectedChainId) {
      throw new Error(`Transaction failed: Wallet is on chain ${walletClient.chain?.id} but expected chain ${expectedChainId}. Please switch to the correct network and try again.`);
    }

    // Otherwise, re-throw the original error
    throw error;
  }
}