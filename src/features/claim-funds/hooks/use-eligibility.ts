"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import type { ClaimGrantsConfig } from "@/src/infrastructure/types/tenant";
import type { ClaimCampaign } from "../providers/types";
import { type EligibilityProgress, fetchEligibilities } from "../services/eligibility.service";
import type { ClaimEligibility } from "../types";
import { useClaimProvider } from "./use-claim-provider";

const EMPTY_ELIGIBILITIES = new Map<string, ClaimEligibility>();
const EMPTY_CAMPAIGNS: ClaimCampaign[] = [];

export interface UseEligibilityReturn {
  eligibilities: Map<string, ClaimEligibility>;
  eligibleCampaigns: ClaimCampaign[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  progress: EligibilityProgress | null;
}

export function useEligibility(
  campaigns: ClaimCampaign[],
  walletAddress: string | undefined,
  communityId: string,
  claimGrants: ClaimGrantsConfig | undefined
): UseEligibilityReturn {
  const provider = useClaimProvider(claimGrants);
  const [progress, setProgress] = useState<EligibilityProgress | null>(null);
  const progressCallbackRef = useRef<(p: EligibilityProgress) => void>(undefined);

  progressCallbackRef.current = setProgress;

  const isEnabled = Boolean(provider && walletAddress && campaigns.length > 0);

  const queryFn = useCallback(async () => {
    setProgress(null);
    const result = await fetchEligibilities(campaigns, walletAddress ?? "", (p) =>
      progressCallbackRef.current?.(p)
    );
    setProgress(null);
    return result;
  }, [campaigns, walletAddress]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["claim-eligibility", provider?.id ?? "none", communityId, walletAddress ?? ""],
    queryFn,
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    eligibilities: data?.eligibilities ?? EMPTY_ELIGIBILITIES,
    eligibleCampaigns: data?.eligibleCampaigns ?? EMPTY_CAMPAIGNS,
    isLoading,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    refetch,
    progress: isLoading ? progress : null,
  };
}
