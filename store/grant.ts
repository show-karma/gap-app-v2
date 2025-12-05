import { create } from "zustand";
import type { GrantResponse } from "@/types/v2/grant";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

interface GrantStore {
  grant: GrantResponse | undefined;
  setGrant: (grant: GrantResponse | undefined) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  refreshGrant: () => Promise<GrantResponse | undefined>;
}

export const useGrantStore = create<GrantStore>((set, get) => ({
  grant: undefined,
  setGrant: (grant: GrantResponse | undefined) => set({ grant }),
  loading: true,
  setLoading: (loading: boolean) => set({ loading }),
  refreshGrant: async () => {
    const { grant } = get();
    if (!grant) return;
    set({ loading: true });
    try {
      const refreshedGrant = await gapIndexerApi
        .grantBySlug(grant.uid)
        .then((res) => res.data as GrantResponse);
      set({ grant: refreshedGrant, loading: false });
      return refreshedGrant;
    } catch (error) {
      console.error("Failed to refresh grant:", error);
      set({ loading: false });
    }
  },
}));
