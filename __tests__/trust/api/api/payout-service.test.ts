import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn(),
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
        COMMUNITY_PAYOUTS: (uid: string, _opts?: any) => `/v2/payouts/communities/${uid}/payouts`,
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
import fetchData from "@/utilities/fetchData";

const mockFetchData = fetchData as ReturnType<typeof vi.fn>;

describe("payout-disbursement service trust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- createDisbursements ---

  describe("createDisbursements", () => {
    it("calls fetchData with correct endpoint and POST method", async () => {
      const disbursements = [{ id: "d1", grantUID: "g1" }];
      mockFetchData.mockResolvedValue([{ disbursements }, null, null, 201]);

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
      } as any);

      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/payouts/create",
        "POST",
        expect.any(Object),
        {},
        {},
        true,
        false
      );
    });

    it("returns disbursements array from response", async () => {
      const disbursements = [
        { id: "d1", grantUID: "g1", amount: "100" },
        { id: "d2", grantUID: "g2", amount: "200" },
      ];
      mockFetchData.mockResolvedValue([{ disbursements }, null, null, 201]);

      const result = await createDisbursements({
        communityUID: "c1",
        disbursements: [],
      } as any);

      expect(result).toEqual(disbursements);
    });

    it("throws when fetchData returns error", async () => {
      mockFetchData.mockResolvedValue([null, "Bad Request", null, 400]);

      await expect(
        createDisbursements({ communityUID: "c1", disbursements: [] } as any)
      ).rejects.toThrow("Failed to create disbursements");
    });
  });

  // --- recordSafeTransaction ---

  describe("recordSafeTransaction", () => {
    it("calls fetchData with correct endpoint containing disbursement ID", async () => {
      mockFetchData.mockResolvedValue([
        { id: "d1", safeTransactionHash: "0xabc" },
        null,
        null,
        200,
      ]);

      await recordSafeTransaction("d1", {
        safeTransactionHash: "0xabc",
      } as any);

      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/payouts/d1/safe-tx",
        "POST",
        expect.objectContaining({ safeTransactionHash: "0xabc" }),
        {},
        {},
        true,
        false
      );
    });

    it("returns updated disbursement", async () => {
      const updated = { id: "d1", safeTransactionHash: "0xabc" };
      mockFetchData.mockResolvedValue([updated, null, null, 200]);

      const result = await recordSafeTransaction("d1", {
        safeTransactionHash: "0xabc",
      } as any);

      expect(result).toEqual(updated);
    });

    it("throws with context when error occurs", async () => {
      mockFetchData.mockResolvedValue([null, "Not Found", null, 404]);

      await expect(
        recordSafeTransaction("d1", {
          safeTransactionHash: "0xabc",
        } as any)
      ).rejects.toThrow("Failed to record Safe transaction");
    });
  });

  // --- getPayoutHistory ---

  describe("getPayoutHistory", () => {
    it("calls fetchData with grant UID and pagination params", async () => {
      const response = { disbursements: [], total: 0, page: 1, limit: 10 };
      mockFetchData.mockResolvedValue([response, null, null, 200]);

      await getPayoutHistory("g1", 1, 10);

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining("g1"),
        "GET",
        {},
        {},
        {},
        true,
        false
      );
    });

    it("returns paginated response", async () => {
      const response = {
        disbursements: [{ id: "d1" }],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockFetchData.mockResolvedValue([response, null, null, 200]);

      const result = await getPayoutHistory("g1");

      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Server Error", null, 500]);

      await expect(getPayoutHistory("g1")).rejects.toThrow("Failed to fetch payout history");
    });
  });

  // --- getTotalDisbursed ---

  describe("getTotalDisbursed", () => {
    it("returns totalDisbursed string", async () => {
      mockFetchData.mockResolvedValue([{ totalDisbursed: "5000.00" }, null, null, 200]);

      const result = await getTotalDisbursed("g1");

      expect(result).toBe("5000.00");
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Error", null, 500]);

      await expect(getTotalDisbursed("g1")).rejects.toThrow("Failed to fetch total disbursed");
    });
  });

  // --- getPendingDisbursements ---

  describe("getPendingDisbursements", () => {
    it("calls fetchData with community UID", async () => {
      const response = { disbursements: [], total: 0, page: 1, limit: 10 };
      mockFetchData.mockResolvedValue([response, null, null, 200]);

      await getPendingDisbursements("c1", 1, 20);

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.stringContaining("c1"),
        "GET",
        {},
        {},
        {},
        true,
        false
      );
    });

    it("returns paginated pending disbursements", async () => {
      const response = {
        disbursements: [{ id: "d1", status: "pending" }],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockFetchData.mockResolvedValue([response, null, null, 200]);

      const result = await getPendingDisbursements("c1");

      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Unauthorized", null, 401]);

      await expect(getPendingDisbursements("c1")).rejects.toThrow(
        "Failed to fetch pending disbursements"
      );
    });
  });

  // --- updateDisbursementStatus ---

  describe("updateDisbursementStatus", () => {
    it("calls fetchData with PATCH method", async () => {
      mockFetchData.mockResolvedValue([{ id: "d1", status: "completed" }, null, null, 200]);

      await updateDisbursementStatus("d1", {
        status: "completed",
      } as any);

      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/payouts/d1/status",
        "PATCH",
        expect.objectContaining({ status: "completed" }),
        {},
        {},
        true,
        false
      );
    });

    it("passes status and reason in request body", async () => {
      mockFetchData.mockResolvedValue([{ id: "d1", status: "rejected" }, null, null, 200]);

      await updateDisbursementStatus("d1", {
        status: "rejected",
        reason: "Invalid data",
      } as any);

      expect(mockFetchData).toHaveBeenCalledWith(
        expect.any(String),
        "PATCH",
        expect.objectContaining({
          status: "rejected",
          reason: "Invalid data",
        }),
        {},
        {},
        true,
        false
      );
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Forbidden", null, 403]);

      await expect(updateDisbursementStatus("d1", { status: "completed" } as any)).rejects.toThrow(
        "Failed to update disbursement status"
      );
    });
  });

  // --- savePayoutConfigs ---

  describe("savePayoutConfigs", () => {
    it("calls fetchData with POST method", async () => {
      mockFetchData.mockResolvedValue([{ configs: [] }, null, null, 201]);

      await savePayoutConfigs({ configs: [] } as any);

      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/payout-configs",
        "POST",
        expect.any(Object),
        {},
        {},
        true,
        false
      );
    });

    it("returns save response", async () => {
      const response = { configs: [{ grantUID: "g1" }] };
      mockFetchData.mockResolvedValue([response, null, null, 201]);

      const result = await savePayoutConfigs({ configs: [] } as any);

      expect(result).toEqual(response);
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Bad Request", null, 400]);

      await expect(savePayoutConfigs({ configs: [] } as any)).rejects.toThrow(
        "Failed to save payout configs"
      );
    });
  });

  // --- getPayoutConfigByGrant ---

  describe("getPayoutConfigByGrant", () => {
    it("returns config when found", async () => {
      const config = { grantUID: "g1", payoutAddress: "0x1" };
      mockFetchData.mockResolvedValue([{ config }, null, null, 200]);

      const result = await getPayoutConfigByGrant("g1");

      expect(result).toEqual(config);
    });

    it("returns null when config is null", async () => {
      mockFetchData.mockResolvedValue([{ config: null }, null, null, 200]);

      const result = await getPayoutConfigByGrant("g1");

      expect(result).toBeNull();
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Not Found", null, 404]);

      await expect(getPayoutConfigByGrant("g1")).rejects.toThrow("Failed to fetch payout config");
    });
  });

  // --- deletePayoutConfig ---

  describe("deletePayoutConfig", () => {
    it("calls fetchData with DELETE method", async () => {
      mockFetchData.mockResolvedValue([{}, null, null, 200]);

      await deletePayoutConfig("g1");

      expect(mockFetchData).toHaveBeenCalledWith(
        "/v2/payout-configs/grant/g1",
        "DELETE",
        {},
        {},
        {},
        true,
        false
      );
    });

    it("throws on error", async () => {
      mockFetchData.mockResolvedValue([null, "Forbidden", null, 403]);

      await expect(deletePayoutConfig("g1")).rejects.toThrow("Failed to delete payout config");
    });

    it("resolves void on success", async () => {
      mockFetchData.mockResolvedValue([{}, null, null, 200]);

      await expect(deletePayoutConfig("g1")).resolves.toBeUndefined();
    });
  });
});
