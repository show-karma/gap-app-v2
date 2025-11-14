import { getWalletClient } from "@wagmi/core"
import { errorManager } from "@/components/Utilities/errorManager"
import { privyConfig as config } from "./wagmi/privy-config"

/**
 * Safely gets a wallet client with error handling for common issues
 * @param chainId The chain ID to connect to
 * @param showToast Whether to show toast messages for errors (default: false)
 * @param setLoadingState Optional function to update loading state on error
 * @returns Object with wallet client (if successful) and error message (if failed)
 */
export const safeGetWalletClient = async (
  chainId: number,
  showToast: boolean = false,
  setLoadingState?: (state: boolean) => void
) => {
  try {
    const walletClient = await getWalletClient(config, {
      chainId,
    })

    if (!walletClient) {
      throw new Error("Error getting wallet client")
    }

    return { walletClient, error: null }
  } catch (error: any) {
    // Use errorManager to track the error
    errorManager("Wallet client error", error, { chainId })

    const errorMsg = "Failed to connect to wallet. Please try again."

    if (setLoadingState) {
      setLoadingState(false)
    }

    return {
      walletClient: null,
      error: errorMsg,
    }
  }
}
