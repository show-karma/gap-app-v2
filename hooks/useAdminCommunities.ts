import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import { useCommunitiesStore } from "@/store/communities";
import type { Community } from "@/types/v2/community";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface GetAdminCommunitiesV2Response {
  communities: Community[];
}

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

  // Map imageURL to logoUrl for consistency
  return (data.communities || []).map((community) => ({
    ...community,
    details: {
      ...community.details,
      logoUrl: community.details.imageURL,
    },
  }));
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
