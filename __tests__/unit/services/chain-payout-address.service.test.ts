/**
 * @file Tests for chain-payout-address.service.ts
 * @description Tests the update method for chain-specific payout addresses.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchData = vi.fn();
vi.mock("@/utilities/fetchData", () => ({
  default: (...args: unknown[]) => mockFetchData(...args),
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

describe("chainPayoutAddressService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("update", () => {
    it("sends PUT with chain payout addresses", async () => {
      const responseMap = { "10": "0xAddr1", "8453": "0xAddr2" };
      mockFetchData.mockResolvedValue([{ chainPayoutAddress: responseMap }, null]);

      const result = await chainPayoutAddressService.update("project-1", {
        "10": "0xAddr1",
        "8453": "0xAddr2",
      });

      expect(result).toEqual(responseMap);
      expect(mockFetchData).toHaveBeenCalledWith(
        "/projects/project-1/chain-payout-addresses",
        "PUT",
        { chainPayoutAddresses: { "10": "0xAddr1", "8453": "0xAddr2" } }
      );
    });

    it("returns null when response has no chainPayoutAddress", async () => {
      mockFetchData.mockResolvedValue([{}, null]);
      const result = await chainPayoutAddressService.update("project-1", { "10": "0xAddr" });
      expect(result).toBeNull();
    });

    it("throws on fetch error", async () => {
      mockFetchData.mockResolvedValue([null, "Forbidden"]);
      await expect(
        chainPayoutAddressService.update("project-1", { "10": "0xAddr" })
      ).rejects.toThrow("Forbidden");
    });

    it("supports null value to remove an address", async () => {
      mockFetchData.mockResolvedValue([{ chainPayoutAddress: { "10": null } }, null]);

      const result = await chainPayoutAddressService.update("project-1", { "10": null });
      expect(result).toEqual({ "10": null });
    });
  });
});
