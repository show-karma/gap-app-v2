"use client";
import {
  useDynamicContext,
  useUserWallets,
} from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { isZeroDevConnector } from "@dynamic-labs/ethereum-aa";
import { useCallback, useMemo } from "react";
import { type Hex } from "viem";
import { useAccount } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { config } from "@/utilities/wagmi/config";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";

export const useDynamicWallet = () => {
  const dynamicContext = useDynamicContext();
  const userWallets = useUserWallets();
  const { address } = useAccount();

  // Extract values from context with proper typing
  const primaryWallet = dynamicContext?.primaryWallet;
  const isAuthenticated = dynamicContext?.user ? true : false;

  // Check if the current wallet is a smart wallet (ZeroDev AA wallet)
  const isSmartWallet = useMemo(() => {
    if (!primaryWallet) return false;
    return isZeroDevConnector(primaryWallet.connector);
  }, [primaryWallet]);

  // Get the smart wallet instance if available
  const smartWallet = useMemo(() => {
    if (!primaryWallet || !isSmartWallet) return null;
    return primaryWallet;
  }, [primaryWallet, isSmartWallet]);

  // Check if wallet supports gasless transactions
  const supportsGasless = useMemo(() => {
    return isSmartWallet;
  }, [isSmartWallet]);

  // Get signer for the wallet (handles both EOA and smart wallets)
  const getSigner = useCallback(async () => {
    if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
      throw new Error("No Ethereum wallet connected");
    }

    // Get the wallet client using wagmi
    const walletClient = await getWalletClient(config);

    if (!walletClient) {
      throw new Error("Failed to get wallet client");
    }

    // Convert to ethers signer using the existing utility
    const signer = await walletClientToSigner(walletClient);

    return signer;
  }, [primaryWallet]);

  // Sign a transaction using the wallet (handles AA if it's a smart wallet)
  const signTransaction = useCallback(
    async (transaction: any) => {
      if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
        throw new Error("No Ethereum wallet connected");
      }

      // For smart wallets, this will use account abstraction
      // For EOA wallets, this will use standard signing
      const signer = await getSigner();

      // Use the signer to send transaction
      return signer?.sendTransaction(transaction);
    },
    [primaryWallet, getSigner]
  );

  // Get the actual wallet address (for smart wallets, this is the smart contract address)
  const getWalletAddress = useCallback((): Hex | undefined => {
    if (!primaryWallet) return undefined;
    return primaryWallet.address as Hex;
  }, [primaryWallet]);

  return {
    isAuthenticated,
    isSmartWallet,
    smartWallet,
    supportsGasless,
    getSigner,
    signTransaction,
    walletAddress: getWalletAddress(),
    primaryWallet,
    userWallets,
  };
};
