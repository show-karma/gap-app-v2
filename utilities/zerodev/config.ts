import { getEntryPoint, KERNEL_V3_3, KernelVersionToAddressesMap } from "@zerodev/sdk/constants";
import type { Chain } from "viem";
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

// ZeroDev Project ID from environment
export const ZERODEV_PROJECT_ID = envVars.ZERODEV_PROJECT_ID || "";

// EntryPoint v0.7 - using ZeroDev's helper to get the proper format
export const ENTRYPOINT = getEntryPoint("0.7");

// Kernel version for smart accounts
export const KERNEL_VERSION = KERNEL_V3_3;

interface ZeroDevChainConfig {
  bundlerRpc: string;
  paymasterRpc: string;
  chain: Chain;
  supported: boolean;
}

/**
 * Generates ZeroDev RPC URLs for a given chain.
 * Uses the v3 pattern: https://rpc.zerodev.app/api/v3/{projectId}/chain/{chainId}
 */
function getZeroDevUrls(chainId: number): { bundlerRpc: string; paymasterRpc: string } {
  const projectId = ZERODEV_PROJECT_ID;
  // In v3, bundler and paymaster use the same endpoint
  const rpcUrl = `https://rpc.zerodev.app/api/v3/${projectId}/chain/${chainId}`;
  return {
    bundlerRpc: rpcUrl,
    paymasterRpc: rpcUrl,
  };
}

/**
 * ZeroDev configuration for each supported chain.
 * Chains are enabled based on ZeroDev's supported networks.
 */
export const ZERODEV_CHAIN_CONFIG: Record<number, ZeroDevChainConfig> = {
  // Mainnets
  [optimism.id]: {
    ...getZeroDevUrls(optimism.id),
    chain: optimism,
    supported: true,
  },
  [arbitrum.id]: {
    ...getZeroDevUrls(arbitrum.id),
    chain: arbitrum,
    supported: true,
  },
  [base.id]: {
    ...getZeroDevUrls(base.id),
    chain: base,
    supported: true,
  },
  [mainnet.id]: {
    ...getZeroDevUrls(mainnet.id),
    chain: mainnet,
    supported: true,
  },
  [polygon.id]: {
    ...getZeroDevUrls(polygon.id),
    chain: polygon,
    supported: true,
  },
  [celo.id]: {
    ...getZeroDevUrls(celo.id),
    chain: celo,
    supported: true,
  },
  [scroll.id]: {
    ...getZeroDevUrls(scroll.id),
    chain: scroll,
    supported: true,
  },
  [sei.id]: {
    ...getZeroDevUrls(sei.id),
    chain: sei,
    supported: false, // SEI may not be supported by ZeroDev - verify
  },
  [lisk.id]: {
    ...getZeroDevUrls(lisk.id),
    chain: lisk,
    supported: false, // Lisk may not be supported by ZeroDev - verify
  },
  // Testnets
  [optimismSepolia.id]: {
    ...getZeroDevUrls(optimismSepolia.id),
    chain: optimismSepolia,
    supported: true,
  },
  [baseSepolia.id]: {
    ...getZeroDevUrls(baseSepolia.id),
    chain: baseSepolia,
    supported: true,
  },
  [sepolia.id]: {
    ...getZeroDevUrls(sepolia.id),
    chain: sepolia,
    supported: true,
  },
};

/**
 * Check if a chain is supported for gasless transactions via ZeroDev.
 */
export function isChainSupportedForGasless(chainId: number): boolean {
  const config = ZERODEV_CHAIN_CONFIG[chainId];
  return config?.supported && !!ZERODEV_PROJECT_ID;
}

/**
 * Get ZeroDev configuration for a specific chain.
 * Returns null if chain is not supported.
 */
export function getZeroDevConfig(chainId: number): ZeroDevChainConfig | null {
  const config = ZERODEV_CHAIN_CONFIG[chainId];
  if (!config?.supported || !ZERODEV_PROJECT_ID) {
    return null;
  }
  return config;
}

/**
 * Get the kernel implementation address for EIP-7702.
 * This is the address of the kernel contract that the EOA will delegate to.
 */
export function getKernelImplementationAddress(): `0x${string}` {
  // Get the implementation address from ZeroDev SDK for the kernel version we're using
  const kernelAddresses = KernelVersionToAddressesMap[KERNEL_VERSION];
  return kernelAddresses.accountImplementationAddress as `0x${string}`;
}
