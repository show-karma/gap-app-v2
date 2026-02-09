export enum PayoutDisbursementStatus {
  CONFIGURED = "CONFIGURED", // Admin-configured payout settings (not a transaction)
  PENDING = "PENDING",
  AWAITING_SIGNATURES = "AWAITING_SIGNATURES",
  DISBURSED = "DISBURSED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

export interface MilestoneBreakdown {
  [milestoneUID: string]: string;
}

export interface PayoutDisbursement {
  id: string;
  grantUID: string;
  projectUID: string;
  communityUID: string;
  chainID: number;
  safeAddress: string;
  safeTransactionHash: string | null;
  disbursedAmount: string;
  token: string;
  tokenAddress: string;
  /** Number of decimals for the token (e.g., 6 for USDC, 18 for most ERC-20s) */
  tokenDecimals: number;
  payoutAddress: string;
  milestoneBreakdown: MilestoneBreakdown | null;
  /** IDs of milestone allocations paid in this disbursement (prevents double payment) */
  paidAllocationIds: string[];
  status: PayoutDisbursementStatus;
  executedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrantDisbursementRequest {
  grantUID: string;
  projectUID: string;
  amount: string;
  payoutAddress: string;
  milestoneBreakdown?: MilestoneBreakdown;
  /** IDs of milestone allocations being paid in this disbursement */
  paidAllocationIds?: string[];
}

export interface CreateDisbursementsRequest {
  grants: GrantDisbursementRequest[];
  communityUID: string;
  chainID: number;
  safeAddress: string;
  token: string;
  tokenAddress: string;
  /** Number of decimals for the token (e.g., 6 for USDC, 18 for most ERC-20s) */
  tokenDecimals: number;
}

export interface CreateDisbursementsResponse {
  disbursements: PayoutDisbursement[];
}

export interface RecordSafeTransactionRequest {
  safeTransactionHash: string;
  nonce?: number;
}

export interface UpdateStatusRequest {
  status: PayoutDisbursementStatus;
  errorMessage?: string;
  reason?: string;
}

export interface PaginationInfo {
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedDisbursementsResponse {
  payload: PayoutDisbursement[];
  pagination: PaginationInfo;
}

export interface TotalDisbursedResponse {
  totalDisbursed: string;
}

export interface PayoutDisbursementFilters {
  page?: number;
  limit?: number;
}

/**
 * Simplified milestone info for disbursement purposes
 */
export interface MilestoneInfo {
  uid: string;
  title: string;
}

/**
 * Grant info needed for creating a disbursement from the PayoutsAdminPage
 */
export interface GrantDisbursementInfo {
  grantUID: string;
  projectUID: string;
  grantName: string;
  projectName: string;
  /** Default payout address */
  payoutAddress: string;
  /** Chain-specific payout addresses keyed by chain ID (e.g., { "10": "0x...", "42161": "0x..." }) */
  chainPayoutAddress?: Record<string, string>;
  approvedAmount: string;
  /** Optional milestones associated with this grant */
  milestones?: MilestoneInfo[];
  /** Token totals breakdown (passed from page to avoid re-fetching with wrong units) */
  totalsByToken?: TokenTotal[];
  /** Milestone allocations configured for this grant (from payout config) */
  milestoneAllocations?: MilestoneAllocation[];
  /** IDs of allocations already paid in previous disbursements */
  paidAllocationIds?: string[];
}

/**
 * Aggregated disbursement status for a grant
 */
export enum AggregatedDisbursementStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

/**
 * Project info in community payouts response
 */
export interface CommunityPayoutProjectInfo {
  uid: string;
  title: string;
  slug: string;
  chainID: number;
  payoutAddress: string | null;
  chainPayoutAddress: Record<string, string> | null;
  /** Admin-set payout address for this community (from attestation.payoutAddress[communityUID]) */
  adminPayoutAddress: string | null;
}

/**
 * Grant info in community payouts response
 */
export interface CommunityPayoutGrantInfo {
  uid: string;
  title: string;
  chainID: number;
  payoutAmount: string;
  currency: string;
  payoutAddress: string | null;
  programId: string | null;
  /** Admin-set payout amount (from attestation.amount) - separate from grant's original amount */
  adminPayoutAmount: string | null;
}

/**
 * Token total breakdown for multi-currency disbursements
 */
export interface TokenTotal {
  token: string;
  tokenDecimals: number;
  tokenAddress: string;
  chainID: number;
  totalAmount: string;
}

/**
 * Disbursement info in community payouts response
 */
export interface CommunityPayoutDisbursementInfo {
  totalDisbursed: string;
  /** Breakdown of totals by token type (for multi-currency support) */
  totalsByToken: TokenTotal[];
  status: AggregatedDisbursementStatus;
  history: PayoutDisbursement[];
}

/**
 * Community payout item combining project, grant, and disbursement info
 */
export interface CommunityPayoutItem {
  project: CommunityPayoutProjectInfo;
  grant: CommunityPayoutGrantInfo;
  disbursements: CommunityPayoutDisbursementInfo;
}

/**
 * Response from community payouts endpoint
 */
export interface CommunityPayoutsResponse {
  payload: CommunityPayoutItem[];
  pagination: PaginationInfo;
}

/**
 * Filters for community payouts
 */
export interface CommunityPayoutsFilters {
  programId?: string;
  status?: AggregatedDisbursementStatus;
}

/**
 * Sorting options for community payouts
 */
export interface CommunityPayoutsSorting {
  sortBy?: "project_title" | "grant_title" | "payout_amount" | "disbursed_amount" | "status";
  sortOrder?: "asc" | "desc";
}

/**
 * Options for fetching community payouts
 */
export interface CommunityPayoutsOptions {
  page?: number;
  limit?: number;
  filters?: CommunityPayoutsFilters;
  sorting?: CommunityPayoutsSorting;
}

/**
 * Milestone allocation within a payout configuration.
 * Each allocation can be linked to an actual milestone (via milestoneUID) or be a custom allocation.
 */
export interface MilestoneAllocation {
  /** Unique identifier for this allocation (UUID) */
  id: string;
  /** Optional link to an actual milestone UID */
  milestoneUID?: string;
  /** Human-readable label for this allocation */
  label: string;
  /** Amount allocated in human-readable format (e.g., "50000" for 50000 USDC) */
  amount: string;
}

/**
 * Item for saving payout config (payout address, total grant amount, token, and milestone allocations)
 */
export interface PayoutConfigItem {
  grantUID: string;
  projectUID: string;
  payoutAddress?: string | null;
  totalGrantAmount?: string | null;
  /** Token contract address for payouts */
  tokenAddress?: string | null;
  /** Chain ID where the payout token is deployed */
  chainId?: number | null;
  /** Breakdown of how the total grant amount is allocated across milestones */
  milestoneAllocations?: MilestoneAllocation[] | null;
}

/**
 * Request to save payout configs
 */
export interface SavePayoutConfigRequest {
  configs: PayoutConfigItem[];
  communityUID: string;
}

/**
 * Saved payout config response
 */
export interface PayoutGrantConfig {
  id: string;
  grantUID: string;
  projectUID: string;
  communityUID: string;
  payoutAddress: string | null;
  totalGrantAmount: string | null;
  /** Token contract address for payouts */
  tokenAddress: string | null;
  /** Chain ID where the payout token is deployed */
  chainId: number | null;
  /** Breakdown of how the total grant amount is allocated across milestones */
  milestoneAllocations: MilestoneAllocation[] | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response from saving payout configs
 */
export interface SavePayoutConfigResponse {
  success: PayoutGrantConfig[];
  failed: Array<{ grantUID: string; error: string }>;
}
