import { envVars } from "@/utilities/enviromentVars";

export type FactoryAddressMap = Record<string, string>;

// Chain name mapping for supported networks
const CHAIN_NAMES: Record<number, string> = {
  8453: "Base",
  42220: "Celo",
  10: "Optimism",
  42161: "Arbitrum",
  1: "Ethereum",
};

export interface SupportedChain {
  chainId: number;
  chainName: string;
  factoryAddress: string;
}

/**
 * Fetch Karma Seeds factory addresses from the backend
 * Returns a map of chainId -> factoryAddress
 */
export async function fetchKarmaSeedsFactoryAddresses(): Promise<FactoryAddressMap> {
  const response = await fetch(
    `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/karma-seeds/config/factory-addresses`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Karma Seeds config: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get factory address for a specific chain
 */
export async function getFactoryAddressForChain(chainId: number): Promise<string | undefined> {
  const addresses = await fetchKarmaSeedsFactoryAddresses();
  return addresses[String(chainId)];
}

/**
 * Get all supported chains with their info
 */
export async function getSupportedChains(): Promise<SupportedChain[]> {
  const addresses = await fetchKarmaSeedsFactoryAddresses();

  return Object.entries(addresses).map(([chainIdStr, factoryAddress]) => {
    const chainId = Number(chainIdStr);
    return {
      chainId,
      chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
      factoryAddress,
    };
  });
}
