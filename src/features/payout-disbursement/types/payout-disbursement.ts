export enum PayoutDisbursementStatus {
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
}

/**
 * Disbursement info in community payouts response
 */
export interface CommunityPayoutDisbursementInfo {
  totalDisbursed: string;
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
