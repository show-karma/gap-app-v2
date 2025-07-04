"use client";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";

export const useDynamicAA = () => {
  const { primaryWallet, user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  // Check if current wallet is a smart wallet based on connector type
  const isSmartWallet =
    primaryWallet?.connector?.name?.toLowerCase().includes("smart") ||
    primaryWallet?.connector?.name?.toLowerCase().includes("zerodev") ||
    false;

  const getWalletAddress = () => {
    if (primaryWallet) {
      return primaryWallet.address;
    }
    return null;
  };

  const getWalletType = () => {
    if (!primaryWallet?.connector) return "unknown";

    const connectorName = primaryWallet.connector.name.toLowerCase();

    if (connectorName.includes("smart") || connectorName.includes("zerodev")) {
      return "smart-wallet";
    }

    if (connectorName.includes("embedded")) {
      return "embedded-wallet";
    }

    return "external-wallet";
  };

  const isAccountAbstractionSupported = () => {
    // Check if the current wallet supports account abstraction
    return (
      isSmartWallet ||
      primaryWallet?.connector?.name?.toLowerCase().includes("embedded")
    );
  };

  const sendTransaction = async (transaction: any) => {
    if (!primaryWallet) {
      throw new Error("No wallet connected");
    }

    try {
      // Use wagmi/viem for transaction sending as Dynamic integrates with it
      // Dynamic's wallet works through the wagmi connector
      return transaction; // Return the transaction object for use with wagmi hooks
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error with transaction:", error);
      }
      throw error;
    }
  };

  const getWalletCapabilities = () => {
    return {
      isSmartWallet,
      isAccountAbstractionSupported: isAccountAbstractionSupported(),
      walletType: getWalletType(),
      hasGasSponsorship: isSmartWallet, // Smart wallets typically support gas sponsorship
      supportsUserOperations: isSmartWallet,
    };
  };

  return {
    // Core properties
    isLoggedIn,
    user,
    primaryWallet,

    // Wallet information
    walletAddress: getWalletAddress(),
    isSmartWallet,
    walletType: getWalletType(),

    // Capabilities
    isAccountAbstractionSupported: isAccountAbstractionSupported(),
    capabilities: getWalletCapabilities(),
  };
};
