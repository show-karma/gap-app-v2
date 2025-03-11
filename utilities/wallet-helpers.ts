import { getWalletClient } from "@wagmi/core";
import { config } from "./wagmi/config";
import { Connector } from "wagmi";
import { errorManager } from "@/components/Utilities/errorManager";
import { toast } from "react-hot-toast";

/**
 * Ensures a wallet is connected before proceeding with wallet operations
 * @param isConnected Current connection status
 * @param address User's wallet address
 * @param connect Function to connect wallet
 * @param connectors Available connectors
 * @returns Object with success status and error message if applicable
 */
export const ensureWalletConnected = async (
  isConnected: boolean,
  address: string | undefined,
  connect: (args?: { connector: Connector }) => Promise<void>,
  connectors: Connector[]
): Promise<{ success: boolean; error?: string }> => {
  if (!isConnected || !address) {
    // Try to connect if not connected
    const connector = connectors[0]; // Use first available connector
    if (connector) {
      try {
        await connect({ connector });
        return { success: true };
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        errorManager("Failed to connect wallet", error);
        return {
          success: false,
          error: "Please connect your wallet to continue.",
        };
      }
    } else {
      return {
        success: false,
        error: "No wallet connectors available.",
      };
    }
  }
  return { success: true };
};

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
    });

    if (!walletClient) {
      const errorMsg =
        "Unable to connect to your wallet. Please refresh the page and try again.";
      if (showToast) {
        toast.error(errorMsg);
      }
      if (setLoadingState) {
        setLoadingState(false);
      }
      return {
        walletClient: null,
        error: errorMsg,
      };
    }

    return { walletClient, error: null };
  } catch (error: any) {
    console.error("Wallet client error:", error);

    // Use errorManager to track the error
    errorManager("Wallet client error", error, { chainId });

    let errorMsg = "Failed to connect to wallet. Please try again.";

    if (error.message?.includes("getChainId is not a function")) {
      errorMsg =
        "Wallet connection issue. Please refresh the page and try again.";
    }

    if (showToast) {
      toast.error(errorMsg);
    }

    if (setLoadingState) {
      setLoadingState(false);
    }

    return {
      walletClient: null,
      error: errorMsg,
    };
  }
};

/**
 * Helper function to standardize wallet connection error handling across the application
 * This function should be used in place of direct getWalletClient calls
 *
 * @param chainId The chain ID to connect to
 * @param setLoadingState Optional function to update loading state on error
 * @param loadingKey Optional key for the loading state object
 * @returns Object with wallet client (if successful) and error message (if failed)
 */
export const handleWalletConnection = async (
  chainId: number,
  setLoadingState?: (state: boolean) => void,
  loadingKey?: string
) => {
  try {
    const { walletClient, error } = await safeGetWalletClient(chainId);

    if (error) {
      console.error("Wallet connection error:", error);
      if (setLoadingState) setLoadingState(false);
      return { walletClient: null, error };
    }

    if (!walletClient) {
      if (setLoadingState) setLoadingState(false);
      return {
        walletClient: null,
        error:
          "Unable to connect to wallet. Please refresh the page and try again.",
      };
    }

    return { walletClient, error: null };
  } catch (error: any) {
    console.error("Unexpected wallet connection error:", error);

    // Use errorManager to track the error
    errorManager("Unexpected wallet connection error", error, { chainId });

    if (setLoadingState) setLoadingState(false);
    return {
      walletClient: null,
      error:
        "An unexpected error occurred. Please refresh the page and try again.",
    };
  }
};
