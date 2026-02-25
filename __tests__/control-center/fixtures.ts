/**
 * Mock data fixtures for Control Center tests.
 * Types match the real types from @/src/features/payout-disbursement.
 */

import {
  AggregatedDisbursementStatus,
  type CommunityPayoutAgreementInfo,
  type CommunityPayoutDisbursementInfo,
  type CommunityPayoutGrantInfo,
  type CommunityPayoutInvoiceInfo,
  type CommunityPayoutItem,
  type CommunityPayoutProjectInfo,
  type CommunityPayoutsResponse,
  type PaginationInfo,
  type PayoutDisbursement,
  PayoutDisbursementStatus,
  type PayoutGrantConfig,
  type TokenTotal,
} from "@/src/features/payout-disbursement";

// ---- Community ----

export const mockCommunity = {
  uid: "community-uid-1",
  details: {
    name: "Test Community",
    slug: "test-community",
    description: "A test community for unit tests",
  },
};

// ---- Project ----

export function createMockProject(
  overrides?: Partial<CommunityPayoutProjectInfo>
): CommunityPayoutProjectInfo {
  return {
    uid: "project-uid-1",
    title: "Test Project Alpha",
    slug: "test-project-alpha",
    chainID: 10,
    payoutAddress: null,
    chainPayoutAddress: null,
    adminPayoutAddress: "0x1234567890abcdef1234567890abcdef12345678",
    ...overrides,
  };
}

// ---- Grant ----

export function createMockGrant(
  overrides?: Partial<CommunityPayoutGrantInfo>
): CommunityPayoutGrantInfo {
  return {
    uid: "grant-uid-1",
    title: "Grant Round 1",
    chainID: 10,
    payoutAmount: "10000",
    currency: "USDC",
    payoutAddress: null,
    programId: "program-1",
    adminPayoutAmount: "10000",
    ...overrides,
  };
}

// ---- Disbursement ----

export function createMockDisbursement(
  overrides?: Partial<PayoutDisbursement>
): PayoutDisbursement {
  return {
    id: "disbursement-1",
    grantUID: "grant-uid-1",
    projectUID: "project-uid-1",
    communityUID: "community-uid-1",
    chainID: 10,
    safeAddress: "0xSafe1234567890abcdef1234567890abcdef1234",
    safeTransactionHash: null,
    disbursedAmount: "5000000000",
    token: "USDC",
    tokenAddress: "0xTokenAddress1234567890abcdef12345678",
    tokenDecimals: 6,
    payoutAddress: "0x1234567890abcdef1234567890abcdef12345678",
    milestoneBreakdown: null,
    paidAllocationIds: [],
    status: PayoutDisbursementStatus.DISBURSED,
    executedAt: "2024-06-15T10:00:00Z",
    createdBy: "0xAdmin1234567890abcdef1234567890abcdef",
    createdAt: "2024-06-15T09:00:00Z",
    updatedAt: "2024-06-15T10:00:00Z",
    ...overrides,
  };
}

// ---- Token Totals ----

export function createMockTokenTotal(overrides?: Partial<TokenTotal>): TokenTotal {
  return {
    token: "USDC",
    tokenDecimals: 6,
    tokenAddress: "0xTokenAddress1234567890abcdef12345678",
    chainID: 10,
    totalAmount: "5000000000", // 5000 USDC
    ...overrides,
  };
}

// ---- Agreement ----

export function createMockAgreement(
  overrides?: Partial<CommunityPayoutAgreementInfo>
): CommunityPayoutAgreementInfo {
  return {
    signed: true,
    signedAt: "2024-06-01T00:00:00Z",
    signedBy: "0xAdmin1234567890abcdef1234567890abcdef",
    ...overrides,
  };
}

// ---- Invoice ----

export function createMockInvoice(
  overrides?: Partial<CommunityPayoutInvoiceInfo>
): CommunityPayoutInvoiceInfo {
  return {
    milestoneLabel: "Milestone 1",
    milestoneUID: "milestone-uid-1",
    milestoneStatus: null,
    milestoneDueDate: null,
    milestoneStatusUpdatedAt: null,
    invoiceStatus: "received" as const,
    invoiceReceivedAt: "2024-06-10T00:00:00Z",
    invoiceReceivedBy: null,
    allocatedAmount: null,
    paymentStatus: "unpaid" as const,
    paymentStatusDate: null,
    ...overrides,
  };
}

// ---- Disbursement Info ----

export function createMockDisbursementInfo(
  overrides?: Partial<CommunityPayoutDisbursementInfo>
): CommunityPayoutDisbursementInfo {
  return {
    totalDisbursed: "5000",
    totalsByToken: [createMockTokenTotal()],
    status: AggregatedDisbursementStatus.IN_PROGRESS,
    history: [createMockDisbursement()],
    ...overrides,
  };
}

// ---- Payout Item (combines all the above) ----

export function createMockPayoutItem(
  overrides?: Partial<CommunityPayoutItem>
): CommunityPayoutItem {
  return {
    project: createMockProject(),
    grant: createMockGrant(),
    disbursements: createMockDisbursementInfo(),
    agreement: createMockAgreement(),
    milestoneInvoices: [
      createMockInvoice(),
      createMockInvoice({
        milestoneLabel: "Milestone 2",
        milestoneUID: "milestone-uid-2",
        invoiceStatus: "not_submitted",
        invoiceReceivedAt: null,
      }),
    ],
    paidMilestoneCount: 0,
    ...overrides,
  };
}

// ---- Pagination ----

export function createMockPagination(overrides?: Partial<PaginationInfo>): PaginationInfo {
  return {
    totalCount: 1,
    page: 1,
    limit: 50,
    totalPages: 1,
    nextPage: null,
    prevPage: null,
    hasNextPage: false,
    hasPrevPage: false,
    ...overrides,
  };
}

// ---- Full Payouts Response ----

export function createMockPayoutsResponse(
  items?: CommunityPayoutItem[],
  pagination?: Partial<PaginationInfo>
): CommunityPayoutsResponse {
  const payload = items || [createMockPayoutItem()];
  return {
    payload,
    pagination: createMockPagination({
      totalCount: payload.length,
      ...pagination,
    }),
  };
}

// ---- Payout Config ----

export function createMockPayoutConfig(overrides?: Partial<PayoutGrantConfig>): PayoutGrantConfig {
  return {
    id: "config-1",
    grantUID: "grant-uid-1",
    projectUID: "project-uid-1",
    communityUID: "community-uid-1",
    payoutAddress: "0x1234567890abcdef1234567890abcdef12345678",
    totalGrantAmount: "10000",
    tokenAddress: "0xTokenAddress1234567890abcdef12345678",
    chainID: 10,
    milestoneAllocations: [
      {
        id: "alloc-1",
        milestoneUID: "milestone-uid-1",
        label: "Milestone 1",
        amount: "5000",
      },
      {
        id: "alloc-2",
        milestoneUID: "milestone-uid-2",
        label: "Milestone 2",
        amount: "5000",
      },
    ],
    createdBy: "0xAdmin1234567890abcdef1234567890abcdef",
    updatedBy: null,
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2024-06-01T00:00:00Z",
    ...overrides,
  };
}

// ---- Multiple items for table testing ----

export function createMultiplePayoutItems(count: number): CommunityPayoutItem[] {
  return Array.from({ length: count }, (_, i) =>
    createMockPayoutItem({
      project: createMockProject({
        uid: `project-uid-${i + 1}`,
        title: `Project ${i + 1}`,
        slug: `project-${i + 1}`,
        adminPayoutAddress:
          i === 0
            ? "0x1234567890abcdef1234567890abcdef12345678"
            : i === 1
              ? "" // empty address
              : "0xabcdef1234567890abcdef1234567890abcdef12",
      }),
      grant: createMockGrant({
        uid: `grant-uid-${i + 1}`,
        title: `Grant ${i + 1}`,
        adminPayoutAmount: i === 1 ? "0" : `${(i + 1) * 5000}`,
      }),
      disbursements: createMockDisbursementInfo({
        totalDisbursed: `${i * 1000}`,
        totalsByToken:
          i > 0
            ? [
                createMockTokenTotal({
                  totalAmount: `${i * 1000000000}`,
                }),
              ]
            : [],
        status:
          i === 0
            ? AggregatedDisbursementStatus.NOT_STARTED
            : i === count - 1
              ? AggregatedDisbursementStatus.COMPLETED
              : AggregatedDisbursementStatus.IN_PROGRESS,
        history:
          i === 0
            ? []
            : [
                createMockDisbursement({
                  id: `disbursement-${i}`,
                  grantUID: `grant-uid-${i + 1}`,
                  status:
                    i === count - 1
                      ? PayoutDisbursementStatus.DISBURSED
                      : PayoutDisbursementStatus.PENDING,
                }),
              ],
      }),
      agreement:
        i % 2 === 0
          ? createMockAgreement()
          : createMockAgreement({ signed: false, signedAt: null, signedBy: null }),
    })
  );
}
