"use client";

import { useQuery } from "@tanstack/react-query";
import type { ClaimGrantsConfig } from "@/src/infrastructure/types/tenant";
import type { ClaimCampaign } from "../providers/types";
import { useClaimProvider } from "./use-claim-provider";

export interface UseCampaignsReturn {
  campaigns: ClaimCampaign[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCampaigns(
  communityId: string,
  claimGrants: ClaimGrantsConfig | undefined
): UseCampaignsReturn {
  const provider = useClaimProvider(claimGrants);

  const isEnabled = Boolean(provider);

  const {
    data: campaigns = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["claim-campaigns", provider?.id ?? "none", communityId],
    queryFn: async () => {
      if (!provider) {
        return [];
      }
      return provider.fetchCampaigns();
    },
    enabled: isEnabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  return {
    campaigns,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
