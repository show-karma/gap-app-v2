"use client";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import toast from "react-hot-toast";

/**
 * Helper function to get a wallet signer with account abstraction support
 * @param chainId The chain ID to connect to
 * @param dynamicWalletHook The return value from useDynamicWallet hook
 * @param operation Optional operation name for logging/toasts
 * @returns A wallet signer that supports both standard and AA wallets
 */
export async function getWalletSignerWithAA(
  chainId: number,
  dynamicWalletHook: {
    isSmartWallet: boolean;
    supportsGasless: boolean;
    getSigner: () => Promise<any>;
  },
  operation?: string
) {
  const { isSmartWallet, supportsGasless, getSigner } = dynamicWalletHook;
  
  // Check if we're using a smart wallet with Dynamic
  if (isSmartWallet && supportsGasless) {
    try {
      // Use Dynamic's signer for AA transactions
      const walletSigner = await getSigner();
      console.log(`Using Dynamic smart wallet for gasless ${operation || 'transaction'}`);
      toast.success(`${operation ? operation + ' with' : 'Using'} gasless transaction`, {
        icon: "⛽",
        duration: 4000,
      });
      return walletSigner;
    } catch (dynamicError) {
      console.warn("Failed to get Dynamic signer, falling back to standard wallet", dynamicError);
      // Fall through to standard wallet flow
    }
  }
  
  // Standard wallet flow
  const { walletClient, error } = await safeGetWalletClient(chainId);
  if (error || !walletClient) {
    throw new Error("Failed to connect to wallet", { cause: error });
  }
  return await walletClientToSigner(walletClient);
}