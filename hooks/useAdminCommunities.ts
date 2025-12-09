import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import { useCommunitiesStore } from "@/store/communities";
import type { Community } from "@/types/v2/community";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

// V2 API response types
interface AdminCommunityV2 {
  uid: string;
  chainID: number;
  details: {
    name: string;
    slug: string;
    description: string | null;
    imageURL: string | null;
  };
}

interface GetAdminCommunitiesV2Response {
  communities: AdminCommunityV2[];
}

// Map V2 response to Community type
const mapV2ToCommunity = (community: AdminCommunityV2): Community => ({
  uid: community.uid,
  chainID: community.chainID,
  details: {
    name: community.details.name,
    slug: community.details.slug,
    description: community.details.description ?? undefined,
    imageURL: community.details.imageURL ?? undefined,
  },
});

const fetchAdminCommunities = async (): Promise<Community[]> => {
  const [data, error] = await fetchData<GetAdminCommunitiesV2Response>(
    INDEXER.V2.USER.ADMIN_COMMUNITIES(),
    "GET",
    {},
    {},
    {},
    true, // Requires authentication
    false
  );

  if (error || !data) {
    throw new Error(error || "Failed to fetch admin communities");
  }

  return (data.communities || []).map(mapV2ToCommunity);
};

export const useAdminCommunities = (address?: string) => {
  const { authenticated: isAuth } = useAuth();
  const { setCommunities, setIsLoading } = useCommunitiesStore();

  const queryResult = useQuery<Community[], Error>({
    queryKey: ["admin-communities", address],
    queryFn: fetchAdminCommunities,
    enabled: !!address && isAuth,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, _error) => {
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
  });

  const { data, isLoading, error, refetch } = queryResult;

  // Sync with Zustand store
  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  useEffect(() => {
    if (!address || !isAuth) {
      setCommunities([]);
      return;
    }
    if (data) {
      setCommunities(data);
    }
  }, [data, address, isAuth, setCommunities]);

  useEffect(() => {
    if (error) {
      errorManager(`Error fetching communities of user ${address} is admin`, error, { address });
      setCommunities([]);
    }
  }, [error, address, setCommunities]);

  return {
    ...queryResult,
    refetch,
  };
};
