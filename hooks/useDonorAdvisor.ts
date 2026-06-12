import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCurrentAdvisor,
  fetchMyCounters,
  type OnboardAdvisorRequest,
  onboardAdvisor,
} from "@/services/donor-research.service";
import type { DonorAdvisor, DonorResearchCountersSnapshot } from "@/types/donor-research";

export const donorAdvisorQueryKey = ["donor-research", "advisor", "me"] as const;
export const donorCountersQueryKey = ["donor-research", "advisor", "counters"] as const;

/**
 * Loads the current advisor row.
 *
 * Returns `data === null` (not undefined!) when the backend signals the
 * advisor hasn't onboarded yet — callers should branch on that explicit
 * null and route to the onboarding flow rather than treating it as an
 * error.
 */
export function useDonorAdvisor() {
  return useQuery<DonorAdvisor | null>({
    queryKey: donorAdvisorQueryKey,
    queryFn: fetchCurrentAdvisor,
    staleTime: 5 * 60_000, // advisor row rarely changes
  });
}

/**
 * Today's rate-limit counters for the current advisor. Auto-refetches
 * every 60 seconds while the page is open so the header chip reflects
 * recently-consumed budget. Backend gracefully returns a `degraded`
 * snapshot when Redis is unreachable instead of throwing.
 */
export function useDonorCounters(enabled: boolean) {
  return useQuery<DonorResearchCountersSnapshot>({
    queryKey: donorCountersQueryKey,
    queryFn: fetchMyCounters,
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/**
 * Onboards the current Privy user as a donor-research advisor. Idempotent
 * on Privy userId — the backend upserts on `privy_user_id` so re-calling
 * returns the existing row.
 */
export function useOnboardAdvisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OnboardAdvisorRequest) => onboardAdvisor(body),
    onSuccess: (advisor) => {
      queryClient.setQueryData(donorAdvisorQueryKey, advisor);
    },
  });
}
