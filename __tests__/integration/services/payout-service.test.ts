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
        CREATE: "/v2/payouts/create",
        RECORD_SAFE_TX: (id: string) => `/v2/payouts/${id}/safe-tx`,
        GRANT_HISTORY: (uid: string, page?: number, limit?: number) => {
          const params = new URLSearchParams();
          if (page) params.set("page", page.toString());
          if (limit) params.set("limit", limit.toString());
          const qs = params.toString();
          return `/v2/payouts/grants/${uid}/history${qs ? `?${qs}` : ""}`;
        },
        GRANT_TOTAL_DISBURSED: (uid: string) => `/v2/payouts/grants/${uid}/total`,
        COMMUNITY_PENDING: (uid: string, page?: number, limit?: number) => {
          const params = new URLSearchParams();
          if (page) params.set("page", page.toString());
          if (limit) params.set("limit", limit.toString());
          const qs = params.toString();
          return `/v2/payouts/communities/${uid}/pending${qs ? `?${qs}` : ""}`;
        },
        UPDATE_STATUS: (id: string) => `/v2/payouts/${id}/status`,
        SAFE_AWAITING: (addr: string, page?: number, limit?: number) =>
          `/v2/payouts/safe/${addr}/awaiting`,
        COMMUNITY_RECENT: (uid: string, page?: number, limit?: number, status?: string) =>
          `/v2/payouts/communities/${uid}/recent`,
        COMMUNITY_PAYOUTS: (uid: string, _opts?: Record<string, unknown>) =>
          `/v2/payouts/communities/${uid}/payouts`,
      },
      PAYOUT_CONFIG: {
        SAVE: "/v2/payout-configs",
        BY_COMMUNITY: (uid: string) => `/v2/payout-configs/community/${uid}`,
        BY_GRANT: (uid: string) => `/v2/payout-configs/grant/${uid}`,
        DELETE: (uid: string) => `/v2/payout-configs/grant/${uid}`,
      },
      GRANT_AGREEMENTS: {
        TOGGLE: (uid: string) => `/v2/grant-agreements/${uid}/toggle`,
      },
      MILESTONE_INVOICES: {
        BATCH_SAVE: (uid: string) => `/v2/milestone-invoices/grants/${uid}/batch`,
      },
    },
  },
}));

import {
  createDisbursements,
  deletePayoutConfig,
  getPayoutConfigByGrant,
  getPayoutHistory,
  getPendingDisbursements,
  getTotalDisbursed,
  recordSafeTransaction,
  savePayoutConfigs,
  updateDisbursementStatus,
} from "@/features/payout-disbursement/services/payout-disbursement.service";
import type {
  CreateDisbursementsRequest,
  RecordSafeTransactionRequest,
  SavePayoutConfigRequest,
  UpdateStatusRequest,
} from "@/features/payout-disbursement/types/payout-disbursement";
import { api } from "@/utilities/api/client";

const mockApiGet = api.get as ReturnType<typeof vi.fn>;
const mockApiPost = api.post as ReturnType<typeof vi.fn>;
const mockApiPatch = api.patch as ReturnType<typeof vi.fn>;
const mockApiDelete = api.delete as ReturnType<typeof vi.fn>;

describe("payout-disbursement service trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- createDisbursements ---

  describe("createDisbursements", () => {
    it("calls api.post with correct endpoint and body", async () => {
      const disbursements = [{ id: "d1", grantUID: "g1" }];
      mockApiPost.mockResolvedValue({ disbursements });

      await createDisbursements({
        communityUID: "c1",
        disbursements: [
          {
            grantUID: "g1",
            amount: "100",
            tokenAddress: "0x1",
            chainId: 1,
          },
        ],
      } as unknown as CreateDisbursementsRequest);

      expect(mockApiPost).toHaveBeenCalledWith("/v2/payouts/create", expect.any(Object));
    });

    it("returns disbursements array from response", async () => {
      const disbursements = [
        { id: "d1", grantUID: "g1", amount: "100" },
        { id: "d2", grantUID: "g2", amount: "200" },
      ];
      mockApiPost.mockResolvedValue({ disbursements });

      const result = await createDisbursements({
        communityUID: "c1",
        disbursements: [],
      } as unknown as CreateDisbursementsRequest);

      expect(result).toEqual(disbursements);
    });

    it("throws when api.post rejects", async () => {
      mockApiPost.mockRejectedValue(new Error("Bad Request"));

      await expect(
        createDisbursements({
          communityUID: "c1",
          disbursements: [],
        } as unknown as CreateDisbursementsRequest)
      ).rejects.toThrow("Failed to create disbursements");
    });
  });

  // --- recordSafeTransaction ---

  describe("recordSafeTransaction", () => {
    it("calls api.post with correct endpoint containing disbursement ID", async () => {
      mockApiPost.mockResolvedValue({ id: "d1", safeTransactionHash: "0xabc" });

      await recordSafeTransaction("d1", {
        safeTransactionHash: "0xabc",
      } as RecordSafeTransactionRequest);

      expect(mockApiPost).toHaveBeenCalledWith(
        "/v2/payouts/d1/safe-tx",
        expect.objectContaining({ safeTransactionHash: "0xabc" })
      );
    });

    it("returns updated disbursement", async () => {
      const updated = { id: "d1", safeTransactionHash: "0xabc" };
      mockApiPost.mockResolvedValue(updated);

      const result = await recordSafeTransaction("d1", {
        safeTransactionHash: "0xabc",
      } as RecordSafeTransactionRequest);

      expect(result).toEqual(updated);
    });

    it("throws with context when error occurs", async () => {
      mockApiPost.mockRejectedValue(new Error("Not Found"));

      await expect(
        recordSafeTransaction("d1", {
          safeTransactionHash: "0xabc",
        } as RecordSafeTransactionRequest)
      ).rejects.toThrow("Failed to record Safe transaction");
    });
  });

  // --- getPayoutHistory ---

  describe("getPayoutHistory", () => {
    it("calls api.get with grant UID and pagination params", async () => {
      const response = { disbursements: [], total: 0, page: 1, limit: 10 };
      mockApiGet.mockResolvedValue(response);

      await getPayoutHistory("g1", 1, 10);

      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("g1"));
    });

    it("returns paginated response", async () => {
      const response = {
        disbursements: [{ id: "d1" }],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockApiGet.mockResolvedValue(response);

      const result = await getPayoutHistory("g1");

      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockApiGet.mockRejectedValue(new Error("Server Error"));

      await expect(getPayoutHistory("g1")).rejects.toThrow("Failed to fetch payout history");
    });
  });

  // --- getTotalDisbursed ---

  describe("getTotalDisbursed", () => {
    it("returns totalDisbursed string", async () => {
      mockApiGet.mockResolvedValue({ totalDisbursed: "5000.00" });

      const result = await getTotalDisbursed("g1");

      expect(result).toBe("5000.00");
    });

    it("throws on error", async () => {
      mockApiGet.mockRejectedValue(new Error("Error"));

      await expect(getTotalDisbursed("g1")).rejects.toThrow("Failed to fetch total disbursed");
    });
  });

  // --- getPendingDisbursements ---

  describe("getPendingDisbursements", () => {
    it("calls api.get with community UID", async () => {
      const response = { disbursements: [], total: 0, page: 1, limit: 10 };
      mockApiGet.mockResolvedValue(response);

      await getPendingDisbursements("c1", 1, 20);

      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining("c1"));
    });

    it("returns paginated pending disbursements", async () => {
      const response = {
        disbursements: [{ id: "d1", status: "pending" }],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockApiGet.mockResolvedValue(response);

      const result = await getPendingDisbursements("c1");

      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockApiGet.mockRejectedValue(new Error("Unauthorized"));

      await expect(getPendingDisbursements("c1")).rejects.toThrow(
        "Failed to fetch pending disbursements"
      );
    });
  });

  // --- updateDisbursementStatus ---

  describe("updateDisbursementStatus", () => {
    it("calls api.patch with correct endpoint and body", async () => {
      mockApiPatch.mockResolvedValue({ id: "d1", status: "completed" });

      await updateDisbursementStatus("d1", {
        status: "completed",
      } as unknown as UpdateStatusRequest);

      expect(mockApiPatch).toHaveBeenCalledWith(
        "/v2/payouts/d1/status",
        expect.objectContaining({ status: "completed" })
      );
    });

    it("passes status and reason in request body", async () => {
      mockApiPatch.mockResolvedValue({ id: "d1", status: "rejected" });

      await updateDisbursementStatus("d1", {
        status: "rejected",
        reason: "Invalid data",
      } as unknown as UpdateStatusRequest);

      expect(mockApiPatch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: "rejected",
          reason: "Invalid data",
        })
      );
    });

    it("throws on error", async () => {
      mockApiPatch.mockRejectedValue(new Error("Forbidden"));

      await expect(
        updateDisbursementStatus("d1", { status: "completed" } as unknown as UpdateStatusRequest)
      ).rejects.toThrow("Failed to update disbursement status");
    });
  });

  // --- savePayoutConfigs ---

  describe("savePayoutConfigs", () => {
    it("calls api.post with correct endpoint", async () => {
      mockApiPost.mockResolvedValue({ configs: [] });

      await savePayoutConfigs({ configs: [] } as unknown as SavePayoutConfigRequest);

      expect(mockApiPost).toHaveBeenCalledWith("/v2/payout-configs", expect.any(Object));
    });

    it("returns save response", async () => {
      const response = { configs: [{ grantUID: "g1" }] };
      mockApiPost.mockResolvedValue(response);

      const result = await savePayoutConfigs({ configs: [] } as unknown as SavePayoutConfigRequest);

      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockApiPost.mockRejectedValue(new Error("Bad Request"));

      await expect(
        savePayoutConfigs({ configs: [] } as unknown as SavePayoutConfigRequest)
      ).rejects.toThrow("Failed to save payout configs");
    });
  });

  // --- getPayoutConfigByGrant ---

  describe("getPayoutConfigByGrant", () => {
    it("returns config when found", async () => {
      const config = { grantUID: "g1", payoutAddress: "0x1" };
      mockApiGet.mockResolvedValue({ config });

      const result = await getPayoutConfigByGrant("g1");

      expect(result).toEqual(config);
    });

    it("returns null when config is null", async () => {
      mockApiGet.mockResolvedValue({ config: null });

      const result = await getPayoutConfigByGrant("g1");

      expect(result).toBeNull();
    });

    it("throws on error", async () => {
      mockApiGet.mockRejectedValue(new Error("Not Found"));

      await expect(getPayoutConfigByGrant("g1")).rejects.toThrow("Failed to fetch payout config");
    });
  });

  // --- deletePayoutConfig ---

  describe("deletePayoutConfig", () => {
    it("calls api.delete with correct endpoint", async () => {
      mockApiDelete.mockResolvedValue({});

      await deletePayoutConfig("g1");

      expect(mockApiDelete).toHaveBeenCalledWith("/v2/payout-configs/grant/g1");
    });

    it("throws on error", async () => {
      mockApiDelete.mockRejectedValue(new Error("Forbidden"));

      await expect(deletePayoutConfig("g1")).rejects.toThrow("Failed to delete payout config");
    });

    it("resolves void on success", async () => {
      mockApiDelete.mockResolvedValue({});

      await expect(deletePayoutConfig("g1")).resolves.toBeUndefined();
    });
  });
});
