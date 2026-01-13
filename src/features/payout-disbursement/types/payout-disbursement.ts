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
 * Grant info needed for creating a disbursement from the PayoutsAdminPage
 */
export interface GrantDisbursementInfo {
  grantUID: string;
  grantName: string;
  projectName: string;
  payoutAddress: string;
  approvedAmount: string;
}
