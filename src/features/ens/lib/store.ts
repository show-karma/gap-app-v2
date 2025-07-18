import { fetchENS } from "@/services/ens";
import { Hex, isAddress } from "viem";
import { create } from "zustand";

// Define the structure for ENS names and avatars
export interface EnsData {
  name?: string | null;
  avatar?: string | null;
  isFetching?: boolean;
}

export type EnsRecord = Record<Hex, EnsData>;

// Define the store interface
interface EnsStore {
  ensData: EnsRecord;
  populateEns: (addresses: string[]) => Promise<void>;
}

// Create the Zustand store
export const useENS = create<EnsStore>((set, get) => ({
  ensData: {},

  populateEns: async (addresses: string[]) => {
    const ensData = get().ensData;
    const lowercasedAddresses = addresses.map(
      (address) => address.toLowerCase() as Hex
    );
    const notTriedAddresses = lowercasedAddresses.filter((address) => {
      return !ensData[address] || !ensData[address]?.isFetching;
    });

    if (notTriedAddresses.length === 0) {
      return;
    }
    for (const address of notTriedAddresses) {
      set((state) => ({
        ensData: {
          ...state.ensData,
          [address.toLowerCase() as Hex]: {
            ...ensData[address.toLowerCase() as Hex],
            isFetching: true,
          },
        },
      }));
    }

    const fetchedNames = await fetchENS(notTriedAddresses);
    if (!fetchedNames?.length) return;

    const names: EnsRecord = {};
    fetchedNames.forEach((item) => {
      names[item.address.toLowerCase() as Hex] = {
        ...ensData[item.address.toLowerCase() as Hex],
        name: item.name && !isAddress(item.name) ? item.name : null,
        avatar: item.avatar && !isAddress(item.avatar) ? item.avatar : null,
        isFetching: false,
      };
    });
    // Update the state with the new ENS names
    set((state) => ({
      ensData: { ...state.ensData, ...names },
    }));
  },
}));
