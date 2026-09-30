import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  approveSimocracyVerdict,
  fetchSimocracyMilestoneVerdicts,
  type SimocracyMilestoneVerdictsResult,
} from "@/services/fundingApplicationIntegrations.service";

const VERDICTS_STALE_TIME_MS = 30 * 1000;

// Reviewer-only: the endpoint answers 403 for anyone else, which the fetch
// turns into `forbidden` so the section simply stays hidden.
export function useSimocracyMilestoneVerdicts(
  referenceNumber: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.simocracyMilestoneVerdicts(referenceNumber),
    queryFn: () => fetchSimocracyMilestoneVerdicts(referenceNumber),
    enabled: (options?.enabled ?? true) && !!referenceNumber,
    staleTime: VERDICTS_STALE_TIME_MS,
  });
}

// Publishes one verdict. The card flips to "published" at once and rolls
// back if Karma refuses (revision moved on, milestone reverted, PDS down…).
export function useApproveSimocracyVerdict(referenceNumber: string) {
  const queryClient = useQueryClient();
  const verdictsKey = QUERY_KEYS.simocracyMilestoneVerdicts(referenceNumber);

  return useMutation({
    mutationFn: (input: { verdictId: string; revision: number }) =>
      approveSimocracyVerdict(referenceNumber, input.verdictId, input.revision),
    onMutate: async ({ verdictId, revision }) => {
      await queryClient.cancelQueries({ queryKey: verdictsKey });
      const previous = queryClient.getQueryData<SimocracyMilestoneVerdictsResult>(verdictsKey);
      if (previous) {
        queryClient.setQueryData<SimocracyMilestoneVerdictsResult>(verdictsKey, {
          ...previous,
          verdicts: previous.verdicts.map((verdict) =>
            verdict.verdictId === verdictId
              ? {
                  ...verdict,
                  status: "published",
                  publishedRevision: revision,
                  canPublish: false,
                  publishBlocker: "already_published",
                }
              : verdict
          ),
        });
      }
      return { previous };
    },
    onError: (error: Error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(verdictsKey, context.previous);
      }
      toast.error(error.message);
    },
    onSuccess: (result) => {
      toast.success(
        result.alreadyPublished ? "This verdict was already published" : "Verdict published"
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: verdictsKey });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simocracyComments(referenceNumber) });
      queryClient.invalidateQueries({ queryKey: ["simocracy-feedback", referenceNumber] });
    },
  });
}
