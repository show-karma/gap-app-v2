import type { ConnectedWallet } from "@privy-io/react-auth";
import { createConnector } from "@wagmi/core";
import type { EIP1193Provider } from "viem";
import { appNetwork } from "@/utilities/network";

/**
 * A wagmi connector that bridges a Privy wallet to wagmi's outer config.
 *
 * The app uses two WagmiProviders: an outer one (minimalWagmiConfig, wraps the app)
 * and an inner one (@privy-io/wagmi, sidecar for Privy sync). Components calling
 * useAccount() read from the outer config, which has no Privy connector — so
 * address is undefined until this bridge connector is connected.
 *
 * When PrivyBridgeUpdater detects a connected wallet, it creates this connector
 * and connects it to the outer config, making address available to all consumers.
 */
export function privyBridgeConnector(wallet: ConnectedWallet, initialChainId: number) {
  let currentProvider: EIP1193Provider | null = null;
  let currentChainId = initialChainId;

  return createConnector((config) => ({
    id: "privy-bridge",
    name: "Privy",
    type: "privy-bridge" as const,

    async connect(params?) {
      const targetChainId = params?.chainId;
      if (targetChainId && targetChainId !== currentChainId) {
        await wallet.switchChain(targetChainId);
        currentChainId = targetChainId;
      }
      currentProvider = (await wallet.getEthereumProvider()) as EIP1193Provider;
      return {
        accounts: [wallet.address as `0x${string}`],
        chainId: currentChainId,
      } as any;
    },

    async disconnect() {
      currentProvider = null;
    },

    async getAccounts() {
      return [wallet.address as `0x${string}`];
    },

    async getChainId() {
      return currentChainId;
    },

    async getProvider() {
      if (!currentProvider) {
        currentProvider = (await wallet.getEthereumProvider()) as EIP1193Provider;
      }
      return currentProvider;
    },

    async isAuthorized() {
      return true;
    },

    async switchChain({ chainId: targetChainId }) {
      await wallet.switchChain(targetChainId);
      currentChainId = targetChainId;
      const chain = appNetwork.find((c) => c.id === targetChainId) || appNetwork[0];
      config.emitter.emit("change", { chainId: targetChainId });
      return chain;
    },

    onAccountsChanged(accounts) {
      config.emitter.emit("change", {
        accounts: accounts as `0x${string}`[],
      });
    },

    onChainChanged(chainIdHex) {
      const id = Number(chainIdHex);
      currentChainId = id;
      config.emitter.emit("change", { chainId: id });
    },

    onDisconnect() {
      config.emitter.emit("disconnect");
    },
  }));
}
