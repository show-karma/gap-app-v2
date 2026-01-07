/**
 * Gasless Transaction Module
 *
 * This module provides a unified interface for gasless (sponsored) transactions
 * using various providers (ZeroDev, Alchemy, etc.).
 *
 * Usage:
 * ```typescript
 * import { createGaslessClient, getGaslessSigner, isChainSupportedForGasless } from "@/utilities/gasless";
 *
 * // Check if chain supports gasless
 * if (isChainSupportedForGasless(chainId)) {
 *   // Create signer from Privy wallet
 *   const signer = await createPrivySignerForGasless(embeddedWallet, chainId);
 *
 *   // Create gasless client
 *   const client = await createGaslessClient(chainId, signer);
 *
 *   // Get ethers.js compatible signer
 *   const ethersSigner = await getGaslessSigner(client, chainId);
 * }
 * ```
 */

import type { Signer } from "ethers";
import { getChainGaslessConfig, getProviderForChain } from "./config";
import { getProvider } from "./providers";
import type { LocalAccountWithEIP7702, SmartAccountClient } from "./types";
import { GaslessProviderError } from "./types";

/**
 * Creates a gasless smart account client for the specified chain.
 * Automatically selects the appropriate provider based on chain configuration.
 *
 * @param chainId - Target blockchain chain ID
 * @param signer - Signer with EIP-7702 support (from createPrivySignerForGasless)
 * @returns Smart account client or null if creation fails
 * @throws GaslessProviderError if provider fails to create client
 */
export async function createGaslessClient(
  chainId: number,
  signer: LocalAccountWithEIP7702
): Promise<SmartAccountClient | null> {
  const config = getChainGaslessConfig(chainId);
  if (!config) {
    console.warn(`[Gasless] Chain ${chainId} is not supported for gasless transactions`);
    return null;
  }

  const providerType = getProviderForChain(chainId);
  if (!providerType) {
    console.warn(`[Gasless] No provider configured for chain ${chainId}`);
    return null;
  }

  const provider = getProvider(providerType);

  console.log(`[Gasless] Creating client for chain ${chainId} using ${provider.name} provider`);

  return provider.createClient({
    chainId,
    signer,
    config,
  });
}

/**
 * Converts a smart account client to an ethers.js Signer.
 * Required for compatibility with the GAP SDK which uses ethers.js.
 *
 * @param client - Smart account client from createGaslessClient
 * @param chainId - Chain ID for provider selection
 * @returns ethers.js Signer that routes transactions through the smart account
 * @throws GaslessProviderError if conversion fails
 */
export async function getGaslessSigner(
  client: SmartAccountClient,
  chainId: number
): Promise<Signer> {
  const config = getChainGaslessConfig(chainId);
  if (!config) {
    throw new GaslessProviderError(
      `Chain ${chainId} is not supported for gasless transactions`,
      "zerodev", // Default provider for error
      chainId
    );
  }

  const providerType = getProviderForChain(chainId);
  if (!providerType) {
    throw new GaslessProviderError(
      `No provider configured for chain ${chainId}`,
      "zerodev",
      chainId
    );
  }

  const provider = getProvider(providerType);

  return provider.toEthersSigner(client, chainId, config);
}

// Re-export commonly used items
export { getChainGaslessConfig, isChainSupportedForGasless } from "./config";
export type {
  ChainGaslessConfig,
  GaslessProviderType,
  IGaslessProvider,
  LocalAccountWithEIP7702,
  SmartAccountClient,
} from "./types";
export { GaslessProviderError } from "./types";
export type { PrivyEmbeddedWallet } from "./utils/privy-signer";
export { createPrivySignerForGasless } from "./utils/privy-signer";
