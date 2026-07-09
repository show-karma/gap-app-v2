import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import { useCommunitiesStore } from "@/store/communities";
import type { Community } from "@/types/v2/community";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

interface GetAdminCommunitiesV2Response {
  communities: Community[];
}

const fetchAdminCommunities = async (): Promise<Community[]> => {
  // Requires authentication (default isAuthorized: true)
  // TODO(#1775): add zod schema
  const data = await api.get<GetAdminCommunitiesV2Response>(INDEXER.V2.USER.ADMIN_COMMUNITIES());

  if (!data) {
    throw new Error("Failed to fetch admin communities");
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
  const setCommunities = useCommunitiesStore((s) => s.setCommunities);
  const setIsLoading = useCommunitiesStore((s) => s.setIsLoading);

  const queryResult = useQuery<Community[], Error>({
    queryKey: ["admin-communities", address],
    queryFn: fetchAdminCommunities,
    enabled: isAuth,
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
    if (!isAuth) {
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
