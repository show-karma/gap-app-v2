import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  askQuestions,
  fetchDiligenceResponseContext,
  getCandidateDiligence,
  getDiligenceTemplate,
  getOutreachPreview,
  requestIntro,
  saveDiligenceTemplate,
  submitDiligenceResponse,
  updateAdvisorEmail,
} from "@/services/diligence.service";
import type {
  AskQuestionsResponse,
  CandidateDiligenceView,
  DiligenceResponseContext,
  DiligenceTemplate,
  OutreachAction,
  OutreachPreview,
  RequestIntroResult,
  SaveDiligenceTemplateRequest,
  SubmitDiligenceResponseRequest,
  SubmitDiligenceResponseResult,
} from "@/types/diligence";

// -- Query keys --------------------------------------------------------------

export const diligenceTemplateQueryKey = ["donor-research", "diligence", "template"] as const;

/**
 * Report-owner-scoped template (see {@link useDiligenceTemplate}). Deliberately
 * NOT nested under {@link diligenceTemplateQueryKey} — invalidating the `/me`
 * template must not clobber (or refetch) every report-scoped copy, since React
 * Query matches keys by prefix.
 */
export const reportDiligenceTemplateQueryKey = (reportId: string) =>
  ["donor-research", "diligence", "report-template", reportId] as const;

export const candidateDiligenceQueryKey = (reportId: string, candidateId: string) =>
  ["donor-research", "diligence", "candidate", reportId, candidateId] as const;

export const diligenceResponseContextQueryKey = (token: string) =>
  ["donor-research", "diligence", "response-context", token] as const;

export const outreachPreviewQueryKey = (
  reportId: string,
  candidateId: string,
  action: OutreachAction
) => ["donor-research", "diligence", "outreach-preview", reportId, candidateId, action] as const;

// -- Advisor: template -------------------------------------------------------

/**
 * Loads a diligence template. Always a stable shape (no 404).
 *
 * Pass `reportId` from inside a report to read the template of that report's
 * OWNER — the one an outreach from this report will freeze. Omit it for the
 * caller's own template (the standalone editor page).
 */
export function useDiligenceTemplate(reportId?: string) {
  return useQuery<DiligenceTemplate>({
    queryKey: reportId ? reportDiligenceTemplateQueryKey(reportId) : diligenceTemplateQueryKey,
    queryFn: () => getDiligenceTemplate(reportId),
    staleTime: 60_000,
  });
}

/**
 * Wholesale-replaces a diligence template, seeding the cache with the saved
 * result so the editor reflects the server's canonical copy. `reportId`
 * selects the report owner's template — see {@link useDiligenceTemplate}.
 *
 * A report-scoped save also drops the caller's `/me` copy: when the caller IS
 * the owner the two are the same row, and a staff caller's own template is
 * untouched either way, so invalidating is always safe and never stale.
 */
export function useSaveDiligenceTemplate(reportId?: string) {
  const queryClient = useQueryClient();
  return useMutation<DiligenceTemplate, Error, SaveDiligenceTemplateRequest>({
    mutationFn: (body) => saveDiligenceTemplate(body, reportId),
    onSuccess: (saved) => {
      if (!reportId) {
        queryClient.setQueryData(diligenceTemplateQueryKey, saved);
        return;
      }
      queryClient.setQueryData(reportDiligenceTemplateQueryKey(reportId), saved);
      queryClient.invalidateQueries({ queryKey: diligenceTemplateQueryKey });
    },
  });
}

// -- Advisor: per-candidate diligence ---------------------------------------

/**
 * Loads the per-candidate diligence view that drives the two action buttons.
 * Disabled until both ids are present.
 */
export function useCandidateDiligence(
  reportId: string | null,
  candidateId: string | null,
  enabled = true
) {
  return useQuery<CandidateDiligenceView>({
    queryKey: candidateDiligenceQueryKey(reportId ?? "", candidateId ?? ""),
    queryFn: () => getCandidateDiligence(reportId as string, candidateId as string),
    enabled: enabled && !!reportId && !!candidateId,
  });
}

/**
 * Loads the exact outreach email a send action would dispatch, for the
 * preview-and-edit step. `staleTime: 0` + refetch on mount so every dialog
 * open shows the current composition (the intro body embeds live Q&A context).
 */
export function useOutreachPreview(
  reportId: string,
  candidateId: string,
  action: OutreachAction,
  enabled = true
) {
  return useQuery<OutreachPreview>({
    queryKey: outreachPreviewQueryKey(reportId, candidateId, action),
    queryFn: () => getOutreachPreview(reportId, candidateId, action),
    enabled: enabled && !!reportId && !!candidateId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

/**
 * Ask Questions (202, async). Invalidates the candidate view so the new
 * `in_progress` / `blocked` state is reflected after the outbox dispatches.
 * `body` carries the advisor-edited email body — pass it ONLY when edited so
 * an untouched preview lets the backend compose its own default.
 */
export function useAskQuestions() {
  const queryClient = useQueryClient();
  return useMutation<
    AskQuestionsResponse,
    Error,
    { reportId: string; candidateId: string; body?: string }
  >({
    mutationFn: ({ reportId, candidateId, body }) => askQuestions(reportId, candidateId, body),
    onSuccess: (_data, { reportId, candidateId }) => {
      queryClient.invalidateQueries({
        queryKey: candidateDiligenceQueryKey(reportId, candidateId),
      });
    },
  });
}

/**
 * Connect / named intro (202 | 422-email). On a queued result invalidates the
 * candidate view. The `email_required` branch is surfaced to the caller (it
 * resolves, not rejects) so the UI can run the email-capture flow. `body`
 * follows the same only-when-edited contract as {@link useAskQuestions}.
 */
export function useRequestIntro() {
  const queryClient = useQueryClient();
  return useMutation<
    RequestIntroResult,
    Error,
    { reportId: string; candidateId: string; body?: string }
  >({
    mutationFn: ({ reportId, candidateId, body }) => requestIntro(reportId, candidateId, body),
    onSuccess: (result, { reportId, candidateId }) => {
      if (result.kind === "queued") {
        queryClient.invalidateQueries({
          queryKey: candidateDiligenceQueryKey(reportId, candidateId),
        });
      }
    },
  });
}

/**
 * Saves the advisor's reply-to email (Connect 422 recovery). On success
 * invalidates the candidate view so the caller can re-attempt the intro.
 * See `updateAdvisorEmail` for the UNVERIFIED-contract caveat.
 */
export function useUpdateAdvisorEmail() {
  return useMutation<void, Error, { email: string }>({
    mutationFn: ({ email }) => updateAdvisorEmail(email),
  });
}

// -- Public nonprofit response surface (unauthenticated) ---------------------

/**
 * Loads the public diligence-response context. Returns `data === null` (not
 * undefined) when the token is unknown/expired — the page branches on that to
 * show the generic "link no longer valid" state. `retry: false` because a 404
 * here is terminal, not transient.
 */
export function useDiligenceResponseContext(token: string) {
  return useQuery<DiligenceResponseContext | null>({
    queryKey: diligenceResponseContextQueryKey(token),
    queryFn: () => fetchDiligenceResponseContext(token),
    enabled: !!token,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

/**
 * Submits the nonprofit's answers (201). On success seeds the context cache
 * with `alreadySubmitted: true` so a re-render hides the form. Errors carry a
 * `status` (see `DiligenceSubmitError`) the caller branches on.
 */
export function useSubmitDiligenceResponse(token: string) {
  const queryClient = useQueryClient();
  return useMutation<SubmitDiligenceResponseResult, Error, SubmitDiligenceResponseRequest>({
    mutationFn: (body) => submitDiligenceResponse(token, body),
    onSuccess: () => {
      queryClient.setQueryData<DiligenceResponseContext | null>(
        diligenceResponseContextQueryKey(token),
        (prev) => (prev ? { ...prev, alreadySubmitted: true } : prev)
      );
    },
  });
}
