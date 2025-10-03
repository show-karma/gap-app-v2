export interface SupportedToken {
  symbol: string;
  name: string;
  address: string; // Use "native" for ETH
  decimals: number;
  chainId: number;
  chainName: string;
  isNative: boolean;
  logoUrl?: string;
}

export interface NetworkConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

const includeTestNetworks = process.env.NEXT_PUBLIC_ENV !== "production";

// Network configurations
const MAINNET_NETWORKS: Record<number, NetworkConfig> = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    chainName: "Ethereum",
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/your-api-key",
    blockExplorer: "https://etherscan.io",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 }
  },
  
  // Optimism
  10: {
    chainId: 10,
    chainName: "Optimism",
    rpcUrl: "https://opt-mainnet.g.alchemy.com/v2/your-api-key",
    blockExplorer: "https://optimistic.etherscan.io",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 }
  },
  
  // Arbitrum One
  42161: {
    chainId: 42161,
    chainName: "Arbitrum One",
    rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/your-api-key",
    blockExplorer: "https://arbiscan.io",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 }
  },
  
  // Base
  8453: {
    chainId: 8453,
    chainName: "Base",
    rpcUrl: "https://base-mainnet.g.alchemy.com/v2/your-api-key",
    blockExplorer: "https://basescan.org",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 }
  },
  
  // Celo
  42220: {
    chainId: 42220,
    chainName: "Celo",
    rpcUrl: "https://forno.celo.org",
    blockExplorer: "https://celoscan.io",
    nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 }
  },
  
  // Polygon
  137: {
    chainId: 137,
    chainName: "Polygon",
    rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/your-api-key",
    blockExplorer: "https://polygonscan.com",
    nativeCurrency: { name: "Matic", symbol: "MATIC", decimals: 18 }
  }
};

const TEST_NETWORKS: Record<number, NetworkConfig> = {
  // Ethereum Sepolia
  11155111: {
    chainId: 11155111,
    chainName: "Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    blockExplorer: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 }
  },

  // Optimism Sepolia
  11155420: {
    chainId: 11155420,
    chainName: "Optimism Sepolia",
    rpcUrl: "https://sepolia.optimism.io",
    blockExplorer: "https://sepolia-optimism.etherscan.io",
    nativeCurrency: { name: "Optimism Sepolia Ether", symbol: "ETH", decimals: 18 }
  },

  // Base Sepolia
  84532: {
    chainId: 84532,
    chainName: "Base Sepolia",
    rpcUrl: "https://base-sepolia.blockpi.network/v1/rpc/public",
    blockExplorer: "https://sepolia.basescan.org",
    nativeCurrency: { name: "Base Sepolia Ether", symbol: "ETH", decimals: 18 }
  }
};

export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = includeTestNetworks
  ? { ...MAINNET_NETWORKS, ...TEST_NETWORKS }
  : MAINNET_NETWORKS;

// Supported tokens configuration
export const SUPPORTED_TOKENS: SupportedToken[] = [
  // USDT - All 6 networks
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    chainId: 1,
    chainName: "Ethereum",
    isNative: false
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    decimals: 6,
    chainId: 42161,
    chainName: "Arbitrum One",
    isNative: false
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    decimals: 6,
    chainId: 8453,
    chainName: "Base",
    isNative: false
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    decimals: 6,
    chainId: 42220,
    chainName: "Celo",
    isNative: false
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 6,
    chainId: 137,
    chainName: "Polygon",
    isNative: false
  },

  // USDC - All 6 networks
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xA0b86a33E6417c8f2bbD1c7E2e1a6D8Eb6F0aB0F",
    decimals: 6,
    chainId: 1,
    chainName: "Ethereum",
    isNative: false
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    decimals: 6,
    chainId: 10,
    chainName: "Optimism",
    isNative: false
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    decimals: 6,
    chainId: 42161,
    chainName: "Arbitrum One",
    isNative: false
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    chainId: 8453,
    chainName: "Base",
    isNative: false
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xef4229c8c3250C675F21BCefa42f58EfbfF6002a",
    decimals: 6,
    chainId: 42220,
    chainName: "Celo",
    isNative: false
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    decimals: 6,
    chainId: 137,
    chainName: "Polygon",
    isNative: false
  },

  // cUSD - Celo only
  {
    symbol: "cUSD",
    name: "Celo Dollar",
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    decimals: 18,
    chainId: 42220,
    chainName: "Celo",
    isNative: false
  },

  // USDGLO - All 6 networks (placeholder addresses - need actual deployment addresses)
  {
    symbol: "USDGLO",
    name: "USD Global",
    address: "0x4F604735c1cF31399C6E711D5962b2B3E0225AD3",
    decimals: 18,
    chainId: 1,
    chainName: "Ethereum",
    isNative: false
  },
  {
    symbol: "USDGLO",
    name: "USD Global",
    address: "0x4F604735c1cF31399C6E711D5962b2B3E0225AD3",
    decimals: 18,
    chainId: 10,
    chainName: "Optimism",
    isNative: false
  },
  {
    symbol: "USDGLO",
    name: "USD Global",
    address: "0x4F604735c1cF31399C6E711D5962b2B3E0225AD3",
    decimals: 18,
    chainId: 42161,
    chainName: "Arbitrum One",
    isNative: false
  },
  {
    symbol: "USDGLO",
    name: "USD Global",
    address: "0x4F604735c1cF31399C6E711D5962b2B3E0225AD3",
    decimals: 18,
    chainId: 8453,
    chainName: "Base",
    isNative: false
  },
  {
    symbol: "USDGLO",
    name: "USD Global",
    address: "0x4F604735c1cF31399C6E711D5962b2B3E0225AD3",
    decimals: 18,
    chainId: 42220,
    chainName: "Celo",
    isNative: false
  },
  {
    symbol: "USDGLO",
    name: "USD Global",
    address: "0x4F604735c1cF31399C6E711D5962b2B3E0225AD3",
    decimals: 18,
    chainId: 137,
    chainName: "Polygon",
    isNative: false
  },

  // Native tokens
  // ETH - Ethereum, Optimism, Arbitrum, Base
  {
    symbol: "ETH",
    name: "Ethereum",
    address: "native",
    decimals: 18,
    chainId: 1,
    chainName: "Ethereum",
    isNative: true
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    address: "native",
    decimals: 18,
    chainId: 10,
    chainName: "Optimism",
    isNative: true
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    address: "native",
    decimals: 18,
    chainId: 42161,
    chainName: "Arbitrum One",
    isNative: true
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    address: "native",
    decimals: 18,
    chainId: 8453,
    chainName: "Base",
    isNative: true
  },

  // WETH - All 6 networks
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    chainId: 1,
    chainName: "Ethereum",
    isNative: false
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
    chainId: 10,
    chainName: "Optimism",
    isNative: false
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    decimals: 18,
    chainId: 42161,
    chainName: "Arbitrum One",
    isNative: false
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
    chainId: 8453,
    chainName: "Base",
    isNative: false
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    address: "0x66803FB87aBd4aaC3cbB3fAd7C3aa01f6F3FB207",
    decimals: 18,
    chainId: 42220,
    chainName: "Celo",
    isNative: false
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    decimals: 18,
    chainId: 137,
    chainName: "Polygon",
    isNative: false
  },

  // CELO - Celo native
  {
    symbol: "CELO",
    name: "Celo",
    address: "native",
    decimals: 18,
    chainId: 42220,
    chainName: "Celo",
    isNative: true
  },

  // MATIC - Polygon native
  {
    symbol: "MATIC",
    name: "Polygon",
    address: "native",
    decimals: 18,
    chainId: 137,
    chainName: "Polygon",
    isNative: true
  },

  // Network-specific tokens
  // OP - Optimism
  {
    symbol: "OP",
    name: "Optimism",
    address: "0x4200000000000000000000000000000000000042",
    decimals: 18,
    chainId: 10,
    chainName: "Optimism",
    isNative: false
  },

  // ARB - Arbitrum
  {
    symbol: "ARB",
    name: "Arbitrum",
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    decimals: 18,
    chainId: 42161,
    chainName: "Arbitrum One",
    isNative: false
  },

  // POL - Polygon (new token)
  {
    symbol: "POL",
    name: "Polygon Ecosystem Token",
    address: "0x455e53CFB9f8F7a8E8fDc0FA1F5EA7e7c75eD9B1",
    decimals: 18,
    chainId: 137,
    chainName: "Polygon",
    isNative: false
  }
];

const TEST_NETWORK_TOKENS: SupportedToken[] = [
  // Native ETH tokens for test networks
  {
    symbol: "ETH",
    name: "Sepolia Ether",
    address: "native",
    decimals: 18,
    chainId: 11155111,
    chainName: "Sepolia",
    isNative: true,
  },
  {
    symbol: "ETH",
    name: "Optimism Sepolia Ether",
    address: "native",
    decimals: 18,
    chainId: 11155420,
    chainName: "Optimism Sepolia",
    isNative: true,
  },
  {
    symbol: "ETH",
    name: "Base Sepolia Ether",
    address: "native",
    decimals: 18,
    chainId: 84532,
    chainName: "Base Sepolia",
    isNative: true,
  },

  // USDC test tokens (official Circle addresses)
  {
    symbol: "USDC",
    name: "USD Coin (Test)",
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    decimals: 6,
    chainId: 11155111,
    chainName: "Sepolia",
    isNative: false,
  },
  {
    symbol: "USDC",
    name: "USD Coin (Test)",
    address: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    decimals: 6,
    chainId: 11155420,
    chainName: "Optimism Sepolia",
    isNative: false,
  },
  {
    symbol: "USDC",
    name: "USD Coin (Test)",
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    decimals: 6,
    chainId: 84532,
    chainName: "Base Sepolia",
    isNative: false,
  },
];

if (includeTestNetworks) {
  SUPPORTED_TOKENS.push(...TEST_NETWORK_TOKENS);
}

// Helper functions
export function getTokensByChain(chainId: number): SupportedToken[] {
  return SUPPORTED_TOKENS.filter(token => token.chainId === chainId);
}

export function getTokenBySymbolAndChain(symbol: string, chainId: number): SupportedToken | undefined {
  return SUPPORTED_TOKENS.find(token => 
    token.symbol === symbol && token.chainId === chainId
  );
}

export function getAllSupportedChains(): number[] {
  return Object.keys(SUPPORTED_NETWORKS).map(Number);
}

export function isChainSupported(chainId: number): boolean {
  return chainId in SUPPORTED_NETWORKS;
}

export function getNetworkConfig(chainId: number): NetworkConfig | undefined {
  return SUPPORTED_NETWORKS[chainId];
}
