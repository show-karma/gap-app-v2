import { useQuery } from "@tanstack/react-query";
import { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { useAccount } from "wagmi";
import type { Hex } from "viem";
import { useEffect, useState } from "react";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

interface UseIsCommunityAdminOptions {
  enabled?: boolean;
  zustandSync?: {
    setIsCommunityAdmin?: (isAdmin: boolean) => void;
    setIsCommunityAdminLoading?: (loading: boolean) => void;
  };
}

interface GrantLike {
  community?: ICommunityResponse | null;
  data?: {
    communityUID: string;
  };
}

export const useIsCommunityAdmin = (
  communityOrGrant?: ICommunityResponse | GrantLike | null,
  address?: string | Hex,
  options?: UseIsCommunityAdminOptions
) => {
  const { address: accountAddress } = useAccount();
  const signer = useSigner();
  const [resolvedCommunity, setResolvedCommunity] = useState<ICommunityResponse | null>(null);
  
  // Use provided address or connected account address
  const checkAddress = address || accountAddress;

  // Determine if input is a community or grant, and resolve community data
  useEffect(() => {
    const resolveCommunity = async () => {
      if (!communityOrGrant) {
        setResolvedCommunity(null);
        return;
      }

      // Check if it's already a community object (has uid property directly)
      if ('uid' in communityOrGrant) {
        setResolvedCommunity(communityOrGrant as ICommunityResponse);
        return;
      }

      // It's a grant-like object, extract community data
      const grant = communityOrGrant as GrantLike;
      
      try {
        // Try to get community data from the grant object first (if already populated)
        let community: ICommunityResponse | null = grant.community || null;

        // Only make API call if community data is not already available
        if (!community && grant.data?.communityUID) {
          const response = await gapIndexerApi
            .communityBySlug(grant.data.communityUID)
            .catch(() => null);
          community = response?.data || null;
        }

        setResolvedCommunity(community);
      } catch (error: any) {
        console.error("Error fetching community data:", error);
        setResolvedCommunity(null);
      }
    };

    resolveCommunity();
  }, [communityOrGrant]);
  
  const query = useQuery({
    queryKey: ["isCommunityAdmin", resolvedCommunity?.uid, resolvedCommunity?.chainID, checkAddress],
    queryFn: async () => {
      if (!resolvedCommunity || !checkAddress) {
        return false;
      }
      
      return await isCommunityAdminOf(resolvedCommunity, checkAddress, signer);
    },
    enabled: !!resolvedCommunity && !!checkAddress && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Sync with Zustand store if setters are provided
  useEffect(() => {
    if (options?.zustandSync?.setIsCommunityAdminLoading) {
      options.zustandSync.setIsCommunityAdminLoading(query.isLoading);
    }
  }, [query.isLoading, options?.zustandSync?.setIsCommunityAdminLoading]);

  useEffect(() => {
    if (options?.zustandSync?.setIsCommunityAdmin && !query.isLoading) {
      options.zustandSync.setIsCommunityAdmin(query.data ?? false);
    }
  }, [query.data, query.isLoading, options?.zustandSync?.setIsCommunityAdmin]);
  
  return {
    isCommunityAdmin: query.data ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

// Hook to check if user is admin of any community from a list
export const useIsCommunityAdminOfAny = (
  communities?: ICommunityResponse[],
  address?: string | Hex,
  options?: UseIsCommunityAdminOptions
) => {
  const { address: accountAddress } = useAccount();
  const signer = useSigner();
  
  // Use provided address or connected account address
  const checkAddress = address || accountAddress;
  
  const query = useQuery({
    queryKey: ["isCommunityAdminOfAny", communities?.map(c => c.uid), checkAddress],
    queryFn: async () => {
      if (!communities || communities.length === 0 || !checkAddress) {
        return false;
      }
      
      // Check each community in parallel
      const results = await Promise.all(
        communities.map(community => 
          isCommunityAdminOf(community, checkAddress, signer)
        )
      );
      
      // Return true if admin of any community
      return results.some((isAdmin: boolean) => isAdmin === true);
    },
    enabled: !!communities && communities.length > 0 && !!checkAddress && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Sync with Zustand store if setters are provided
  useEffect(() => {
    if (options?.zustandSync?.setIsCommunityAdminLoading) {
      options.zustandSync.setIsCommunityAdminLoading(query.isLoading);
    }
  }, [query.isLoading, options?.zustandSync?.setIsCommunityAdminLoading]);

  useEffect(() => {
    if (options?.zustandSync?.setIsCommunityAdmin && !query.isLoading) {
      options.zustandSync.setIsCommunityAdmin(query.data ?? false);
    }
  }, [query.data, query.isLoading, options?.zustandSync?.setIsCommunityAdmin]);
  
  return {
    isCommunityAdminOfAny: query.data ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

// Convenience hook specifically for grant-based admin checks with Zustand sync
export const useGrantCommunityAdmin = (
  grant?: GrantLike | null,
  address?: string | Hex,
  zustandSync?: {
    setIsCommunityAdmin?: (isAdmin: boolean) => void;
    setIsCommunityAdminLoading?: (loading: boolean) => void;
  }
) => {
  return useIsCommunityAdmin(grant, address, {
    zustandSync,
  });
};