"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ClaimGrantsConfig } from "@/src/infrastructure/types/tenant";
import {
  CLAIM_CAMPAIGNS_ABI,
  DEFAULT_CLAIM_CONTRACT_ADDRESS,
  uuidToBytes16,
} from "../lib/hedgey-contract";
import { getPublicClient } from "../lib/viem-clients";
import type { ClaimCampaign } from "../providers/types";

export interface UseClaimedStatusesReturn {
  claimedStatuses: Map<string, boolean>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

async function fetchClaimedStatuses(
  campaigns: ClaimCampaign[],
  walletAddress: string,
  networkName: string
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  const publicClient = getPublicClient(networkName);

  const promises = campaigns.map(async (campaign) => {
    try {
      const contractAddress =
        (campaign.contractAddress as `0x${string}`) ?? DEFAULT_CLAIM_CONTRACT_ADDRESS;

      const claimed = await publicClient.readContract({
        address: contractAddress,
        abi: CLAIM_CAMPAIGNS_ABI,
        functionName: "claimed",
        args: [uuidToBytes16(campaign.id), walletAddress as `0x${string}`],
      });

      return { campaignId: campaign.id, claimed: claimed as boolean };
    } catch {
      return { campaignId: campaign.id, claimed: false };
    }
  });

  const statuses = await Promise.all(promises);
  for (const { campaignId, claimed } of statuses) {
    results.set(campaignId, claimed);
  }

  return results;
}

export function useClaimedStatuses(
  campaigns: ClaimCampaign[],
  walletAddress: string | undefined,
  claimGrants: ClaimGrantsConfig | undefined
): UseClaimedStatusesReturn {
  const networkName =
    claimGrants?.providerConfig?.type === "hedgey"
      ? claimGrants.providerConfig.networkName
      : "optimism";

  const campaignIdsKey = useMemo(
    () =>
      campaigns
        .map((c) => c.id)
        .sort()
        .join(","),
    [campaigns]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["claimed-statuses", walletAddress, campaignIdsKey, networkName],
    queryFn: () => fetchClaimedStatuses(campaigns, walletAddress!, networkName),
    enabled: Boolean(walletAddress && campaigns.length > 0),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });

  return {
    claimedStatuses: data ?? new Map(),
    isLoading,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    refetch,
  };
}
