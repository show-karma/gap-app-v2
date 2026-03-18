"use client";

/**
 * Bridge between the deferred Privy SDK and the rest of the app.
 *
 * Architecture:
 *   PrivyBridgeContext.Provider (always in tree, stable position)
 *     ├── PrivySidecar (sibling, renders null, pushes values via setState)
 *     └── children (never moves in the tree, never re-mounts)
 *
 * Before the Privy SDK loads, consumers get safe defaults (ready=false).
 * Once PrivySidecar mounts inside PrivyProvider, it reads usePrivy() /
 * useWallets() / useAccount() and calls setBridge() to update the context.
 * Children re-render (context value changed) but never re-mount.
 */
/**
 * Privy types are imported as `type` to avoid pulling the Privy SDK
 * into the initial bundle. Only the type information is used — the
 * actual values come from PrivySidecar at runtime.
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

const PrivyBridgeContext = createContext<PrivyBridgeValue>(PRIVY_BRIDGE_DEFAULTS);
const PrivyBridgeSetterContext = createContext<(v: PrivyBridgeValue) => void>(noop);

export function usePrivyBridge(): PrivyBridgeValue {
  return useContext(PrivyBridgeContext);
}

export function usePrivyBridgeSetter(): (v: PrivyBridgeValue) => void {
  return useContext(PrivyBridgeSetterContext);
}

/**
 * Provider that holds bridge state. Wrap the app once at the root.
 * The setter is exposed via a separate context so PrivySidecar can
 * push values without being a descendant of PrivyBridgeContext.Provider.
 */
export function PrivyBridgeProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<PrivyBridgeValue>(PRIVY_BRIDGE_DEFAULTS);

  // Stable reference — never causes PrivySidecar to re-render
  const setter = useCallback((v: PrivyBridgeValue) => setValue(v), []);

  return (
    <PrivyBridgeSetterContext.Provider value={setter}>
      <PrivyBridgeContext.Provider value={value}>{children}</PrivyBridgeContext.Provider>
    </PrivyBridgeSetterContext.Provider>
  );
}
