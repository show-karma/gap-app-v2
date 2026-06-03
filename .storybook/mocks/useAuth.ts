import type { Hex } from "viem";

/** Storybook stub — authenticated viewer for EFP stories. */
export const STORYBOOK_VIEWER_ADDRESS = "0xcccccccccccccccccccccccccccccccccccccccc" as Hex;

export function useAuth() {
  return {
    authenticate: async () => {},
    disconnect: async () => {},
    ready: true,
    authenticated: true,
    isConnected: true,
    user: null,
    address: STORYBOOK_VIEWER_ADDRESS,
    primaryWallet: null,
    wallets: [],
    login: async () => {},
    logout: async () => {},
    getAccessToken: async () => null,
    connectWallet: async () => {},
    isAuthenticated: true,
    isReady: true,
  };
}
