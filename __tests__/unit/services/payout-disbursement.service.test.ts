/**
 * @file Tests for payout-disbursement.service.ts
 * @description Tests all payout disbursement service functions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchData = vi.fn();
vi.mock("@/utilities/fetchData", () => ({
  default: (...args: unknown[]) => mockFetchData(...args),
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    V2: {
      PAYOUTS: {
        CREATE: "/v2/payouts",
        RECORD_SAFE_TX: (id: string) => `/v2/payouts/${id}/safe-tx`,
        GRANT_HISTORY: (uid: string, page?: number, limit?: number) =>
          `/v2/payouts/grant/${uid}?page=${page ?? 1}&limit=${limit ?? 10}`,
        GRANT_TOTAL_DISBURSED: (uid: string) => `/v2/payouts/grant/${uid}/total`,
        COMMUNITY_PENDING: (uid: string, page?: number, limit?: number) =>
          `/v2/payouts/community/${uid}/pending?page=${page ?? 1}&limit=${limit ?? 10}`,
        UPDATE_STATUS: (id: string) => `/v2/payouts/${id}/status`,
        SAFE_AWAITING: (addr: string, page?: number, limit?: number) =>
          `/v2/payouts/safe/${addr}/awaiting?page=${page ?? 1}&limit=${limit ?? 10}`,
        COMMUNITY_RECENT: (uid: string, page?: number, limit?: number, status?: string) =>
          `/v2/payouts/community/${uid}/recent`,
        COMMUNITY_PAYOUTS: (uid: string, _opts?: Record<string, unknown>) =>
          `/v2/payouts/community/${uid}/payouts`,
        COMMUNITY_PAYOUTS_PUBLIC: (uid: string, _opts?: Record<string, unknown>) =>
          `/v2/payouts/community/${uid}/payouts/public`,
      },
      PAYOUT_CONFIG: {
        SAVE: "/v2/payout-config",
        BY_COMMUNITY: (uid: string) => `/v2/payout-config/community/${uid}`,
        BY_COMMUNITY_PUBLIC: (uid: string) => `/v2/payout-config/community/${uid}/public`,
        BY_GRANT: (uid: string) => `/v2/payout-config/grant/${uid}`,
        BY_GRANT_PUBLIC: (uid: string) => `/v2/payout-config/grant/${uid}/public`,
        VALIDATE_BULK_IMPORT: "/v2/payout-config/validate-bulk",
        DELETE: (uid: string) => `/v2/payout-config/grant/${uid}`,
      },
      GRANT_AGREEMENTS: {
        TOGGLE: (uid: string) => `/v2/grant-agreements/${uid}/toggle`,
      },
      MILESTONE_INVOICES: {
        BATCH_SAVE: (uid: string) => `/v2/milestone-invoices/${uid}/batch`,
      },
    },
  },
}));

import {
  createDisbursements,
  deletePayoutConfig,
  getAwaitingSignaturesDisbursements,
  getCommunityPayouts,
  getCommunityPayoutsPublic,
  getPayoutConfigByGrant,
  getPayoutConfigByGrantPublic,
  getPayoutConfigsByCommunity,
  getPayoutConfigsByCommunityPublic,
  getPayoutHistory,
  getPendingDisbursements,
  getRecentCommunityDisbursements,
  getTotalDisbursed,
  recordSafeTransaction,
  saveMilestoneInvoices,
  savePayoutConfigs,
  toggleGrantAgreement,
  updateDisbursementStatus,
  validateBulkImportRows,
} from "@/features/payout-disbursement/services/payout-disbursement.service";
import type {
  CreateDisbursementsRequest,
  RecordSafeTransactionRequest,
  SavePayoutConfigRequest,
  UpdateStatusRequest,
} from "@/features/payout-disbursement/types/payout-disbursement";

describe("payout-disbursement.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // createDisbursements
  // =========================================================================

  describe("createDisbursements", () => {
    it("creates and returns disbursements", async () => {
      const disbursements = [{ id: "d1" }, { id: "d2" }];
      mockFetchData.mockResolvedValue([{ disbursements }, null]);

      const result = await createDisbursements({
        grants: [],
      } as unknown as CreateDisbursementsRequest);
      expect(result).toEqual(disbursements);
    });

    it("throws on fetch error", async () => {
      mockFetchData.mockResolvedValue([null, "Server error"]);
      await expect(
        createDisbursements({ grants: [] } as unknown as CreateDisbursementsRequest)
      ).rejects.toThrow(/Failed to create disbursements/);
    });

    it("throws when data is null", async () => {
      mockFetchData.mockResolvedValue([null, null]);
      await expect(
        createDisbursements({ grants: [] } as unknown as CreateDisbursementsRequest)
      ).rejects.toThrow(/Failed to create disbursements/);
    });
  });

  // =========================================================================
  // recordSafeTransaction
  // =========================================================================

  describe("recordSafeTransaction", () => {
    it("records safe tx and returns disbursement", async () => {
      const disbursement = { id: "d1", status: "pending_signatures" };
      mockFetchData.mockResolvedValue([disbursement, null]);

      const result = await recordSafeTransaction("d1", {
        safeTxHash: "0xhash",
        safeAddress: "0xSafe",
      } as unknown as RecordSafeTransactionRequest);
      expect(result).toEqual(disbursement);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Not found"]);
      await expect(
        recordSafeTransaction("d1", { safeTxHash: "0x" } as unknown as RecordSafeTransactionRequest)
      ).rejects.toThrow(/Failed to record Safe transaction/);
    });
  });

  // =========================================================================
  // getPayoutHistory
  // =========================================================================

  describe("getPayoutHistory", () => {
    it("returns paginated disbursement history", async () => {
      const response = { data: [{ id: "d1" }], total: 1, page: 1 };
      mockFetchData.mockResolvedValue([response, null]);

      const result = await getPayoutHistory("grant-1", 1, 10);
      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Error"]);
      await expect(getPayoutHistory("grant-1")).rejects.toThrow(/Failed to fetch payout history/);
    });
  });

  // =========================================================================
  // getTotalDisbursed
  // =========================================================================

  describe("getTotalDisbursed", () => {
    it("returns total disbursed amount", async () => {
      mockFetchData.mockResolvedValue([{ totalDisbursed: "1500.00" }, null]);
      const result = await getTotalDisbursed("grant-1");
      expect(result).toBe("1500.00");
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Error"]);
      await expect(getTotalDisbursed("grant-1")).rejects.toThrow(/Failed to fetch total disbursed/);
    });
  });

  // =========================================================================
  // getPendingDisbursements
  // =========================================================================

  describe("getPendingDisbursements", () => {
    it("returns pending disbursements", async () => {
      const response = { data: [{ id: "d1", status: "pending" }], total: 1 };
      mockFetchData.mockResolvedValue([response, null]);

      const result = await getPendingDisbursements("community-1");
      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Error"]);
      await expect(getPendingDisbursements("c1")).rejects.toThrow(
        /Failed to fetch pending disbursements/
      );
    });
  });

  // =========================================================================
  // updateDisbursementStatus
  // =========================================================================

  describe("updateDisbursementStatus", () => {
    it("updates status and returns disbursement", async () => {
      const disbursement = { id: "d1", status: "completed" };
      mockFetchData.mockResolvedValue([disbursement, null]);

      const result = await updateDisbursementStatus("d1", {
        status: "completed",
      } as unknown as UpdateStatusRequest);
      expect(result).toEqual(disbursement);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Forbidden"]);
      await expect(
        updateDisbursementStatus("d1", { status: "completed" } as unknown as UpdateStatusRequest)
      ).rejects.toThrow(/Failed to update disbursement status/);
    });
  });

  // =========================================================================
  // getAwaitingSignaturesDisbursements
  // =========================================================================

  describe("getAwaitingSignaturesDisbursements", () => {
    it("returns awaiting signatures disbursements", async () => {
      const response = { data: [{ id: "d1" }], total: 1 };
      mockFetchData.mockResolvedValue([response, null]);

      const result = await getAwaitingSignaturesDisbursements("0xSafe");
      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Error"]);
      await expect(getAwaitingSignaturesDisbursements("0xSafe")).rejects.toThrow(
        /Failed to fetch awaiting signatures/
      );
    });
  });

  // =========================================================================
  // Payout configs
  // =========================================================================

  describe("savePayoutConfigs", () => {
    it("saves and returns payout config response", async () => {
      const response = { saved: 2, configs: [] };
      mockFetchData.mockResolvedValue([response, null]);

      const result = await savePayoutConfigs({ configs: [] } as unknown as SavePayoutConfigRequest);
      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Error"]);
      await expect(
        savePayoutConfigs({ configs: [] } as unknown as SavePayoutConfigRequest)
      ).rejects.toThrow(/Failed to save payout configs/);
    });
  });

  describe("getPayoutConfigsByCommunity", () => {
    it("returns configs array", async () => {
      const configs = [{ grantUID: "g1" }];
      mockFetchData.mockResolvedValue([{ configs }, null]);

      const result = await getPayoutConfigsByCommunity("community-1");
      expect(result).toEqual(configs);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Error"]);
      await expect(getPayoutConfigsByCommunity("c1")).rejects.toThrow(
        /Failed to fetch payout configs/
      );
    });
  });

  describe("getPayoutConfigsByCommunityPublic", () => {
    it("returns configs array (no auth)", async () => {
      const configs = [{ grantUID: "g1" }];
      mockFetchData.mockResolvedValue([{ configs }, null]);

      const result = await getPayoutConfigsByCommunityPublic("community-1");
      expect(result).toEqual(configs);
    });
  });

  describe("getPayoutConfigByGrant", () => {
    it("returns config for grant", async () => {
      const config = { grantUID: "g1", payoutAddress: "0xAddr" };
      mockFetchData.mockResolvedValue([{ config }, null]);

      const result = await getPayoutConfigByGrant("g1");
      expect(result).toEqual(config);
    });

    it("returns null when config is null", async () => {
      mockFetchData.mockResolvedValue([{ config: null }, null]);
      const result = await getPayoutConfigByGrant("g1");
      expect(result).toBeNull();
    });
  });

  describe("getPayoutConfigByGrantPublic", () => {
    it("returns config for grant without authentication", async () => {
      const config = {
        grantUID: "g1",
        payoutAddress: "0xAddr",
        milestoneAllocations: [{ id: "a1", label: "Milestone 1", amount: "5000" }],
      };
      mockFetchData.mockResolvedValue([{ config }, null]);

      const result = await getPayoutConfigByGrantPublic("g1");
      expect(result).toEqual(config);
    });

    it("returns null when no config exists", async () => {
      mockFetchData.mockResolvedValue([{ config: null }, null]);
      const result = await getPayoutConfigByGrantPublic("g1");
      expect(result).toBeNull();
    });

    it("calls the public endpoint without auth flag", async () => {
      mockFetchData.mockResolvedValue([{ config: null }, null]);
      await getPayoutConfigByGrantPublic("g1");
      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/payout-config/grant/g1/public",
        "GET",
        {},
        {},
        {},
        false,
        false
      );
    });

    it("throws when fetch fails", async () => {
      mockFetchData.mockResolvedValue([null, "Not found"]);
      await expect(getPayoutConfigByGrantPublic("g1")).rejects.toThrow(
        /Failed to fetch payout config/
      );
    });
  });

  describe("deletePayoutConfig", () => {
    it("deletes config without error", async () => {
      mockFetchData.mockResolvedValue([null, null]);
      await expect(deletePayoutConfig("g1")).resolves.toBeUndefined();
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Forbidden"]);
      await expect(deletePayoutConfig("g1")).rejects.toThrow(/Failed to delete payout config/);
    });
  });

  // =========================================================================
  // toggleGrantAgreement
  // =========================================================================

  describe("toggleGrantAgreement", () => {
    it("toggles agreement signed status", async () => {
      const agreement = { grantUID: "g1", signed: true };
      mockFetchData.mockResolvedValue([agreement, null]);

      const result = await toggleGrantAgreement("g1", true, "community-1");
      expect(result).toEqual(agreement);
    });

    it("includes signedAt when provided", async () => {
      mockFetchData.mockResolvedValue([{ grantUID: "g1", signed: true }, null]);

      await toggleGrantAgreement("g1", true, "c1", "2025-01-01T00:00:00Z");
      expect(mockFetchData).toHaveBeenCalledWith(
        expect.any(String),
        "POST",
        expect.objectContaining({ signedAt: "2025-01-01T00:00:00Z" }),
        expect.anything(),
        expect.anything(),
        true,
        false
      );
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Error"]);
      await expect(toggleGrantAgreement("g1", true, "c1")).rejects.toThrow(
        /Failed to toggle agreement/
      );
    });
  });

  // =========================================================================
  // saveMilestoneInvoices
  // =========================================================================

  describe("saveMilestoneInvoices", () => {
    it("saves milestone invoices", async () => {
      const invoices = [{ milestoneLabel: "M1", invoiceReceivedAt: "2025-01-01" }];
      mockFetchData.mockResolvedValue([{ invoices }, null]);

      const result = await saveMilestoneInvoices("g1", "c1", [
        { milestoneLabel: "M1", invoiceReceivedAt: "2025-01-01" },
      ]);
      expect(result.invoices).toEqual(invoices);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Error"]);
      await expect(saveMilestoneInvoices("g1", "c1", [])).rejects.toThrow(
        /Failed to save invoices/
      );
    });
  });

  // =========================================================================
  // validateBulkImportRows
  // =========================================================================

  describe("validateBulkImportRows", () => {
    it("returns validated rows", async () => {
      const rows = [{ rowNumber: 1, status: "valid", errors: [] }];
      mockFetchData.mockResolvedValue([{ rows }, null]);

      const result = await validateBulkImportRows("c1", [
        {
          rowNumber: 1,
          grantUID: "g1",
          projectUID: "p1",
          projectSlug: "slug",
          projectName: "name",
          payoutAddress: "0xAddr",
          amount: "100",
        },
      ]);
      expect(result).toEqual(rows);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Validation failed"]);
      await expect(validateBulkImportRows("c1", [])).rejects.toThrow(
        /Failed to validate bulk import/
      );
    });
  });
});
