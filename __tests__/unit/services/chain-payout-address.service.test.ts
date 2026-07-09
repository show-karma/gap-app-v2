/**
 * @file Tests for chain-payout-address.service.ts
 * @description Tests the update method for chain-specific payout addresses.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/api/client", () => ({
  api: { put: vi.fn() },
}));

vi.mock("@/utilities/indexer", () => ({
  INDEXER: {
    PROJECT: {
      CHAIN_PAYOUT_ADDRESS: {
        UPDATE: (id: string) => `/projects/${id}/chain-payout-addresses`,
      },
    },
  },
}));

import { chainPayoutAddressService } from "@/features/chain-payout-address/services/chain-payout-address.service";
import { api } from "@/utilities/api/client";

const mockApiPut = api.put as unknown as vi.Mock;

describe("chainPayoutAddressService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("update", () => {
    it("sends PUT with chain payout addresses", async () => {
      const responseMap = { "10": "0xAddr1", "8453": "0xAddr2" };
      mockApiPut.mockResolvedValue({ chainPayoutAddress: responseMap });

      const result = await chainPayoutAddressService.update("project-1", {
        "10": "0xAddr1",
        "8453": "0xAddr2",
      });

      expect(result).toEqual(responseMap);
      expect(mockApiPut).toHaveBeenCalledWith("/projects/project-1/chain-payout-addresses", {
        chainPayoutAddresses: { "10": "0xAddr1", "8453": "0xAddr2" },
      });
    });

    it("returns null when response has no chainPayoutAddress", async () => {
      mockApiPut.mockResolvedValue({});
      const result = await chainPayoutAddressService.update("project-1", { "10": "0xAddr" });
      expect(result).toBeNull();
    });

    it("throws on fetch error", async () => {
      mockApiPut.mockRejectedValue(new Error("Forbidden"));
      await expect(
        chainPayoutAddressService.update("project-1", { "10": "0xAddr" })
      ).rejects.toThrow("Forbidden");
    });

    it("supports null value to remove an address", async () => {
      mockApiPut.mockResolvedValue({ chainPayoutAddress: { "10": null } });

      const result = await chainPayoutAddressService.update("project-1", { "10": null });
      expect(result).toEqual({ "10": null });
    });
  });
});
