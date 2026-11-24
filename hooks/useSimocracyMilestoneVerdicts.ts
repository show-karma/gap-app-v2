import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { QUERY_KEYS } from "@/hooks/fundingPlatformQueryKeys";
import {
  approveSimocracyVerdict,
  fetchSimocracyApplicationVerdicts,
  fetchSimocracyMilestoneVerdicts,
  type SimocracyVerdictRow,
  type SimocracyVerdictSubject,
  type SimocracyVerdictsResult,
} from "@/services/fundingApplicationIntegrations.service";

const VERDICTS_STALE_TIME_MS = 30 * 1000;

function verdictsKey(referenceNumber: string, subject: SimocracyVerdictSubject) {
  return subject === "application"
    ? QUERY_KEYS.simocracyApplicationVerdicts(referenceNumber)
    : QUERY_KEYS.simocracyMilestoneVerdicts(referenceNumber);
}

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

export function useSimocracyApplicationVerdicts(
  referenceNumber: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.simocracyApplicationVerdicts(referenceNumber),
    queryFn: () => fetchSimocracyApplicationVerdicts(referenceNumber),
    enabled: (options?.enabled ?? true) && !!referenceNumber,
    staleTime: VERDICTS_STALE_TIME_MS,
  });
}

// Publishes one verdict. While the request runs the card shows "Publishing…"
// (and a progress toast); on success the row flips to published and the
// public comment list is refetched so the verdict reappears there.
const APPROVE_TOAST_ID = "simocracy-verdict-approve";

interface ApproveInput {
  verdictId: string;
  revision: number;
  subject: SimocracyVerdictSubject;
}

export function useApproveSimocracyVerdict(referenceNumber: string) {
  const queryClient = useQueryClient();

  const patchVerdict = (
    subject: SimocracyVerdictSubject,
    verdictId: string,
    patch: Partial<SimocracyVerdictRow>
  ) => {
    const key = verdictsKey(referenceNumber, subject);
    const current = queryClient.getQueryData<SimocracyVerdictsResult>(key);
    if (!current) return;
    queryClient.setQueryData<SimocracyVerdictsResult>(key, {
      ...current,
      verdicts: current.verdicts.map((verdict) =>
        verdict.verdictId === verdictId ? { ...verdict, ...patch } : verdict
      ),
    });
  };

  return useMutation({
    mutationFn: ({ verdictId, revision, subject }: ApproveInput) =>
      approveSimocracyVerdict(referenceNumber, verdictId, revision, subject),
    onMutate: async ({ verdictId, subject }) => {
      const key = verdictsKey(referenceNumber, subject);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SimocracyVerdictsResult>(key);
      patchVerdict(subject, verdictId, {
        status: "publishing",
        canPublish: false,
        publishBlocker: "publishing",
      });
      toast.loading("Publishing to Simocracy…", { id: APPROVE_TOAST_ID });
      return { previous };
    },
    onError: (error: Error, { subject }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(verdictsKey(referenceNumber, subject), context.previous);
      }
      toast.error(error.message, { id: APPROVE_TOAST_ID });
    },
    onSuccess: (result, { verdictId, revision, subject }) => {
      patchVerdict(subject, verdictId, {
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
    onSettled: (_result, _error, { subject }) => {
      queryClient.invalidateQueries({ queryKey: verdictsKey(referenceNumber, subject) });
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.simocracyComments(referenceNumber) });
      queryClient.invalidateQueries({ queryKey: ["simocracy-feedback", referenceNumber] });
      queryClient.invalidateQueries({ queryKey: ["application-comments"] });
    },
  });
}
