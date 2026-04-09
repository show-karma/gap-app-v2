"use client";

/**
 * Bridge between the deferred Privy SDK and the rest of the app.
 *
 * Before the Privy SDK loads, consumers get safe defaults (ready=false).
 * Once PrivyWagmiProviders mounts and wraps children, PrivyBridgeUpdater
 * reads usePrivy()/useWallets()/useAccount() and pushes values into this
 * context. useAuth() reads from this context rather than calling Privy
 * hooks directly, keeping the Privy SDK out of useAuth's import chain.
 */

/**
 * Privy types are imported as `type` to avoid pulling the Privy SDK
 * into the initial bundle. Only the type information is used — the
 * actual values come from PrivyBridgeUpdater at runtime.
 */
import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

export interface PrivyBridgeValue {
  // From usePrivy
  ready: boolean;
  authenticated: boolean;
  user: User | null;
  login: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  connectWallet: () => void;
  // From useWallets
  wallets: ConnectedWallet[];
  // From useSmartWallets
  // biome-ignore lint/suspicious/noExplicitAny: Privy smart wallet client type is complex and internal
  smartWalletClient: any;
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
  smartWalletClient: null,
  isConnected: false,
};

const PrivyBridgeContext = createContext<PrivyBridgeValue>(PRIVY_BRIDGE_DEFAULTS);
const PrivyBridgeSetterContext = createContext<(v: PrivyBridgeValue) => void>(noop);
const LoadPrivyContext = createContext<() => void>(noop);
const PrivyLoadRequestedContext = createContext<boolean>(false);

export function usePrivyBridge(): PrivyBridgeValue {
  return useContext(PrivyBridgeContext);
}

export function usePrivyBridgeSetter(): (v: PrivyBridgeValue) => void {
  return useContext(PrivyBridgeSetterContext);
}

export function useLoadPrivy(): () => void {
  return useContext(LoadPrivyContext);
}

export function usePrivyLoadRequested(): boolean {
  return useContext(PrivyLoadRequestedContext);
}

/**
 * Provider that holds bridge state. Wrap the app once at the root.
 */
export function PrivyBridgeProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<PrivyBridgeValue>(PRIVY_BRIDGE_DEFAULTS);
  const [loadRequested, setLoadRequested] = useState(false);
  const setter = useCallback((v: PrivyBridgeValue) => setValue(v), []);
  const loadPrivy = useCallback(() => setLoadRequested(true), []);

  return (
    <PrivyBridgeSetterContext.Provider value={setter}>
      <LoadPrivyContext.Provider value={loadPrivy}>
        <PrivyLoadRequestedContext.Provider value={loadRequested}>
          <PrivyBridgeContext.Provider value={value}>{children}</PrivyBridgeContext.Provider>
        </PrivyLoadRequestedContext.Provider>
      </LoadPrivyContext.Provider>
    </PrivyBridgeSetterContext.Provider>
  );
}
