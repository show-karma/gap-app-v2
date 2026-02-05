import type { TNetwork } from "@show-karma/karma-gap-sdk";
import type { Chain } from "viem/chains";
import {
  arbitrum,
  base,
  baseSepolia,
  celo,
  lisk,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  scroll,
  sei,
  sepolia,
} from "viem/chains";

const includeTestNetworks = process.env.NEXT_PUBLIC_ENV !== "production";

const productionNetworks: Chain[] = [
  mainnet,
  optimism,
  arbitrum,
  base,
  celo,
  polygon,
  lisk,
  scroll,
  sei,
];

const nonProductionNetworks: Chain[] = [
  mainnet,
  optimism,
  arbitrum,
  base,
  celo,
  polygon,
  lisk,
  scroll,
  sei,
  optimismSepolia,
  baseSepolia,
  sepolia,
];

const configuredNetworks = includeTestNetworks ? nonProductionNetworks : productionNetworks;

export const appNetwork = configuredNetworks as [Chain, ...Chain[]];

/**
 * Networks supported by GAP SDK for project creation.
 * Filters out chains that are available for other features (e.g., donations)
 * but cannot be used for creating projects/attestations.
 */
const gapUnsupportedChainIds: number[] = [mainnet.id];

export const gapSupportedNetworks = appNetwork.filter(
  (chain) => !gapUnsupportedChainIds.includes(chain.id)
) as [Chain, ...Chain[]];

/**
 * Networks where projects can configure payout addresses for donations.
 * Currently the same as gapSupportedNetworks, but separated for semantic clarity.
 */
export const PAYOUT_CHAINS = gapSupportedNetworks;

export function getExplorerUrl(chainId: number, transactionHash: string) {
  const chain = [
    mainnet,
    optimism,
    arbitrum,
    base,
    celo,
    polygon,
    optimismSepolia,
    baseSepolia,
    sepolia,
    lisk,
    scroll,
    sei,
  ].find((c) => c.id === chainId);
  if (!chain || !chain.blockExplorers?.default?.url) {
    // Return a fallback block explorer URL if the chain or its explorer is not found
    return `https://www.oklink.com/multi-search#key=${transactionHash}`;
  }
  return `${chain.blockExplorers.default.url}/tx/${transactionHash}`;
}

/**
 * Mapping of network names (lowercase) to chain IDs.
 * Comprehensive lookup table supporting various name formats.
 * Used for onramp providers that return network names as strings.
 */
export const NETWORK_CHAIN_IDS: Record<string, number> = {
  // Ethereum mainnet
  mainnet: 1,
  ethereum: 1,
  // Optimism
  optimism: 10,
  "op mainnet": 10,
  // Arbitrum
  arbitrum: 42161,
  "arbitrum-one": 42161,
  arbitrumone: 42161,
  // Base
  base: 8453,
  // Polygon
  polygon: 137,
  matic: 137,
  // Celo
  celo: 42220,
  // Sei
  sei: 1329,
  // Lisk
  lisk: 1135,
  // Scroll
  scroll: 534352,
  // Testnets
  sepolia: 11155111,
  "optimism-sepolia": 11155420,
  "optimism sepolia": 11155420,
  optimismsepolia: 11155420,
  optimismgoerli: 420,
  "optimism goerli": 420,
  "optimism-goerli": 420,
  "base-sepolia": 84532,
  "base sepolia": 84532,
  basesepolia: 84532,
};

export function getChainIdByName(name: string): number {
  const normalized = name.toLowerCase();
  return NETWORK_CHAIN_IDS[normalized] ?? appNetwork[0].id;
}

export function getChainNameById(id: number): TNetwork {
  switch (id) {
    case 1:
      return "mainnet" as TNetwork;
    case 10:
      return "optimism";
    case 42161:
      return "arbitrum";
    case 8453:
      return "base" as TNetwork;
    case 42220:
      return "celo";
    case 137:
      return "polygon" as TNetwork;
    case 11155420:
      return "optimism-sepolia";
    case 11155111:
      return "sepolia";
    case 84532:
      return "base-sepolia";
    case 1135:
      return "lisk";
    case 534352:
      return "scroll";
    case 1329:
      return "sei" as TNetwork;
    default: {
      const network = appNetwork[0].name;
      return getChainNameById(getChainIdByName(network));
    }
  }
}
