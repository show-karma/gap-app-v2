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
  },
  operation?: string
) {
  const { isSmartWallet, supportsGasless } = dynamicWalletHook;
  
  // Get the wallet client (this will work for both standard and smart wallets)
  const { walletClient, error } = await safeGetWalletClient(chainId, false, undefined);
  if (error || !walletClient) {
    throw new Error("Failed to connect to wallet", { cause: error });
  }
  
  // Convert to signer
  const walletSigner = await walletClientToSigner(walletClient);
  
  // If it's a smart wallet, show the gasless notification
  if (isSmartWallet && supportsGasless) {
    console.log(`Using Dynamic smart wallet for gasless ${operation || 'transaction'}`);
    toast.success(`${operation ? operation + ' with' : 'Using'} gasless transaction`, {
      icon: "⛽",
      duration: 4000,
    });
  }
  
  return walletSigner;
}