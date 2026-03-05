import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import type {
  CommunityPayoutAgreementInfo,
  CommunityPayoutInvoiceInfo,
  CommunityPayoutsOptions,
  CommunityPayoutsResponse,
  CreateDisbursementsRequest,
  CreateDisbursementsResponse,
  PaginatedDisbursementsResponse,
  PayoutDisbursement,
  PayoutGrantConfig,
  RecordSafeTransactionRequest,
  SavePayoutConfigRequest,
  SavePayoutConfigResponse,
  TotalDisbursedResponse,
  UpdateStatusRequest,
} from "../types/payout-disbursement";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Creates disbursement records for multiple grants
 */
export const createDisbursements = async (
  request: CreateDisbursementsRequest
): Promise<PayoutDisbursement[]> => {
  try {
    const [data, error] = await fetchData<CreateDisbursementsResponse>(
      INDEXER.V2.PAYOUTS.CREATE,
      "POST",
      request,
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to create disbursements");
    }

    return data.disbursements;
  } catch (error: unknown) {
    errorManager("Error creating disbursements", error);
    throw new Error(`Failed to create disbursements: ${getErrorMessage(error)}`);
  }
};

/**
 * Records Safe transaction hash for a disbursement
 */
export const recordSafeTransaction = async (
  disbursementId: string,
  request: RecordSafeTransactionRequest
): Promise<PayoutDisbursement> => {
  try {
    const [data, error] = await fetchData<PayoutDisbursement>(
      INDEXER.V2.PAYOUTS.RECORD_SAFE_TX(disbursementId),
      "POST",
      request,
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to record Safe transaction");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error recording Safe transaction for disbursement ${disbursementId}`, error);
    throw new Error(`Failed to record Safe transaction: ${getErrorMessage(error)}`);
  }
};

/**
 * Gets payout history for a grant
 */
export const getPayoutHistory = async (
  grantUID: string,
  page?: number,
  limit?: number
): Promise<PaginatedDisbursementsResponse> => {
  try {
    const [data, error] = await fetchData<PaginatedDisbursementsResponse>(
      INDEXER.V2.PAYOUTS.GRANT_HISTORY(grantUID, page, limit),
      "GET",
      {},
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch payout history");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error fetching payout history for grant ${grantUID}`, error);
    throw new Error(`Failed to fetch payout history: ${getErrorMessage(error)}`);
  }
};

/**
 * Gets total disbursed amount for a grant
 */
export const getTotalDisbursed = async (grantUID: string): Promise<string> => {
  try {
    const [data, error] = await fetchData<TotalDisbursedResponse>(
      INDEXER.V2.PAYOUTS.GRANT_TOTAL_DISBURSED(grantUID),
      "GET",
      {},
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch total disbursed");
    }

    return data.totalDisbursed;
  } catch (error: unknown) {
    errorManager(`Error fetching total disbursed for grant ${grantUID}`, error);
    throw new Error(`Failed to fetch total disbursed: ${getErrorMessage(error)}`);
  }
};

/**
 * Gets pending disbursements for a community
 */
export const getPendingDisbursements = async (
  communityUID: string,
  page?: number,
  limit?: number
): Promise<PaginatedDisbursementsResponse> => {
  try {
    const [data, error] = await fetchData<PaginatedDisbursementsResponse>(
      INDEXER.V2.PAYOUTS.COMMUNITY_PENDING(communityUID, page, limit),
      "GET",
      {},
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch pending disbursements");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error fetching pending disbursements for community ${communityUID}`, error);
    throw new Error(`Failed to fetch pending disbursements: ${getErrorMessage(error)}`);
  }
};

/**
 * Updates disbursement status
 */
export const updateDisbursementStatus = async (
  disbursementId: string,
  request: UpdateStatusRequest
): Promise<PayoutDisbursement> => {
  try {
    const [data, error] = await fetchData<PayoutDisbursement>(
      INDEXER.V2.PAYOUTS.UPDATE_STATUS(disbursementId),
      "PATCH",
      request,
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to update disbursement status");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error updating status for disbursement ${disbursementId}`, error);
    throw new Error(`Failed to update disbursement status: ${getErrorMessage(error)}`);
  }
};

/**
 * Gets disbursements awaiting signatures for a Safe address
 */
export const getAwaitingSignaturesDisbursements = async (
  safeAddress: string,
  page?: number,
  limit?: number
): Promise<PaginatedDisbursementsResponse> => {
  try {
    const [data, error] = await fetchData<PaginatedDisbursementsResponse>(
      INDEXER.V2.PAYOUTS.SAFE_AWAITING(safeAddress, page, limit),
      "GET",
      {},
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch awaiting signatures disbursements");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error fetching awaiting signatures disbursements for Safe ${safeAddress}`, error);
    throw new Error(`Failed to fetch awaiting signatures disbursements: ${getErrorMessage(error)}`);
  }
};

/**
 * Gets recent disbursements for a community (all statuses)
 */
export const getRecentCommunityDisbursements = async (
  communityUID: string,
  page?: number,
  limit?: number,
  status?: string
): Promise<PaginatedDisbursementsResponse> => {
  try {
    const [data, error] = await fetchData<PaginatedDisbursementsResponse>(
      INDEXER.V2.PAYOUTS.COMMUNITY_RECENT(communityUID, page, limit, status),
      "GET",
      {},
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch recent community disbursements");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error fetching recent disbursements for community ${communityUID}`, error);
    throw new Error(`Failed to fetch recent community disbursements: ${getErrorMessage(error)}`);
  }
};

/**
 * Gets community payouts with aggregated disbursement status
 * Returns grants with their project info, payout amounts, and disbursement history
 */
export const getCommunityPayouts = async (
  communityUID: string,
  options?: CommunityPayoutsOptions
): Promise<CommunityPayoutsResponse> => {
  try {
    const [data, error] = await fetchData<CommunityPayoutsResponse>(
      INDEXER.V2.PAYOUTS.COMMUNITY_PAYOUTS(communityUID, {
        page: options?.page,
        limit: options?.limit,
        programId: options?.filters?.programId,
        status: options?.filters?.status,
        agreementStatus: options?.filters?.agreementStatus,
        invoiceStatus: options?.filters?.invoiceStatus,
        search: options?.filters?.search,
        sortBy: options?.sorting?.sortBy,
        sortOrder: options?.sorting?.sortOrder,
      }),
      "GET",
      {},
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch community payouts");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error fetching community payouts for ${communityUID}`, error);
    throw new Error(`Failed to fetch community payouts: ${getErrorMessage(error)}`);
  }
};

/**
 * Save payout configs (payout address and total grant amount) for multiple grants
 */
export const savePayoutConfigs = async (
  request: SavePayoutConfigRequest
): Promise<SavePayoutConfigResponse> => {
  try {
    const [data, error] = await fetchData<SavePayoutConfigResponse>(
      INDEXER.V2.PAYOUT_CONFIG.SAVE,
      "POST",
      request,
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to save payout configs");
    }

    return data;
  } catch (error: unknown) {
    errorManager("Error saving payout configs", error);
    throw new Error(`Failed to save payout configs: ${getErrorMessage(error)}`);
  }
};

/**
 * Get payout configs for a community
 */
export const getPayoutConfigsByCommunity = async (
  communityUID: string
): Promise<PayoutGrantConfig[]> => {
  try {
    const [data, error] = await fetchData<{ configs: PayoutGrantConfig[] }>(
      INDEXER.V2.PAYOUT_CONFIG.BY_COMMUNITY(communityUID),
      "GET",
      {},
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch payout configs");
    }

    return data.configs;
  } catch (error: unknown) {
    errorManager(`Error fetching payout configs for community ${communityUID}`, error);
    throw new Error(`Failed to fetch payout configs: ${getErrorMessage(error)}`);
  }
};

/**
 * Get payout config for a specific grant
 */
export const getPayoutConfigByGrant = async (
  grantUID: string
): Promise<PayoutGrantConfig | null> => {
  try {
    const [data, error] = await fetchData<{ config: PayoutGrantConfig | null }>(
      INDEXER.V2.PAYOUT_CONFIG.BY_GRANT(grantUID),
      "GET",
      {},
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to fetch payout config");
    }

    return data.config;
  } catch (error: unknown) {
    errorManager(`Error fetching payout config for grant ${grantUID}`, error);
    throw new Error(`Failed to fetch payout config: ${getErrorMessage(error)}`);
  }
};

/**
 * Validate bulk import rows against all community grants via backend matching
 */
export const validateBulkImportRows = async (
  communityUID: string,
  rows: Array<{
    rowNumber: number;
    grantUID: string;
    projectUID: string;
    projectSlug: string;
    projectName: string;
    payoutAddress: string;
    amount: string;
  }>
): Promise<
  Array<{
    rowNumber: number;
    grantUID: string;
    projectUID: string;
    projectSlug: string;
    projectName: string;
    payoutAddress: string;
    amount: string;
    status: "valid" | "invalid";
    errors: string[];
    target: {
      grantUID: string;
      projectUID: string;
      matchedBy: string;
    } | null;
  }>
> => {
  try {
    const [data, error] = await fetchData<{
      rows: Array<{
        rowNumber: number;
        grantUID: string;
        projectUID: string;
        projectSlug: string;
        projectName: string;
        payoutAddress: string;
        amount: string;
        status: "valid" | "invalid";
        errors: string[];
        target: {
          grantUID: string;
          projectUID: string;
          matchedBy: string;
        } | null;
      }>;
    }>(
      INDEXER.V2.PAYOUT_CONFIG.VALIDATE_BULK_IMPORT,
      "POST",
      { communityUID, rows },
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to validate bulk import");
    }

    return data.rows;
  } catch (error: unknown) {
    errorManager("Error validating bulk import", error);
    throw new Error(`Failed to validate bulk import: ${getErrorMessage(error)}`);
  }
};

/**
 * Delete payout config for a grant
 */
export const deletePayoutConfig = async (grantUID: string): Promise<void> => {
  try {
    const [, error] = await fetchData(
      INDEXER.V2.PAYOUT_CONFIG.DELETE(grantUID),
      "DELETE",
      {},
      {},
      {},
      true,
      false
    );

    if (error) {
      throw new Error(error);
    }
  } catch (error: unknown) {
    errorManager(`Error deleting payout config for grant ${grantUID}`, error);
    throw new Error(`Failed to delete payout config: ${getErrorMessage(error)}`);
  }
};

/**
 * Toggle grant agreement signed status
 */
export const toggleGrantAgreement = async (
  grantUID: string,
  signed: boolean,
  communityUID: string,
  signedAt?: string
): Promise<CommunityPayoutAgreementInfo> => {
  try {
    const body: Record<string, unknown> = { signed, communityUID };
    if (signedAt) body.signedAt = signedAt;

    const [data, error] = await fetchData<CommunityPayoutAgreementInfo>(
      INDEXER.V2.GRANT_AGREEMENTS.TOGGLE(grantUID),
      "POST",
      body,
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to toggle agreement");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error toggling agreement for grant ${grantUID}`, error);
    throw new Error(`Failed to toggle agreement: ${getErrorMessage(error)}`);
  }
};

/**
 * Batch save milestone invoices for a grant
 */
export const saveMilestoneInvoices = async (
  grantUID: string,
  communityUID: string,
  invoices: Array<{
    milestoneLabel: string;
    milestoneUID?: string | null;
    invoiceReceivedAt?: string | null;
  }>
): Promise<{ invoices: CommunityPayoutInvoiceInfo[] }> => {
  try {
    const [data, error] = await fetchData<{ invoices: CommunityPayoutInvoiceInfo[] }>(
      INDEXER.V2.MILESTONE_INVOICES.BATCH_SAVE(grantUID),
      "PUT",
      { communityUID, invoices },
      {},
      {},
      true,
      false
    );

    if (error || !data) {
      throw new Error(error || "Failed to save invoices");
    }

    return data;
  } catch (error: unknown) {
    errorManager(`Error saving invoices for grant ${grantUID}`, error);
    throw new Error(`Failed to save invoices: ${getErrorMessage(error)}`);
  }
};
