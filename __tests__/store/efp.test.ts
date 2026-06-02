import { act } from "@testing-library/react";
import type { Hex } from "viem";
import { useEFP } from "@/store/efp";

vi.mock("@/utilities/fetchEFP", () => ({
  fetchEfpStats: vi.fn(),
  fetchEfpCommonFollowers: vi.fn(),
  fetchEfpFollowingAll: vi.fn(),
}));

import { fetchEfpCommonFollowers, fetchEfpFollowingAll, fetchEfpStats } from "@/utilities/fetchEFP";

const ADDR = "0x1234567890abcdef1234567890abcdef12345678" as Hex;
const VIEWER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;

describe("useEFP store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useEFP.setState({
        efpData: {},
        viewerFollowing: undefined,
        isFetchingFollowing: false,
        followingError: false,
      });
    });
  });

  describe("populateEfp", () => {
    it("stores stats for new addresses", async () => {
      vi.mocked(fetchEfpStats).mockResolvedValueOnce([
        { address: ADDR, followers_count: 3, following_count: 1 },
      ]);

      await act(async () => {
        await useEFP.getState().populateEfp([ADDR]);
      });

      expect(useEFP.getState().efpData[ADDR]).toMatchObject({
        followers_count: 3,
        following_count: 1,
        isFetching: false,
        error: false,
      });
    });

    it("skips addresses already in store", async () => {
      act(() => {
        useEFP.setState({
          efpData: { [ADDR]: { followers_count: 1 } },
        });
      });

      await act(async () => {
        await useEFP.getState().populateEfp([ADDR]);
      });

      expect(fetchEfpStats).not.toHaveBeenCalled();
    });

    it("marks error when stats fetch returns no result for address", async () => {
      vi.mocked(fetchEfpStats).mockResolvedValueOnce([]);

      await act(async () => {
        await useEFP.getState().populateEfp([ADDR]);
      });

      expect(useEFP.getState().efpData[ADDR]?.error).toBe(true);
    });
  });

  describe("populateCommonFollowers", () => {
    it("stores common followers response", async () => {
      vi.mocked(fetchEfpCommonFollowers).mockResolvedValueOnce({
        results: [{ address: VIEWER, mutuals_rank: 1 }],
        length: 1,
      });

      await act(async () => {
        await useEFP.getState().populateCommonFollowers(ADDR, VIEWER);
      });

      expect(useEFP.getState().efpData[ADDR]).toMatchObject({
        commonFollowersLength: 1,
        isFetchingCommon: false,
      });
    });
  });

  describe("populateViewerFollowing", () => {
    it("stores viewer following list", async () => {
      const following = [
        {
          version: 1,
          record_type: "address" as const,
          data: VIEWER,
          address: VIEWER,
          tags: [],
        },
      ];
      vi.mocked(fetchEfpFollowingAll).mockResolvedValueOnce(following);

      await act(async () => {
        await useEFP.getState().populateViewerFollowing(VIEWER);
      });

      expect(useEFP.getState().viewerFollowing).toEqual(following);
      expect(useEFP.getState().isFetchingFollowing).toBe(false);
    });
  });
});
