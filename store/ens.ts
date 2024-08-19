import { fetchENSNames } from "@/utilities/fetchENSNames";
import { fetchENSAvatars } from "@/utilities/fetchENSAvatar";
import { Hex, isAddress } from "viem";
import { create } from "zustand";

// Define the structure for ENS names and avatars
export interface EnsData {
  name?: string | null;
  avatar?: string | null;
}

export type EnsRecord = Record<Hex, EnsData>;

// Define the store interface
interface EnsStore {
  ensData: EnsRecord;
  populateEnsNames: (addresses: string[]) => Promise<void>;
  populateEnsAvatars: (addresses: string[]) => Promise<void>;
}

// Create the Zustand store
export const useENS = create<EnsStore>((set, get) => ({
  ensData: {},

  populateEnsNames: async (addresses: string[]) => {
    const ensData = get().ensData;
    const notTriedAddresses = addresses.filter(
      (address) => !ensData[address as Hex]?.name
    );

    if (notTriedAddresses.length === 0) {
      return;
    }

    const fetchedNames = await fetchENSNames(notTriedAddresses);
    if (!fetchedNames?.length) return;

    const names: EnsRecord = {};
    fetchedNames.forEach((item) => {
      names[item.address as Hex] = {
        ...ensData[item.address as Hex],
        name: item.name && !isAddress(item.name) ? item.name : null,
      };
    });

    // Update the state with the new ENS names
    set((state) => ({
      ensData: { ...state.ensData, ...names },
    }));
  },

  populateEnsAvatars: async (addresses: string[]) => {
    const ensData = get().ensData;
    const notTriedAddresses = addresses.filter(
      (address) => !ensData[address as Hex]?.avatar
    );

    if (notTriedAddresses.length === 0) {
      return;
    }

    const fetchedAvatars = await fetchENSAvatars(notTriedAddresses);
    if (!fetchedAvatars?.length) return;

    const avatars: EnsRecord = {};
    fetchedAvatars.forEach((item) => {
      avatars[item.address as Hex] = {
        ...ensData[item.address as Hex],
        avatar: item.avatar && !isAddress(item.avatar) ? item.avatar : null,
      };
    });

    // Update the state with the new ENS avatars
    set((state) => ({
      ensData: { ...state.ensData, ...avatars },
    }));
  },
}));
