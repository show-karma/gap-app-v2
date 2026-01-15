// Token contract addresses for supported networks
export const TOKEN_ADDRESSES = {
  // USDC contract addresses
  usdc: {
    // Ethereum Mainnet
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const,
    // Optimism
    10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as const,
    // Polygon
    137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as const,
    // Base
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
    // Arbitrum One
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const,
    // Celo Mainnet
    42220: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const,
    // Scroll
    534352: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4" as const,
    // Sei
    1329: "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1" as const,
    // Lisk
    1135: "0xF242275d3a6527d877f2c927a82D9b057609cc71" as const,
    // OP Sepolia (testnet USDC)
    11155420: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7" as const,
    // Base Sepolia (testnet USDC)
    84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const,
  },
} as const;

// Network information
export const NETWORKS = {
  1: {
    name: "Ethereum",
    chainId: 1,
    shortName: "eth",
    rpcUrl: "https://eth.llamarpc.com",
    blockExplorer: "https://etherscan.io",
    isTestnet: false,
  },
  10: {
    name: "Optimism",
    chainId: 10,
    shortName: "oeth",
    rpcUrl: "https://mainnet.optimism.io",
    blockExplorer: "https://optimistic.etherscan.io",
    isTestnet: false,
  },
  137: {
    name: "Polygon",
    chainId: 137,
    shortName: "matic",
    rpcUrl: "https://polygon-rpc.com",
    blockExplorer: "https://polygonscan.com",
    isTestnet: false,
  },
  8453: {
    name: "Base",
    chainId: 8453,
    shortName: "base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    isTestnet: false,
  },
  42161: {
    name: "Arbitrum",
    chainId: 42161,
    shortName: "arb1",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io",
    isTestnet: false,
  },
  42220: {
    name: "Celo",
    chainId: 42220,
    shortName: "celo",
    rpcUrl: "https://forno.celo.org",
    blockExplorer: "https://celoscan.io",
    isTestnet: false,
  },
  534352: {
    name: "Scroll",
    chainId: 534352,
    shortName: "scr",
    rpcUrl: "https://rpc.scroll.io",
    blockExplorer: "https://scrollscan.com",
    isTestnet: false,
  },
  1329: {
    name: "Sei",
    chainId: 1329,
    shortName: "sei",
    rpcUrl: "https://evm-rpc.sei-apis.com",
    blockExplorer: "https://seitrace.com",
    isTestnet: false,
  },
  1135: {
    name: "Lisk",
    chainId: 1135,
    shortName: "lisk",
    rpcUrl: "https://lisk.drpc.org",
    blockExplorer: "https://blockscout.lisk.com",
    isTestnet: false,
  },
  // Testnets
  11155111: {
    name: "Sepolia",
    chainId: 11155111,
    shortName: "sep",
    rpcUrl: "https://rpc.sepolia.org",
    blockExplorer: "https://sepolia.etherscan.io",
    isTestnet: true,
  },
  11155420: {
    name: "OP Sepolia",
    chainId: 11155420,
    shortName: "oeth-sep",
    rpcUrl: "https://sepolia.optimism.io",
    blockExplorer: "https://sepolia-optimism.etherscan.io",
    isTestnet: true,
  },
  84532: {
    name: "Base Sepolia",
    chainId: 84532,
    shortName: "basesep",
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia.basescan.org",
    isTestnet: true,
  },
} as const;

// Token information
export const TOKENS = {
  usdc: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
} as const;

// Native token information per network
export const NATIVE_TOKENS: Record<number, { symbol: string; decimals: number; coingeckoId: string }> = {
  1: {
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  10: {
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  137: {
    symbol: "POL",
    decimals: 18,
    coingeckoId: "matic-network",
  },
  8453: {
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  42161: {
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  42220: {
    symbol: "CELO",
    decimals: 18,
    coingeckoId: "celo",
  },
  534352: {
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  1329: {
    symbol: "SEI",
    decimals: 18,
    coingeckoId: "sei-network",
  },
  1135: {
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  // Testnets
  11155111: {
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  11155420: {
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  84532: {
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
  },
};

export type SupportedChainId = keyof typeof NETWORKS;
export type SupportedToken = keyof typeof TOKEN_ADDRESSES;

/** Helper to get native token symbol for a chain */
export function getNativeTokenSymbol(chainId: number): string {
  return NATIVE_TOKENS[chainId]?.symbol || "ETH";
}

/** Helper to check if USDC is available on a chain */
export function hasUSDC(chainId: number): boolean {
  return chainId in TOKEN_ADDRESSES.usdc;
}

/** Helper to get networks filtered by environment */
export function getAvailableNetworks(includeTestnets: boolean = false) {
  return Object.entries(NETWORKS)
    .filter(([, network]) => includeTestnets || !network.isTestnet)
    .map(([id, network]) => ({
      id: Number(id) as SupportedChainId,
      name: network.name,
      isTestnet: network.isTestnet,
    }));
}

/** Check if a network is a testnet */
export function isTestnet(chainId: number): boolean {
  return NETWORKS[chainId as SupportedChainId]?.isTestnet ?? false;
}
