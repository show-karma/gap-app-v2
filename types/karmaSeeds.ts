/**
 * Karma Seeds - Project Funding via Token Sales
 * Allows project owners to launch ERC-20 tokens for supporters to fund projects
 */

/**
 * KarmaSeeds entity from the backend API
 */
export interface KarmaSeeds {
  id: string;
  projectUID: string;
  chainID: number;
  chainName: string;
  contractAddress: string;
  factoryAddress: string;
  tokenName: string;
  tokenSymbol: string;
  maxSupply: string;
  treasuryAddress: string;
  creatorAddress: string;
  deploymentTxHash: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Form data for launching Karma Seeds
 */
export interface LaunchKarmaSeedsForm {
  tokenName: string;
  tokenSymbol: string;
  maxSupply: string;
}

/**
 * Request body for creating Karma Seeds record
 * (after contract deployment)
 */
export interface CreateKarmaSeedsRequest {
  tokenName: string;
  tokenSymbol: string;
  maxSupply: string;
  treasuryAddress: string;
  contractAddress: string;
  factoryAddress: string;
  deploymentTxHash: string;
  chainID?: number;
}

/**
 * Live contract stats from blockchain
 */
export interface KarmaSeedsStats {
  projectUID: string;
  contractAddress: string;
  chainID: number;
  totalSupply: string;
  maxSupply: string;
  remainingSupply: string;
  ethPrice: string;
  tokenName: string;
  tokenSymbol: string;
}

/**
 * Preview buy response
 */
export interface PreviewBuyResponse {
  tokensToReceive: string;
  paymentToken: string;
  paymentAmount: string;
  usdValue: string;
}

/**
 * Configuration for Karma Seeds contracts on different chains
 */
export interface KarmaSeedsConfig {
  chainID: number;
  chainName: string;
  factoryAddress: `0x${string}`;
  ethUsdFeed: `0x${string}`;
  usdc: `0x${string}`;
  weth: `0x${string}`;
}

/**
 * Base Mainnet Karma Seeds configuration (Beacon Proxy Pattern)
 */
export const KARMA_SEEDS_CONFIG: KarmaSeedsConfig = {
  chainID: 8453,
  chainName: "Base",
  factoryAddress: "0xA459b855fa03AB80c92a79F341db8020FC67e047" as `0x${string}`,
  ethUsdFeed: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" as `0x${string}`,
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
  weth: "0x4200000000000000000000000000000000000006" as `0x${string}`,
};

/**
 * Default max supply for Karma Seeds (1 million tokens)
 */
export const DEFAULT_MAX_SUPPLY = "1000000";
export const DEFAULT_MAX_SUPPLY_WEI = "1000000000000000000000000";
