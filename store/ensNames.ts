import { fetchENSNames } from "@/utilities/fetchENSNames";
import { Hex, isAddress } from "viem";
import { create } from "zustand";

export interface EnsName {
  name?: string | null;
}

export type EnsNamesRecord = Record<Hex, EnsName>;

interface EnsNamesStore {
  ensNames: EnsNamesRecord;
  populateEnsNames: (addresses: string[]) => Promise<void>;
}

export const useENSNames = create<EnsNamesStore>((set, get) => ({
  ensNames: {},
  populateEnsNames: async (addresses: string[]) => {
    const ensNames = get().ensNames;
    const notTriedAddresses = addresses.filter(
      (address) => !ensNames[address as Hex]
    );

    if (notTriedAddresses.length === 0) {
      return;
    }

    const fetchedNames = await fetchENSNames(notTriedAddresses);
    if (!fetchedNames?.length) return;

    const names: EnsNamesRecord = {};
    fetchedNames.forEach((item) => {
      names[item.address as Hex] = {
        name: item.name && !isAddress(item.name) ? item.name : null,
      };
    });

    // Update the state with the new ensNames
    set((state) => ({
      ensNames: { ...state.ensNames, ...names },
    }));
  },
}));
