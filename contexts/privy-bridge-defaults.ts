import type { PrivyBridgeValue } from "./privy-bridge-context";

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
  walletsReady: false,
  smartWalletClient: null,
  isConnected: false,
};
