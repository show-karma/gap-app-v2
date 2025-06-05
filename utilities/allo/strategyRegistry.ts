/**
 * Official Allo Protocol Strategy Registry
 * Maps strategy IDs from getStrategyId() calls to human-readable names
 * Based on official deployments from: https://github.com/allo-protocol/allo-v2/tree/main/scripts/deployments
 */

export interface StrategyInfo {
  name: string;
  description: string;
  supportsDirectDistribution: boolean;
  requiresMerkleTree: boolean;
  requiresClaiming: boolean;
  category: 'direct' | 'merkle' | 'voting' | 'rfp' | 'streaming' | 'other';
}

/**
 * Strategy ID and Chain ID to Strategy Info mapping
 * Key format: `${chainId}:${strategyId}`
 */
export const STRATEGY_REGISTRY: Record<string, StrategyInfo> = {
  // Celo Mainnet (42220) DonationVotingMerkleDistributionDirectTransferStrategy
  "42220:0x9fa6890423649187b1f0e8bf4265f0305ce99523c3d11aa36b35a54617bb0ec0": {
    name: "Donation Voting (Merkle Direct)",
    description: "Quadratic funding with merkle-based direct transfer capability",
    supportsDirectDistribution: true,
    requiresMerkleTree: true,
    requiresClaiming: false,
    category: 'merkle'
  }
};

/**
 * Network-specific strategy deployments
 * Maps network IDs to their deployed strategy addresses and IDs
 */
export const NETWORK_STRATEGY_DEPLOYMENTS: Record<number, Record<string, string>> = {
  // Optimism Mainnet
  10: {
    // These would be populated with actual deployment data
    // Format: "strategyAddress": "strategyId"
  },
  
  // Arbitrum One
  42161: {
    // These would be populated with actual deployment data
  },
  
  // Celo Mainnet  
  42220: {
    // These would be populated with actual deployment data
  },
  
  // Testnet deployments
  11155420: { // Optimism Sepolia
    // These would be populated with actual deployment data
  },
  
  11155111: { // Ethereum Sepolia
    // These would be populated with actual deployment data
  },
  
  84532: { // Base Sepolia
    // These would be populated with actual deployment data
  }
};

/**
 * Get strategy information by ID and chain ID
 */
export function getStrategyInfo(strategyId: string, chainId: number): StrategyInfo | null {
  const key = `${chainId}:${strategyId}`;
  return STRATEGY_REGISTRY[key] || null;
}

/**
 * Get strategy name by ID with fallback
 */
export function getStrategyName(strategyId: string, chainId: number): string {
  const info = getStrategyInfo(strategyId, chainId);
  return info?.name || `Unknown Strategy: ${strategyId}`;
}

/**
 * Check if a strategy supports direct distribution
 */
export function supportsDirectDistribution(strategyId: string, chainId: number): boolean {
  const info = getStrategyInfo(strategyId, chainId);
  return info?.supportsDirectDistribution || false;
}

/**
 * Get all strategies that support direct distribution
 */
export function getDirectDistributionStrategies(): string[] {
  return Object.entries(STRATEGY_REGISTRY)
    .filter(([_, info]) => info.supportsDirectDistribution)
    .map(([key, _]) => key.split(':')[1]); // Return just the strategy ID part
}

/**
 * Get strategies by category
 */
export function getStrategiesByCategory(category: StrategyInfo['category']): string[] {
  return Object.entries(STRATEGY_REGISTRY)
    .filter(([_, info]) => info.category === category)
    .map(([key, _]) => key.split(':')[1]); // Return just the strategy ID part
} 