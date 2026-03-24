import {
  type PaginatedDisbursementsResponse,
  type PaginationInfo,
  type PayoutDisbursement,
  PayoutDisbursementStatus,
} from "@/src/features/payout-disbursement/types/payout-disbursement";
import { applyOverrides, type DeepPartial, randomAddress, seq } from "./utils";

// ─── Disbursement factory ───

export function createMockDisbursement(
  overrides?: DeepPartial<PayoutDisbursement>
): PayoutDisbursement {
  const n = seq();
  const now = new Date().toISOString();
  const defaults: PayoutDisbursement = {
    id: `disb-${n}`,
    grantUID: `0xgrant${n.toString(16).padStart(12, "0")}`,
    projectUID: `0xproject${n.toString(16).padStart(12, "0")}`,
    communityUID: `0xcommunity${n.toString(16).padStart(8, "0")}`,
    chainID: 10,
    safeAddress: randomAddress(),
    safeTransactionHash: null,
    disbursedAmount: "25000",
    token: "USDC",
    tokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    tokenDecimals: 6,
    payoutAddress: randomAddress(),
    milestoneBreakdown: null,
    paidAllocationIds: [],
    status: PayoutDisbursementStatus.PENDING,
    executedAt: null,
    createdBy: randomAddress(),
    createdAt: now,
    updatedAt: now,
  };
  return applyOverrides(defaults, overrides);
}

// ─── Paginated disbursements ───

export function createMockPaginatedDisbursements(
  page = 1,
  limit = 10,
  status?: PayoutDisbursementStatus
): PaginatedDisbursementsResponse {
  const totalCount = 25;
  const totalPages = Math.ceil(totalCount / limit);
  const itemsOnPage = Math.min(limit, totalCount - (page - 1) * limit);

  const payload = Array.from({ length: itemsOnPage }, () => {
    const base = createMockDisbursement();
    return status ? { ...base, status } : base;
  });

  const pagination: PaginationInfo = {
    totalCount,
    page,
    limit,
    totalPages,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  return { payload, pagination };
}

// ─── Status presets ───

export function pendingDisbursement(
  overrides?: DeepPartial<PayoutDisbursement>
): PayoutDisbursement {
  return createMockDisbursement({
    status: PayoutDisbursementStatus.PENDING,
    ...overrides,
  } as DeepPartial<PayoutDisbursement>);
}

export function awaitingSignaturesDisbursement(
  overrides?: DeepPartial<PayoutDisbursement>
): PayoutDisbursement {
  return createMockDisbursement({
    status: PayoutDisbursementStatus.AWAITING_SIGNATURES,
    safeTransactionHash: "0xabc123def456789012345678901234567890abcdef0123456789012345678901",
    ...overrides,
  } as DeepPartial<PayoutDisbursement>);
}

export function disbursedDisbursement(
  overrides?: DeepPartial<PayoutDisbursement>
): PayoutDisbursement {
  return createMockDisbursement({
    status: PayoutDisbursementStatus.DISBURSED,
    safeTransactionHash: "0xabc123def456789012345678901234567890abcdef0123456789012345678901",
    executedAt: "2024-08-15T14:30:00Z",
    ...overrides,
  } as DeepPartial<PayoutDisbursement>);
}

export function confirmedDisbursement(
  overrides?: DeepPartial<PayoutDisbursement>
): PayoutDisbursement {
  // CONFIRMED is not a real status in the enum; use DISBURSED with executedAt as "confirmed"
  return createMockDisbursement({
    status: PayoutDisbursementStatus.DISBURSED,
    safeTransactionHash: "0xabc123def456789012345678901234567890abcdef0123456789012345678901",
    executedAt: "2024-08-15T14:30:00Z",
    ...overrides,
  } as DeepPartial<PayoutDisbursement>);
}
