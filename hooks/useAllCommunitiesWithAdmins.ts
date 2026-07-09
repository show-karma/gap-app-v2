import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import { getCommunities } from "@/services/communities.service";
import type { Community } from "@/types/v2/community";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

const CommunityAdminSchema = z
  .object({
    id: z.string(),
    admins: z.array(z.unknown()),
  })
  .passthrough();
type CommunityAdmin = z.infer<typeof CommunityAdminSchema>;

interface AllCommunitiesWithAdminsData {
  communities: Community[];
  communityAdmins: CommunityAdmin[];
}

const fetchAllCommunitiesWithAdmins = async (): Promise<AllCommunitiesWithAdminsData> => {
  const result = await getCommunities({ limit: 1000 });
  result.sort((a: Community, b: Community) =>
    (a.details?.name || a.uid).localeCompare(b.details?.name || b.uid)
  );

  // Fetch admins data for ALL communities
  const adminPromises = result.map(async (community: Community) => {
    try {
      const data = await api.get(INDEXER.COMMUNITY.ADMINS(community.uid), {
        isAuthorized: false,
        schema: CommunityAdminSchema,
      });
      if (!data) return { id: community.uid, admins: [] };
      return data;
    } catch {
      // Per-community admin lookup failures degrade to an empty admin list
      // so one bad community doesn't fail the whole dashboard load.
      return { id: community.uid, admins: [] };
    }
  });

  const communityAdmins = await Promise.all(adminPromises);

  return {
    communities: result,
    communityAdmins,
  };
};

export const useAllCommunitiesWithAdmins = () => {
  return useQuery<AllCommunitiesWithAdminsData, Error>({
    queryKey: ["all-communities-with-admins"],
    queryFn: async () => {
      try {
        return await fetchAllCommunitiesWithAdmins();
      } catch (error: any) {
        errorManager("Error fetching all communities", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export type { AllCommunitiesWithAdminsData };
