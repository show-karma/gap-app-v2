export type GapNetworkName =
  | "mainnet"
  | "optimism"
  | "arbitrum"
  | "base"
  | "celo"
  | "polygon"
  | "optimism-sepolia"
  | "sepolia"
  | "base-sepolia"
  | "lisk"
  | "scroll"
  | "sei";

const DEFAULT_CHAIN_ID = 1;
const DEFAULT_CHAIN_NAME: GapNetworkName = "mainnet";

const CHAIN_EXPLORER_BASE_URLS: Record<number, string> = {
  1: "https://etherscan.io",
  10: "https://optimistic.etherscan.io",
  137: "https://polygonscan.com",
  1135: "https://blockscout.lisk.com",
  1329: "https://seitrace.com",
  8453: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
  42220: "https://celoscan.io",
  42161: "https://arbiscan.io",
  534352: "https://scrollscan.com",
  11155111: "https://sepolia.etherscan.io",
  11155420: "https://optimism-sepolia.blockscout.com",
};

const CHAIN_NAME_BY_ID: Record<number, GapNetworkName> = {
  1: "mainnet",
  10: "optimism",
  137: "polygon",
  1135: "lisk",
  1329: "sei",
  8453: "base",
  84532: "base-sepolia",
  42220: "celo",
  42161: "arbitrum",
  534352: "scroll",
  11155111: "sepolia",
  11155420: "optimism-sepolia",
};

export function getExplorerUrl(chainId: number, transactionHash: string) {
  const explorerBaseUrl = CHAIN_EXPLORER_BASE_URLS[chainId];
  if (!explorerBaseUrl) {
    // Return a fallback block explorer URL if the chain or its explorer is not found
    return `https://www.oklink.com/multi-search#key=${transactionHash}`;
  }
  return `${explorerBaseUrl}/tx/${transactionHash}`;
}

/**
 * Mapping of network names (lowercase) to chain IDs.
 * Used for onramp providers that return network names as strings.
 */
export const NETWORK_CHAIN_IDS: Record<string, number> = {
  base: 8453,
  ethereum: 1,
  mainnet: 1,
  polygon: 137,
  optimism: 10,
  arbitrum: 42161,
  avalanche: 43114,
};

export function getChainIdByName(name: string): number {
  switch (name.toLowerCase()) {
    case "mainnet":
    case "ethereum":
      return 1;
    case "op mainnet":
    case "optimism":
      return 10;
    case "arbitrum":
    case "arbitrum-one":
    case "arbitrumone":
      return 42161;
    case "base":
      return 8453;
    case "celo":
      return 42220;
    case "polygon":
    case "matic":
      return 137;
    case "optimismgoerli":
    case "optimism goerli":
    case "optimism-goerli":
      return 420;
    case "optimism sepolia":
    case "optimism-sepolia":
    case "optimismsepolia":
      return 11155420;
    case "sepolia":
      return 11155111;
    case "base-sepolia":
    case "base sepolia":
    case "basesepolia":
      return 84532;
    case "lisk":
      return 1135;
    case "scroll":
      return 534352;
    case "sei":
      return 1329;
    default:
      return DEFAULT_CHAIN_ID;
  }
}

export function getChainNameById(id: number): GapNetworkName {
  return CHAIN_NAME_BY_ID[id] ?? DEFAULT_CHAIN_NAME;
}
