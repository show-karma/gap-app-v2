/**
 * Campaign status from Hedgey API
 */
export type CampaignStatus = "active" | "completed";

/**
 * Lockup/vesting configuration for a claim campaign
 */
export interface ClaimLockup {
  /** Unix timestamp (seconds) when funds can be claimed */
  cliff: number;
  /** Vesting period duration */
  period: number;
  /** Number of vesting periods */
  periods: number;
  /** Unix timestamp (seconds) when vesting starts */
  start: number;
  /** Address of the token locker contract */
  tokenLocker: string;
}

/**
 * Hedgey campaign data from GraphQL API
 */
export interface HedgeyCampaign {
  _id: string;
  id: string;
  network: string;
  contractAddress: string;
  start: string;
  end: string;
  totalAmount: string;
  totalAmountClaimed: string;
  totalClaims: number;
  totalAddresses: number;
  token: {
    address: string;
    decimals: number;
    name: string;
    ticker: string;
  };
  claimLockup?: ClaimLockup;
}

/**
 * Claim proof data from Hedgey REST API
 */
export interface ClaimProof {
  canClaim: boolean;
  amount: string;
  proof: `0x${string}`[];
}

/**
 * Campaign info from Hedgey REST API
 */
export interface CampaignInfo {
  title: string;
  claimFee: string;
  campaignStatus?: CampaignStatus;
}

/**
 * Combined eligibility data for a user on a specific campaign
 */
export interface ClaimEligibility {
  campaignId: string;
  title: string;
  canClaim: boolean;
  claimed: boolean;
  amount: string;
  proof: `0x${string}`[];
  claimFee: string;
  campaignStatus?: CampaignStatus;
}

/**
 * Campaign with eligibility info for display
 */
export interface CampaignWithEligibility extends HedgeyCampaign {
  eligibility?: ClaimEligibility;
}

/**
 * Status of a claim transaction
 */
export type ClaimStatus =
  | "idle"
  | "checking"
  | "eligible"
  | "claiming"
  | "success"
  | "error"
  | "already_claimed";

/**
 * Return type for useHedgeyCampaigns hook
 */
export interface UseHedgeyCampaignsReturn {
  campaigns: HedgeyCampaign[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Return type for useClaimEligibility hook
 */
export interface UseClaimEligibilityReturn {
  eligibilities: Map<string, ClaimEligibility>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Parameters for claim transaction
 */
export interface ClaimParams {
  campaignId: string;
  proof: `0x${string}`[];
  amount: bigint;
  contractAddress: `0x${string}`;
}
