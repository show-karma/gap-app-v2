import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type PartialCommunity = {
  uid: string
  details:
    | {
        name: string
        slug: string
        imageURL: string
      }
    | undefined
}

interface CommunitiesStore {
  communities: PartialCommunity[]
  setCommunities: (communities: ICommunityResponse[]) => void
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
}

export const useCommunitiesStore = create(
  persist<CommunitiesStore>(
    (set, _get) => ({
      communities: [],
      setCommunities: (communities: ICommunityResponse[]) =>
        set({ communities: communities.map(mapCommunity) }),
      isLoading: false,
      setIsLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: "communities",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)

function mapCommunity(community: ICommunityResponse) {
  const mappedData: PartialCommunity = {
    uid: community.uid,
    details: community.details
      ? {
          name: community.details.data?.name!,
          slug: community.details.data?.slug!,
          imageURL: community.details.data?.imageURL,
        }
      : undefined,
  }
  return mappedData
}
