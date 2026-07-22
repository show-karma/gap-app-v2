"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as portfolioService from "@/services/portfolio-reports.service";
import type { ReportExportDownload, ReportSnapshotSource } from "@/types/portfolio-report";

const EXPORT_KEYS = {
  manifest: (slug: string, id: string, refresh: boolean) =>
    ["portfolio-report-export-manifest", slug, id, refresh] as const,
};

/**
 * Loads the export manifest (data-bearing sections) for a report. Pass
 * `enabled` so the query only fires when the export menu is opened, and
 * `refresh` to rebuild from current data rather than the report's snapshot.
 *
 * `refresh` is part of the query key: the two modes return genuinely different
 * row counts, so they must not share a cache entry.
 */
export function useReportExportManifest(
  communitySlug: string,
  reportId: string,
  enabled: boolean,
  refresh = false
) {
  return useQuery({
    queryKey: EXPORT_KEYS.manifest(communitySlug, reportId, refresh),
    queryFn: () => portfolioService.getReportExportManifest(communitySlug, reportId, refresh),
    enabled: Boolean(communitySlug && reportId && enabled),
    // A refresh costs a full recompute upstream, so don't re-fetch it on every
    // menu open within the minute.
    staleTime: 60_000,
  });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function notifySource(snapshotSource: ReportSnapshotSource | null): void {
  if (snapshotSource === "live-recompute") {
    toast.success(
      "Exported — this report predates data snapshots, so its data is reconstructed from source records and may not exactly match the original report.",
      { icon: "ℹ️", duration: 6000 }
    );
    return;
  }
  if (snapshotSource === "live-refresh") {
    toast.success(
      "Exported with current data — these numbers are newer than the published report.",
      { icon: "ℹ️", duration: 6000 }
    );
    return;
  }
  toast.success("Data exported");
}

function handleDownload(download: ReportExportDownload): void {
  triggerDownload(download.blob, download.filename);
  notifySource(download.snapshotSource);
}

/** Download one section as CSV. */
export function useExportReportSection(communitySlug: string, reportId: string, refresh = false) {
  return useMutation({
    mutationFn: (section: string) =>
      portfolioService.exportReportSection(communitySlug, reportId, section, refresh),
    onSuccess: handleDownload,
    onError: () => {
      toast.error("Failed to export data");
    },
  });
}

/** Download every section as one Excel workbook, a worksheet per section. */
export function useExportReportWorkbook(communitySlug: string, reportId: string, refresh = false) {
  return useMutation({
    mutationFn: () => portfolioService.exportReportWorkbook(communitySlug, reportId, refresh),
    onSuccess: handleDownload,
    onError: () => {
      toast.error("Failed to export data");
    },
  });
}
