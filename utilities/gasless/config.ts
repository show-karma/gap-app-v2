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
import { envVars } from "../enviromentVars";
import type { ChainGaslessConfig, GaslessProviderType } from "./types";

/**
 * ZeroDev Project ID from environment.
 */
export const ZERODEV_PROJECT_ID = envVars.ZERODEV_PROJECT_ID || "";

/**
 * Alchemy Gas Manager Policy ID (shared across all Alchemy chains).
 */
export const ALCHEMY_POLICY_ID = envVars.ALCHEMY_POLICY_ID || "";

/**
 * Generates ZeroDev RPC URLs for a given chain.
 * Uses the v3 pattern: https://rpc.zerodev.app/api/v3/{projectId}/chain/{chainId}
 */
function getZeroDevRpcUrl(chainId: number): string {
  return `https://rpc.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}/chain/${chainId}`;
}

/**
 * Chain-specific gasless configuration.
 * Maps each chain to its provider and settings.
 *
 * To add a new chain:
 * 1. Add the chain import from viem/chains
 * 2. Add configuration entry with appropriate provider
 * 3. Ensure RPC URL is available in envVars
 */
export const CHAIN_GASLESS_CONFIG: Record<number, ChainGaslessConfig> = {
  // ============================================
  // MAINNETS
  // ============================================

  [optimism.id]: {
    provider: "zerodev",
    chain: optimism,
    rpcUrl: envVars.RPC.OPTIMISM,
    enabled: true,
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },

  [arbitrum.id]: {
    provider: "zerodev",
    chain: arbitrum,
    rpcUrl: envVars.RPC.ARBITRUM,
    enabled: true,
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },

  [base.id]: {
    provider: "zerodev",
    chain: base,
    rpcUrl: envVars.RPC.BASE,
    enabled: true,
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },

  [mainnet.id]: {
    provider: "zerodev",
    chain: mainnet,
    rpcUrl: envVars.RPC.MAINNET,
    enabled: true,
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },

  [polygon.id]: {
    provider: "zerodev",
    chain: polygon,
    rpcUrl: envVars.RPC.POLYGON,
    enabled: true,
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },

  [celo.id]: {
    provider: "alchemy",
    chain: celo,
    rpcUrl: envVars.RPC.CELO,
    enabled: true,
    alchemy: {
      policyId: ALCHEMY_POLICY_ID,
    },
  },

  [scroll.id]: {
    provider: "zerodev",
    chain: scroll,
    rpcUrl: envVars.RPC.SCROLL,
    enabled: true,
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },

  [sei.id]: {
    provider: "zerodev",
    chain: sei,
    rpcUrl: envVars.RPC.SEI,
    enabled: true,
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },

  [lisk.id]: {
    provider: "zerodev",
    chain: lisk,
    rpcUrl: envVars.RPC.LISK,
    enabled: false, // Lisk may not be supported by ZeroDev - verify before enabling
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },

  // ============================================
  // TESTNETS
  // ============================================

  [optimismSepolia.id]: {
    provider: "zerodev",
    chain: optimismSepolia,
    rpcUrl: envVars.RPC.OPT_SEPOLIA,
    enabled: true,
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },

  [baseSepolia.id]: {
    provider: "zerodev",
    chain: baseSepolia,
    rpcUrl: envVars.RPC.BASE_SEPOLIA,
    enabled: true,
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },

  [sepolia.id]: {
    provider: "zerodev",
    chain: sepolia,
    rpcUrl: envVars.RPC.SEPOLIA,
    enabled: true,
    zerodev: {
      projectId: ZERODEV_PROJECT_ID,
      useEIP7702: true,
    },
  },
};

/**
 * Check if a chain is supported for gasless transactions.
 */
export function isChainSupportedForGasless(chainId: number): boolean {
  const config = CHAIN_GASLESS_CONFIG[chainId];
  if (!config?.enabled) return false;

  // Verify provider-specific requirements
  if (config.provider === "zerodev") {
    return !!ZERODEV_PROJECT_ID;
  }
  if (config.provider === "alchemy") {
    return !!ALCHEMY_POLICY_ID && !!config.rpcUrl;
  }

  return false;
}

/**
 * Get gasless configuration for a specific chain.
 * Returns null if chain is not supported or not enabled.
 */
export function getChainGaslessConfig(chainId: number): ChainGaslessConfig | null {
  if (!isChainSupportedForGasless(chainId)) {
    return null;
  }
  return CHAIN_GASLESS_CONFIG[chainId];
}

/**
 * Get the provider type for a chain.
 */
export function getProviderForChain(chainId: number): GaslessProviderType | null {
  const config = CHAIN_GASLESS_CONFIG[chainId];
  return config?.enabled ? config.provider : null;
}

/**
 * Get all supported chain IDs for gasless transactions.
 */
export function getSupportedChainIds(): number[] {
  return Object.entries(CHAIN_GASLESS_CONFIG)
    .filter(([, config]) => config.enabled)
    .map(([chainId]) => Number(chainId));
}
