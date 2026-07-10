"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as portfolioService from "@/services/portfolio-reports.service";
import type { ReportExportDownload, ReportSnapshotSource } from "@/types/portfolio-report";

const EXPORT_KEYS = {
  manifest: (slug: string, id: string) => ["portfolio-report-export-manifest", slug, id] as const,
};

/**
 * Loads the export manifest (data-bearing sections) for a report. Pass
 * `enabled` so the query only fires when the export menu is opened.
 */
export function useReportExportManifest(communitySlug: string, reportId: string, enabled: boolean) {
  return useQuery({
    queryKey: EXPORT_KEYS.manifest(communitySlug, reportId),
    queryFn: () => portfolioService.getReportExportManifest(communitySlug, reportId),
    enabled: Boolean(communitySlug && reportId && enabled),
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
      "Exported — this report predates data snapshots, so it reflects current data, not the data at the time it was generated.",
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
export function useExportReportSection(communitySlug: string, reportId: string) {
  return useMutation({
    mutationFn: (section: string) =>
      portfolioService.exportReportSection(communitySlug, reportId, section),
    onSuccess: handleDownload,
    onError: () => {
      toast.error("Failed to export data");
    },
  });
}

/** Download every section as a single JSON file. */
export function useExportReportAll(communitySlug: string, reportId: string) {
  return useMutation({
    mutationFn: () => portfolioService.exportReportAll(communitySlug, reportId),
    onSuccess: handleDownload,
    onError: () => {
      toast.error("Failed to export data");
    },
  });
}
