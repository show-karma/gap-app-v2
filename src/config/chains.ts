export interface ChainConfig {
  id: number;
  name: string;
  image: string;
  rpcUrl?: string;
  explorerUrl?: string;
  currency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const chains: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: "Ethereum",
    image: "/images/networks/ethereum.svg",
    explorerUrl: "https://etherscan.io",
    currency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  10: {
    id: 10,
    name: "Optimism",
    image: "/images/networks/optimism.svg",
    explorerUrl: "https://optimistic.etherscan.io",
    currency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  1135: {
    id: 1135,
    name: "Lisk",
    image: "/images/networks/lisk.svg",
    currency: {
      name: "LSK",
      symbol: "LSK",
      decimals: 18,
    },
  },
  1329: {
    id: 1329,
    name: "Sei",
    image: "/images/networks/sei.svg",
    currency: {
      name: "SEI",
      symbol: "SEI",
      decimals: 18,
    },
  },
  1328: {
    id: 1328,
    name: "Sei Testnet",
    image: "/images/networks/sei.svg",
    currency: {
      name: "SEI",
      symbol: "SEI",
      decimals: 18,
    },
  },
  713715: {
    id: 713715,
    name: "Sei Devnet",
    image: "/images/networks/sei.svg",
    currency: {
      name: "SEI",
      symbol: "SEI",
      decimals: 18,
    },
  },
  42161: {
    id: 42161,
    name: "Arbitrum One",
    image: "/images/networks/arbitrum-one.svg",
    explorerUrl: "https://arbiscan.io",
    currency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  420: {
    id: 420,
    name: "Optimism Goerli",
    image: "/images/networks/optimism.svg",
    explorerUrl: "https://goerli-optimism.etherscan.io",
    currency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  11155111: {
    id: 11155111,
    name: "Sepolia",
    image: "/images/networks/ethereum.svg",
    explorerUrl: "https://sepolia.etherscan.io",
    currency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  11155420: {
    id: 11155420,
    name: "Optimism Sepolia",
    image: "/images/networks/optimism.svg",
    explorerUrl: "https://sepolia-optimism.etherscan.io",
    currency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  42220: {
    id: 42220,
    name: "CELO",
    image: "/images/networks/celo.svg",
    explorerUrl: "https://celoscan.io",
    currency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    },
  },
  44787: {
    id: 44787,
    name: "CELO Alfajores",
    image: "/images/networks/celo.svg",
    explorerUrl: "https://alfajores.celoscan.io",
    currency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    },
  },
  84532: {
    id: 84532,
    name: "Base Sepolia",
    image: "/images/networks/base.svg",
    explorerUrl: "https://sepolia.basescan.org",
    currency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  8453: {
    id: 8453,
    name: "Base",
    image: "/images/networks/base.svg",
    explorerUrl: "https://basescan.org",
    currency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  534352: {
    id: 534352,
    name: "Scroll",
    image: "/images/networks/scroll.svg",
    explorerUrl: "https://scrollscan.com",
    currency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

// Helper functions for backward compatibility
export const chainImgDictionary = (chainId: number): string => {
  return chains[chainId]?.image || "";
};

export const chainNameDictionary = (chainId: number): string => {
  return chains[chainId]?.name || "";
};