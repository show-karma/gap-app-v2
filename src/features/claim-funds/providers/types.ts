/**
 * Provider-agnostic types for the claim grants feature.
 * All claim providers (Hedgey, custom, etc.) must implement these interfaces.
 */

/**
 * Token information displayed in the UI
 */
export interface ClaimToken {
  address: string;
  name: string;
  ticker: string;
  decimals: number;
}

/**
 * A claimable campaign - common structure for all providers
 */
export interface ClaimCampaign {
  id: string;
  title: string;
  token: ClaimToken;
  totalAmount: string;
  totalClaimed: string;
  totalClaimants?: number;
  startTime?: number;
  endTime?: number;
  contractAddress: string;
  /** Provider-specific metadata (e.g., lockup info, merkle root) */
  metadata?: Record<string, unknown>;
}

/**
 * The main provider interface that all claim providers must implement
 */
export interface ClaimProvider {
  readonly id: string;
  readonly name: string;
  fetchCampaigns(): Promise<ClaimCampaign[]>;
}

/**
 * Supported provider types
 */
export type ClaimProviderType = "hedgey" | "none";

export interface HedgeyProviderConfig {
  type: "hedgey";
  networkName: string;
  contractAddress: string;
}

export type ProviderConfig = HedgeyProviderConfig;

export interface ClaimGrantsConfig {
  enabled: boolean;
  provider: ClaimProviderType;
  providerConfig?: ProviderConfig;
}
