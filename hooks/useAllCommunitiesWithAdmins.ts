import { useQuery } from "@tanstack/react-query";
import { errorManager } from "@/components/Utilities/errorManager";
import { getCommunities } from "@/services/communities.service";
import type { Community } from "@/types/v2/community";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface CommunityAdmin {
  id: string;
  admins: any[];
}

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
      const [data, error] = await fetchData(
        INDEXER.COMMUNITY.ADMINS(community.uid),
        "GET",
        {},
        {},
        {},
        false
      );
      if (error || !data) return { id: community.uid, admins: [] };
      return data;
    } catch {
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
