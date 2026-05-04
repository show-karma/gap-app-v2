"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import * as portfolioService from "@/services/portfolio-reports.service";
import {
  type CreateReportConfigRequest,
  type GenerateReportRequest,
  type PortfolioReport,
  type ReportConfig,
  reportPollIntervalMs,
  type UpdateReportConfigRequest,
} from "@/types/portfolio-report";

const QUERY_KEYS = {
  configs: (slug: string) => ["portfolio-report-configs", slug] as const,
  reports: (slug: string) => ["portfolio-reports", slug] as const,
  report: (slug: string, id: string) => ["portfolio-report", slug, id] as const,
  published: (slug: string) => ["portfolio-reports-published", slug] as const,
  publishedRunDate: (slug: string, runDate: string) =>
    ["portfolio-report-published", slug, runDate] as const,
};

// ── Config queries ───────────────────────────────────────────

export function useReportConfigs(communitySlug: string) {
  return useQuery({
    queryKey: QUERY_KEYS.configs(communitySlug),
    queryFn: () => portfolioService.getReportConfigs(communitySlug),
    enabled: Boolean(communitySlug),
  });
}

export function useReportConfig(communitySlug: string, configId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configs(communitySlug), configId],
    queryFn: () => portfolioService.getReportConfig(communitySlug, configId),
    enabled: Boolean(communitySlug && configId),
  });
}

export function useCreateReportConfig(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReportConfigRequest) =>
      portfolioService.createReportConfig(communitySlug, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.configs(communitySlug),
      });
    },
  });
}

export function useUpdateReportConfig(communitySlug: string, configId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateReportConfigRequest) =>
      portfolioService.updateReportConfig(communitySlug, configId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.configs(communitySlug),
      });
    },
  });
}

export function useDeleteReportConfig(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (configId: string) => portfolioService.deleteReportConfig(communitySlug, configId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.configs(communitySlug),
      });
    },
  });
}

// ── Report queries ───────────────────────────────────────────

export function usePortfolioReports(communitySlug: string, status?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.reports(communitySlug), status],
    queryFn: () => portfolioService.listReports(communitySlug, status),
    enabled: Boolean(communitySlug),
  });
}

export function usePortfolioReport(communitySlug: string, reportId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.report(communitySlug, reportId),
    queryFn: () => portfolioService.getReport(communitySlug, reportId),
    enabled: Boolean(communitySlug && reportId),
    refetchInterval: (query) =>
      reportPollIntervalMs(query.state.data as PortfolioReport | undefined),
  });
}

/**
 * Per-row polling for the list page: while the row is `generating`, polls
 * `GET /reports/:id` and mirrors the result back into the list cache so
 * the badge updates without a separate list refetch.
 */
export function useReportRowSync(
  communitySlug: string,
  initialReport: PortfolioReport
): PortfolioReport {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: QUERY_KEYS.report(communitySlug, initialReport.id),
    queryFn: () => portfolioService.getReport(communitySlug, initialReport.id),
    enabled: Boolean(communitySlug && initialReport.id),
    initialData: initialReport,
    refetchInterval: (query) =>
      reportPollIntervalMs(query.state.data as PortfolioReport | undefined),
  });

  useEffect(() => {
    if (!data) return;
    queryClient.setQueriesData<PortfolioReport[] | undefined>(
      { queryKey: QUERY_KEYS.reports(communitySlug) },
      (old) => {
        if (!old) return old;
        let changed = false;
        const next = old.map((r) => {
          if (r.id !== data.id || r === data) return r;
          if (
            r.status === data.status &&
            r.markdown === data.markdown &&
            r.generationError === data.generationError &&
            r.updatedAt === data.updatedAt
          ) {
            return r;
          }
          changed = true;
          return data;
        });
        return changed ? next : old;
      }
    );
  }, [data, communitySlug, queryClient]);

  return data ?? initialReport;
}

// ── Mutations ────────────────────────────────────────────────

export function useGenerateReport(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateReportRequest) =>
      portfolioService.generateReport(communitySlug, body),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.report(communitySlug, data.id), data);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.reports(communitySlug),
      });
    },
  });
}

export function useRegenerateReport(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => portfolioService.regenerateReport(communitySlug, reportId),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.report(communitySlug, data.id), data);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.reports(communitySlug),
      });
    },
  });
}

export function usePublishReport(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => portfolioService.publishReport(communitySlug, reportId),
    onSuccess: (data: PortfolioReport) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.reports(communitySlug),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.published(communitySlug),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.publishedRunDate(communitySlug, data.runDate),
      });
      queryClient.setQueryData(QUERY_KEYS.report(communitySlug, data.id), data);
    },
  });
}

export function useUnpublishReport(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => portfolioService.unpublishReport(communitySlug, reportId),
    onSuccess: (data: PortfolioReport) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.reports(communitySlug),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.published(communitySlug),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.publishedRunDate(communitySlug, data.runDate),
      });
      queryClient.setQueryData(QUERY_KEYS.report(communitySlug, data.id), data);
    },
  });
}

export function useUpdateReportMarkdown(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, markdown }: { reportId: string; markdown: string }) =>
      portfolioService.updateReportMarkdown(communitySlug, reportId, markdown),
    onSuccess: (data: PortfolioReport) => {
      queryClient.setQueryData(QUERY_KEYS.report(communitySlug, data.id), data);
      if (data.status === "published") {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.published(communitySlug),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.publishedRunDate(communitySlug, data.runDate),
        });
      }
    },
  });
}

// ── Public queries ───────────────────────────────────────────

export function usePublishedReports(communitySlug: string) {
  return useQuery({
    queryKey: QUERY_KEYS.published(communitySlug),
    queryFn: () => portfolioService.getPublishedReports(communitySlug),
    enabled: Boolean(communitySlug),
  });
}

export function usePublishedReport(communitySlug: string, runDate: string) {
  return useQuery({
    queryKey: QUERY_KEYS.publishedRunDate(communitySlug, runDate),
    queryFn: () => portfolioService.getPublishedReportByRunDate(communitySlug, runDate),
    enabled: Boolean(communitySlug && runDate),
  });
}

export function useReportConfigsExist(communitySlug: string) {
  const { data, isLoading, isError } = useReportConfigs(communitySlug);
  return {
    hasConfigs: !isLoading && !isError && (data?.length ?? 0) > 0,
    isLoading,
    isError,
  };
}
