"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as portfolioService from "@/services/portfolio-reports.service";
import type {
  CreateReportConfigRequest,
  GenerateReportRequest,
  PortfolioReport,
  ReportConfig,
  UpdateReportConfigRequest,
} from "@/types/portfolio-report";

const QUERY_KEYS = {
  configs: (slug: string) => ["portfolio-report-configs", slug] as const,
  reports: (slug: string) => ["portfolio-reports", slug] as const,
  report: (slug: string, id: string) => ["portfolio-report", slug, id] as const,
  published: (slug: string) => ["portfolio-reports-published", slug] as const,
  publishedMonth: (slug: string, month: string) =>
    ["portfolio-report-published", slug, month] as const,
};

// ── Config queries ───────────────────────────────────────────

export function useReportConfigs(communitySlug: string) {
  return useQuery({
    queryKey: QUERY_KEYS.configs(communitySlug),
    queryFn: () => portfolioService.getReportConfigs(communitySlug),
    enabled: Boolean(communitySlug),
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

export function usePortfolioReport(
  communitySlug: string,
  reportId: string,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  return useQuery({
    queryKey: QUERY_KEYS.report(communitySlug, reportId),
    queryFn: () => portfolioService.getReport(communitySlug, reportId),
    enabled: Boolean(communitySlug && reportId) && enabled,
  });
}

// ── Mutations ────────────────────────────────────────────────

export function useGenerateReport(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateReportRequest) =>
      portfolioService.generateReport(communitySlug, body),
    onSuccess: () => {
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.reports(communitySlug),
      });
      queryClient.setQueryData(QUERY_KEYS.report(communitySlug, data.id), data);
    },
  });
}

export function usePublishReport(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => portfolioService.publishReport(communitySlug, reportId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.reports(communitySlug),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.published(communitySlug),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.publishedMonth(communitySlug, data.reportMonth),
      });
      queryClient.setQueryData(QUERY_KEYS.report(communitySlug, data.id), data);
    },
  });
}

export function useUnpublishReport(communitySlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => portfolioService.unpublishReport(communitySlug, reportId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.reports(communitySlug),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.published(communitySlug),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.publishedMonth(communitySlug, data.reportMonth),
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
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.report(communitySlug, data.id), data);
      if (data.status === "published") {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.published(communitySlug),
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.publishedMonth(communitySlug, data.reportMonth),
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

export function usePublishedReport(communitySlug: string, month: string) {
  return useQuery({
    queryKey: QUERY_KEYS.publishedMonth(communitySlug, month),
    queryFn: () => portfolioService.getPublishedReportByMonth(communitySlug, month),
    enabled: Boolean(communitySlug && month),
  });
}
