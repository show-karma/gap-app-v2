import type { Address } from "viem";
import { getContract } from "viem";
import { getRPCClient } from "@/utilities/rpcClient";

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
}

// Standard ERC20 ABI for token information
const ERC20_ABI = [
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name", 
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view", 
    "type": "function"
  }
] as const;

// Well-known native token addresses (zero address represents native token)
const NATIVE_TOKENS: Record<number, TokenInfo> = {
  // Mainnet chains
  1: { address: "0x0000000000000000000000000000000000000000" as Address, symbol: "ETH", name: "Ethereum", decimals: 18 },
  10: { address: "0x0000000000000000000000000000000000000000" as Address, symbol: "ETH", name: "Ethereum", decimals: 18 },
  42161: { address: "0x0000000000000000000000000000000000000000" as Address, symbol: "ETH", name: "Ethereum", decimals: 18 },
  42220: { address: "0x0000000000000000000000000000000000000000" as Address, symbol: "CELO", name: "Celo", decimals: 18 },
  8453: { address: "0x0000000000000000000000000000000000000000" as Address, symbol: "ETH", name: "Ethereum", decimals: 18 },
  
  // Testnet chains
  11155111: { address: "0x0000000000000000000000000000000000000000" as Address, symbol: "ETH", name: "Ethereum", decimals: 18 },
  11155420: { address: "0x0000000000000000000000000000000000000000" as Address, symbol: "ETH", name: "Ethereum", decimals: 18 },
  84532: { address: "0x0000000000000000000000000000000000000000" as Address, symbol: "ETH", name: "Ethereum", decimals: 18 },
};

// Well-known token addresses for common tokens
const WELL_KNOWN_TOKENS: Record<number, Record<string, TokenInfo>> = {
  // Ethereum Mainnet
  1: {
    "0xa0b86a33e6ba8d5c5b3b7b7a0c0a2d2d2d2d2d2d": { address: "0xa0b86a33e6ba8d5c5b3b7b7a0c0a2d2d2d2d2d2d" as Address, symbol: "USDC", name: "USD Coin", decimals: 6 },
    "0xdac17f958d2ee523a2206206994597c13d831ec7": { address: "0xdac17f958d2ee523a2206206994597c13d831ec7" as Address, symbol: "USDT", name: "Tether USD", decimals: 6 },
  },
  
  // Optimism
  10: {
    "0x7f5c764cbc4f41c5eff24c506a1f3d4b7e6b94f0": { address: "0x7f5c764cbc4f41c5eff24c506a1f3d4b7e6b94f0" as Address, symbol: "USDC", name: "USD Coin", decimals: 6 },
    "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58": { address: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58" as Address, symbol: "USDT", name: "Tether USD", decimals: 6 },
  },
  
  // Arbitrum
  42161: {
    "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8": { address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8" as Address, symbol: "USDC", name: "USD Coin", decimals: 6 },
    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": { address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9" as Address, symbol: "USDT", name: "Tether USD", decimals: 6 },
  },
  
  // Celo
  42220: {
    "0x765de816845861e75a25fca122bb6898b8b1282a": { address: "0x765de816845861e75a25fca122bb6898b8b1282a" as Address, symbol: "cUSD", name: "Celo Dollar", decimals: 18 },
    "0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73": { address: "0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73" as Address, symbol: "cEUR", name: "Celo Euro", decimals: 18 },
  }
};

/**
 * Check if a token address represents the native token (zero address)
 */
function isNativeToken(tokenAddress: Address): boolean {
  return tokenAddress === "0x0000000000000000000000000000000000000000" ||
         tokenAddress === "0x0000000000000000000000000000000000000001";
}

/**
 * Get token information from contract or well-known list
 */
export async function getTokenInfo(tokenAddress: Address, chainId: number): Promise<TokenInfo> {
  console.log(`Getting token info for ${tokenAddress} on chain ${chainId}`);
  
  // Check if it's the native token
  if (isNativeToken(tokenAddress)) {
    const nativeToken = NATIVE_TOKENS[chainId];
    if (nativeToken) {
      console.log(`Found native token: ${nativeToken.symbol}`);
      return nativeToken;
    }
  }
  
  // Check well-known tokens first
  const chainTokens = WELL_KNOWN_TOKENS[chainId];
  if (chainTokens) {
    const knownToken = chainTokens[tokenAddress.toLowerCase()];
    if (knownToken) {
      console.log(`Found well-known token: ${knownToken.symbol}`);
      return knownToken;
    }
  }
  
  // Fetch from contract
  try {
    const client = await getRPCClient(chainId);
    const tokenContract = getContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      client,
    });
    
    console.log("Fetching token info from contract...");
    
    // Fetch token details in parallel
    const [symbol, name, decimals] = await Promise.all([
      tokenContract.read.symbol() as Promise<string>,
      tokenContract.read.name() as Promise<string>,
      tokenContract.read.decimals() as Promise<number>,
    ]);
    
    const tokenInfo: TokenInfo = {
      address: tokenAddress,
      symbol,
      name,
      decimals,
    };
    
    console.log(`Fetched token info from contract:`, tokenInfo);
    return tokenInfo;
    
  } catch (error) {
    console.error("Error fetching token info from contract:", error);
    
    // Fallback: return generic token info
    return {
      address: tokenAddress,
      symbol: "TOKEN",
      name: "Unknown Token",
      decimals: 18,
    };
  }
}

/**
 * Get multiple token infos efficiently
 */
export async function getTokenInfos(tokenAddresses: Address[], chainId: number): Promise<TokenInfo[]> {
  const promises = tokenAddresses.map(address => getTokenInfo(address, chainId));
  return Promise.all(promises);
}

/**
 * Format token amount with proper decimals and symbol
 */
export function formatTokenAmount(amount: bigint, tokenInfo: TokenInfo): string {
  const divisor = BigInt(10 ** tokenInfo.decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  if (fractionalPart === BigInt(0)) {
    return `${wholePart} ${tokenInfo.symbol}`;
  }
  
  // Convert fractional part to string with proper padding
  const fractionalStr = fractionalPart.toString().padStart(tokenInfo.decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  if (trimmedFractional === '') {
    return `${wholePart} ${tokenInfo.symbol}`;
  }
  
  return `${wholePart}.${trimmedFractional} ${tokenInfo.symbol}`;
}

/**
 * Parse token amount string to bigint with proper decimals
 */
export function parseTokenAmount(amount: string, tokenInfo: TokenInfo): bigint {
  const multiplier = BigInt(10 ** tokenInfo.decimals);
  const [wholePart, fractionalPart = ''] = amount.split('.');
  
  const wholeBI = BigInt(wholePart) * multiplier;
  
  if (fractionalPart === '') {
    return wholeBI;
  }
  
  // Pad or truncate fractional part to match decimals
  const paddedFractional = fractionalPart.padEnd(tokenInfo.decimals, '0').slice(0, tokenInfo.decimals);
  const fractionalBI = BigInt(paddedFractional);
  
  return wholeBI + fractionalBI;
} 