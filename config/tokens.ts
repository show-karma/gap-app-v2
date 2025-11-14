// Token contract addresses for supported networks
export const TOKEN_ADDRESSES = {
  // USDC contract addresses
  usdc: {
    // Celo Mainnet
    42220: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const,
    // Arbitrum One
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const,
    // Optimism
    10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as const,
  },
} as const

// Network information
export const NETWORKS = {
  42220: {
    name: "Celo",
    chainId: 42220,
    rpcUrl: "https://forno.celo.org",
    blockExplorer: "https://celoscan.io",
  },
  42161: {
    name: "Arbitrum",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io",
  },
  10: {
    name: "Optimism",
    chainId: 10,
    rpcUrl: "https://mainnet.optimism.io",
    blockExplorer: "https://optimistic.etherscan.io",
  },
} as const

// Token information
export const TOKENS = {
  usdc: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
} as const

export type SupportedChainId = keyof typeof NETWORKS
export type SupportedToken = keyof typeof TOKEN_ADDRESSES
