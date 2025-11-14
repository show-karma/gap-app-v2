import type { WalletClient } from "viem"

export interface WalletClientValidationResult {
  isValid: boolean
  chainId?: number
  issues: string[]
}

/**
 * Validate wallet client state and readiness for transactions
 */
export function validateWalletClient(
  walletClient: WalletClient | null | undefined,
  expectedChainId?: number
): WalletClientValidationResult {
  const issues: string[] = []

  if (!walletClient) {
    issues.push("Wallet client is not available")
    return { isValid: false, issues }
  }

  if (!walletClient.account) {
    issues.push("Wallet client has no account connected")
  }

  if (!walletClient.chain) {
    issues.push("Wallet client has no chain information")
  } else {
    const currentChainId = walletClient.chain.id

    if (expectedChainId && currentChainId !== expectedChainId) {
      issues.push(`Wallet client is on chain ${currentChainId}, expected ${expectedChainId}`)
    }

    return {
      isValid: issues.length === 0,
      chainId: currentChainId,
      issues,
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

/**
 * Wait for wallet client to become valid for a specific chain
 */
export async function waitForValidWalletClient(
  getWalletClient: () => WalletClient | null | undefined,
  expectedChainId: number,
  maxRetries = 15,
  delayMs = 1000
): Promise<WalletClient | null> {
  console.log(`Waiting for valid wallet client on chain ${expectedChainId}...`)

  for (let i = 0; i < maxRetries; i++) {
    const walletClient = getWalletClient()
    const validation = validateWalletClient(walletClient, expectedChainId)

    if (validation.isValid && walletClient) {
      console.log(`✅ Wallet client validated successfully for chain ${expectedChainId}`)
      return walletClient
    }

    // If we have a wallet client but wrong chain, it might still be switching
    if (walletClient && walletClient.account) {
      console.log(
        `⏳ Wallet client available but validation pending (attempt ${i + 1}/${maxRetries}):`,
        validation.issues
      )
    } else {
      console.log(
        `❌ Wallet client not available (attempt ${i + 1}/${maxRetries}):`,
        validation.issues
      )
    }

    // Increase delay for later attempts
    const currentDelay = Math.min(delayMs * (1 + i * 0.2), 3000)

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, currentDelay))
    }
  }

  console.error(
    `❌ Failed to get valid wallet client for chain ${expectedChainId} after ${maxRetries} attempts`
  )

  // Don't return invalid client - let caller handle the null case
  return null
}

/**
 * Check if wallet client needs refresh after network switch
 */
export function shouldRefreshWalletClient(
  walletClient: WalletClient | null | undefined,
  expectedChainId: number
): boolean {
  if (!walletClient) return true
  if (!walletClient.chain) return true
  if (walletClient.chain.id !== expectedChainId) return true
  return false
}

/**
 * Get wallet client readiness score (0-100)
 */
export function getWalletClientReadinessScore(
  walletClient: WalletClient | null | undefined,
  expectedChainId?: number
): number {
  let score = 0

  if (walletClient) score += 40
  if (walletClient?.account) score += 30
  if (walletClient?.chain) score += 20
  if (expectedChainId && walletClient?.chain?.id === expectedChainId) score += 10

  return score
}
