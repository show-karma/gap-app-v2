import { fetchENSAvatars } from "@/utilities/fetchENSAvatar";
import { Hex, isAddress } from "viem";
import { create } from "zustand";

export interface EnsAvatar {
  avatar?: string | null;
}

export type EnsAvatarRecord = Record<Hex, EnsAvatar>;

interface EnsAvatarStore {
  ensAvatars: EnsAvatarRecord;
  populateEnsAvatars: (addresses: string[]) => Promise<void>;
}

export const useENSAvatar = create<EnsAvatarStore>((set, get) => ({
  ensAvatars: {},
  populateEnsAvatars: async (addresses: string[]) => {
    const ensAvatars = get().ensAvatars;
    const notTriedAddresses = addresses.filter(
      (address) => !ensAvatars[address as Hex]
    );

    if (notTriedAddresses.length === 0) {
      return;
    }

    const fetchedAvatars = await fetchENSAvatars(notTriedAddresses);
    if (!fetchedAvatars?.length) return;

    const avatars: EnsAvatarRecord = {};
    fetchedAvatars.forEach((item) => {
      avatars[item.address as Hex] = {
        avatar: item.avatar && !isAddress(item.avatar) ? item.avatar : null,
      };
    });

    // Update the state with the new ensNames
    set((state) => ({
      ensAvatars: { ...state.ensAvatars, ...avatars },
    }));
  },
}));
