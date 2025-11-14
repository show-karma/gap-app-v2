import toast from "react-hot-toast"
import { NETWORK_CONSTANTS } from "@/constants/donation"
import type { SupportedToken } from "@/constants/supportedTokens"

export interface DonationPayment {
  projectId: string
  amount: string
  token: SupportedToken
  chainId: number
}

/**
 * Validate that all projects have payout addresses
 */
export function validatePayoutAddresses(
  payments: DonationPayment[],
  payoutAddresses: Record<string, string>
): { valid: boolean; missingAddresses: DonationPayment[] } {
  const missingAddresses = payments.filter((payment) => !payoutAddresses[payment.projectId])

  if (missingAddresses.length > 0) {
    toast.error(
      "Cannot proceed: Some projects are missing payout addresses. Donation blocked for security."
    )
    return { valid: false, missingAddresses }
  }

  return { valid: true, missingAddresses: [] }
}

/**
 * Get the target chain ID from payments
 */
export function getTargetChainId(payments: DonationPayment[]): number | null {
  return payments.find((payment) => payment.chainId)?.chainId || null
}

/**
 * Switch to target network if needed
 */
export async function ensureCorrectNetwork(
  currentChainId: number | null,
  targetChainId: number | null,
  switchToNetwork: (chainId: number) => Promise<void>
): Promise<number | null> {
  if (!targetChainId) {
    toast.error("Unable to determine donation network.")
    return null
  }

  let activeChainId = currentChainId

  if (activeChainId !== targetChainId) {
    try {
      await switchToNetwork(targetChainId)
      activeChainId = targetChainId
    } catch (error) {
      toast.error("Switch to the required network to continue.")
      return null
    }
  }

  return activeChainId
}

/**
 * Wait for wallet client to sync after network switch
 */
export async function waitForWalletSync(
  payment: DonationPayment,
  activeChainId: number | null,
  switchToNetwork: (chainId: number) => Promise<void>,
  getFreshWalletClient: (chainId: number) => Promise<any>
): Promise<number | null> {
  if (!payment.chainId || payment.chainId === activeChainId) {
    return activeChainId
  }

  try {
    await switchToNetwork(payment.chainId)

    let attempts = 0
    const maxAttempts = NETWORK_CONSTANTS.WALLET_SYNC_MAX_ATTEMPTS

    while (attempts < maxAttempts) {
      const freshWalletClient = await getFreshWalletClient(payment.chainId)

      if (freshWalletClient && freshWalletClient.chain?.id === payment.chainId) {
        return payment.chainId
      }

      attempts++
      await new Promise((resolve) => setTimeout(resolve, NETWORK_CONSTANTS.WALLET_SYNC_DELAY_MS))
    }

    throw new Error(
      `Wallet client failed to sync to chain ${payment.chainId} after ${maxAttempts} attempts. Please ensure your wallet has switched networks.`
    )
  } catch (error) {
    throw new Error(
      `Failed to switch to required network (Chain ID: ${payment.chainId}). ${
        error instanceof Error ? error.message : "Please try again."
      }`
    )
  }
}

/**
 * Create completed donation records from results
 */
export function createCompletedDonations(
  results: any[],
  payments: DonationPayment[],
  cartItems: any[]
) {
  return results
    .map((result) => {
      const payment = payments.find((p) => p.projectId === result.projectId)
      if (!payment) {
        console.error(`No payment found for result projectId: ${result.projectId}`)
        return null
      }

      const cartItem = cartItems.find((item) => item.uid === payment.projectId)

      return {
        projectId: payment.projectId,
        projectTitle: cartItem?.title || payment.projectId,
        projectSlug: cartItem?.slug,
        projectImageURL: cartItem?.imageURL,
        amount: payment.amount,
        token: payment.token,
        chainId: payment.chainId,
        transactionHash: result.status === "success" ? result.hash : "",
        timestamp: Date.now(),
        status: (result.status === "success" ? "success" : "failed") as "success" | "failed",
      }
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
}
