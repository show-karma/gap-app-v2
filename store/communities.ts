import { Community, CommunityDetails } from "@show-karma/karma-gap-sdk";
import { StateStorage, createJSONStorage, persist } from "zustand/middleware";

import { create } from "zustand";
type PartialDetails = Pick<CommunityDetails, 'slug' | 'name' | 'imageURL'>

type PartialCommunity = {
  uid: string;
  details: PartialDetails | undefined
};

interface CommunitiesStore {
  communities: PartialCommunity[];
  setCommunities: (communities: Community[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export const useCommunitiesStore = create(
  persist<CommunitiesStore>(
    (set, get) => ({
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

function mapCommunity(community: Community) {
  const mappedData: PartialCommunity = {
    uid: community.uid,
    details: community.details ? {
      name: community.details.name,
      slug: community.details.slug,
      imageURL: community.details.imageURL
    } :  undefined,
  };
  return mappedData;
}
