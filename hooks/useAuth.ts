"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect } from "react";
import { TokenManager } from "@/utilities/auth/token-manager";
import { Hex } from "viem";
import { useAccount } from "wagmi";

/**
 * Authentication hook that wraps Privy's built-in authentication
 *
 * Privy handles all the complexity:
 * - Token management and refresh
 * - Session persistence
 * - Cross-tab synchronization
 * - Cookie management
 * - Wallet connections
 */
export const useAuth = () => {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    getAccessToken,
  } = usePrivy();

  const { wallets } = useWallets();

  const { isConnected } = useAccount()

  // Get primary wallet (first connected wallet)
  const primaryWallet = wallets[0];
  const address = primaryWallet?.address as Hex | undefined;

  // Initialize TokenManager with Privy
  useEffect(() => {
    if (ready) {
      TokenManager.setPrivyInstance({ getAccessToken });
    }
  }, [ready, getAccessToken]);


  // Cross-tab logout synchronization
  useEffect(() => {
    if (!ready || !authenticated) return;

    const checkAuthStatus = async () => {
      const hasToken = await TokenManager.getToken();
      if (!hasToken && authenticated) {
        logout?.();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'privy:token' && !e.newValue) {
        checkAuthStatus();
      }
    };

    checkAuthStatus();

    const intervalId = setInterval(checkAuthStatus, 5000);

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [ready, authenticated, logout])


  return {
    // Core authentication (Privy handles everything)
    authenticate: login,  // Just use Privy's login
    disconnect: logout,   // Just use Privy's logout

    // State from Privy
    ready,
    authenticated,
    isConnected,
    user,
    address,
    primaryWallet,
    wallets,

    // Privy methods
    login,
    logout,
    getAccessToken
  };
};