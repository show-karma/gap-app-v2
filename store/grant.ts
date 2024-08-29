import { create } from "zustand";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

interface GrantStore {
  grant: IGrantResponse | undefined;
  setGrant: (grant: IGrantResponse | undefined) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  refreshGrant: () => Promise<IGrantResponse | undefined>;
}

export const useGrantStore = create<GrantStore>((set, get) => ({
  grant: undefined,
  setGrant: (grant: IGrantResponse | undefined) => set({ grant }),
  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  refreshGrant: async () => {
    const { grant } = get();
    if (!grant) return;
    set({ loading: true });
    try {
      const refreshedGrant = await gapIndexerApi
        .grantsBySlug(grant.uid)
        .then((res) => res.data);
      set({ grant: refreshedGrant[0], loading: false });
      return refreshedGrant[0];
    } catch (error) {
      console.error("Failed to refresh grant:", error);
      set({ loading: false });
    }
  },
}));