"use client";

import { createContext, useContext } from "react";

interface WalletConnectDeferContextValue {
  enableWalletConnect: () => void;
  walletConnectEnabled: boolean;
}

const NOOP = () => {};

const WalletConnectDeferContext = createContext<WalletConnectDeferContextValue>({
  enableWalletConnect: NOOP,
  walletConnectEnabled: false,
});

export function useWalletConnectDefer() {
  return useContext(WalletConnectDeferContext);
}

export { WalletConnectDeferContext };
