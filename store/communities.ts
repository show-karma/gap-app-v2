import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Community } from "@/types/v2/community";

type PartialCommunity = {
  uid: string;
  details:
    | {
        name: string;
        slug: string;
        imageURL?: string;
      }
    | undefined;
};

interface CommunitiesStore {
  communities: PartialCommunity[];
  setCommunities: (communities: Community[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export const useCommunitiesStore = create(
  persist<CommunitiesStore>(
    (set, _get) => ({
      communities: [],
      setCommunities: (communities: Community[]) =>
        set({ communities: communities.map(mapCommunity) }),
      isLoading: false,
      setIsLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: "communities",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

function mapCommunity(community: Community): PartialCommunity {
  return {
    uid: community.uid,
    details: community.details
      ? {
          name: community.details.name ?? "",
          slug: community.details.slug ?? "",
          imageURL: community.details.imageURL,
        }
      : undefined,
  };
}
