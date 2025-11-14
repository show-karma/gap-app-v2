import { useQuery } from "@tanstack/react-query"
import fetchData from "@/utilities/fetchData"

export interface CommunityGrant {
  programId: string
  title: string
  projectUID: string
}

export const useCommunityGrants = (slug: string) => {
  return useQuery<CommunityGrant[], Error>({
    queryKey: ["community-grants", slug],
    queryFn: async () => {
      const [data] = await fetchData(`/v2/communities/${slug}/grants`)
      return (data as CommunityGrant[]) || []
    },
    enabled: !!slug,
    retry: false,
  })
}
