"use client";
import { useDynamicContext, useUserWallets } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { isZeroDevConnector } from "@dynamic-labs/ethereum-aa";
import { useMemo } from "react";
import { type Hex } from "viem";
import { useAccount } from "wagmi";

export const useDynamicWallet = () => {
  const dynamicContext = useDynamicContext();
  const userWallets = useUserWallets();
  const { address, connector } = useAccount();

  // Extract values from context with proper typing
  const primaryWallet = dynamicContext?.primaryWallet;
  const isAuthenticated = dynamicContext?.user ? true : false;

  // Check if the current wallet is a smart wallet (ZeroDev AA wallet)
  // We check both the Dynamic wallet and the wagmi connector
  const isSmartWallet = useMemo(() => {
    if (!primaryWallet) return false;
    
    // Check if it's a ZeroDev connector through Dynamic
    if (isZeroDevConnector(primaryWallet.connector)) {
      return true;
    }
    
    // Also check the wagmi connector name for ZeroDev
    if (connector && 'name' in connector && typeof connector.name === 'string' && connector.name.toLowerCase().includes('zerodev')) {
      return true;
    }
    
    return false;
  }, [primaryWallet, connector]);

  // Check if wallet supports gasless transactions
  const supportsGasless = useMemo(() => {
    return isSmartWallet;
  }, [isSmartWallet]);

  return {
    isAuthenticated,
    isSmartWallet,
    supportsGasless,
    walletAddress: address,
    primaryWallet,
    userWallets,
  };
};
