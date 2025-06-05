import type { Address } from "viem";

// Allo Protocol V2 contract addresses for each chain
export const ALLO_CONTRACT_ADDRESSES: Record<string, Address> = {
  // Mainnet chains
  optimism: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
  arbitrum: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
  celo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
  
  // Testnet chains  
  "optimism-sepolia": "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
  sepolia: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
  "base-sepolia": "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
} as const;

// Chain ID to chain name mapping for Allo
export const CHAIN_ID_TO_NAME: Record<number, string> = {
  10: "optimism",
  42161: "arbitrum",  
  42220: "celo",
  11155420: "optimism-sepolia",
  11155111: "sepolia",
  84532: "base-sepolia",
} as const;

// Strategy type identifiers
export const STRATEGY_TYPES = {
  // Direct Distribution Strategies
  DIRECT_GRANTS_SIMPLE: "DirectGrantsSimpleStrategy",
  DIRECT_GRANTS_LITE: "DirectGrantsLiteStrategy",
  
  // Merkle Distribution Strategies
  MERKLE_PAYOUT: "MerklePayoutStrategy", 
  DONATION_VOTING_MERKLE_DIRECT: "DonationVotingMerkleDistributionDirectTransferStrategy",
  DONATION_VOTING_MERKLE_VAULT: "DonationVotingMerkleDistributionVaultStrategy",
  
  // Voting Strategies
  QUADRATIC_FUNDING: "QuadraticFundingVotingStrategy",
  DONATION_VOTING: "DonationVotingStrategy",
  DONATION_VOTING_CUSTOM_REGISTRY: "DonationVotingCustomRegistryStrategy",
  SIMPLE_QV: "SimpleQuadraticVotingStrategy",
  QV_GOVERNANCE_TOKEN: "QuadraticVotingGovernanceTokenStrategy",
  QV_HACKATHON: "HackathonQVStrategy",
  QV_TIERED_NFT: "QuadraticVotingTieredNFTStrategy",
  WRAPPED_VOTING: "WrappedVotingStrategy",
  
  // RFP Strategies
  RFP_SIMPLE: "RFPSimpleStrategy",
  RFP_COMMITTEE: "RFPCommitteeStrategy",
  RFP_COMMITTEE_HEDGEY: "RFPCommitteeHedgeyStrategy",
  
  // MicroGrants Strategies
  MICRO_GRANTS: "MicroGrantsStrategy",
  MICRO_GRANTS_HATS: "MicroGrantsHatsStrategy",
  MICRO_GRANTS_GOV: "MicroGrantsGovernanceStrategy",
  
  // Other Distribution Strategies
  PROPORTIONAL_PAYOUT: "ProportionalPayoutStrategy",
  SABLIER_V2: "SablierV2Strategy",
  SUPERFLUID: "SQFSuperFluidStrategy",
  STREAMING_QF: "StreamingQuadraticFundingStrategy",
  
  // Community Strategies
  IMPACT_STREAM_QV: "ImpactStreamQuadraticVotingStrategy",
} as const;

// Strategy categories for UI organization
export const STRATEGY_CATEGORIES = {
  DIRECT_DISTRIBUTION: [
    STRATEGY_TYPES.DIRECT_GRANTS_SIMPLE,
    STRATEGY_TYPES.DIRECT_GRANTS_LITE,
  ],
  MERKLE_DISTRIBUTION: [
    STRATEGY_TYPES.MERKLE_PAYOUT,
    STRATEGY_TYPES.DONATION_VOTING_MERKLE_DIRECT,
    STRATEGY_TYPES.DONATION_VOTING_MERKLE_VAULT,
  ],
  VOTING_BASED: [
    STRATEGY_TYPES.QUADRATIC_FUNDING,
    STRATEGY_TYPES.DONATION_VOTING,
    STRATEGY_TYPES.SIMPLE_QV,
    STRATEGY_TYPES.QV_GOVERNANCE_TOKEN,
    STRATEGY_TYPES.QV_HACKATHON,
    STRATEGY_TYPES.QV_TIERED_NFT,
  ],
  RFP_BASED: [
    STRATEGY_TYPES.RFP_SIMPLE,
    STRATEGY_TYPES.RFP_COMMITTEE,
    STRATEGY_TYPES.RFP_COMMITTEE_HEDGEY,
  ],
  MICRO_GRANTS: [
    STRATEGY_TYPES.MICRO_GRANTS,
    STRATEGY_TYPES.MICRO_GRANTS_HATS,
    STRATEGY_TYPES.MICRO_GRANTS_GOV,
  ],
  STREAMING: [
    STRATEGY_TYPES.SABLIER_V2,
    STRATEGY_TYPES.SUPERFLUID,
    STRATEGY_TYPES.STREAMING_QF,
  ],
} as const;

// Strategy capabilities for disbursement
export const STRATEGY_CAPABILITIES = {
  // Direct Distribution Strategies
  [STRATEGY_TYPES.DIRECT_GRANTS_SIMPLE]: {
    supportsDirectDistribution: true,
    requiresMerkleTree: false,
    requiresClaiming: false,
    description: "Simple direct grants distribution"
  },
  [STRATEGY_TYPES.DIRECT_GRANTS_LITE]: {
    supportsDirectDistribution: true,
    requiresMerkleTree: false,
    requiresClaiming: false,
    description: "Lightweight direct grants with allocation and distribution"
  },
  
  // Merkle Distribution Strategies
  [STRATEGY_TYPES.MERKLE_PAYOUT]: {
    supportsDirectDistribution: false,
    requiresMerkleTree: true,
    requiresClaiming: true,
    description: "Merkle tree based distribution requiring claims"
  },
  [STRATEGY_TYPES.DONATION_VOTING_MERKLE_DIRECT]: {
    supportsDirectDistribution: false,
    requiresMerkleTree: true,
    requiresClaiming: true,
    description: "Quadratic funding with merkle distribution"
  },
  [STRATEGY_TYPES.DONATION_VOTING_MERKLE_VAULT]: {
    supportsDirectDistribution: false,
    requiresMerkleTree: true,
    requiresClaiming: true,
    description: "Quadratic funding with merkle distribution via vault"
  },
  
  // MicroGrants Strategies
  [STRATEGY_TYPES.MICRO_GRANTS]: {
    supportsDirectDistribution: true,
    requiresMerkleTree: false,
    requiresClaiming: false,
    description: "Small grants with direct distribution"
  },
  [STRATEGY_TYPES.MICRO_GRANTS_HATS]: {
    supportsDirectDistribution: true,
    requiresMerkleTree: false,
    requiresClaiming: false,
    description: "Small grants with Hats protocol integration"
  },
  [STRATEGY_TYPES.MICRO_GRANTS_GOV]: {
    supportsDirectDistribution: true,
    requiresMerkleTree: false,
    requiresClaiming: false,
    description: "Small grants with governance voting"
  },
  
  // RFP Strategies
  [STRATEGY_TYPES.RFP_SIMPLE]: {
    supportsDirectDistribution: true,
    requiresMerkleTree: false,
    requiresClaiming: false,
    description: "Request for proposal with milestone-based distribution"
  },
  [STRATEGY_TYPES.RFP_COMMITTEE]: {
    supportsDirectDistribution: true,
    requiresMerkleTree: false,
    requiresClaiming: false,
    description: "RFP with committee approval process"
  },
  
  // Voting Strategies (mostly require claiming)
  [STRATEGY_TYPES.QUADRATIC_FUNDING]: {
    supportsDirectDistribution: false,
    requiresMerkleTree: false,
    requiresClaiming: true,
    description: "Standard quadratic funding mechanism"
  },
  [STRATEGY_TYPES.DONATION_VOTING]: {
    supportsDirectDistribution: false,
    requiresMerkleTree: false,
    requiresClaiming: true,
    description: "Donation-based voting distribution"
  },
  
  // Other Distribution Strategies
  [STRATEGY_TYPES.PROPORTIONAL_PAYOUT]: {
    supportsDirectDistribution: true,
    requiresMerkleTree: false,
    requiresClaiming: false,
    description: "Proportional distribution based on allocations"
  },
  
  // Streaming Strategies
  [STRATEGY_TYPES.SABLIER_V2]: {
    supportsDirectDistribution: true,
    requiresMerkleTree: false,
    requiresClaiming: false,
    description: "Token streaming via Sablier V2"
  },
  [STRATEGY_TYPES.SUPERFLUID]: {
    supportsDirectDistribution: true,
    requiresMerkleTree: false,
    requiresClaiming: false,
    description: "Real-time streaming with Superfluid"
  },
} as const;

// Add a function to get strategies that support direct distribution
export function getDirectDistributionStrategies() {
  return Object.entries(STRATEGY_CAPABILITIES)
    .filter(([_, capabilities]) => capabilities.supportsDirectDistribution)
    .map(([type, capabilities]) => ({
      type,
      ...capabilities
    }));
}

export type SupportedChain = keyof typeof ALLO_CONTRACT_ADDRESSES;
export type StrategyType = (typeof STRATEGY_TYPES)[keyof typeof STRATEGY_TYPES]; 