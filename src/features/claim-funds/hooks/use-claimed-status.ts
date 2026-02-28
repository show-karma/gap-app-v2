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

const EMPTY_MAP = new Map<string, boolean>();

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

  const calls = campaigns.map((campaign) => ({
    address: (campaign.contractAddress as `0x${string}`) ?? DEFAULT_CLAIM_CONTRACT_ADDRESS,
    abi: CLAIM_CAMPAIGNS_ABI,
    functionName: "claimed" as const,
    args: [uuidToBytes16(campaign.id), walletAddress as `0x${string}`],
  }));

  const multicallResults = await publicClient.multicall({
    contracts: calls,
    allowFailure: true,
  });

  for (let i = 0; i < campaigns.length; i++) {
    const result = multicallResults[i];
    results.set(campaigns[i].id, result.status === "success" ? (result.result as boolean) : false);
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
    claimedStatuses: data ?? EMPTY_MAP,
    isLoading,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    refetch,
  };
}
