import type { Hex } from "viem";
import { create } from "zustand";
import type { EfpCommonFollower, EfpFollowingRecord } from "@/types/efp";
import { fetchEfpCommonFollowers, fetchEfpFollowingAll, fetchEfpStats } from "@/utilities/fetchEFP";

export interface EfpData {
  followers_count?: number;
  following_count?: number;
  commonFollowers?: EfpCommonFollower[];
  commonFollowersLength?: number;
  isFetching?: boolean;
  isFetchingCommon?: boolean;
  error?: boolean;
}

export type EfpRecord = Record<Hex, EfpData>;

interface EfpStore {
  efpData: EfpRecord;
  viewerFollowing: EfpFollowingRecord[] | null;
  isFetchingFollowing: boolean;
  followingError: boolean;
  populateEfp: (addresses: string[]) => Promise<void>;
  populateCommonFollowers: (target: string, leader: string) => Promise<void>;
  populateViewerFollowing: (viewer: string) => Promise<void>;
  resetViewerFollowing: () => void;
}

const isValidEthAddress = (addr: string): boolean => /^0x[0-9a-fA-F]{40}$/i.test(addr);

export const useEFP = create<EfpStore>((set, get) => ({
  efpData: {},
  viewerFollowing: null,
  isFetchingFollowing: false,
  followingError: false,

  populateEfp: async (addresses: string[]) => {
    const efpData = get().efpData;

    const lowercasedAddresses = addresses
      .filter((address): address is string => !!address && isValidEthAddress(address))
      .map((address) => address.toLowerCase() as Hex);

    const notTriedAddresses = lowercasedAddresses.filter(
      (address) => !efpData[address] || efpData[address].error
    );

    if (notTriedAddresses.length === 0) {
      return;
    }

    for (const address of notTriedAddresses) {
      set((state) => ({
        efpData: {
          ...state.efpData,
          [address]: {
            ...state.efpData[address],
            isFetching: true,
            error: false,
          },
        },
      }));
    }

    const fetched = await fetchEfpStats(notTriedAddresses);

    const updates: EfpRecord = {};
    for (const address of notTriedAddresses) {
      const item = fetched.find((r) => r.address.toLowerCase() === address);
      updates[address] = {
        followers_count: item?.followers_count ?? 0,
        following_count: item?.following_count ?? 0,
        isFetching: false,
        error: !item,
      };
    }

    set((state) => ({
      efpData: { ...state.efpData, ...updates },
    }));
  },

  populateCommonFollowers: async (target: string, leader: string) => {
    if (!isValidEthAddress(target) || !isValidEthAddress(leader)) {
      return;
    }

    const targetHex = target.toLowerCase() as Hex;
    const leaderHex = leader.toLowerCase() as Hex;

    if (targetHex === leaderHex) {
      return;
    }

    set((state) => ({
      efpData: {
        ...state.efpData,
        [targetHex]: {
          ...state.efpData[targetHex],
          isFetchingCommon: true,
        },
      },
    }));

    const response = await fetchEfpCommonFollowers(targetHex, leaderHex);

    set((state) => ({
      efpData: {
        ...state.efpData,
        [targetHex]: {
          ...state.efpData[targetHex],
          commonFollowers: response?.results ?? [],
          commonFollowersLength: response?.length ?? 0,
          isFetchingCommon: false,
        },
      },
    }));
  },

  populateViewerFollowing: async (viewer: string) => {
    if (!isValidEthAddress(viewer)) {
      return;
    }

    set({ isFetchingFollowing: true, followingError: false, viewerFollowing: null });

    const following = await fetchEfpFollowingAll(viewer.toLowerCase() as Hex);

    if (following === null) {
      set({ viewerFollowing: null, isFetchingFollowing: false, followingError: true });
      return;
    }

    set({ viewerFollowing: following, isFetchingFollowing: false, followingError: false });
  },

  resetViewerFollowing: () => {
    set({ viewerFollowing: null, isFetchingFollowing: false, followingError: false });
  },
}));
