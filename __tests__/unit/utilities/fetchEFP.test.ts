import type { Hex } from "viem";

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_EFP_API_URL: "",
  },
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("viem", () => ({
  isAddress: vi.fn((addr: string) => /^0x[0-9a-fA-F]{40}$/i.test(addr)),
}));

import { errorManager } from "@/components/Utilities/errorManager";
import {
  EFP_BATCH_SIZE,
  fetchEfpCommonFollowers,
  fetchEfpFollowing,
  fetchEfpStats,
  getEfpApiBase,
  getEfpProfileUrl,
} from "@/utilities/fetchEFP";

const ADDR1 = "0x1111111111111111111111111111111111111111" as Hex;
const VIEWER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;

describe("fetchEFP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("getEfpApiBase", () => {
    it("returns default API base when env is empty", () => {
      expect(getEfpApiBase()).toBe("https://api.ethfollow.xyz/api/v1");
    });
  });

  describe("getEfpProfileUrl", () => {
    it("builds efp.app profile URL with lowercase address", () => {
      expect(getEfpProfileUrl(ADDR1)).toBe(
        "https://efp.app/0x1111111111111111111111111111111111111111"
      );
    });
  });

  describe("fetchEfpStats", () => {
    it("fetches stats for valid addresses", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ followers_count: 5, following_count: 2 }),
      });

      const results = await fetchEfpStats([ADDR1]);

      expect(results).toEqual([
        {
          address: ADDR1,
          followers_count: 5,
          following_count: 2,
        },
      ]);
      expect(global.fetch).toHaveBeenCalledWith(`${getEfpApiBase()}/users/${ADDR1}/stats`);
    });

    it("filters invalid addresses", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ followers_count: 0, following_count: 0 }),
      });

      const results = await fetchEfpStats([ADDR1, "not-an-address", "0xshort"]);

      expect(results).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("reports errors when response is not ok", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const results = await fetchEfpStats([ADDR1]);

      expect(results).toEqual([]);
    });

    it("processes addresses in batches", async () => {
      const addresses: Hex[] = [];
      for (let i = 1; i <= EFP_BATCH_SIZE + 3; i++) {
        addresses.push(`0x${String(i).padStart(40, "0")}` as Hex);
      }

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ followers_count: 1, following_count: 1 }),
      });

      const results = await fetchEfpStats(addresses);

      expect(results).toHaveLength(addresses.length);
      expect(global.fetch).toHaveBeenCalledTimes(addresses.length);
    });
  });

  describe("fetchEfpCommonFollowers", () => {
    it("returns empty results when leader equals target", async () => {
      const result = await fetchEfpCommonFollowers(ADDR1, ADDR1);
      expect(result).toEqual({ results: [], length: 0 });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("fetches common followers with leader query param", async () => {
      const payload = {
        results: [{ address: "0x2222222222222222222222222222222222222222", mutuals_rank: 1 }],
        length: 1,
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => payload,
      });

      const result = await fetchEfpCommonFollowers(ADDR1, VIEWER);

      expect(result).toEqual(payload);
      expect(global.fetch).toHaveBeenCalledWith(
        `${getEfpApiBase()}/users/${ADDR1}/commonFollowers?leader=${VIEWER}&limit=8`
      );
    });
  });

  describe("fetchEfpFollowing", () => {
    it("fetches a single page of following", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          following: [
            {
              version: 1,
              record_type: "address",
              data: ADDR1,
              address: ADDR1,
              tags: [],
            },
          ],
        }),
      });

      const results = await fetchEfpFollowing(VIEWER, { limit: 50, offset: 0 });

      expect(results).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("returns null on failed following fetch", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 503,
      });

      const results = await fetchEfpFollowing(VIEWER);

      expect(results).toBeNull();
    });
  });
});
