import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  approveSimocracyVerdict,
  dismissSimocracyVerdict,
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

// Publishes one verdict. While the request runs the card shows "Publishing…"
// (and a progress toast); on success the row flips to published and the
// public comment list is refetched so the verdict reappears there.
const APPROVE_TOAST_ID = "simocracy-verdict-approve";

function useVerdictPatcher(referenceNumber: string) {
  const queryClient = useQueryClient();
  const verdictsKey = QUERY_KEYS.simocracyMilestoneVerdicts(referenceNumber);

  const patchVerdict = (
    verdictId: string,
    patch: Partial<SimocracyMilestoneVerdictsResult["verdicts"][number]>
  ) => {
    const current = queryClient.getQueryData<SimocracyMilestoneVerdictsResult>(verdictsKey);
    if (!current) return;
    queryClient.setQueryData<SimocracyMilestoneVerdictsResult>(verdictsKey, {
      ...current,
      verdicts: current.verdicts.map((verdict) =>
        verdict.verdictId === verdictId ? { ...verdict, ...patch } : verdict
      ),
    });
  };

  return { queryClient, verdictsKey, patchVerdict };
}

export function useApproveSimocracyVerdict(referenceNumber: string) {
  const { queryClient, verdictsKey, patchVerdict } = useVerdictPatcher(referenceNumber);

  return useMutation({
    mutationFn: (input: { verdictId: string; revision: number }) =>
      approveSimocracyVerdict(referenceNumber, input.verdictId, input.revision),
    onMutate: async ({ verdictId }) => {
      await queryClient.cancelQueries({ queryKey: verdictsKey });
      const previous = queryClient.getQueryData<SimocracyMilestoneVerdictsResult>(verdictsKey);
      patchVerdict(verdictId, {
        status: "publishing",
        canPublish: false,
        publishBlocker: "publishing",
      });
      toast.loading("Publishing to Simocracy…", { id: APPROVE_TOAST_ID });
      return { previous };
    },
    onError: (error: Error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(verdictsKey, context.previous);
      }
      toast.error(error.message, { id: APPROVE_TOAST_ID });
    },
    onSuccess: (result, { verdictId, revision }) => {
      patchVerdict(verdictId, {
        status: "published",
        publishedRevision: revision,
        canPublish: false,
        publishBlocker: "already_published",
      });
      toast.success(
        result.alreadyPublished ? "This verdict was already published" : "Verdict published",
        { id: APPROVE_TOAST_ID }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: verdictsKey });
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.simocracyComments(referenceNumber) });
      queryClient.invalidateQueries({ queryKey: ["simocracy-feedback", referenceNumber] });
    },
  });
}

// Sets one verdict aside. The card flips to dismissed at once and rolls back
// if the server refuses (already published, or the agent re-ran it).
const DISMISS_TOAST_ID = "simocracy-verdict-dismiss";

export function useDismissSimocracyVerdict(referenceNumber: string) {
  const { queryClient, verdictsKey, patchVerdict } = useVerdictPatcher(referenceNumber);

  return useMutation({
    mutationFn: (input: { verdictId: string; revision: number }) =>
      dismissSimocracyVerdict(referenceNumber, input.verdictId, input.revision),
    onMutate: async ({ verdictId }) => {
      await queryClient.cancelQueries({ queryKey: verdictsKey });
      const previous = queryClient.getQueryData<SimocracyMilestoneVerdictsResult>(verdictsKey);
      patchVerdict(verdictId, {
        status: "dismissed",
        canPublish: false,
        publishBlocker: "dismissed",
      });
      return { previous };
    },
    onError: (error: Error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(verdictsKey, context.previous);
      }
      toast.error(error.message, { id: DISMISS_TOAST_ID });
    },
    onSuccess: (result) => {
      toast.success(
        result.alreadyDismissed ? "This verdict was already dismissed" : "Verdict dismissed",
        { id: DISMISS_TOAST_ID }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: verdictsKey });
    },
  });
}
