import { type Chain, createPublicClient, http } from "viem";
import { arbitrum, mainnet, optimism, sepolia } from "viem/chains";

export type SupportedChainName = "optimism" | "arbitrum" | "mainnet" | "sepolia";

const CHAIN_MAP: Record<SupportedChainName, Chain> = {
  optimism,
  arbitrum,
  mainnet,
  sepolia,
};

/**
 * Get a viem Chain object by network name
 */
export function getChainByName(networkName: string): Chain {
  const chain = CHAIN_MAP[networkName as SupportedChainName];
  if (!chain) {
    return optimism; // Default fallback
  }
  return chain;
}

export const SUPPORTED_CHAINS = Object.values(CHAIN_MAP);

/**
 * Cache of public clients keyed by network name
 */
const publicClients = new Map<string, ReturnType<typeof createPublicClient>>();

/**
 * Get or create a cached public client for a network
 */
export function getPublicClient(networkName: string): ReturnType<typeof createPublicClient> {
  const existing = publicClients.get(networkName);
  if (existing) return existing;

  const chain = getChainByName(networkName);
  const client = createPublicClient({
    chain,
    transport: http(),
  });

  publicClients.set(networkName, client);
  return client;
}

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

/**
 * Get the browser's ethereum provider (e.g., MetaMask)
 */
export function getBrowserProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const win = window as unknown as { ethereum?: EthereumProvider };
  return win.ethereum;
}

/**
 * Request connected accounts from the browser provider
 */
export async function requestAccounts(provider: EthereumProvider): Promise<string[]> {
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  return accounts;
}

/**
 * Switch to a chain, adding it if necessary
 */
export async function switchOrAddChain(provider: EthereumProvider, chain: Chain): Promise<void> {
  const chainIdHex = `0x${chain.id.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: unknown) {
    const err = switchError as { code?: number };
    // Chain not added (4902) - add it
    if (err.code === 4902) {
      const rpcUrl = chain.rpcUrls.default.http[0];
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: chain.name,
            rpcUrls: rpcUrl ? [rpcUrl] : [],
            nativeCurrency: chain.nativeCurrency,
            blockExplorers: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : [],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}
