import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  reorderReportCandidates,
  type UpdateReportConfigRequest,
  updateReportConfig,
} from "@/services/donor-research.service";
import {
  DEFAULT_TOP_COUNT,
  recompute,
} from "@/src/features/donor-research/components/report-brief/scoring";
import type { ResearchReportDetail } from "@/types/donor-research";
import { donorReportQueryKey } from "./useDonorReports";

type UpdateConfigVariables = { reportId: string } & UpdateReportConfigRequest;

interface ReorderVariables {
  reportId: string;
  orderedCandidateIds: string[];
}

interface MutationContext {
  previous: ResearchReportDetail | undefined;
}

/**
 * Optimistic projection of a config commit (DEV-418). A `weights` change
 * re-ranks by composite (and clears manual ordering); a `topCount`-only change
 * keeps the current order and just moves the featured cutoff. Either way the
 * featured flags are recomputed at the new `topCount`, and the one-pagers of
 * candidates leaving the featured set are nulled (entrants' are synthesized
 * server-side and land on the invalidation refetch).
 */
function projectConfigCommit(
  report: ResearchReportDetail,
  body: UpdateReportConfigRequest
): ResearchReportDetail {
  const newTopCount = body.topCount ?? report.topCount ?? DEFAULT_TOP_COUNT;
  const wasFeatured = new Set(report.candidates.filter((c) => c.featuredFlag).map((c) => c.id));

  if (body.weights) {
    const candidates = recompute(report.candidates, body.weights, newTopCount).map((entry) => {
      const leaving = !entry.featuredFlag && wasFeatured.has(entry.candidate.id);
      return {
        ...entry.candidate,
        composite: entry.composite,
        featuredFlag: entry.featuredFlag,
        manualPosition: null,
        onePagerText: leaving ? null : entry.candidate.onePagerText,
      };
    });
    return { ...report, weights: body.weights, topCount: newTopCount, candidates };
  }

  // topCount-only: keep the current order, move the featured cutoff.
  const candidates = report.candidates.map((candidate, index) => {
    const featured = index < newTopCount;
    const leaving = !featured && wasFeatured.has(candidate.id);
    return {
      ...candidate,
      featuredFlag: featured,
      onePagerText: leaving ? null : candidate.onePagerText,
    };
  });
  return { ...report, topCount: newTopCount, candidates };
}

/** Optimistic projection of a manual reorder commit (composites unchanged). */
function projectReorderCommit(
  report: ResearchReportDetail,
  orderedCandidateIds: string[]
): ResearchReportDetail {
  const byId = new Map(report.candidates.map((c) => [c.id, c]));
  const topCount = report.topCount ?? DEFAULT_TOP_COUNT;
  const wasFeatured = new Set(report.candidates.filter((c) => c.featuredFlag).map((c) => c.id));
  const candidates = orderedCandidateIds
    .map((id, index) => {
      const candidate = byId.get(id);
      if (!candidate) return null;
      const featured = index < topCount;
      const leaving = !featured && wasFeatured.has(id);
      return {
        ...candidate,
        manualPosition: index + 1,
        featuredFlag: featured,
        onePagerText: leaving ? null : candidate.onePagerText,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  return { ...report, candidates };
}

/**
 * Commit composite weights and/or a new featured-set size (DEV-418 U8) with an
 * optimistic re-rank. The cache flips to the projected ranking immediately,
 * rolls back on error, and reconciles against the server-confirmed report.
 */
export function useUpdateReportConfig() {
  const queryClient = useQueryClient();
  return useMutation<ResearchReportDetail, Error, UpdateConfigVariables, MutationContext>({
    mutationFn: ({ reportId, ...body }) => updateReportConfig(reportId, body),
    onMutate: async ({ reportId, ...body }) => {
      const key = donorReportQueryKey(reportId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ResearchReportDetail>(key);
      if (previous) {
        queryClient.setQueryData<ResearchReportDetail>(key, projectConfigCommit(previous, body));
      }
      return { previous };
    },
    onError: (_error, { reportId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(donorReportQueryKey(reportId), context.previous);
      }
    },
    onSettled: (_data, _error, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: donorReportQueryKey(reportId) });
    },
  });
}

/**
 * Commit a manual candidate ordering with an optimistic reorder (DEV-418 U8).
 */
export function useReorderReport() {
  const queryClient = useQueryClient();
  return useMutation<ResearchReportDetail, Error, ReorderVariables, MutationContext>({
    mutationFn: ({ reportId, orderedCandidateIds }) =>
      reorderReportCandidates(reportId, orderedCandidateIds),
    onMutate: async ({ reportId, orderedCandidateIds }) => {
      const key = donorReportQueryKey(reportId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ResearchReportDetail>(key);
      if (previous) {
        queryClient.setQueryData<ResearchReportDetail>(
          key,
          projectReorderCommit(previous, orderedCandidateIds)
        );
      }
      return { previous };
    },
    onError: (_error, { reportId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(donorReportQueryKey(reportId), context.previous);
      }
    },
    onSettled: (_data, _error, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: donorReportQueryKey(reportId) });
    },
  });
}
