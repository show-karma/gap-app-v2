import { useQuery } from "@tanstack/react-query";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { useCommunitiesStore } from "@/store/communities";

import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useWallet } from "./useWallet";

const fetchAdminCommunities = async (
  address: string
): Promise<ICommunityResponse[]> => {
  if (!address) return [];

  const response = await gapIndexerApi.adminOf(address as `0x${string}`);
  return response?.data || [];
};

export const useAdminCommunities = (address?: string) => {
  const { isLoggedIn } = useWallet();
  const { setCommunities, setIsLoading } = useCommunitiesStore();

  const queryResult = useQuery<ICommunityResponse[], Error>({
    queryKey: ["admin-communities", address],
    queryFn: () => fetchAdminCommunities(address!),
    enabled: !!address && isLoggedIn,
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
    } else if (!address || !isLoggedIn) {
      setCommunities([]);
    }
  }, [data, address, isLoggedIn, setCommunities]);

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
