import { create } from "zustand";
import { errorManager } from "@/components/Utilities/errorManager";
import { getProjectGrants } from "@/services/project-grants.service";
import type { Grant } from "@/types/v2/grant";

interface GrantStore {
  grant: Grant | undefined;
  setGrant: (grant: Grant | undefined) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  refreshGrant: () => Promise<Grant | undefined>;
}

export const useGrantStore = create<GrantStore>((set, get) => ({
  grant: undefined,
  setGrant: (grant: Grant | undefined) => set({ grant }),
  loading: true,
  setLoading: (loading: boolean) => set({ loading }),
  refreshGrant: async () => {
    const { grant } = get();
    if (!grant) return;
    set({ loading: true });
    try {
      // Get grant's project UID from the grant's project property
      const projectIdOrSlug = grant.project?.details?.slug || grant.projectUID;
      if (!projectIdOrSlug) {
        throw new Error("Cannot refresh grant: no project identifier available");
      }

      // Fetch grants using V2 endpoint which returns proper V2 Grant format
      const grants = await getProjectGrants(projectIdOrSlug);
      const refreshedGrant = grants.find((g) => g.uid.toLowerCase() === grant.uid.toLowerCase());

      if (!refreshedGrant) {
        throw new Error(`Grant ${grant.uid} not found in project ${projectIdOrSlug}`);
      }

      set({ grant: refreshedGrant, loading: false });
      return refreshedGrant;
    } catch (error) {
      errorManager("Failed to refresh grant", error, {
        grantUID: grant.uid,
        projectUID: grant.projectUID,
      });
      set({ loading: false });
    }
  },
}));
