import { useQuery } from "@tanstack/react-query";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { useCommunitiesStore } from "@/src/features/communities/lib/communities-store";
import { useAuthStore } from "@/store/auth";
import { useEffect } from "react";
import { errorManager } from "@/lib/utils/error-manager";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

const fetchAdminCommunities = async (
  address: string
): Promise<ICommunityResponse[]> => {
  if (!address) return [];

  const response = await gapIndexerApi.adminOf(address as `0x${string}`);
  return response?.data || [];
};

const useAdminCommunities = (address?: string) => {
  const { isAuth } = useAuthStore();
  const { setCommunities, setIsLoading } = useCommunitiesStore();

  const queryResult = useQuery<ICommunityResponse[], Error>({
    queryKey: ["admin-communities", address],
    queryFn: () => fetchAdminCommunities(address!),
    enabled: !!address && isAuth,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
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
    if (data) {
      setCommunities(data);
    } else if (!address || !isAuth) {
      setCommunities([]);
    }
  }, [data, address, isAuth, setCommunities]);

  useEffect(() => {
    if (error) {
      errorManager(
        `Error fetching communities of user ${address} is admin`,
        error,
        { address }
      );
      setCommunities([]);
    }
  }, [error, address, setCommunities]);

  return {
    ...queryResult,
    refetch,
  };
};

export default useAdminCommunities;
