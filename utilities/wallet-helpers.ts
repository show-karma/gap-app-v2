import { getWalletClient, reconnect } from "@wagmi/core";
import { errorManager } from "@/components/Utilities/errorManager";
import { privyConfig as config } from "./wagmi/privy-config";

/**
 * Safely gets a wallet client with error handling for common issues.
 * After a chain switch, the wagmi wallet client cache can be stale.
 * This function reconnects and retries if the returned client is on the wrong chain.
 *
 * @param chainId The chain ID to connect to
 * @param showToast Whether to show toast messages for errors (default: false)
 * @param setLoadingState Optional function to update loading state on error
 * @returns Object with wallet client (if successful) and error message (if failed)
 */
export const safeGetWalletClient = async (
  chainId: number,
  _showToast: boolean = false,
  setLoadingState?: (state: boolean) => void
) => {
  try {
    let walletClient = await getWalletClient(config, {
      chainId,
    });

    if (!walletClient) {
      throw new Error("Error getting wallet client");
    }

    // Verify the wallet client is on the expected chain.
    // After a chain switch, wagmi's cache may still return a stale client.
    if (walletClient.chain?.id !== chainId) {
      // Force wagmi to re-establish connector state, flushing stale cache
      try {
        await reconnect(config);
      } catch {
        // Reconnect can fail if already connected — safe to ignore
      }

      let retries = 5;
      while (retries > 0 && walletClient.chain?.id !== chainId) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        walletClient = await getWalletClient(config, { chainId });
        retries--;
      }

      if (walletClient.chain?.id !== chainId) {
        throw new Error(
          `Wallet is on chain ${walletClient.chain?.id} but expected ${chainId}. Please switch your wallet network and try again.`
        );
      }
    }

    return { walletClient, error: null };
  } catch (error: unknown) {
    // Use errorManager to track the error
    errorManager("Wallet client error", error, { chainId });

    const errorMsg =
      error instanceof Error && error.message.includes("expected")
        ? error.message
        : "Failed to connect to wallet. Please try again.";

    if (setLoadingState) {
      setLoadingState(false);
    }

    return {
      walletClient: null,
      error: errorMsg,
    };
  }
};
