import type { Community } from "@show-karma/karma-gap-sdk"
import { useQuery } from "@tanstack/react-query"
import { errorManager } from "@/components/Utilities/errorManager"
import { useGap } from "@/hooks/useGap"
import fetchData from "@/utilities/fetchData"
import { INDEXER } from "@/utilities/indexer"

interface CommunityAdmin {
  id: string
  admins: any[]
}

interface AllCommunitiesWithAdminsData {
  communities: Community[]
  communityAdmins: CommunityAdmin[]
}

const fetchAllCommunitiesWithAdmins = async (gap: any): Promise<AllCommunitiesWithAdminsData> => {
  if (!gap) throw new Error("Gap not initialized")

  const result = await gap.fetch.communities()
  result.sort((a: Community, b: Community) =>
    (a.details?.name || a.uid).localeCompare(b.details?.name || b.uid)
  )

  // Fetch admins data for ALL communities
  const adminPromises = result.map(async (community: Community) => {
    try {
      const [data, error] = await fetchData(
        INDEXER.COMMUNITY.ADMINS(community.uid),
        "GET",
        {},
        {},
        {},
        false
      )
      if (error || !data) return { id: community.uid, admins: [] }
      return data
    } catch {
      return { id: community.uid, admins: [] }
    }
  })

  const communityAdmins = await Promise.all(adminPromises)

  return {
    communities: result,
    communityAdmins,
  }
}

export const useAllCommunitiesWithAdmins = () => {
  const { gap } = useGap()

  return useQuery<AllCommunitiesWithAdminsData, Error>({
    queryKey: ["all-communities-with-admins"],
    queryFn: async () => {
      try {
        return await fetchAllCommunitiesWithAdmins(gap)
      } catch (error: any) {
        errorManager("Error fetching all communities", error)
        throw error
      }
    },
    enabled: !!gap,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}

export type { AllCommunitiesWithAdminsData }
