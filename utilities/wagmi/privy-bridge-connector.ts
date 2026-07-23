import type { ConnectedWallet } from "@privy-io/react-auth";
import { createConnector } from "@wagmi/core";
import { type EIP1193Provider, SwitchChainError } from "viem";
import type { Chain } from "viem/chains";
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

  // Shared chain-switch flow used by both connect({ chainId }) and switchChain.
  // Validates the target is in appNetwork, then tries Privy's wallet.switchChain.
  // Only on Privy's specific "Unable to determine current chainId." lookup
  // failure does it fall back to a direct wallet_switchEthereumChain RPC on
  // the cached proxyProvider (which does not consult Privy's internal wallet
  // store). Callers update currentChainId and emit "change" as appropriate.
  const performSwitch = async (targetChainId: number): Promise<Chain> => {
    const chain = appNetwork.find((c) => c.id === targetChainId);
    if (!chain) {
      throw new SwitchChainError(new Error(`Unsupported chainId: ${targetChainId}`));
    }
    try {
      await wallet.switchChain(targetChainId);
    } catch (err) {
      if (!isPrivyChainIdLookupError(err)) throw err;
      // Surface a signal so a future change in Privy's error wording — which
      // would silently disable this fallback — is at least visible in logs.
      console.warn(
        "[privy-bridge] Privy wallet.switchChain lookup failed; dispatching wallet_switchEthereumChain via provider"
      );
      const provider = currentProvider ?? ((await wallet.getEthereumProvider()) as EIP1193Provider);
      currentProvider = provider;
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    }
    return chain;
  };

  return createConnector((config) => ({
    id: "privy-bridge",
    name: "Privy",
    type: "privy-bridge" as const,

    async connect(params?) {
      const targetChainId = params?.chainId;
      if (targetChainId && targetChainId !== currentChainId) {
        await performSwitch(targetChainId);
        currentChainId = targetChainId;
      }
      currentProvider = (await wallet.getEthereumProvider()) as EIP1193Provider;
      const accounts = [wallet.address as `0x${string}`];
      return {
        // wagmi's connect() return type is conditional on `withCapabilities`;
        // `as never` mirrors the typing pattern used by wagmi's own connectors.
        accounts: (params?.withCapabilities
          ? accounts.map((address) => ({ address, capabilities: {} }))
          : accounts) as never,
        chainId: currentChainId,
      };
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
      const chain = await performSwitch(targetChainId);
      currentChainId = targetChainId;
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

function isPrivyChainIdLookupError(err: unknown): boolean {
  return err instanceof Error && err.message === "Unable to determine current chainId.";
}
