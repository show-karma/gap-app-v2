"use client";

import { createContext, useContext } from "react";

/**
 * Bridge between Privy/Wagmi hooks and the rest of the app.
 *
 * When PrivyWagmiProviders hasn't loaded yet (deferred via dynamic import),
 * consumers get safe defaults (ready=false, authenticated=false) instead of
 * a thrown error from usePrivy()/useAccount() missing their providers.
 *
 * Once PrivyWagmiProviders mounts, the PrivyBridge component populates this
 * context with live values from usePrivy(), useWallets(), and useAccount().
 */
export interface PrivyBridgeValue {
  // From usePrivy
  ready: boolean;
  authenticated: boolean;
  user: any;
  login: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  connectWallet: () => void;
  // From useWallets
  wallets: any[];
  // From useAccount
  isConnected: boolean;
}

const noop = () => {};
const noopAsync = async () => {};

export const PRIVY_BRIDGE_DEFAULTS: PrivyBridgeValue = {
  ready: false,
  authenticated: false,
  user: null,
  login: noop,
  logout: noopAsync,
  getAccessToken: async () => null,
  connectWallet: noop,
  wallets: [],
  isConnected: false,
};

export const PrivyBridgeContext = createContext<PrivyBridgeValue>(PRIVY_BRIDGE_DEFAULTS);

export function usePrivyBridge(): PrivyBridgeValue {
  return useContext(PrivyBridgeContext);
}
