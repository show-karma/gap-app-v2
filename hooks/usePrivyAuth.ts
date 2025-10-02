"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useDisconnect } from "wagmi";
import { useEffect, useMemo } from "react";
import { TokenManager } from "@/utilities/auth/token-manager";

interface UsePrivyAuthReturn {
  // Authentication state
  isAuthenticated: boolean;
  isReady: boolean;

  // User data
  user: any | null;
  address: string | undefined;

  // Wallet state
  isConnected: boolean;
  wallets: any[];

  // Actions
  login: () => void;
  logout: () => Promise<void>;
  connectWallet: () => void;
  disconnectWallet: () => void;

  // Token management
  getAccessToken: () => Promise<string | null>;
}

/**
 * Unified authentication hook that wraps Privy and Wagmi
 * Provides a simple interface for authentication and wallet management
 * This is the new Privy-based authentication replacing RainbowKit
 */
export function usePrivyAuth(): UsePrivyAuthReturn {
  const {
    ready: privyReady,
    authenticated,
    user,
    login: privyLogin,
    logout: privyLogout,
    getAccessToken: privyGetAccessToken,
    connectWallet: privyConnectWallet,
  } = usePrivy();

  const { wallets } = useWallets();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Set Privy instance for TokenManager when it's ready
  useEffect(() => {
    if (privyReady && authenticated) {
      TokenManager.setPrivyInstance({
        getAccessToken: privyGetAccessToken,
        logout: privyLogout,
      });
    }
  }, [privyReady, authenticated, privyGetAccessToken, privyLogout]);

  // Get the primary wallet address
  const primaryAddress = useMemo(() => {
    if (address) return address;
    if (wallets && wallets.length > 0) {
      // Find the active wallet or the first one
      const activeWallet = wallets.find((w: any) => w.connected) || wallets[0];
      return activeWallet?.address;
    }
    return undefined;
  }, [address, wallets]);

  const handleLogin = () => {
    privyLogin();
  };

  const handleLogout = async () => {
    // Disconnect wallet first if connected
    if (isConnected) {
      disconnect();
    }
    // Then logout from Privy
    await privyLogout();
    // Clear token manager
    TokenManager.setPrivyInstance(null);
  };

  const handleConnectWallet = () => {
    if (!authenticated) {
      // If not authenticated, trigger login flow
      privyLogin();
    } else {
      // If authenticated, connect additional wallet
      privyConnectWallet();
    }
  };

  const handleDisconnectWallet = () => {
    disconnect();
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!authenticated) return null;
    try {
      const token = await privyGetAccessToken();
      return token;
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  };

  return {
    // Authentication state
    isAuthenticated: authenticated,
    isReady: privyReady,

    // User data
    user,
    address: primaryAddress,

    // Wallet state
    isConnected: isConnected || (wallets && wallets.length > 0),
    wallets,

    // Actions
    login: handleLogin,
    logout: handleLogout,
    connectWallet: handleConnectWallet,
    disconnectWallet: handleDisconnectWallet,

    // Token management
    getAccessToken,
  };
}