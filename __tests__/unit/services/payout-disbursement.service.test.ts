/**
 * @file Tests for payout-disbursement.service.ts
 * @description Tests all payout disbursement service functions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    V2: {
      PAYOUTS: {
        CREATE: "/v2/payouts",
        RECORD_PAYMENT: "/v2/payouts/record-payment",
        RECORD_SAFE_TX: (id: string) => `/v2/payouts/${id}/safe-tx`,
        GRANT_HISTORY: (uid: string, page?: number, limit?: number) =>
          `/v2/payouts/grant/${uid}?page=${page ?? 1}&limit=${limit ?? 10}`,
        GRANT_TOTAL_DISBURSED: (uid: string) => `/v2/payouts/grant/${uid}/total`,
        COMMUNITY_PENDING: (uid: string, page?: number, limit?: number) =>
          `/v2/payouts/community/${uid}/pending?page=${page ?? 1}&limit=${limit ?? 10}`,
        UPDATE_STATUS: (id: string) => `/v2/payouts/${id}/status`,
        SAFE_AWAITING: (addr: string, page?: number, limit?: number) =>
          `/v2/payouts/safe/${addr}/awaiting?page=${page ?? 1}&limit=${limit ?? 10}`,
        COMMUNITY_RECENT: (uid: string, _page?: number, _limit?: number, _status?: string) =>
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
        DOWNLOAD: (key: string) => `/v2/milestone-invoices/download?key=${encodeURIComponent(key)}`,
      },
      GRANTS: {
        INVOICE_REQUIREMENT: (uid: string) => `/v2/grants/${uid}/invoice-requirement`,
        INVOICE_SUBMIT: (uid: string) => `/v2/grants/${uid}/invoice`,
        INVOICE_DOWNLOAD: (uid: string, key: string) =>
          `/v2/grants/${uid}/invoice/download?key=${encodeURIComponent(key)}`,
      },
    },
  },
}));

import {
  checkGrantInvoiceRequired,
  createDisbursements,
  deletePayoutConfig,
  getAwaitingSignaturesDisbursements,
  getGrantInvoiceDownloadUrl,
  getInvoiceDownloadUrl,
  getPayoutConfigByGrant,
  getPayoutConfigByGrantPublic,
  getPayoutConfigsByCommunity,
  getPayoutConfigsByCommunityPublic,
  getPayoutHistory,
  getPendingDisbursements,
  getTotalDisbursed,
  recordPayment,
  recordSafeTransaction,
  saveMilestoneInvoices,
  savePayoutConfigs,
  submitGranteeInvoice,
  toggleGrantAgreement,
  updateDisbursementStatus,
  validateBulkImportRows,
} from "@/features/payout-disbursement/services/payout-disbursement.service";
import type {
  CreateDisbursementsRequest,
  RecordPaymentRequest,
  RecordSafeTransactionRequest,
  SavePayoutConfigRequest,
  UpdateStatusRequest,
} from "@/features/payout-disbursement/types/payout-disbursement";
import { api } from "@/utilities/api/client";

const mockApiGet = api.get as ReturnType<typeof vi.fn>;
const mockApiPost = api.post as ReturnType<typeof vi.fn>;
const mockApiPut = api.put as ReturnType<typeof vi.fn>;
const mockApiPatch = api.patch as ReturnType<typeof vi.fn>;
const mockApiDelete = api.delete as ReturnType<typeof vi.fn>;

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
      mockApiPost.mockResolvedValue({ disbursements });

      const result = await createDisbursements({
        grants: [],
      } as unknown as CreateDisbursementsRequest);
      expect(result).toEqual(disbursements);
    });

    it("throws on fetch error", async () => {
      mockApiPost.mockRejectedValue(new Error("Server error"));
      await expect(
        createDisbursements({ grants: [] } as unknown as CreateDisbursementsRequest)
      ).rejects.toThrow(/Failed to create disbursements/);
    });

    it("throws when data is null", async () => {
      mockApiPost.mockResolvedValue(null);
      await expect(
        createDisbursements({ grants: [] } as unknown as CreateDisbursementsRequest)
      ).rejects.toThrow(/Failed to create disbursements/);
    });
  });

  // =========================================================================
  // recordPayment
  // =========================================================================

  describe("recordPayment", () => {
    const request: RecordPaymentRequest = {
      grantUID: "grant-1",
      projectUID: "project-1",
      communityUID: "community-1",
      chainID: 1,
      disbursedAmount: "50000000000",
      tokenDecimals: 6,
      token: "USDC",
      tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      paymentDate: "2026-03-01T00:00:00.000Z",
      transactionHash: "0xabc123",
      notes: "Initial Payment",
    };

    it("should call api.post with correct url and body", async () => {
      const disbursement = { id: "d1", status: "DISBURSED" };
      mockApiPost.mockResolvedValue(disbursement);

      await recordPayment(request);

      expect(mockApiPost).toHaveBeenCalledWith("/v2/payouts/record-payment", request);
    });

    it("should return disbursement on success", async () => {
      const disbursement = { id: "d1", status: "DISBURSED", grantUID: "grant-1" };
      mockApiPost.mockResolvedValue(disbursement);

      const result = await recordPayment(request);
      expect(result).toEqual(disbursement);
    });

    it("should throw on error response", async () => {
      mockApiPost.mockRejectedValue(new Error("Server error"));

      await expect(recordPayment(request)).rejects.toThrow(/Failed to record payment/);
    });

    it("should throw when data is null", async () => {
      mockApiPost.mockResolvedValue(null);

      await expect(recordPayment(request)).rejects.toThrow(/Failed to record payment/);
    });
  });

  // =========================================================================
  // recordSafeTransaction
  // =========================================================================

  describe("recordSafeTransaction", () => {
    it("records safe tx and returns disbursement", async () => {
      const disbursement = { id: "d1", status: "pending_signatures" };
      mockApiPost.mockResolvedValue(disbursement);

      const result = await recordSafeTransaction("d1", {
        safeTxHash: "0xhash",
        safeAddress: "0xSafe",
      } as unknown as RecordSafeTransactionRequest);
      expect(result).toEqual(disbursement);
    });

    it("throws on error", async () => {
      mockApiPost.mockRejectedValue(new Error("Not found"));
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
      mockApiGet.mockResolvedValue(response);

      const result = await getPayoutHistory("grant-1", 1, 10);
      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockApiGet.mockRejectedValue(new Error("Error"));
      await expect(getPayoutHistory("grant-1")).rejects.toThrow(/Failed to fetch payout history/);
    });
  });

  // =========================================================================
  // getTotalDisbursed
  // =========================================================================

  describe("getTotalDisbursed", () => {
    it("returns total disbursed amount", async () => {
      mockApiGet.mockResolvedValue({ totalDisbursed: "1500.00" });
      const result = await getTotalDisbursed("grant-1");
      expect(result).toBe("1500.00");
    });

    it("throws on error", async () => {
      mockApiGet.mockRejectedValue(new Error("Error"));
      await expect(getTotalDisbursed("grant-1")).rejects.toThrow(/Failed to fetch total disbursed/);
    });
  });

  // =========================================================================
  // getPendingDisbursements
  // =========================================================================

  describe("getPendingDisbursements", () => {
    it("returns pending disbursements", async () => {
      const response = { data: [{ id: "d1", status: "pending" }], total: 1 };
      mockApiGet.mockResolvedValue(response);

      const result = await getPendingDisbursements("community-1");
      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockApiGet.mockRejectedValue(new Error("Error"));
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
      mockApiPatch.mockResolvedValue(disbursement);

      const result = await updateDisbursementStatus("d1", {
        status: "completed",
      } as unknown as UpdateStatusRequest);
      expect(result).toEqual(disbursement);
    });

    it("throws on error", async () => {
      mockApiPatch.mockRejectedValue(new Error("Forbidden"));
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
      mockApiGet.mockResolvedValue(response);

      const result = await getAwaitingSignaturesDisbursements("0xSafe");
      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockApiGet.mockRejectedValue(new Error("Error"));
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
      mockApiPost.mockResolvedValue(response);

      const result = await savePayoutConfigs({ configs: [] } as unknown as SavePayoutConfigRequest);
      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockApiPost.mockRejectedValue(new Error("Error"));
      await expect(
        savePayoutConfigs({ configs: [] } as unknown as SavePayoutConfigRequest)
      ).rejects.toThrow(/Failed to save payout configs/);
    });
  });

  describe("getPayoutConfigsByCommunity", () => {
    it("returns configs array", async () => {
      const configs = [{ grantUID: "g1" }];
      mockApiGet.mockResolvedValue({ configs });

      const result = await getPayoutConfigsByCommunity("community-1");
      expect(result).toEqual(configs);
    });

    it("throws on error", async () => {
      mockApiGet.mockRejectedValue(new Error("Error"));
      await expect(getPayoutConfigsByCommunity("c1")).rejects.toThrow(
        /Failed to fetch payout configs/
      );
    });
  });

  describe("getPayoutConfigsByCommunityPublic", () => {
    it("returns configs array (no auth)", async () => {
      const configs = [{ grantUID: "g1" }];
      mockApiGet.mockResolvedValue({ configs });

      const result = await getPayoutConfigsByCommunityPublic("community-1");
      expect(result).toEqual(configs);
    });
  });

  describe("getPayoutConfigByGrant", () => {
    it("returns config for grant", async () => {
      const config = { grantUID: "g1", payoutAddress: "0xAddr" };
      mockApiGet.mockResolvedValue({ config });

      const result = await getPayoutConfigByGrant("g1");
      expect(result).toEqual(config);
    });

    it("returns null when config is null", async () => {
      mockApiGet.mockResolvedValue({ config: null });
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
      mockApiGet.mockResolvedValue({ config });

      const result = await getPayoutConfigByGrantPublic("g1");
      expect(result).toEqual(config);
    });

    it("returns null when no config exists", async () => {
      mockApiGet.mockResolvedValue({ config: null });
      const result = await getPayoutConfigByGrantPublic("g1");
      expect(result).toBeNull();
    });

    it("calls the public endpoint without auth flag", async () => {
      mockApiGet.mockResolvedValue({ config: null });
      await getPayoutConfigByGrantPublic("g1");
      expect(mockApiGet).toHaveBeenCalledWith("/v2/payout-config/grant/g1/public", {
        isAuthorized: false,
      });
    });

    it("throws when fetch fails", async () => {
      mockApiGet.mockRejectedValue(new Error("Not found"));
      await expect(getPayoutConfigByGrantPublic("g1")).rejects.toThrow(
        /Failed to fetch payout config/
      );
    });
  });

  describe("deletePayoutConfig", () => {
    it("deletes config without error", async () => {
      mockApiDelete.mockResolvedValue(undefined);
      await expect(deletePayoutConfig("g1")).resolves.toBeUndefined();
    });

    it("throws on error", async () => {
      mockApiDelete.mockRejectedValue(new Error("Forbidden"));
      await expect(deletePayoutConfig("g1")).rejects.toThrow(/Failed to delete payout config/);
    });
  });

  // =========================================================================
  // toggleGrantAgreement
  // =========================================================================

  describe("toggleGrantAgreement", () => {
    it("toggles agreement signed status", async () => {
      const agreement = { grantUID: "g1", signed: true };
      mockApiPost.mockResolvedValue(agreement);

      const result = await toggleGrantAgreement("g1", true, "community-1");
      expect(result).toEqual(agreement);
    });

    it("includes signedAt when provided", async () => {
      mockApiPost.mockResolvedValue({ grantUID: "g1", signed: true });

      await toggleGrantAgreement("g1", true, "c1", "2025-01-01T00:00:00Z");
      expect(mockApiPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signedAt: "2025-01-01T00:00:00Z" })
      );
    });

    it("throws on error", async () => {
      mockApiPost.mockRejectedValue(new Error("Error"));
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
      mockApiPut.mockResolvedValue({ invoices });

      const result = await saveMilestoneInvoices("g1", "c1", [
        { milestoneLabel: "M1", invoiceReceivedAt: "2025-01-01" },
      ]);
      expect(result.invoices).toEqual(invoices);
    });

    it("throws on error", async () => {
      mockApiPut.mockRejectedValue(new Error("Error"));
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
      mockApiPost.mockResolvedValue({ rows });

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
      mockApiPost.mockRejectedValue(new Error("Validation failed"));
      await expect(validateBulkImportRows("c1", [])).rejects.toThrow(
        /Failed to validate bulk import/
      );
    });
  });

  // =========================================================================
  // getInvoiceDownloadUrl
  // =========================================================================

  describe("getInvoiceDownloadUrl", () => {
    it("returns presigned download URL", async () => {
      mockApiGet.mockResolvedValue({ downloadUrl: "https://s3.example.com/invoice.pdf" });

      const result = await getInvoiceDownloadUrl("invoices/grant-1/file.pdf");
      expect(result).toBe("https://s3.example.com/invoice.pdf");
    });

    it("throws when downloadUrl is missing from response", async () => {
      mockApiGet.mockResolvedValue({});
      await expect(getInvoiceDownloadUrl("key")).rejects.toThrow(/Failed to get download URL/);
    });

    it("throws on fetch error", async () => {
      mockApiGet.mockRejectedValue(new Error("Not found"));
      await expect(getInvoiceDownloadUrl("key")).rejects.toThrow(/Failed to get download URL/);
    });
  });

  // =========================================================================
  // checkGrantInvoiceRequired
  // =========================================================================

  describe("checkGrantInvoiceRequired", () => {
    it("returns invoice requirement data when API succeeds", async () => {
      const response = { invoiceRequired: true, invoiceStatus: "pending", invoiceFileKey: null };
      mockApiGet.mockResolvedValue({ data: response });

      const result = await checkGrantInvoiceRequired("grant-1");
      expect(result).toEqual(response);
    });

    it("returns { invoiceRequired: false } on fetch error", async () => {
      mockApiGet.mockRejectedValue(new Error("Server error"));

      const result = await checkGrantInvoiceRequired("grant-1");
      expect(result).toEqual({ invoiceRequired: false });
    });

    it("returns { invoiceRequired: false } when data is null", async () => {
      mockApiGet.mockResolvedValue(null);

      const result = await checkGrantInvoiceRequired("grant-1");
      expect(result).toEqual({ invoiceRequired: false });
    });

    it("returns { invoiceRequired: false } when fetchData throws", async () => {
      mockApiGet.mockRejectedValue(new Error("Network failure"));

      const result = await checkGrantInvoiceRequired("grant-1");
      expect(result).toEqual({ invoiceRequired: false });
    });

    it("calls the correct URL with the grant UID", async () => {
      mockApiGet.mockResolvedValue({ data: { invoiceRequired: false } });

      await checkGrantInvoiceRequired("abc-123");
      expect(mockApiGet).toHaveBeenCalledWith("/v2/grants/abc-123/invoice-requirement");
    });
  });

  // =========================================================================
  // submitGranteeInvoice
  // =========================================================================

  describe("submitGranteeInvoice", () => {
    const invoice = {
      milestoneLabel: "Milestone 1",
      milestoneUID: "ms-1",
      invoiceFileKey: "invoices/grant-1/file.pdf",
      invoiceFileUrl: "https://s3.example.com/file.pdf",
    };

    it("submits invoice and returns the saved invoice", async () => {
      const savedInvoice = { ...invoice, id: "inv-1", createdAt: "2026-04-01" };
      mockApiPut.mockResolvedValue({ data: { invoice: savedInvoice } });

      const result = await submitGranteeInvoice("grant-1", invoice);
      expect(result).toEqual(savedInvoice);
    });

    it("calls the correct URL with PUT method and invoice body", async () => {
      mockApiPut.mockResolvedValue({ data: { invoice: {} } });

      await submitGranteeInvoice("grant-1", invoice);
      expect(mockApiPut).toHaveBeenCalledWith("/v2/grants/grant-1/invoice", invoice);
    });

    it("surfaces the backend error message verbatim", async () => {
      mockApiPut.mockRejectedValue(new Error("An invoice already exists for this milestone"));
      await expect(submitGranteeInvoice("grant-1", invoice)).rejects.toThrow(
        "An invoice already exists for this milestone"
      );
    });

    it("falls back to a generic message when the backend provides none", async () => {
      mockApiPut.mockResolvedValue(null);
      await expect(submitGranteeInvoice("grant-1", invoice)).rejects.toThrow(
        "Failed to submit invoice"
      );
    });
  });

  // =========================================================================
  // getGrantInvoiceDownloadUrl
  // =========================================================================

  describe("getGrantInvoiceDownloadUrl", () => {
    it("returns the download URL", async () => {
      mockApiGet.mockResolvedValue({ data: { downloadUrl: "https://s3.example.com/signed-url" } });

      const result = await getGrantInvoiceDownloadUrl("grant-1", "invoices/file.pdf");
      expect(result).toBe("https://s3.example.com/signed-url");
    });

    it("calls the correct URL with grant UID and encoded file key", async () => {
      mockApiGet.mockResolvedValue({ data: { downloadUrl: "https://example.com" } });

      await getGrantInvoiceDownloadUrl("grant-1", "path/with spaces.pdf");
      expect(mockApiGet).toHaveBeenCalledWith(
        "/v2/grants/grant-1/invoice/download?key=path%2Fwith%20spaces.pdf"
      );
    });

    it("throws when downloadUrl is missing from response", async () => {
      mockApiGet.mockResolvedValue({});
      await expect(getGrantInvoiceDownloadUrl("grant-1", "key")).rejects.toThrow(
        /Failed to get download URL/
      );
    });

    it("throws on fetch error", async () => {
      mockApiGet.mockRejectedValue(new Error("Forbidden"));
      await expect(getGrantInvoiceDownloadUrl("grant-1", "key")).rejects.toThrow(
        /Failed to get download URL/
      );
    });
  });
});
