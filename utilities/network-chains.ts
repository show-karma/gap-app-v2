import type { Chain } from "viem/chains";
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

const includeTestNetworks = process.env.NEXT_PUBLIC_ENV !== "production";

const productionNetworks: Chain[] = [
  mainnet,
  optimism,
  arbitrum,
  base,
  celo,
  polygon,
  lisk,
  scroll,
  sei,
];

const nonProductionNetworks: Chain[] = [
  mainnet,
  optimism,
  arbitrum,
  base,
  celo,
  polygon,
  lisk,
  scroll,
  sei,
  optimismSepolia,
  baseSepolia,
  sepolia,
];

const configuredNetworks = includeTestNetworks ? nonProductionNetworks : productionNetworks;

export const appNetwork = configuredNetworks as [Chain, ...Chain[]];

/**
 * Networks supported by GAP SDK for project creation.
 * Filters out chains that are available for other features (e.g., donations)
 * but cannot be used for creating projects/attestations.
 */
const gapUnsupportedChainIds: number[] = [mainnet.id];

export const gapSupportedNetworks = appNetwork.filter(
  (chain) => !gapUnsupportedChainIds.includes(chain.id)
) as [Chain, ...Chain[]];

/**
 * Networks where projects can configure payout addresses for donations.
 * Includes all app networks (including mainnet) since donations don't require
 * GAP SDK/attestation support - only the batch donations contract deployment.
 */
export const PAYOUT_CHAINS = appNetwork;
