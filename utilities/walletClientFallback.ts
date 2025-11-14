import type { WalletClient } from "viem"

/**
 * Enhanced wallet client fallback with retry mechanism
 */
export async function getWalletClientWithFallback(
  primaryWalletClient: WalletClient | null | undefined,
  expectedChainId: number,
  refetchWalletClient?: () => Promise<{ data: WalletClient | null | undefined }>
): Promise<WalletClient | null> {
  // Step 1: Check if primary wallet client is usable
  if (primaryWalletClient?.account) {
    if (primaryWalletClient.chain?.id === expectedChainId) {
      return primaryWalletClient
    } else {
    }
  } else {
  }

  // Step 2: Try to refetch wallet client if available
  if (refetchWalletClient) {
    try {
      const { data: refreshedClient } = await refetchWalletClient()
      if (refreshedClient?.account) {
        if (refreshedClient.chain?.id === expectedChainId) {
          return refreshedClient
        } else {
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to refetch wallet client:`, error)
    }
  }

  // Wait a bit and check primary again
  await new Promise((resolve) => setTimeout(resolve, 2000))

  if (primaryWalletClient?.account) {
    return primaryWalletClient
  }

  // Last resort: try refetch one more time
  if (refetchWalletClient) {
    try {
      const { data: lastResortClient } = await refetchWalletClient()
      if (lastResortClient?.account) {
        return lastResortClient
      }
    } catch (error) {
      console.warn(`❌ Last resort wallet client fetch failed:`, error)
    }
  }

  console.error(`❌ No usable wallet client found for chain ${expectedChainId}`)
  return null
}

/**
 * Check if wallet client is "good enough" for transaction execution
 */
export function isWalletClientGoodEnough(
  walletClient: WalletClient | null | undefined,
  expectedChainId?: number
): boolean {
  if (!walletClient) return false
  if (!walletClient.account) return false

  // If we have a specific chain requirement, check it
  if (expectedChainId && walletClient.chain?.id !== expectedChainId) {
    console.warn(`⚠️ Wallet client chain mismatch: ${walletClient.chain?.id} vs ${expectedChainId}`)
    return false
  }

  return true
}

/**
 * Try to execute a transaction with fallback wallet clients
 */
export async function executeWithWalletClientFallback<T>(
  execution: (walletClient: WalletClient) => Promise<T>,
  primaryWalletClient: WalletClient | null | undefined,
  expectedChainId: number,
  refetchWalletClient?: () => Promise<{ data: WalletClient | null | undefined }>
): Promise<T> {
  const walletClient = await getWalletClientWithFallback(
    primaryWalletClient,
    expectedChainId,
    refetchWalletClient
  )

  if (!walletClient) {
    throw new Error(
      `No wallet client available for chain ${expectedChainId}. Please ensure your wallet is connected and on the correct network.`
    )
  }

  try {
    return await execution(walletClient)
  } catch (error) {
    // If execution fails and it's a chain mismatch, provide helpful error
    if (walletClient.chain?.id !== expectedChainId) {
      throw new Error(
        `Transaction failed: Wallet is on chain ${walletClient.chain?.id} but expected chain ${expectedChainId}. Please switch to the correct network and try again.`
      )
    }

    // Otherwise, re-throw the original error
    throw error
  }
}
